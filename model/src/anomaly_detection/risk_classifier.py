"""
risk_classifier.py  —  XGBoost Anomaly-Type Classifier

Given a transaction that the Isolation Forest flagged as anomalous,
this classifier predicts WHICH type of anomaly it is (multiclass).

ML technique: XGBoost Gradient Boosted Trees (supervised, multiclass)
  - Trained on labelled anomaly dataset
  - Features: same 11 features as IF + IF anomaly score
  - Output: one of 8 anomaly types + confidence score
"""

import os
import numpy as np
import pandas as pd
import joblib
from typing import Dict, Optional

try:
    import xgboost as xgb
    HAS_XGB = True
except ImportError:
    HAS_XGB = False
    from sklearn.ensemble import RandomForestClassifier  # fallback

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "models")

ANOMALY_TYPES = [
    "NONE", "VELOCITY_SPIKE", "LARGE_TRANSFER", "RUG_PULL",
    "DRAIN_ATTACK", "LAYERING", "SMURFING",
    "FLASH_LOAN_PATTERN", "HONEYPOT_INTERACTION",
]

FEATURES = [
    "value_eth", "gas_used", "gas_price_gwei",
    "hour_utc", "day_of_week",
    "is_new_recipient", "is_round_amount",
    "tx_count_10min", "period_volume_eth", "amount_zscore",
    "recipient_cluster", "if_anomaly_score",
]


class AnomalyTypeClassifier:
    """
    XGBoost multiclass classifier that identifies anomaly type.
    Falls back to RandomForest if xgboost is not installed.
    """

    def __init__(self):
        self.model = None
        self.label_map = {t: i for i, t in enumerate(ANOMALY_TYPES)}
        self.rev_map   = {i: t for i, t in enumerate(ANOMALY_TYPES)}
        self.is_trained = False

    def train(self, df: pd.DataFrame) -> None:
        """Train on labelled data. anomaly_type column required."""
        df = df.copy()
        df["if_anomaly_score"] = df.get("amount_zscore", 0) * -0.1  # proxy during training
        df["label"] = df["anomaly_type"].map(self.label_map).fillna(0).astype(int)

        X = df[FEATURES].fillna(0).values
        y = df["label"].values

        if HAS_XGB:
            self.model = xgb.XGBClassifier(
                n_estimators=200, max_depth=6,
                learning_rate=0.1, use_label_encoder=False,
                eval_metric="mlogloss", random_state=42, n_jobs=-1,
            )
        else:
            from sklearn.ensemble import RandomForestClassifier
            self.model = RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1)

        self.model.fit(X, y)
        self.is_trained = True

    def predict(self, tx: dict, if_score: float = 0.0) -> Dict:
        """Predict anomaly type and confidence for a transaction."""
        assert self.is_trained, "Model not trained"
        tx = dict(tx)
        tx["if_anomaly_score"] = if_score
        tx.setdefault("amount_zscore", 0)
        tx.setdefault("recipient_cluster", 1)

        row = pd.DataFrame([tx])[FEATURES].fillna(0).values

        proba = self.model.predict_proba(row)[0]
        pred_idx  = int(np.argmax(proba))
        confidence = round(float(proba[pred_idx]) * 100, 1)
        anomaly_type = self.rev_map[pred_idx]

        return {
            "anomaly_type":  anomaly_type,
            "confidence":    confidence,
            "top3": [
                {"type": self.rev_map[i], "prob": round(float(p) * 100, 1)}
                for i, p in sorted(enumerate(proba), key=lambda x: -x[1])[:3]
            ],
        }

    def save(self, path: str = MODEL_DIR) -> None:
        joblib.dump(self.model, os.path.join(path, "xgb_classifier.joblib"))

    @classmethod
    def load(cls, path: str = MODEL_DIR) -> "AnomalyTypeClassifier":
        inst = cls()
        inst.model     = joblib.load(os.path.join(path, "xgb_classifier.joblib"))
        inst.is_trained = True
        return inst
