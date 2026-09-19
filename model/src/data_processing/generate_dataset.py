"""
generate_dataset.py
Generates a realistic synthetic blockchain transaction dataset for training
and testing the Guardiant anomaly detection models.

Produces:
  model/data/training_dataset.csv   — 600 labelled transactions (550 normal, 50 anomalous)
  model/data/test_cases.json        — 8 named anomaly scenarios for the demo page
  model/data/wallet_profiles.csv    — per-wallet behavioral baselines
"""

import os
import json
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

random.seed(42)
np.random.seed(42)

# ── Constants ────────────────────────────────────────────────────────────────
WALLETS = [f"0x{i:040x}" for i in range(1, 21)]      # 20 synthetic wallets
KNOWN_GOOD_RECIPIENTS = [f"0x{i:040x}" for i in range(100, 130)]
KNOWN_BAD_RECIPIENTS  = [f"0xDEAD{i:036x}" for i in range(5)]
HONEYPOT_CONTRACTS    = [f"0xBAD{i:037x}"  for i in range(3)]

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def random_address(pool=None):
    if pool:
        return random.choice(pool)
    return f"0x{random.randint(0, 2**160):040x}"


def normal_transaction(wallet: str, base_time: datetime, idx: int) -> dict:
    """Generate one realistic normal transaction."""
    hour = random.choices(range(24), weights=[
        1,1,1,1,1,1, 2,4,6,8,8,8, 8,8,7,7,6,5, 5,4,3,2,2,1
    ])[0]
    ts = base_time + timedelta(minutes=idx * random.randint(8, 90), hours=hour % 4)
    amount = round(abs(np.random.lognormal(mean=-2.5, sigma=1.2)), 6)   # typical: 0.001–0.5 ETH
    return {
        "wallet":           wallet,
        "from_address":     wallet,
        "to_address":       random_address(KNOWN_GOOD_RECIPIENTS),
        "value_eth":        max(0.0001, amount),
        "gas_used":         random.randint(21000, 80000),
        "gas_price_gwei":   round(random.uniform(10, 80), 2),
        "timestamp":        ts.isoformat(),
        "hour_utc":         ts.hour,
        "day_of_week":      ts.weekday(),
        "is_new_recipient": int(random.random() < 0.08),
        "is_round_amount":  0,
        "tx_count_10min":   random.randint(1, 3),
        "period_volume_eth":round(amount * random.uniform(1, 2.5), 6),
        "amount_zscore":    round(random.uniform(-1.5, 1.5), 3),
        "recipient_cluster": random.randint(0, 3),
        "anomaly_label":    0,
        "anomaly_type":     "NONE",
    }


def anomaly_velocity_spike(wallet: str, base_time: datetime) -> list:
    """15 transactions in 10 minutes — velocity anomaly."""
    txns = []
    for i in range(15):
        ts = base_time + timedelta(seconds=i * 40)
        txns.append({
            "wallet": wallet, "from_address": wallet,
            "to_address": random_address(KNOWN_GOOD_RECIPIENTS),
            "value_eth": round(random.uniform(0.01, 0.1), 6),
            "gas_used": 21000, "gas_price_gwei": 50.0,
            "timestamp": ts.isoformat(), "hour_utc": ts.hour,
            "day_of_week": ts.weekday(), "is_new_recipient": 0,
            "is_round_amount": 0, "tx_count_10min": 15,
            "period_volume_eth": round(random.uniform(0.5, 1.5), 6),
            "amount_zscore": round(random.uniform(0.5, 1.5), 3),
            "recipient_cluster": 1, "anomaly_label": 1,
            "anomaly_type": "VELOCITY_SPIKE",
        })
    return txns


def anomaly_large_transfer(wallet: str, base_time: datetime) -> list:
    """Single transfer 20x the wallet's average — large transfer anomaly."""
    ts = base_time + timedelta(hours=2)
    return [{
        "wallet": wallet, "from_address": wallet,
        "to_address": random_address(KNOWN_GOOD_RECIPIENTS),
        "value_eth": round(random.uniform(15, 50), 4),
        "gas_used": 21000, "gas_price_gwei": 30.0,
        "timestamp": ts.isoformat(), "hour_utc": ts.hour,
        "day_of_week": ts.weekday(), "is_new_recipient": 1,
        "is_round_amount": 1, "tx_count_10min": 1,
        "period_volume_eth": round(random.uniform(15, 50), 4),
        "amount_zscore": round(random.uniform(4, 8), 3),
        "recipient_cluster": 3, "anomaly_label": 1,
        "anomaly_type": "LARGE_TRANSFER",
    }]


