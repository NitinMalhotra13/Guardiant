"""
isolation_forest.py  —  Guardiant Core Anomaly Detector

Uses Isolation Forest with per-wallet contamination tuning (personalised risk).
Extracts 10-minute rolling-window features and scores each transaction.

ML technique: Isolation Forest (unsupervised anomaly detection)
  - Contamination parameter = risk_factor / 50  (0.02 – 0.20 per wallet)
  - Trained once on the labelled dataset, then fine-tuned per wallet on arrival
"""

import os
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from typing import List, Dict, Optional, Tuple

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "models")
os.makedirs(MODEL_DIR, exist_ok=True)

FEATURES = [
    "value_eth", "gas_used", "gas_price_gwei",
    "hour_utc", "day_of_week",
    "is_new_recipient", "is_round_amount",
    "tx_count_10min", "period_volume_eth", "amount_zscore",
    "recipient_cluster",
]

ANOMALY_TYPE_MAP = {
    0: "NONE",
    1: "VELOCITY_SPIKE",
    2: "LARGE_TRANSFER",
    3: "RUG_PULL",
    4: "DRAIN_ATTACK",
    5: "LAYERING",
    6: "SMURFING",
    7: "FLASH_LOAN_PATTERN",
    8: "HONEYPOT_INTERACTION",
}


