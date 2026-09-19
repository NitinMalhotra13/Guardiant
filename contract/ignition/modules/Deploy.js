const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("GuardiantDeploy", (m) => {
  // 1. Deploy CustomToken (GUARD token used in LP)
  const token = m.contract("CustomToken", [
    "Guardiant Token", "GUARD", 1000000, m.getAccount(0)
  ]);

  // 2. Deploy LiquidityPool with token
  const liquidityPool = m.contract("LiquidityPool", [token]);

  // 3. Deploy Wallet (core protected wallet)
  const wallet = m.contract("Wallet", []);

  // 4. Deploy AnomalyGuard (pass wallet address)
  const anomalyGuard = m.contract("AnomalyGuard", [wallet]);

  // 5. Deploy SubscriptionManager
  const subscriptionManager = m.contract("SubscriptionManager", []);

  return { token, liquidityPool, wallet, anomalyGuard, subscriptionManager };
});