def anomaly_rug_pull(wallet: str, base_time: datetime) -> list:
    """Rapid pump then dump — rug pull pattern."""
    txns = []
    ts = base_time
    # Pump phase: many small buys
    for i in range(5):
        ts += timedelta(minutes=2)
        txns.append({
            "wallet": wallet, "from_address": random_address(),
            "to_address": wallet, "value_eth": round(random.uniform(0.1, 0.5), 6),
            "gas_used": 80000, "gas_price_gwei": 120.0,
            "timestamp": ts.isoformat(), "hour_utc": ts.hour,
            "day_of_week": ts.weekday(), "is_new_recipient": 0,
            "is_round_amount": 0, "tx_count_10min": 8,
            "period_volume_eth": round(random.uniform(1, 3), 6),
            "amount_zscore": round(random.uniform(2, 4), 3),
            "recipient_cluster": 2, "anomaly_label": 1,
            "anomaly_type": "RUG_PULL",
        })
    # Dump phase: one massive outflow
    ts += timedelta(minutes=1)
    txns.append({
        "wallet": wallet, "from_address": wallet,
        "to_address": random_address(KNOWN_BAD_RECIPIENTS),
        "value_eth": round(random.uniform(10, 30), 4),
        "gas_used": 21000, "gas_price_gwei": 200.0,
        "timestamp": ts.isoformat(), "hour_utc": ts.hour,
        "day_of_week": ts.weekday(), "is_new_recipient": 1,
        "is_round_amount": 1, "tx_count_10min": 9,
        "period_volume_eth": round(random.uniform(12, 33), 4),
        "amount_zscore": round(random.uniform(6, 10), 3),
        "recipient_cluster": 3, "anomaly_label": 1,
        "anomaly_type": "RUG_PULL",
    })
    return txns


def anomaly_drain_attack(wallet: str, base_time: datetime) -> list:
    """Unknown address draining wallet rapidly."""
    txns = []
    attacker = random_address(KNOWN_BAD_RECIPIENTS)
    ts = base_time
    for i in range(6):
        ts += timedelta(seconds=30)
        txns.append({
            "wallet": wallet, "from_address": wallet,
            "to_address": attacker,
            "value_eth": round(random.uniform(0.5, 2), 4),
            "gas_used": 21000, "gas_price_gwei": 150.0,
            "timestamp": ts.isoformat(), "hour_utc": ts.hour,
            "day_of_week": ts.weekday(), "is_new_recipient": int(i == 0),
            "is_round_amount": 0, "tx_count_10min": 6,
            "period_volume_eth": round(random.uniform(3, 12), 4),
            "amount_zscore": round(random.uniform(3, 6), 3),
            "recipient_cluster": 3, "anomaly_label": 1,
            "anomaly_type": "DRAIN_ATTACK",
        })
    return txns


def anomaly_layering(wallet: str, base_time: datetime) -> list:
    """Splitting large sum into many small transfers (structuring)."""
    txns = []
    ts = base_time
    recipients = [random_address() for _ in range(10)]
    for r in recipients:
        ts += timedelta(minutes=1)
        txns.append({
            "wallet": wallet, "from_address": wallet,
            "to_address": r, "value_eth": round(random.uniform(0.09, 0.11), 6),
            "gas_used": 21000, "gas_price_gwei": 40.0,
            "timestamp": ts.isoformat(), "hour_utc": ts.hour,
            "day_of_week": ts.weekday(), "is_new_recipient": 1,
            "is_round_amount": 1, "tx_count_10min": 10,
            "period_volume_eth": round(0.1 * len(txns), 4),
            "amount_zscore": round(random.uniform(1, 2), 3),
            "recipient_cluster": 3, "anomaly_label": 1,
            "anomaly_type": "LAYERING",
        })
    return txns