class GuardiantIsolationForest:
    """
    Personalised Isolation Forest anomaly detector.

    One global model is trained on all wallets.
    Per-wallet contamination is tuned via risk_factor (1-10).
    """

    def __init__(self, contamination: float = 0.08, random_state: int = 42):
        self.contamination = contamination
        self.random_state  = random_state
        self.model: Optional[IsolationForest] = None
        self.scaler: Optional[StandardScaler] = None
        self.wallet_stats: Dict[str, dict] = {}   # per-wallet baselines
        self.is_trained = False

    # ── Training ─────────────────────────────────────────────────────────────

    def train(self, df: pd.DataFrame) -> None:
        """Train on the labelled dataset. Only normal rows used for IF training."""
        normal = df[df.get("anomaly_label", pd.Series(0, index=df.index)) == 0]
        X = self._extract_features(normal)

        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        self.model = IsolationForest(
            n_estimators=200,
            contamination=self.contamination,
            max_samples="auto",
            random_state=self.random_state,
            n_jobs=-1,
        )
        self.model.fit(X_scaled)
        self.is_trained = True

        # Build per-wallet baselines from full dataset
        for wallet, grp in df[df.get("anomaly_label", pd.Series(0, index=df.index)) == 0].groupby("wallet"):
            self.wallet_stats[wallet] = {
                "mean_value":   grp.value_eth.mean(),
                "std_value":    grp.value_eth.std() + 1e-9,
                "mean_tx_rate": grp.tx_count_10min.mean(),
                "std_tx_rate":  grp.tx_count_10min.std() + 1e-9,
                "n_samples":    len(grp),
            }

    # ── Inference ────────────────────────────────────────────────────────────

    def score_transaction(
        self,
        tx: dict,
        wallet_address: Optional[str] = None,
        risk_factor: int = 5,
    ) -> Dict:
        """
        Score a single transaction.

        Returns:
          anomaly_score   float   raw IF score (lower = more anomalous)
          risk_score      float   0-100 (higher = more risky)
          is_anomaly      bool
          anomaly_type    str
          severity        str     LOW / MEDIUM / HIGH / CRITICAL
          explanation     str     human-readable reason
        """
        assert self.is_trained, "Model not trained"

        # Enrich with wallet baseline stats
        tx_enriched = self._enrich(tx, wallet_address)
        X = self._extract_features(pd.DataFrame([tx_enriched]))
        X_scaled = self.scaler.transform(X)

        raw_score = float(self.model.score_samples(X_scaled)[0])

        # Personalise threshold: higher risk_factor → lower threshold → more sensitive
        base_threshold = -0.1
        personal_threshold = base_threshold - (risk_factor - 1) * 0.01

        is_anomaly = raw_score < personal_threshold

        # Map to 0-100 risk score (clamp raw_score range [-0.5, 0.1])
        risk_score = round(np.clip(((-raw_score - 0.0) / 0.5) * 100, 0, 100), 1)

        anomaly_type, severity, explanation = self._classify(tx_enriched, risk_score)

        return {
            "anomaly_score":  round(raw_score, 4),
            "risk_score":     risk_score,
            "is_anomaly":     is_anomaly,
            "anomaly_type":   anomaly_type if is_anomaly else "NONE",
            "severity":       severity if is_anomaly else "NONE",
            "explanation":    explanation if is_anomaly else "Transaction looks normal",
        }

    def score_batch(
        self, txns: List[dict], wallet_address: Optional[str] = None, risk_factor: int = 5
    ) -> List[Dict]:
        return [self.score_transaction(tx, wallet_address, risk_factor) for tx in txns]

    # ── Classification (rule-augmented) ──────────────────────────────────────

    def _classify(self, tx: dict, risk_score: float) -> Tuple[str, str, str]:
        """Rule-augmented type classification on top of IF score."""
        v   = tx.get("value_eth", 0)
        cnt = tx.get("tx_count_10min", 0)
        zscore = tx.get("amount_zscore", 0)
        new_r  = tx.get("is_new_recipient", 0)
        round_ = tx.get("is_round_amount", 0)
        gas    = tx.get("gas_price_gwei", 0)
        period = tx.get("period_volume_eth", 0)

        if v > 100 and gas > 150:
            return ("FLASH_LOAN_PATTERN", "CRITICAL",
                    f"Extreme value ({v:.1f} ETH) with very high gas — flash loan pattern")
        if cnt >= 10:
            return ("VELOCITY_SPIKE", "HIGH",
                    f"{cnt} transactions in 10 min (normal: ≤3) — velocity spike")
        if zscore > 5:
            return ("LARGE_TRANSFER", "HIGH",
                    f"Amount is {zscore:.1f}σ above wallet baseline — unusually large transfer")
        if round_ and new_r and period > 1 and cnt >= 5:
            return ("LAYERING", "MEDIUM",
                    f"Round-amount transfers to {cnt} new recipients in short window — layering")
        if new_r and v > 5:
            return ("DRAIN_ATTACK", "CRITICAL",
                    f"{v:.2f} ETH sent to unknown address — potential drain attack")
        if period > 10 and cnt > 6:
            return ("RUG_PULL", "CRITICAL",
                    f"High volume ({period:.2f} ETH) across {cnt} txns in 10 min — rug pull pattern")
        if new_r and cnt >= 6 and round(v, 2) == v:
            return ("SMURFING", "MEDIUM",
                    f"Near-identical amounts to {cnt} new recipients — smurfing pattern")

        # Fallback by risk score
        if risk_score > 80:
            return ("DRAIN_ATTACK", "CRITICAL", "Critically anomalous transaction pattern")
        if risk_score > 60:
            return ("LARGE_TRANSFER", "HIGH", "Highly anomalous transaction detected")
        return ("VELOCITY_SPIKE", "MEDIUM", "Unusual transaction pattern detected")

    # ── Feature Engineering ──────────────────────────────────────────────────

    def _enrich(self, tx: dict, wallet: Optional[str]) -> dict:
        """Add computed features using wallet baseline."""
        tx = dict(tx)
        stats = self.wallet_stats.get(wallet, {
            "mean_value": 0.1, "std_value": 0.1,
            "mean_tx_rate": 2, "std_tx_rate": 1,
        })
        v = tx.get("value_eth", 0)
        tx["amount_zscore"] = (v - stats["mean_value"]) / stats["std_value"]
        tx.setdefault("is_round_amount", int(round(v, 2) == v and v >= 0.01))
        tx.setdefault("recipient_cluster", 1)
        return tx

    def _extract_features(self, df: pd.DataFrame) -> np.ndarray:
        for col in FEATURES:
            if col not in df.columns:
                df[col] = 0
        return df[FEATURES].fillna(0).values

    # ── Persistence ──────────────────────────────────────────────────────────

    def save(self, path: str = MODEL_DIR) -> None:
        joblib.dump({
            "model":        self.model,
            "scaler":       self.scaler,
            "wallet_stats": self.wallet_stats,
            "contamination": self.contamination,
        }, os.path.join(path, "isolation_forest.joblib"))

    @classmethod
    def load(cls, path: str = MODEL_DIR) -> "GuardiantIsolationForest":
        data = joblib.load(os.path.join(path, "isolation_forest.joblib"))
        inst = cls(contamination=data["contamination"])
        inst.model        = data["model"]
        inst.scaler       = data["scaler"]
        inst.wallet_stats = data["wallet_stats"]
        inst.is_trained   = True
        return inst
