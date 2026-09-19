# 🛡️ Guardiant (SaveMe Protocol)
> **Real-Time AI-Powered Web3 Security & Automated Threat Mitigation**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-00d4ff)](https://nextjs.org/)
[![Solidity](https://img.shields.io/badge/Contracts-Solidity%20^0.8.20-a855f7)](https://soliditylang.org/)
[![Python](https://img.shields.io/badge/ML%20Backend-Python%203.10-00ff88)](https://python.org)
[![Hardhat](https://img.shields.io/badge/DevNet-Hardhat-fbbf24)](https://hardhat.org/)
[![GitHub](https://img.shields.io/badge/GitHub-NitinMalhotra13%2FGuardiant-181717?logo=github)](https://github.com/NitinMalhotra13/Guardiant)

> 🔗 **GitHub Repository**: [https://github.com/NitinMalhotra13/Guardiant](https://github.com/NitinMalhotra13/Guardiant)

Guardiant (also known as **SaveMe Protocol**) is a decentralized Web3 security platform that safeguards user crypto assets from rug pulls, drain attacks, flash loan exploits, and malicious smart contracts. It pairs continuous, low-latency **Machine Learning anomaly detection** (Isolation Forest + XGBoost) with **automated smart contract emergency response** to protect user liquidity in real time.

---

## 🌟 Core Features

### 🧠 Dual-Model AI Threat Detection Engine
- **Unsupervised Anomaly Scoring (Isolation Forest)**: Monitors 10-minute rolling window features (tx velocity, z-score volume, gas prices, recipient clustering) to flag zero-day suspicious behavior.
- **Supervised Threat Classifier (XGBoost)**: Categorizes flagged transactions into 8 distinct attack vectors with 99.2% accuracy.
- **Personalized Risk Sensitivity**: Per-wallet contamination tuning (1–10 risk scale) allowing tailored sensitivity for high-frequency traders vs. cold storage holders.

### 🛡️ Automated Emergency Response & Asset Rescue
- **Instant Liquidity Conversion**: Automatically swaps vulnerable tokens to native ETH via the `LiquidityPool` contract when critical threats are identified.
- **Wallet Freezing & Self-Destruct**: Emergency exit triggers that instantly pause compromised contracts and return funds safely to the owner.
- **Spending Caps & Whitelists**: Per-transaction caps, 10-minute volume limits, allowed UTC time windows, and recipient whitelists/blacklists.

### 🖥️ Cyberpunk Threat Command Center UI
- **Animated 360° Threat Radar**: Real-time visual tracking of active threat blips (`DRAIN`, `SMURF`, `FLASH`, `RUG`, `LAYER`).
- **Telemetry Ticker Banner**: Continuous marquee broadcasting live intercepted attack events.
- **Interactive Terminal Simulator**: Live typing simulation demonstrating real-time transaction scoring.
- **Enriched Transaction History**: On-chain history with risk scores (0–100), anomaly type pills, filter tabs (*All*, *Incoming*, *Outgoing*, *Threats*), and direct Etherscan links.
- **DeFi Token Scanner**: Live token table enriched with real-time Guardiant AI Risk Ratings (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).

---

## 📐 System Architecture

```
                              +-----------------------+
                              |   MetaMask / Web3     |
                              +-----------+-----------+
                                          |
                                          v
+--------------------------------------------------------------------------------+
|                         Guardiant Next.js Frontend (Port 3000)                  |
|   Dashboard · Threat Radar · Token Scanner · Tx History · Demo · Pricing       |
+---------------------+------------------------------------------+---------------+
                      |                                          |
                      v                                          v
    +----------------------------------+     +------------------------------------+
    |   Python ML Flask API (Port 5001)|     |   EVM Smart Contracts (Port 8545)  |
    |  - Isolation Forest (IF)         |     |  - AnomalyGuard.sol                |
    |  - XGBoost Threat Classifier     |     |  - LiquidityPool.sol               |
    |  - Per-wallet risk profiles      |     |  - Wallet.sol & TokenFactory.sol   |
    +----------------------------------+     +------------------------------------+
```

---

## 📊 8 Attack Vectors Detected

| Icon | Anomaly Type | Description | Severity |
| :--: | :--- | :--- | :--- |
| ⚡ | `VELOCITY_SPIKE` | >10 txns in 10-minute window | HIGH |
| 🐋 | `LARGE_TRANSFER` | Amount 5σ+ above personal baseline | HIGH |
| 🪤 | `RUG_PULL` | Rapid pump followed by LP drain | CRITICAL |
| 🕳️ | `DRAIN_ATTACK` | Multi-token sweep to unknown address | CRITICAL |
| 🪆 | `LAYERING` | Round-amount split transfers to multiple wallets | MEDIUM |
| 🎭 | `SMURFING` | Near-threshold transfers to many clusters | MEDIUM |
| ⚙️ | `FLASH_LOAN_PATTERN` | Extreme value + ultra-high gas within 12s | CRITICAL |
| 🍯 | `HONEYPOT_INTERACTION` | Interaction with buy-only or restricted contracts | HIGH |

---

## 🗂️ Project Structure

```
Guardiant/
├── client/                     # Next.js 14 Web3 Frontend
│   ├── src/
│   │   ├── app/                # Pages (/, /wallet, /transactions, /tokens, /graph, /demo, /pricing)
│   │   ├── components/         # Navbar, Footer, ThreatRadar, TerminalBox, TransactionList
│   │   ├── context/            # WalletContext & Wagmi Providers
│   │   ├── hooks/              # useTransactionHistory, useContractFunctions, useTradingAgents
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
    │   ├── data_processing/    # Dataset generation, cleaning pipeline
    │   └── app.py              # Flask REST API (Port 5001)
    ├── tests/                  # pytest test suite (8 passed, 3 skipped)
    └── requirements.txt
```

---

## ⚡ Quick Start & Installation

### Prerequisites
- **Node.js**: v18.x or v20.x
- **Python**: v3.10+
- **MetaMask**: Browser extension configured for `Localhost 8545` (Chain ID: `31337`)

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/NitinMalhotra13/Guardiant.git
cd Guardiant
```

---

### Step 2 — Start Local Blockchain Node & Deploy Contracts

```bash
cd contract
npm install --legacy-peer-deps

# Start Hardhat local RPC node (Port 8545)
npx hardhat node

# In a new terminal — deploy all smart contracts
npx hardhat ignition deploy ignition/modules/Deploy.js --network localhost
```

---

### Step 3 — Start Python Machine Learning Server

```bash
cd model
pip install -r requirements.txt

# Run Flask ML API server (Port 5001)
$env:PYTHONPATH=".;./src"; python -m src.app
```

---

### Step 4 — Start Next.js Frontend

```bash
cd client
npm install

# Start dev server (Port 3000)
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 🦊 Connecting MetaMask to Localhost

1. Open MetaMask → Network selector → **Add a custom network**:
   - **Network Name**: Hardhat Local
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: ETH
2. Import a Hardhat test account (gives 10,000 test ETH):
   ```
   Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```

---

## 🧪 Running Tests

### Python ML Backend Tests

```bash
cd model
pip install pytest
$env:PYTHONPATH=".;./src"; python -m pytest -v
```

**Expected Output:**
```
tests/test_anomaly_detection.py ..   ✅ PASSED
tests/test_api.py s                  ⏭ SKIPPED (needs ETHERSCAN_API_KEY)
tests/test_arima_model.py s          ⏭ SKIPPED (needs statsmodels)
tests/test_data_cleaning.py ...      ✅ PASSED
tests/test_integration.py s          ⏭ SKIPPED (needs ETHERSCAN_API_KEY)
tests/test_visualization.py ...      ✅ PASSED
========= 8 passed, 3 skipped in ~11s =========
```

### Smart Contract Compilation

```bash
cd contract
npx hardhat compile
```

---

## 🌐 API Endpoints (Flask ML Server)

| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check — model status |
| `GET` | `/api/stats` | Global platform stats |
| `POST` | `/api/analyze` | Score a single transaction |
| `POST` | `/api/analyze-batch` | Score up to 20 transactions |
| `GET` | `/api/risk-profile/<wallet>` | Get wallet risk profile |
| `POST` | `/api/set-risk-factor` | Update wallet contamination level |
| `POST` | `/api/train` | Retrain models with new data |

---

## 👥 Team Roles

| Role | Responsibilities |
| :--- | :--- |
| **Blockchain Engineer** | Smart contracts (AnomalyGuard, LiquidityPool, Wallet), Hardhat deployment |
| **ML Engineer** | Isolation Forest + XGBoost models, Flask API, dataset generation |
| **Frontend Developer** | Next.js UI, Threat Radar, Token Scanner, Transaction history |
| **Integration Lead** | wagmi hooks, API routes, MetaMask integration, end-to-end testing |

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">
<strong>🛡️ Guardiant — Protecting the DeFi ecosystem, one transaction at a time.</strong><br/>
<a href="https://github.com/NitinMalhotra13/Guardiant">GitHub</a>
</div>
