"""
app.py  —  Guardiant ML API (Flask)

Endpoints:
  POST /api/analyze           — score one transaction
  POST /api/analyze-batch     — score up to 20 transactions
  GET  /api/risk-profile/<w>  — get wallet risk profile
  POST /api/set-risk-factor   — update wallet contamination
  POST /api/train             — retrain models with new data
  GET  /api/health            — health check
  GET  /api/stats             — global stats
  POST /api/watchlist-alert   — trigger watchlist notification
"""

import os, json, logging
from datetime import datetime
from functools import wraps

import numpy as np
import pandas as pd
from flask import Flask, request, jsonify, abort
from flask_cors import CORS

# ── Internal imports ─────────────────────────────────────────────────────────
try:
    from .anomaly_detection.isolation_forest import GuardiantIsolationForest
    from .anomaly_detection.risk_classifier  import AnomalyTypeClassifier
    from .data_processing.generate_dataset   import generate_training_data, generate_test_cases
except ImportError:
    from anomaly_detection.isolation_forest import GuardiantIsolationForest
    from anomaly_detection.risk_classifier  import AnomalyTypeClassifier
    from data_processing.generate_dataset   import generate_training_data, generate_test_cases


# ── App setup ─────────────────────────────────────────────────────────────────
app = Flask(__name__)

# Security: only allow requests from localhost:3000
CORS(app, resources={r"/api/*": {"origins": [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]}})

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
DATA_DIR  = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(DATA_DIR,  exist_ok=True)

# ── State ──────────────────────────────────────────────────────────────────────
IF_MODEL:    GuardiantIsolationForest = None
XGB_MODEL:   AnomalyTypeClassifier   = None

# Per-wallet risk factors (1–10). Loaded from file on startup.
wallet_risk_factors: dict = {}   # { "0x...": 5 }
protection_stats = {"events": 0, "eth_saved": 0.0}


# ── Bootstrap ─────────────────────────────────────────────────────────────────
def bootstrap_models():
    """Train models on first launch if saved models not found."""
    global IF_MODEL, XGB_MODEL
    if_path  = os.path.join(MODEL_DIR, "isolation_forest.joblib")
    xgb_path = os.path.join(MODEL_DIR, "xgb_classifier.joblib")

    if os.path.exists(if_path) and os.path.exists(xgb_path):
        log.info("Loading saved models...")
        IF_MODEL  = GuardiantIsolationForest.load(MODEL_DIR)
        XGB_MODEL = AnomalyTypeClassifier.load(MODEL_DIR)
        log.info("Models loaded ✓")
    else:
        log.info("No saved models found — generating data and training...")
        _retrain()

def _retrain():
    global IF_MODEL, XGB_MODEL
    csv_path = os.path.join(DATA_DIR, "training_dataset.csv")
    if not os.path.exists(csv_path):
        df = generate_training_data()
        generate_test_cases()
    else:
        df = pd.read_csv(csv_path)

    IF_MODEL = GuardiantIsolationForest(contamination=0.08)
    IF_MODEL.train(df)
    IF_MODEL.save(MODEL_DIR)

    XGB_MODEL = AnomalyTypeClassifier()
    XGB_MODEL.train(df)
    XGB_MODEL.save(MODEL_DIR)
    log.info("Models trained and saved ✓")


# ── Rate limiting (simple in-memory, per IP) ─────────────────────────────────
from collections import defaultdict, deque
import time as _time

_rate_store = defaultdict(deque)
RATE_LIMIT   = 60   # requests
RATE_WINDOW  = 60   # seconds

