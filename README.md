# 🛡️ Guardiant (SaveMe Protocol)
> **Real-Time AI-Powered Web3 Security & Automated Threat Mitigation**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-00d4ff)](https://nextjs.org/)
[![Solidity](https://img.shields.io/badge/Contracts-Solidity%20^0.8.20-a855f7)](https://soliditylang.org/)
[![Python](https://img.shields.io/badge/ML%20Backend-Python%203.10-00ff88)](https://python.org)
[![Hardhat](https://img.shields.io/badge/DevNet-Hardhat-fbbf24)](https://hardhat.org/)

Guardiant (also known as **SaveMe Protocol**) is a decentralized Web3 security platform that safeguards user crypto assets from rug pulls, drain attacks, flash loan exploits, and malicious smart contracts. It pairs continuous, low-latency **Machine Learning anomaly detection** (Isolation Forest + XGBoost) with **automated smart contract emergency response** to protect user liquidity in real time.

---

## 🌟 Core Value Proposition & Features

### 🧠 Dual-Model AI Threat Detection Engine
- **Unsupervised Anomaly Scoring (Isolation Forest)**: Monitors 10-minute rolling window features (tx velocity, z-score volume, gas prices, recipient clustering) to flag zero-day suspicious behavior.
- **Supervised Threat Classifier (XGBoost)**: Categorizes flagged transactions into 8 distinct attack vectors with high precision.
- **Personalized Risk Sensitivity**: Per-wallet contamination tuning (`1-10` risk scale) allowing tailored sensitivity for high-frequency traders vs. cold storage holders.

### 🛡️ Automated Emergency Response & Asset Rescue
- **Instant Liquidity Conversion**: Automatically swaps vulnerable tokens to native ETH via the `LiquidityPool` contract when critical threats are identified.
- **Wallet Freezing & Self-Destruct**: Emergency exit triggers that instantly pause compromised contracts and return funds safely to the owner.
- **Spending Caps & Whitelists**: Per-transaction caps, 10-minute volume limits, allowed UTC time windows, and recipient whitelists/blacklists.

### 🖥️ Cyberpunk Threat Command Center UI
- **Animated 360° Threat Radar**: Real-time visual tracking of threat blips (`DRAIN`, `SMURF`, `FLASH`, `RUG`, `LAYER`).
- **Telemetry Ticker Banner**: Continuous marquee broadcasting live intercepted attack events.
- **Interactive Terminal Simulator**: Live typing simulation demonstrating real-time transaction scoring.
- **Enriched Transaction History**: On-chain history equipped with risk scores (0–100), anomaly type pills, filter tabs (*All*, *Incoming*, *Outgoing*, *Threats*), and direct Etherscan links.
- **DeFi Token Scanner**: Live token table enriched with real-time Guardiant AI Risk Ratings (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).

---

## 📐 System Architecture

```
                                  +-----------------------+
                                  |   MetaMask / Web3     |
                                  +-----------+-----------+
                                              |
                                              v
+-----------------------------------------------------------------------------------+
|                            Guardiant Next.js Frontend                             |
|    (Dashboard, Live Threat Radar, Token Scanner, Tx History, Spending Limits)     |
+---------------------+---------------------------------------+---------------------+
                      |                                       |
                      v                                       v
    +----------------------------------+    +------------------------------------+
    |      Python ML API (Flask)       |    |      EVM Smart Contracts (Local)   |
    |  - Isolation Forest (Score 0-100)|    |  - AnomalyGuard.sol                |
    |  - XGBoost (8 Threat Classes)    |    |  - LiquidityPool.sol               |
    |  - Risk Profile Engine           |    |  - Wallet.sol & TokenFactory.sol   |
    +----------------------------------+    +------------------------------------+
```

---

## 📊 8 Attack Vectors Detected

| Vector | Anomaly Type | Description | Action Taken |
| :--- | :--- | :--- | :--- |
| ⚡ | `VELOCITY_SPIKE` | >10 txns in 10-minute window (5× baseline) | Pause Wallet |
| 🐋 | `LARGE_TRANSFER` | Amount is 5σ+ above personal baseline | Freeze & Alert |
| 🪤 | `RUG_PULL` | Rapid token pump followed by LP drain | Auto-Swap to ETH |
| 🕳️ | `DRAIN_ATTACK` | Multi-token sweep to unknown address | Emergency Exit |
| 🪆 | `LAYERING` | Round-amount split transfers to multiple wallets | Pause Wallet |
| 🎭 | `SMURFING` | Near-threshold transfers to many recipient clusters | Pause Wallet |
| ⚙️ | `FLASH_LOAN_PATTERN` | Extreme value + ultra-high gas within 12s | Auto-Swap to ETH |
| 🍯 | `HONEYPOT_INTERACTION` | Interaction with buy-only or restricted contracts | Block Tx |

---

## 🗂️ Project Structure

```
Guardiant-main/
├── client/                     # Next.js 14 Web3 Frontend (App Router, TailwindCSS)
│   ├── src/
│   │   ├── app/                # Pages (/, /wallet, /transactions, /tokens, /graph, /demo, /pricing)
│   │   ├── components/         # UI Components (Navbar, Footer, Radar, Terminal, TransactionList)
│   │   ├── context/            # WalletContext & Wagmi Providers
│   │   ├── hooks/              # Custom React hooks (useTransactionHistory, useContractFunctions)
│   │   └── styles/             # Cyberpunk theme system (globals.css)
│   └── package.json
│
├── contract/                   # Hardhat Solidity Smart Contracts
│   ├── contracts/              # AnomalyGuard.sol, LiquidityPool.sol, Wallet.sol, CustomToken.sol
│   ├── ignition/modules/       # Hardhat Ignition deployment modules
│   └── hardhat.config.js
│
└── model/                      # Python Machine Learning Backend
    ├── src/
    │   ├── anomaly_detection/  # Isolation Forest & XGBoost risk classifiers
    │   ├── data_processing/    # Training dataset generation & cleaning pipeline
    │   └── app.py              # Flask REST API (Port 5001)
    └── requirements.txt
```

---

## ⚡ Quick Start & Installation

### 1. Prerequisites
- **Node.js**: `v18.x` or `v20.x`
- **Python**: `v3.10` or higher
- **MetaMask**: Browser Extension configured for `Localhost 8545` (Chain ID: `31337`)

---

### 2. Start Local Blockchain Node & Deploy Contracts

```bash
cd contract

# Install dependencies
npm install --legacy-peer-deps

# Start Hardhat local RPC node (Port 8545)
npx hardhat node

# In a new terminal, deploy smart contracts to local node
npx hardhat ignition deploy ignition/modules/Deploy.js --network localhost
```

---

### 3. Start Python Machine Learning Server

```bash
cd model

# Install Python requirements
pip install -r requirements.txt

# Run Flask ML API server (Port 5001)
$env:PYTHONPATH=".;./src"; $env:PYTHONIOENCODING="utf-8"; python -m src.app
```

---

### 4. Start Next.js Frontend Client

```bash
cd client

# Install dependencies
npm install

# Start Next.js dev server (Port 3000)
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 🦊 Connecting MetaMask to Localhost

1. In MetaMask, open the **Network selector** -> enable **Show test networks**.
2. Select **Localhost 8545** (or add custom RPC: `http://127.0.0.1:8545`, Chain ID: `31337`).
3. Import a Hardhat test private key to get 10,000 test ETH:
   ```
   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```

---

## 📜 License & Acknowledgements

Distributed under the **MIT License**. Created as an open-source Web3 security protocol to make DeFi safer for everyone.
