// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Wallet
 * @notice Guardiant protected wallet with full user-configurable limits,
 *         anomaly detection hooks, and emergency exit.
 *
 * User-settable limits (all optional, 0 = disabled):
 *   1. perTxCap         — max ETH/tokens per single transaction
 *   2. periodLimit      — max total ETH out per 10-min rolling window
 *   3. txCountLimit     — max number of outgoing txns per 10-min window
 *   4. recipientWhitelist — only allow transfers to approved addresses
 *   5. blacklist        — block transfers to specific addresses
 *   6. allowedHourStart / allowedHourEnd — time-of-day restriction (UTC hour 0-23)
 */
contract Wallet is ReentrancyGuard {

    // ─────────────────────────────────────────────────────────
    // User-configurable limit struct
    // ─────────────────────────────────────────────────────────
    struct UserLimits {
        uint256 perTxCap;           // Max ETH (in wei) per single tx. 0 = no limit.
        uint256 periodLimit;        // Max total ETH out in current 10-min window. 0 = no limit.
        uint256 txCountLimit;       // Max outgoing txns in 10-min window. 0 = no limit.
        uint8   allowedHourStart;   // UTC hour: transactions allowed from (0-23). 0 = any time.
        uint8   allowedHourEnd;     // UTC hour: transactions allowed until (0-23). 0 = any time.
        bool    whitelistEnabled;   // If true, only whitelisted recipients are allowed.
    }

    // ─────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────
    mapping(address => address[])                    public userTokens;
    mapping(address => mapping(address => uint256))  public tokenBalances;

    // Per-user limits
    mapping(address => UserLimits)  public userLimits;

    // Per-user rolling window tracking (10-min window = 600 seconds)
    mapping(address => uint256)     public windowStart;       // timestamp when current window began
    mapping(address => uint256)     public windowSpent;       // total ETH sent in current window
    mapping(address => uint256)     public windowTxCount;     // txns sent in current window

    // Recipient whitelist / blacklist
    mapping(address => mapping(address => bool)) public whitelist;
    mapping(address => mapping(address => bool)) public blacklist;

    // Risk & freeze (set by anomaly oracle)
    mapping(address => uint8)  public riskFactor;   // 1–10
    mapping(address => bool)   public isFrozen;

    // Oracle & owner
    address public anomalyOracle;
    address public owner;

    uint256 public constant WINDOW_DURATION = 600; // 10 minutes in seconds

    // ─────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────
    event TokenAdded(address indexed user, address indexed token, uint256 amount);
    event TokenRemoved(address indexed user, address indexed token, uint256 amount);
    event TokenTransferred(address indexed from, address indexed to, address indexed token, uint256 amount, uint256 timestamp);
    event ETHSent(address indexed from, address indexed to, uint256 amount, uint256 timestamp);

    // Limit events
    event PerTxCapSet(address indexed user, uint256 cap);
    event PeriodLimitSet(address indexed user, uint256 limit);
    event TxCountLimitSet(address indexed user, uint256 limit);
    event TimeWindowSet(address indexed user, uint8 hourStart, uint8 hourEnd);
    event WhitelistToggled(address indexed user, bool enabled);
    event RecipientWhitelisted(address indexed user, address indexed recipient, bool allowed);
    event RecipientBlacklisted(address indexed user, address indexed recipient, bool blocked);
    event LimitsReset(address indexed user);

    // Oracle events
    event RiskFactorUpdated(address indexed user, uint8 factor);
    event WalletFrozen(address indexed user);
    event WalletUnfrozen(address indexed user);
    event EmergencyExitExecuted(address indexed user, uint256 ethReturned);

    // ─────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == anomalyOracle || msg.sender == owner, "Not authorized");
        _;
    }

    modifier notFrozen() {
        require(!isFrozen[msg.sender], "Wallet frozen: anomaly detected");
        _;
    }

    // ─────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
        anomalyOracle = msg.sender;
    }

    receive() external payable {}

    // ─────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────
    function setAnomalyOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Zero address");
        anomalyOracle = _oracle;
    }

    // ─────────────────────────────────────────────────────────
    // ── USER-CONFIGURABLE LIMITS ─────────────────────────────
    // ─────────────────────────────────────────────────────────

    /// @notice Set max ETH per single transaction (in wei). 0 = no limit.
    function setPerTxCap(uint256 _cap) external {
        userLimits[msg.sender].perTxCap = _cap;
        emit PerTxCapSet(msg.sender, _cap);
    }

    /// @notice Set max total ETH outflow per 10-min window (in wei). 0 = no limit.
    function setPeriodLimit(uint256 _limit) external {
        userLimits[msg.sender].periodLimit = _limit;
        emit PeriodLimitSet(msg.sender, _limit);
    }

    /// @notice Set max number of outgoing transactions per 10-min window. 0 = no limit.
    function setTxCountLimit(uint256 _limit) external {
        userLimits[msg.sender].txCountLimit = _limit;
        emit TxCountLimitSet(msg.sender, _limit);
    }

    /// @notice Restrict transactions to a UTC hour range. Both 0 = any time allowed.
    function setTimeWindow(uint8 _hourStart, uint8 _hourEnd) external {
        require(_hourStart <= 23 && _hourEnd <= 23, "Invalid hours");
        userLimits[msg.sender].allowedHourStart = _hourStart;
        userLimits[msg.sender].allowedHourEnd   = _hourEnd;
        emit TimeWindowSet(msg.sender, _hourStart, _hourEnd);
    }

    /// @notice Enable or disable whitelist enforcement for your wallet.
    function setWhitelistEnabled(bool _enabled) external {
        userLimits[msg.sender].whitelistEnabled = _enabled;
        emit WhitelistToggled(msg.sender, _enabled);
    }

    /// @notice Add or remove an address from your whitelist.
    function setWhitelist(address _recipient, bool _allowed) external {
        whitelist[msg.sender][_recipient] = _allowed;
        emit RecipientWhitelisted(msg.sender, _recipient, _allowed);
    }

    /// @notice Add or remove an address from your blacklist.
    function setBlacklist(address _recipient, bool _blocked) external {
        blacklist[msg.sender][_recipient] = _blocked;
        emit RecipientBlacklisted(msg.sender, _recipient, _blocked);
    }

    /// @notice Reset ALL limits to defaults (no restrictions).
    function resetAllLimits() external {
        delete userLimits[msg.sender];
        windowStart[msg.sender]    = 0;
        windowSpent[msg.sender]    = 0;
        windowTxCount[msg.sender]  = 0;
        emit LimitsReset(msg.sender);
    }

    /// @notice Get all current limits for a user in one call (useful for frontend).
    function getLimits(address user) external view returns (UserLimits memory) {
        return userLimits[user];
    }

    /// @notice Get the current rolling window stats for a user.
    function getWindowStats(address user) external view returns (
        uint256 spent,
        uint256 txCount,
        uint256 windowEndsAt
    ) {
        uint256 ws = windowStart[user];
        if (ws == 0 || block.timestamp >= ws + WINDOW_DURATION) {
            return (0, 0, block.timestamp + WINDOW_DURATION);
        }
        return (windowSpent[user], windowTxCount[user], ws + WINDOW_DURATION);
    }

    // ─────────────────────────────────────────────────────────
    // Internal limit enforcement
    // ─────────────────────────────────────────────────────────

    function _enforceOutboundLimits(address sender, address recipient, uint256 amount) internal {
        UserLimits memory limits = userLimits[sender];

        // 1. Per-tx cap
        if (limits.perTxCap > 0) {
            require(amount <= limits.perTxCap, "Exceeds per-transaction cap");
        }

        // 2. Blacklist check
        require(!blacklist[sender][recipient], "Recipient is blacklisted");

        // 3. Whitelist check
        if (limits.whitelistEnabled) {
            require(whitelist[sender][recipient], "Recipient not whitelisted");
        }

        // 4. Time-of-day check
        if (limits.allowedHourStart != 0 || limits.allowedHourEnd != 0) {
            uint256 currentHour = (block.timestamp % 86400) / 3600;
            if (limits.allowedHourStart <= limits.allowedHourEnd) {
                require(
                    currentHour >= limits.allowedHourStart && currentHour <= limits.allowedHourEnd,
                    "Outside allowed hours"
                );
            } else {
                // Overnight window e.g. 22:00 – 06:00
                require(
                    currentHour >= limits.allowedHourStart || currentHour <= limits.allowedHourEnd,
                    "Outside allowed hours"
                );
            }
        }

        // 5. Rolling window — refresh if expired
        if (windowStart[sender] == 0 || block.timestamp >= windowStart[sender] + WINDOW_DURATION) {
            windowStart[sender]   = block.timestamp;
            windowSpent[sender]   = 0;
            windowTxCount[sender] = 0;
        }

        // 6. Period (volume) limit
        if (limits.periodLimit > 0) {
            require(
                windowSpent[sender] + amount <= limits.periodLimit,
                "Exceeds 10-min period limit"
            );
        }

        // 7. Transaction count limit
        if (limits.txCountLimit > 0) {
            require(
                windowTxCount[sender] < limits.txCountLimit,
                "Exceeds 10-min transaction count limit"
            );
        }

        // Update window counters
        windowSpent[sender]   += amount;
        windowTxCount[sender] += 1;
    }

    // ─────────────────────────────────────────────────────────
    // Token Management
    // ─────────────────────────────────────────────────────────

    function addToken(address token, uint256 amount) external notFrozen {
        require(token != address(0), "Zero address");
        require(amount > 0, "Amount must be > 0");

        bool exists = false;
        for (uint i = 0; i < userTokens[msg.sender].length; i++) {
            if (userTokens[msg.sender][i] == token) { exists = true; break; }
        }
        if (!exists) userTokens[msg.sender].push(token);

        tokenBalances[msg.sender][token] += amount;
        emit TokenAdded(msg.sender, token, amount);
    }

    function removeToken(address token, uint256 amount) external notFrozen {
        require(tokenBalances[msg.sender][token] >= amount, "Insufficient balance");
        tokenBalances[msg.sender][token] -= amount;
        emit TokenRemoved(msg.sender, token, amount);
    }

    function getTokenBalance(address token) external view returns (uint256) {
        return tokenBalances[msg.sender][token];
    }

    function getUserTokens() external view returns (address[] memory) {
        return userTokens[msg.sender];
    }

    function transferToken(address token, address to, uint256 amount) external notFrozen {
        require(tokenBalances[msg.sender][token] >= amount, "Insufficient balance");
        require(to != address(0), "Cannot transfer to zero address");

        _enforceOutboundLimits(msg.sender, to, amount);

        tokenBalances[msg.sender][token] -= amount;

        bool tokenExists = false;
        for (uint i = 0; i < userTokens[to].length; i++) {
            if (userTokens[to][i] == token) { tokenExists = true; break; }
        }
        if (!tokenExists) userTokens[to].push(token);

        tokenBalances[to][token] += amount;
        emit TokenTransferred(msg.sender, to, token, amount, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────
    // Native ETH Transfer
    // ─────────────────────────────────────────────────────────

    function sendETH(address payable to) external payable nonReentrant notFrozen {
        require(to != address(0), "Zero address");
        require(msg.value > 0, "Must send ETH");

        _enforceOutboundLimits(msg.sender, to, msg.value);

        (bool success, ) = to.call{value: msg.value}("");
        require(success, "ETH transfer failed");

        emit ETHSent(msg.sender, to, msg.value, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────
    // Risk Factor & Freeze (oracle only)
    // ─────────────────────────────────────────────────────────

    function setRiskFactor(address user, uint8 factor) external onlyOracle {
        require(factor >= 1 && factor <= 10, "Risk factor 1-10");
        riskFactor[user] = factor;
        emit RiskFactorUpdated(user, factor);
    }

    function freezeWallet(address user) external onlyOracle {
        isFrozen[user] = true;
        emit WalletFrozen(user);
    }

    function unfreezeWallet(address user) external onlyOracle {
        isFrozen[user] = false;
        emit WalletUnfrozen(user);
    }

    // ─────────────────────────────────────────────────────────
    // Emergency Kill Switch (B2C core feature)
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Instantly clears all token positions and returns ETH to caller.
     *         Bypasses all limits — callable even when frozen.
     */
    function emergencyExit() external nonReentrant {
        address[] memory tokens = userTokens[msg.sender];
        for (uint i = 0; i < tokens.length; i++) {
            tokenBalances[msg.sender][tokens[i]] = 0;
        }
        delete userTokens[msg.sender];

        // Unfreeze after exit
        isFrozen[msg.sender] = false;

        // Return any ETH held by contract
        uint256 ethBal = address(this).balance;
        uint256 returned = 0;
        if (ethBal > 0) {
            returned = ethBal;
            (bool ok, ) = msg.sender.call{value: ethBal}("");
            require(ok, "ETH return failed");
        }

        emit EmergencyExitExecuted(msg.sender, returned);
    }

    // ─────────────────────────────────────────────────────────
    // View Helpers
    // ─────────────────────────────────────────────────────────

    function getWalletStatus(address user) external view returns (
        bool frozen,
        uint8 risk,
        uint256 perTxCap,
        uint256 periodLimit,
        uint256 txCountLimit,
        bool whitelistEnabled
    ) {
        UserLimits memory l = userLimits[user];
        return (isFrozen[user], riskFactor[user], l.perTxCap, l.periodLimit, l.txCountLimit, l.whitelistEnabled);
    }

    function isRecipientAllowed(address sender, address recipient) external view returns (bool) {
        if (blacklist[sender][recipient]) return false;
        if (userLimits[sender].whitelistEnabled && !whitelist[sender][recipient]) return false;
        return true;
    }
}