def rate_limit(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        ip  = request.remote_addr or "127.0.0.1"
        now = _time.time()
        dq  = _rate_store[ip]
        while dq and dq[0] < now - RATE_WINDOW:
            dq.popleft()
        if len(dq) >= RATE_LIMIT:
            return jsonify({"error": "Rate limit exceeded"}), 429
        dq.append(now)
        return f(*args, **kwargs)
    return decorated


# ── Validation helpers ────────────────────────────────────────────────────────
def _require_fields(data: dict, *fields):
    missing = [f for f in fields if f not in data]
    if missing:
        abort(400, f"Missing fields: {missing}")

def _validate_address(addr: str):
    if not isinstance(addr, str) or not addr.startswith("0x") or len(addr) != 42:
        abort(400, f"Invalid Ethereum address: {addr}")

def _clean_tx(tx: dict) -> dict:
    """Sanitise and fill defaults for a transaction object."""
    return {
        "wallet":           str(tx.get("wallet", "0x" + "0" * 40)),
        "from_address":     str(tx.get("from_address", tx.get("from", "0x" + "0" * 40))),
        "to_address":       str(tx.get("to_address",   tx.get("to",   "0x" + "0" * 40))),
        "value_eth":        float(tx.get("value_eth", tx.get("value", 0))),
        "gas_used":         int(tx.get("gas_used", 21000)),
        "gas_price_gwei":   float(tx.get("gas_price_gwei", 20)),
        "hour_utc":         int(tx.get("hour_utc", datetime.utcnow().hour)),
        "day_of_week":      int(tx.get("day_of_week", datetime.utcnow().weekday())),
        "is_new_recipient": int(tx.get("is_new_recipient", 0)),
        "is_round_amount":  int(tx.get("is_round_amount", 0)),
        "tx_count_10min":   int(tx.get("tx_count_10min", 1)),
        "period_volume_eth":float(tx.get("period_volume_eth", tx.get("value_eth", 0))),
        "amount_zscore":    float(tx.get("amount_zscore", 0)),
        "recipient_cluster":int(tx.get("recipient_cluster", 1)),
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status":   "ok",
        "models":   IF_MODEL is not None and XGB_MODEL is not None,
        "wallets":  len(wallet_risk_factors),
        "timestamp": datetime.utcnow().isoformat(),
    })


@app.route("/api/stats", methods=["GET"])
def stats():
    return jsonify({
        "total_protected_events": protection_stats["events"],
        "total_eth_saved":        protection_stats["eth_saved"],
        "active_wallets":         len(IF_MODEL.wallet_stats) if IF_MODEL else 0,
        "model_type":             "IsolationForest + XGBoost",
    })


@app.route("/api/analyze", methods=["POST"])
@rate_limit
def analyze():
    """Score a single transaction."""
    data = request.get_json(force=True, silent=True) or {}
    _require_fields(data, "transaction")
    tx = _clean_tx(data["transaction"])

    wallet  = tx["wallet"]
    risk_f  = wallet_risk_factors.get(wallet, 5)

    if_result  = IF_MODEL.score_transaction(tx, wallet, risk_f)
    xgb_result = XGB_MODEL.predict(tx, if_result["anomaly_score"]) if if_result["is_anomaly"] else {}

    # Update protection stats
    if if_result["is_anomaly"]:
        protection_stats["events"] += 1
        protection_stats["eth_saved"] += tx.get("value_eth", 0)

    return jsonify({
        "wallet":       wallet,
        "risk_factor":  risk_f,
        "result":       {**if_result, **xgb_result},
        "timestamp":    datetime.utcnow().isoformat(),
        "notification": _build_notification(if_result, tx) if if_result["is_anomaly"] else None,
    })


@app.route("/api/analyze-batch", methods=["POST"])
@rate_limit
def analyze_batch():
    """Score up to 20 transactions at once."""
    data = request.get_json(force=True, silent=True) or {}
    _require_fields(data, "transactions")
    txns = data["transactions"]
    if not isinstance(txns, list) or len(txns) > 20:
        abort(400, "transactions must be a list of ≤20 items")

    results = []
    for tx_raw in txns:
        tx = _clean_tx(tx_raw)
        wallet = tx["wallet"]
        risk_f = wallet_risk_factors.get(wallet, 5)
        if_res = IF_MODEL.score_transaction(tx, wallet, risk_f)
        xgb_res = XGB_MODEL.predict(tx, if_res["anomaly_score"]) if if_res["is_anomaly"] else {}
        results.append({
            "wallet":  wallet,
            "result":  {**if_res, **xgb_res},
            "notification": _build_notification(if_res, tx) if if_res["is_anomaly"] else None,
        })

    return jsonify({"results": results, "count": len(results)})


@app.route("/api/risk-profile/<wallet>", methods=["GET"])
@rate_limit
def risk_profile(wallet: str):
    """Return a wallet's current risk profile."""
    _validate_address(wallet)
    risk_f = wallet_risk_factors.get(wallet, 5)
    stats  = IF_MODEL.wallet_stats.get(wallet, {}) if IF_MODEL else {}
    return jsonify({
        "wallet":     wallet,
        "risk_factor": risk_f,
        "contamination": risk_f / 50,
        "behavioral_baseline": stats,
        "risk_label": _risk_label(risk_f),
    })