def anomaly_smurfing(wallet: str, base_time: datetime) -> list:
    """Multiple wallets each receiving just-under-threshold amounts."""
    txns = []
    ts = base_time
    for i in range(8):
        ts += timedelta(minutes=3)
        txns.append({
            "wallet": wallet, "from_address": wallet,
            "to_address": random_address(),
            "value_eth": round(random.uniform(0.095, 0.099), 6),
            "gas_used": 21000, "gas_price_gwei": 35.0,
            "timestamp": ts.isoformat(), "hour_utc": ts.hour,
            "day_of_week": ts.weekday(), "is_new_recipient": 1,
            "is_round_amount": 0, "tx_count_10min": 8,
            "period_volume_eth": round(0.097 * (i + 1), 4),
            "amount_zscore": round(random.uniform(1.5, 2.5), 3),
            "recipient_cluster": 3, "anomaly_label": 1,
            "anomaly_type": "SMURFING",
        })
    return txns


def anomaly_flash_loan(wallet: str, base_time: datetime) -> list:
    """Borrow huge amount → swap → repay within seconds."""
    ts = base_time
    return [
        {
            "wallet": wallet, "from_address": random_address(),
            "to_address": wallet, "value_eth": 500.0,
            "gas_used": 300000, "gas_price_gwei": 200.0,
            "timestamp": ts.isoformat(), "hour_utc": ts.hour,
            "day_of_week": ts.weekday(), "is_new_recipient": 0,
            "is_round_amount": 1, "tx_count_10min": 3,
            "period_volume_eth": 500.0,
            "amount_zscore": 15.0, "recipient_cluster": 3,
            "anomaly_label": 1, "anomaly_type": "FLASH_LOAN_PATTERN",
        },
        {
            "wallet": wallet, "from_address": wallet,
            "to_address": random_address(), "value_eth": 498.5,
            "gas_used": 300000, "gas_price_gwei": 200.0,
            "timestamp": (ts + timedelta(seconds=12)).isoformat(),
            "hour_utc": ts.hour, "day_of_week": ts.weekday(),
            "is_new_recipient": 1, "is_round_amount": 0,
            "tx_count_10min": 3, "period_volume_eth": 998.5,
            "amount_zscore": 15.0, "recipient_cluster": 3,
            "anomaly_label": 1, "anomaly_type": "FLASH_LOAN_PATTERN",
        },
    ]


def anomaly_honeypot(wallet: str, base_time: datetime) -> list:
    """Interaction with a known honeypot contract."""
    ts = base_time + timedelta(hours=1)
    return [{
        "wallet": wallet, "from_address": wallet,
        "to_address": random.choice(HONEYPOT_CONTRACTS),
        "value_eth": round(random.uniform(0.5, 3), 4),
        "gas_used": 250000, "gas_price_gwei": 60.0,
        "timestamp": ts.isoformat(), "hour_utc": ts.hour,
        "day_of_week": ts.weekday(), "is_new_recipient": 1,
        "is_round_amount": 0, "tx_count_10min": 1,
        "period_volume_eth": round(random.uniform(0.5, 3), 4),
        "amount_zscore": round(random.uniform(2, 4), 3),
        "recipient_cluster": 3, "anomaly_label": 1,
        "anomaly_type": "HONEYPOT_INTERACTION",
    }]


def generate_training_data():
    rows = []
    base = datetime(2024, 9, 1, 10, 0, 0)

    # 550 normal transactions
    for wallet in WALLETS[:15]:
        for i in range(random.randint(28, 42)):
            rows.append(normal_transaction(wallet, base, i))

    # 50 anomalous transactions (8 types)
    anom_fns = [
        anomaly_velocity_spike, anomaly_large_transfer, anomaly_rug_pull,
        anomaly_drain_attack,   anomaly_layering,       anomaly_smurfing,
        anomaly_flash_loan,     anomaly_honeypot,
    ]
    for fn in anom_fns:
        wallet = random.choice(WALLETS[15:])
        result = fn(wallet, base + timedelta(days=random.randint(1, 180)))
        rows.extend(result)

    df = pd.DataFrame(rows)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)

    out = os.path.join(OUTPUT_DIR, "training_dataset.csv")
    df.to_csv(out, index=False)
    print(f"[✓] Training dataset saved: {out}  ({len(df)} rows, "
          f"{(df.anomaly_label==1).sum()} anomalies)")
    return df


