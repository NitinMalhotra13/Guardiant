import pytest
import pandas as pd

try:
    import statsmodels
    from src.anomaly_detection.arima_model import ARIMAModel
    HAS_STATSMODELS = True
except ImportError:
    HAS_STATSMODELS = False

pytestmark = pytest.mark.skipif(not HAS_STATSMODELS, reason="statsmodels package not installed")

@pytest.fixture
def sample_time_series_data():
    data = {
        'timeStamp': pd.date_range(start='2023-01-01', periods=7, freq='D'),
        'value': [100, 200, 150, 300, 500, 600, 700]
    }
    return pd.DataFrame(data)


def test_prepare_data(sample_time_series_data):
    arima = ARIMAModel(sample_time_series_data)
    prepared_data = arima.prepare_data()

    assert prepared_data is not None, "Time series preparation failed."
    assert prepared_data.index.is_monotonic_increasing, "Time series index is not sorted."
    assert prepared_data.isna().sum() == 0, "There are missing values in the prepared time series."