@app.route("/api/set-risk-factor", methods=["POST"])
@rate_limit
def set_risk_factor():
    """Update the risk factor (sensitivity) for a wallet."""
    data = request.get_json(force=True, silent=True) or {}
    _require_fields(data, "wallet", "risk_factor")
    wallet = data["wallet"]
    _validate_address(wallet)
    factor = int(data["risk_factor"])
    if not 1 <= factor <= 10:
        abort(400, "risk_factor must be 1–10")
    wallet_risk_factors[wallet] = factor
    return jsonify({"wallet": wallet, "risk_factor": factor, "contamination": factor / 50})


@app.route("/api/train", methods=["POST"])
def retrain():
    """Retrain models (long-running — call async)."""
    try:
        _retrain()
        return jsonify({"status": "ok", "message": "Models retrained successfully"})
    except Exception as e:
        log.error(f"Retrain failed: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/test-scenario/<int:scenario_id>", methods=["GET"])
@rate_limit
def test_scenario(scenario_id: int):
    """Return pre-built test scenarios for the demo page."""
    tc_path = os.path.join(DATA_DIR, "test_cases.json")
    if not os.path.exists(tc_path):
        generate_test_cases()
    with open(tc_path) as f:
        data = json.load(f)
    scenarios = data.get("scenarios", [])
    if scenario_id < 1 or scenario_id > len(scenarios):
        abort(404, "Scenario not found")
    sc = scenarios[scenario_id - 1]

    # Run all transactions through ML pipeline
    results = []
    for tx in sc["transactions"]:
        tx_clean = _clean_tx(tx)
        risk_f   = 5
        if_res   = IF_MODEL.score_transaction(tx_clean, tx_clean["wallet"], risk_f)
        xgb_res  = XGB_MODEL.predict(tx_clean, if_res["anomaly_score"]) if if_res["is_anomaly"] else {}
        results.append({**if_res, **xgb_res})

    return jsonify({
        "scenario":   sc,
        "ml_results": results,
        "summary": {
            "total_txns":       len(results),
            "anomalies_found":  sum(1 for r in results if r.get("is_anomaly")),
            "max_risk_score":   max((r.get("risk_score", 0) for r in results), default=0),
            "detected_type":    sc["expected_anomaly"],
        }
    })


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_notification(if_result: dict, tx: dict) -> dict:
    """Build the user-facing notification message."""
    atype    = if_result.get("anomaly_type", "UNKNOWN")
    severity = if_result.get("severity", "MEDIUM")
    value    = tx.get("value_eth", 0)
    messages = {
        "VELOCITY_SPIKE":       f"⚡ Velocity spike detected — {tx.get('tx_count_10min',0)} txns in 10 min. Wallet paused.",
        "LARGE_TRANSFER":       f"🔴 Unusually large transfer of {value:.4f} ETH detected. Wallet frozen for review.",
        "RUG_PULL":             f"🚨 Rug pull pattern detected! Your tokens have been swapped to ETH and secured.",
        "DRAIN_ATTACK":         f"🛡️ Drain attack blocked! {value:.4f} ETH attempted drain to unknown address was stopped.",
        "LAYERING":             f"⚠️ Layering/structuring detected — funds split across multiple recipients. Wallet paused.",
        "SMURFING":             f"⚠️ Smurfing pattern detected — near-threshold transfers to many wallets. Wallet paused.",
        "FLASH_LOAN_PATTERN":   f"🔥 Flash loan attack detected! Extreme {value:.0f} ETH movement in seconds. Auto-protected.",
        "HONEYPOT_INTERACTION": f"🍯 Honeypot contract detected! Transfer to {tx.get('to_address','?')[:10]}… was blocked.",
    }
    return {
        "title":    f"🛡️ Guardiant Protection Activated",
        "message":  messages.get(atype, f"Anomaly detected ({atype}). Your wallet has been protected."),
        "severity": severity,
        "type":     atype,
        "action":   "TOKENS_SWAPPED_TO_ETH" if severity in ("HIGH", "CRITICAL") else "WALLET_PAUSED",
        "eth_secured": value if severity in ("HIGH", "CRITICAL") else 0,
        "timestamp": datetime.utcnow().isoformat(),
    }

def _risk_label(factor: int) -> str:
    if factor <= 3: return "LOW"
    if factor <= 6: return "MEDIUM"
    if factor <= 8: return "HIGH"
    return "CRITICAL"


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    bootstrap_models()
    app.run(host="127.0.0.1", port=5001, debug=False)