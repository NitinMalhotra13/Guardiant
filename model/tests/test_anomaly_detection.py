import pytest
import pandas as pd
from src.anomaly_detection.isolation_forest import GuardiantIsolationForest, FEATURES

@pytest.fixture
def sample_dataframe():
    data = {
        "wallet": ["0x1111111111111111111111111111111111111111"] * 10,
        "value_eth": [0.1, 0.2, 0.15, 0.05, 0.12, 0.18, 0.11, 0.14, 0.13, 0.16],
        "gas_used": [21000] * 10,
        "gas_price_gwei": [30.0] * 10,
        "hour_utc": [12] * 10,
        "day_of_week": [1] * 10,
        "is_new_recipient": [0] * 10,
        "is_round_amount": [0] * 10,
        "tx_count_10min": [1] * 10,
        "period_volume_eth": [0.15] * 10,
        "amount_zscore": [0.1] * 10,
        "recipient_cluster": [1] * 10,
        "anomaly_label": [0] * 10,
    }
    return pd.DataFrame(data)


def test_train_model(sample_dataframe):
    model = GuardiantIsolationForest(contamination=0.1)
    model.train(sample_dataframe)

    assert model.is_trained, "GuardiantIsolationForest model training failed."
    assert model.model is not None, "Internal IsolationForest model is None."


def test_score_transaction(sample_dataframe):
    model = GuardiantIsolationForest(contamination=0.1)
    model.train(sample_dataframe)

    sample_tx = {
        "wallet": "0x1111111111111111111111111111111111111111",
        "value_eth": 0.15,
        "gas_used": 21000,
        "gas_price_gwei": 30.0,
        "hour_utc": 12,
        "day_of_week": 1,
        "is_new_recipient": 0,
        "is_round_amount": 0,
        "tx_count_10min": 1,
        "period_volume_eth": 0.15,
    }
    res = model.score_transaction(sample_tx)

    assert "risk_score" in res, "Missing risk_score in prediction result."
    assert "is_anomaly" in res, "Missing is_anomaly boolean in prediction result."
    assert "anomaly_type" in res, "Missing anomaly_type in prediction result."
    assert 0 <= res["risk_score"] <= 100, "Risk score out of [0, 100] range."