def generate_test_cases():
    now = datetime.utcnow()
    wallet = WALLETS[0]
    test_cases = {
        "scenarios": [
            {
                "id": 1, "name": "Velocity Spike",
                "description": "15 transactions in 10 minutes — far above normal velocity",
                "transactions": anomaly_velocity_spike(wallet, now),
                "expected_anomaly": "VELOCITY_SPIKE", "expected_severity": "HIGH",
            },
            {
                "id": 2, "name": "Large Transfer",
                "description": "Single transfer 20x the wallet's historical average",
                "transactions": anomaly_large_transfer(wallet, now),
                "expected_anomaly": "LARGE_TRANSFER", "expected_severity": "HIGH",
            },
            {
                "id": 3, "name": "Rug Pull Pattern",
                "description": "Pump followed by massive liquidity drain",
                "transactions": anomaly_rug_pull(wallet, now),
                "expected_anomaly": "RUG_PULL", "expected_severity": "CRITICAL",
            },
            {
                "id": 4, "name": "Drain Attack",
                "description": "Unknown address repeatedly draining wallet",
                "transactions": anomaly_drain_attack(wallet, now),
                "expected_anomaly": "DRAIN_ATTACK", "expected_severity": "CRITICAL",
            },
            {
                "id": 5, "name": "Layering / Structuring",
                "description": "Large sum split into many near-equal transfers",
                "transactions": anomaly_layering(wallet, now),
                "expected_anomaly": "LAYERING", "expected_severity": "MEDIUM",
            },
            {
                "id": 6, "name": "Smurfing",
                "description": "Multiple wallets each receiving just-under-threshold amounts",
                "transactions": anomaly_smurfing(wallet, now),
                "expected_anomaly": "SMURFING", "expected_severity": "MEDIUM",
            },
            {
                "id": 7, "name": "Flash Loan Attack",
                "description": "Borrow 500 ETH → manipulate → repay in seconds",
                "transactions": anomaly_flash_loan(wallet, now),
                "expected_anomaly": "FLASH_LOAN_PATTERN", "expected_severity": "CRITICAL",
            },
            {
                "id": 8, "name": "Honeypot Interaction",
                "description": "Sending funds to a known honeypot contract",
                "transactions": anomaly_honeypot(wallet, now),
                "expected_anomaly": "HONEYPOT_INTERACTION", "expected_severity": "HIGH",
            },
        ]
    }
    out = os.path.join(OUTPUT_DIR, "test_cases.json")
    with open(out, "w") as f:
        json.dump(test_cases, f, indent=2, default=str)
    print(f"[✓] Test cases saved: {out}  (8 scenarios)")
    return test_cases


def generate_wallet_profiles(df: pd.DataFrame):
    """Per-wallet behavioral baselines used for personalised risk scoring."""
    profiles = []
    for wallet, grp in df[df.anomaly_label == 0].groupby("wallet"):
        profiles.append({
            "wallet":           wallet,
            "avg_value_eth":    round(grp.value_eth.mean(), 6),
            "std_value_eth":    round(grp.value_eth.std(), 6),
            "median_value_eth": round(grp.value_eth.median(), 6),
            "avg_tx_per_10min": round(grp.tx_count_10min.mean(), 2),
            "typical_hour_start": int(grp.hour_utc.quantile(0.1)),
            "typical_hour_end":   int(grp.hour_utc.quantile(0.9)),
            "pct_new_recipients": round(grp.is_new_recipient.mean(), 3),
            "pct_round_amounts":  round(grp.is_round_amount.mean(), 3),
            "base_risk_factor":   random.randint(1, 4),  # initial low risk
        })
    out = os.path.join(OUTPUT_DIR, "wallet_profiles.csv")
    pd.DataFrame(profiles).to_csv(out, index=False)
    print(f"[✓] Wallet profiles saved: {out}  ({len(profiles)} wallets)")


if __name__ == "__main__":
    print("Generating Guardiant training data...")
    df = generate_training_data()
    generate_test_cases()
    generate_wallet_profiles(df)
    print("\nAll data files generated successfully.")
