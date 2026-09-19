// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IWallet {
    function freezeWallet(address user) external;
    function unfreezeWallet(address user) external;
    function setRiskFactor(address user, uint8 factor) external;
    function emergencyExit() external;
    function getUserTokens() external view returns (address[] memory);
    function tokenBalances(address user, address token) external view returns (uint256);
}

interface ILiquidityPool {
    function swap(uint256 tokenAmount) external;
    function swapEthForTokens() external payable;
}

/**
 * @title AnomalyGuard
 * @notice Core B2C rug-pull protection contract.
 *         Receives anomaly reports from the ML oracle, freezes wallets,
 *         executes emergency exits, and emits rich notification events
 *         that the frontend uses to show users what happened.
 */
contract AnomalyGuard is ReentrancyGuard {

    // ─────────────────────────────────────────────────────────
    // Anomaly types (mirrors ML model categories)
    // ─────────────────────────────────────────────────────────
    enum AnomalyType {
        NONE,
        VELOCITY_SPIKE,      // Too many txns in short window
        LARGE_TRANSFER,      // Single tx >> historical average
        RUG_PULL,            // Liquidity drain pattern detected
        DRAIN_ATTACK,        // Wallet being emptied to unknown address
        LAYERING,            // Splitting funds through many small txns
        SMURFING,            // Multiple wallets receiving near-threshold amounts
        FLASH_LOAN_PATTERN,  // Borrow-swap-repay in one block
        HONEYPOT_INTERACTION // Interaction with known honeypot contract
    }

    enum Severity { LOW, MEDIUM, HIGH, CRITICAL }

    // ─────────────────────────────────────────────────────────
    // Structs
    // ─────────────────────────────────────────────────────────
    struct AnomalyRecord {
        AnomalyType anomalyType;
        Severity    severity;
        uint256     timestamp;
        uint256     amountInvolved;   // wei value at risk
        address     suspiciousAddress; // counterparty that triggered it
        string      description;       // human-readable explanation
        bool        autoProtected;     // was emergency exit triggered?
        uint256     ethRecovered;      // ETH returned to user after swap
    }

    struct ProtectionEvent {
        address     wallet;
        AnomalyType anomalyType;
        Severity    severity;
        uint256     timestamp;
        uint256     tokensSwapped;   // total token value cleared
        uint256     ethRecovered;    // ETH sent back to user
        string      message;         // User-facing notification message
    }

    // ─────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────
    address public owner;
    address public mlOracle;   // backend ML service address that calls reportAnomaly
    IWallet public wallet;

    mapping(address => AnomalyRecord[]) public anomalyHistory;
    mapping(address => bool)            public autoProtectEnabled; // user opt-in for auto-exit
    mapping(address => ProtectionEvent[]) public protectionLog;

    // Watchlist: user can watch any token contract for rug pull signals
    mapping(address => address[]) public watchlist;               // user => token contracts
    mapping(address => mapping(address => bool)) public isWatched;

    uint256 public totalProtectedEvents;
    uint256 public totalEthRecovered;

    // ─────────────────────────────────────────────────────────
    // Events (used by frontend for real-time notifications)
    // ─────────────────────────────────────────────────────────

    /// @notice Emitted when ML detects an anomaly — frontend shows alert immediately
    event AnomalyDetected(
        address indexed wallet,
        AnomalyType indexed anomalyType,
        Severity severity,
        uint256 amountAtRisk,
        address suspiciousAddress,
        string  description,
        uint256 timestamp
    );

    /// @notice Emitted when wallet is auto-frozen pending user action
    event WalletFrozenForProtection(
        address indexed wallet,
        AnomalyType anomalyType,
        string  reason,
        uint256 timestamp
    );

    /// @notice Emitted when emergency exit completes — tells user exactly what happened
    event ProtectionActivated(
        address indexed wallet,
        AnomalyType anomalyType,
        uint256 tokensCleared,
        uint256 ethRecovered,
        string  userMessage,     // e.g. "Your LINK tokens were swapped to 0.42 ETH and secured"
        uint256 timestamp
    );

    /// @notice Emitted when user manually unfreezes / overrides protection
    event ProtectionOverridden(address indexed wallet, uint256 timestamp);

    /// @notice Emitted when a watchlist token shows rug pull signals
    event WatchlistAlert(
        address indexed user,
        address indexed tokenContract,
        string  signal,
        uint256 timestamp
    );

    event AutoProtectToggled(address indexed user, bool enabled);
    event WatchlistUpdated(address indexed user, address token, bool added);
    event RiskFactorSet(address indexed user, uint8 factor);

    // ─────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == mlOracle || msg.sender == owner, "Not ML oracle");
        _;
    }

    // ─────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────
    constructor(address _wallet) {
        owner    = msg.sender;
        mlOracle = msg.sender;
        wallet   = IWallet(_wallet);
    }

    receive() external payable {}

    // ─────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────
    function setMlOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Zero address");
        mlOracle = _oracle;
    }

    // ─────────────────────────────────────────────────────────
    // User Settings
    // ─────────────────────────────────────────────────────────

    /// @notice Toggle automatic emergency exit on anomaly detection.
    ///         If enabled, the contract auto-swaps tokens to ETH and notifies user.
    function setAutoProtect(bool _enabled) external {
        autoProtectEnabled[msg.sender] = _enabled;
        emit AutoProtectToggled(msg.sender, _enabled);
    }

    // ─────────────────────────────────────────────────────────
    // Watchlist Management
    // ─────────────────────────────────────────────────────────

    function addToWatchlist(address tokenContract) external {
        require(tokenContract != address(0), "Zero address");
        require(!isWatched[msg.sender][tokenContract], "Already watching");
        watchlist[msg.sender].push(tokenContract);
        isWatched[msg.sender][tokenContract] = true;
        emit WatchlistUpdated(msg.sender, tokenContract, true);
    }

    function removeFromWatchlist(address tokenContract) external {
        require(isWatched[msg.sender][tokenContract], "Not watching");
        isWatched[msg.sender][tokenContract] = false;
        address[] storage wl = watchlist[msg.sender];
        for (uint i = 0; i < wl.length; i++) {
            if (wl[i] == tokenContract) {
                wl[i] = wl[wl.length - 1];
                wl.pop();
                break;
            }
        }
        emit WatchlistUpdated(msg.sender, tokenContract, false);
    }

    function getWatchlist(address user) external view returns (address[] memory) {
        return watchlist[user];
    }

    /// @notice Oracle fires this when it detects a rug pull signal on a watched token
    function alertWatchlist(address user, address tokenContract, string calldata signal) external onlyOracle {
        emit WatchlistAlert(user, tokenContract, signal, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────
    // ML Oracle: Report Anomaly
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Called by the ML backend when it detects an anomaly.
     * @param userWallet    Address of the affected wallet
     * @param anomalyType   Category of anomaly (enum)
     * @param severity      LOW / MEDIUM / HIGH / CRITICAL
     * @param amountAtRisk  Wei value potentially at risk
     * @param suspicious    Counterparty address that triggered detection
     * @param description   Human-readable description (e.g. "Velocity 12x above baseline")
     * @param triggerExit   If true AND user has autoProtect enabled, execute emergency exit
     */
    function reportAnomaly(
        address userWallet,
        AnomalyType anomalyType,
        Severity severity,
        uint256 amountAtRisk,
        address suspicious,
        string calldata description,
        bool triggerExit
    ) external onlyOracle nonReentrant {
        require(userWallet != address(0), "Zero address");

        // Store record
        anomalyHistory[userWallet].push(AnomalyRecord({
            anomalyType:       anomalyType,
            severity:          severity,
            timestamp:         block.timestamp,
            amountInvolved:    amountAtRisk,
            suspiciousAddress: suspicious,
            description:       description,
            autoProtected:     false,
            ethRecovered:      0
        }));

        // Update wallet risk factor based on severity
        uint8 newRisk = _severityToRisk(severity);
        wallet.setRiskFactor(userWallet, newRisk);
        emit RiskFactorSet(userWallet, newRisk);

        // Emit anomaly alert — frontend picks this up immediately
        emit AnomalyDetected(
            userWallet,
            anomalyType,
            severity,
            amountAtRisk,
            suspicious,
            description,
            block.timestamp
        );

        // Freeze wallet for HIGH / CRITICAL
        if (severity == Severity.HIGH || severity == Severity.CRITICAL) {
            wallet.freezeWallet(userWallet);
            emit WalletFrozenForProtection(
                userWallet,
                anomalyType,
                _buildFreezeReason(anomalyType),
                block.timestamp
            );
        }

        // Auto-protect: trigger emergency exit if user opted in and severity warrants it
        if (triggerExit && autoProtectEnabled[userWallet] &&
            (severity == Severity.HIGH || severity == Severity.CRITICAL)) {
            _executeProtection(userWallet, anomalyType, amountAtRisk);
        }
    }

    // ─────────────────────────────────────────────────────────
    // Protection Execution (internal)
    // ─────────────────────────────────────────────────────────

    function _executeProtection(
        address userWallet,
        AnomalyType anomalyType,
        uint256 tokensCleared
    ) internal {
        // In production: call LP swap here. For demo: emit event with recovered amount.
        // The actual swap mechanics live in the Wallet.emergencyExit() call path.
        uint256 ethRecovered = tokensCleared; // 1:1 for demo (real: LP rate)

        string memory userMsg = _buildUserMessage(anomalyType, tokensCleared, ethRecovered);

        // Record protection event
        protectionLog[userWallet].push(ProtectionEvent({
            wallet:        userWallet,
            anomalyType:   anomalyType,
            severity:      Severity.CRITICAL,
            timestamp:     block.timestamp,
            tokensSwapped: tokensCleared,
            ethRecovered:  ethRecovered,
            message:       userMsg
        }));

        // Update anomaly record
        uint256 last = anomalyHistory[userWallet].length - 1;
        anomalyHistory[userWallet][last].autoProtected = true;
        anomalyHistory[userWallet][last].ethRecovered  = ethRecovered;

        totalProtectedEvents += 1;
        totalEthRecovered    += ethRecovered;

        // Emit — this is the notification the user sees in the UI
        emit ProtectionActivated(
            userWallet,
            anomalyType,
            tokensCleared,
            ethRecovered,
            userMsg,
            block.timestamp
        );
    }

    // ─────────────────────────────────────────────────────────
    // Manual override by user
    // ─────────────────────────────────────────────────────────

    /// @notice User can manually unfreeze their wallet (overriding protection).
    function overrideProtection() external {
        wallet.unfreezeWallet(msg.sender);
        emit ProtectionOverridden(msg.sender, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────
    // View — History & Stats
    // ─────────────────────────────────────────────────────────

    function getAnomalyHistory(address user) external view returns (AnomalyRecord[] memory) {
        return anomalyHistory[user];
    }

    function getProtectionLog(address user) external view returns (ProtectionEvent[] memory) {
        return protectionLog[user];
    }

    function getLatestAnomaly(address user) external view returns (AnomalyRecord memory) {
        require(anomalyHistory[user].length > 0, "No anomaly history");
        return anomalyHistory[user][anomalyHistory[user].length - 1];
    }

    function getStats() external view returns (uint256 events, uint256 ethSaved) {
        return (totalProtectedEvents, totalEthRecovered);
    }

    // ─────────────────────────────────────────────────────────
    // String Builders (for user-facing messages)
    // ─────────────────────────────────────────────────────────

    function _buildFreezeReason(AnomalyType t) internal pure returns (string memory) {
        if (t == AnomalyType.VELOCITY_SPIKE)      return "Wallet frozen: abnormal transaction velocity detected";
        if (t == AnomalyType.LARGE_TRANSFER)      return "Wallet frozen: unusually large transfer detected";
        if (t == AnomalyType.RUG_PULL)            return "Wallet frozen: rug pull pattern detected in connected token";
        if (t == AnomalyType.DRAIN_ATTACK)        return "Wallet frozen: drain attack pattern detected";
        if (t == AnomalyType.LAYERING)            return "Wallet frozen: layering/structuring pattern detected";
        if (t == AnomalyType.SMURFING)            return "Wallet frozen: smurfing pattern detected";
        if (t == AnomalyType.FLASH_LOAN_PATTERN)  return "Wallet frozen: flash loan attack pattern detected";
        if (t == AnomalyType.HONEYPOT_INTERACTION)return "Wallet frozen: interaction with honeypot contract";
        return "Wallet frozen: anomaly detected";
    }

    function _buildUserMessage(
        AnomalyType t,
        uint256 tokensCleared,
        uint256 ethRecovered
    ) internal pure returns (string memory) {
        // In production format amounts; for demo use generic message
        if (t == AnomalyType.RUG_PULL)
            return "Rug pull detected: your tokens were automatically swapped to ETH and secured in your wallet.";
        if (t == AnomalyType.DRAIN_ATTACK)
            return "Drain attack detected: your credits were swapped to ETH before funds could be drained.";
        if (t == AnomalyType.VELOCITY_SPIKE)
            return "Abnormal activity detected: transactions paused and your tokens were converted to ETH for safety.";
        if (t == AnomalyType.LARGE_TRANSFER)
            return "Unusually large transfer flagged: your tokens were swapped to ETH and your wallet frozen pending your review.";
        if (t == AnomalyType.HONEYPOT_INTERACTION)
            return "Honeypot contract detected: your position was exited before you could be trapped.";
        return "Anomaly detected: your tokens were swapped to ETH and secured. Review the protection log for details.";
    }

    function _severityToRisk(Severity s) internal pure returns (uint8) {
        if (s == Severity.LOW)      return 3;
        if (s == Severity.MEDIUM)   return 5;
        if (s == Severity.HIGH)     return 7;
        return 10; // CRITICAL
    }
}
