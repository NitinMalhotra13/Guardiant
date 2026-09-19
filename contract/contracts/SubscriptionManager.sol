// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SubscriptionManager
 * @notice B2B SaaS monthly subscription for multi-wallet monitoring.
 *         Pricing is per candidate per month, always in even wallet pairs.
 *
 * Tiers (per candidate / month):
 *   Starter    — $50  → 2 wallets (1 pair)
 *   Growth     — $98  → 4 wallets (2 pairs)
 *   Business   — $145 → 6 wallets (3 pairs)
 *   Enterprise — $189 → 8 wallets (4 pairs)
 *
 * ETH price peg: hardcoded for demo at 1 ETH = $3000.
 * In production: use a Chainlink ETH/USD price feed.
 */
contract SubscriptionManager is ReentrancyGuard {

    // ─────────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────────
    uint256 public constant MONTH_DURATION   = 30 days;
    uint256 public constant ETH_USD_RATE     = 3000; // demo peg: 1 ETH = $3000

    // USD prices per tier (in cents to avoid floats)
    uint256 public constant TIER1_USD_CENTS  = 5000;  // $50.00
    uint256 public constant TIER2_USD_CENTS  = 9800;  // $98.00
    uint256 public constant TIER3_USD_CENTS  = 14500; // $145.00
    uint256 public constant TIER4_USD_CENTS  = 18900; // $189.00

    // Wallets per tier (always even)
    uint8 public constant TIER1_WALLETS = 2;
    uint8 public constant TIER2_WALLETS = 4;
    uint8 public constant TIER3_WALLETS = 6;
    uint8 public constant TIER4_WALLETS = 8;

    // ─────────────────────────────────────────────────────────
    // Structs
    // ─────────────────────────────────────────────────────────
    struct Subscription {
        uint8     tier;             // 1–4
        uint256   expiresAt;        // Unix timestamp
        uint256   startedAt;        // When subscription began
        address[] monitoredWallets; // Assigned wallet pairs
        bool      active;
        uint256   totalPaid;        // Total ETH paid (in wei)
    }

    // ─────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────
    address public owner;
    mapping(address => Subscription) public subscriptions;
    address[] public subscribers;

    uint256 public totalRevenue;

    // ─────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────
    event SubscriptionCreated(
        address indexed subscriber,
        uint8   tier,
        uint8   wallets,
        uint256 pricePaidWei,
        uint256 expiresAt
    );
    event SubscriptionRenewed(
        address indexed subscriber,
        uint8   tier,
        uint256 pricePaidWei,
        uint256 newExpiresAt
    );
    event SubscriptionUpgraded(
        address indexed subscriber,
        uint8   oldTier,
        uint8   newTier,
        uint256 additionalPaid,
        uint256 newExpiresAt
    );
    event SubscriptionExpired(address indexed subscriber, uint8 tier);
    event WalletAdded(address indexed subscriber, address wallet);
    event Withdrawn(address indexed owner, uint256 amount);

    // ─────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier hasActiveSubscription() {
        require(subscriptions[msg.sender].active, "No active subscription");
        require(block.timestamp < subscriptions[msg.sender].expiresAt, "Subscription expired");
        _;
    }

    // ─────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
    }

    // ─────────────────────────────────────────────────────────
    // Price Helpers
    // ─────────────────────────────────────────────────────────

    /// @notice Returns price in wei for a given tier
    function getTierPrice(uint8 tier) public pure returns (uint256 priceWei) {
        uint256 usdCents;
        if (tier == 1) usdCents = TIER1_USD_CENTS;
        else if (tier == 2) usdCents = TIER2_USD_CENTS;
        else if (tier == 3) usdCents = TIER3_USD_CENTS;
        else if (tier == 4) usdCents = TIER4_USD_CENTS;
        else revert("Invalid tier");

        // priceWei = (usdCents / 100) / ETH_USD_RATE * 1e18
        priceWei = (usdCents * 1e18) / (100 * ETH_USD_RATE);
    }

    function getTierWallets(uint8 tier) public pure returns (uint8) {
        if (tier == 1) return TIER1_WALLETS;
        if (tier == 2) return TIER2_WALLETS;
        if (tier == 3) return TIER3_WALLETS;
        if (tier == 4) return TIER4_WALLETS;
        revert("Invalid tier");
    }

    /// @notice Returns all tier info for frontend display
    function getAllTiers() external pure returns (
        uint8[4] memory wallets,
        uint256[4] memory pricesWei,
        uint256[4] memory pricesUsdCents
    ) {
        wallets       = [TIER1_WALLETS, TIER2_WALLETS, TIER3_WALLETS, TIER4_WALLETS];
        pricesWei     = [getTierPrice(1), getTierPrice(2), getTierPrice(3), getTierPrice(4)];
        pricesUsdCents = [TIER1_USD_CENTS, TIER2_USD_CENTS, TIER3_USD_CENTS, TIER4_USD_CENTS];
    }

    // ─────────────────────────────────────────────────────────
    // Subscribe
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Subscribe to a tier. Send exact ETH (use getTierPrice).
     * @param tier 1 (Starter) to 4 (Enterprise)
     * @param walletsToMonitor Caller-provided wallet addresses to monitor.
     *        Must be exactly getTierWallets(tier) addresses (always even).
     */
    function subscribe(uint8 tier, address[] calldata walletsToMonitor) external payable nonReentrant {
        require(tier >= 1 && tier <= 4, "Invalid tier");
        require(!subscriptions[msg.sender].active || block.timestamp >= subscriptions[msg.sender].expiresAt,
            "Already subscribed. Use renew or upgrade.");

        uint8   numWallets = getTierWallets(tier);
        uint256 price      = getTierPrice(tier);

        require(walletsToMonitor.length == numWallets, "Wrong number of wallets for tier");
        require(numWallets % 2 == 0, "Must be even number of wallets"); // Always true by design
        require(msg.value >= price, "Insufficient payment");

        // Refund overpayment
        if (msg.value > price) {
            (bool ok, ) = msg.sender.call{value: msg.value - price}("");
            require(ok, "Refund failed");
        }

        Subscription storage sub = subscriptions[msg.sender];
        sub.tier    = tier;
        sub.expiresAt   = block.timestamp + MONTH_DURATION;
        sub.startedAt   = block.timestamp;
        sub.active      = true;
        sub.totalPaid   += price;

        delete sub.monitoredWallets;
        for (uint i = 0; i < walletsToMonitor.length; i++) {
            require(walletsToMonitor[i] != address(0), "Zero address in wallet list");
            sub.monitoredWallets.push(walletsToMonitor[i]);
            emit WalletAdded(msg.sender, walletsToMonitor[i]);
        }

        if (sub.startedAt == block.timestamp && sub.totalPaid == price) {
            subscribers.push(msg.sender);
        }

        totalRevenue += price;

        emit SubscriptionCreated(msg.sender, tier, numWallets, price, sub.expiresAt);
    }

    // ─────────────────────────────────────────────────────────
    // Renew
    // ─────────────────────────────────────────────────────────

    /// @notice Renew the same tier for another 30 days.
    function renewSubscription() external payable nonReentrant {
        Subscription storage sub = subscriptions[msg.sender];
        require(sub.startedAt > 0, "No existing subscription");

        uint8   tier  = sub.tier;
        uint256 price = getTierPrice(tier);
        require(msg.value >= price, "Insufficient payment");

        if (msg.value > price) {
            (bool ok, ) = msg.sender.call{value: msg.value - price}("");
            require(ok, "Refund failed");
        }

        // If already expired, restart from now; else extend
        uint256 base = block.timestamp > sub.expiresAt ? block.timestamp : sub.expiresAt;
        sub.expiresAt = base + MONTH_DURATION;
        sub.active    = true;
        sub.totalPaid += price;
        totalRevenue  += price;

        emit SubscriptionRenewed(msg.sender, tier, price, sub.expiresAt);
    }

    // ─────────────────────────────────────────────────────────
    // Upgrade
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Upgrade to a higher tier. Pay the difference (pro-rated for remaining days).
     * @param newTier Must be higher than current tier.
     * @param walletsToMonitor Full set of wallets for new tier (replaces existing list).
     */
    function upgradeSubscription(uint8 newTier, address[] calldata walletsToMonitor) external payable nonReentrant {
        Subscription storage sub = subscriptions[msg.sender];
        require(sub.active && block.timestamp < sub.expiresAt, "No active subscription");
        require(newTier > sub.tier && newTier <= 4, "Must upgrade to higher tier");

        uint8 numWallets = getTierWallets(newTier);
        require(walletsToMonitor.length == numWallets, "Wrong number of wallets");

        // Pro-rate: fraction of month remaining
        uint256 remainingSeconds = sub.expiresAt - block.timestamp;
        uint256 oldPrice = getTierPrice(sub.tier);
        uint256 newPrice = getTierPrice(newTier);

        // Credit for unused old subscription, charge difference
        uint256 oldCredit  = (oldPrice * remainingSeconds) / MONTH_DURATION;
        uint256 newCharge  = (newPrice * remainingSeconds) / MONTH_DURATION;
        uint256 additional = newCharge > oldCredit ? newCharge - oldCredit : 0;

        require(msg.value >= additional, "Insufficient upgrade payment");

        if (msg.value > additional) {
            (bool ok, ) = msg.sender.call{value: msg.value - additional}("");
            require(ok, "Refund failed");
        }

        uint8 oldTier = sub.tier;
        sub.tier     = newTier;
        sub.totalPaid += additional;
        totalRevenue  += additional;

        delete sub.monitoredWallets;
        for (uint i = 0; i < walletsToMonitor.length; i++) {
            require(walletsToMonitor[i] != address(0), "Zero address");
            sub.monitoredWallets.push(walletsToMonitor[i]);
            emit WalletAdded(msg.sender, walletsToMonitor[i]);
        }

        emit SubscriptionUpgraded(msg.sender, oldTier, newTier, additional, sub.expiresAt);
    }

    // ─────────────────────────────────────────────────────────
    // View
    // ─────────────────────────────────────────────────────────

    function getMySubscription() external view returns (
        uint8   tier,
        bool    active,
        uint256 expiresAt,
        uint256 daysRemaining,
        address[] memory monitoredWallets,
        uint256 totalPaid
    ) {
        Subscription storage sub = subscriptions[msg.sender];
        bool isActive = sub.active && block.timestamp < sub.expiresAt;
        uint256 days_ = isActive ? (sub.expiresAt - block.timestamp) / 1 days : 0;
        return (sub.tier, isActive, sub.expiresAt, days_, sub.monitoredWallets, sub.totalPaid);
    }

    function isSubscribed(address user) external view returns (bool) {
        return subscriptions[user].active && block.timestamp < subscriptions[user].expiresAt;
    }

    function getTotalSubscribers() external view returns (uint256) {
        return subscribers.length;
    }

    // ─────────────────────────────────────────────────────────
    // Owner: Withdraw revenue
    // ─────────────────────────────────────────────────────────

    function withdraw() external onlyOwner nonReentrant {
        uint256 bal = address(this).balance;
        require(bal > 0, "Nothing to withdraw");
        (bool ok, ) = owner.call{value: bal}("");
        require(ok, "Withdraw failed");
        emit Withdrawn(owner, bal);
    }
}
