import pytest
import os
import pandas as pd
from src.api.etherscan_api import EtherscanAPI
from src.data_processing.data_cleaning import DataCleaner
from src.anomaly_detection.isolation_forest import GuardiantIsolationForest

pytestmark = pytest.mark.skipif(
    not os.getenv("ETHERSCAN_API_KEY"),
    reason="ETHERSCAN_API_KEY environment variable not set"
)

def test_integration():
    api_key = os.getenv("ETHERSCAN_API_KEY")
    address = os.getenv("ETHERSCAN_ADDRESS")
    assert api_key and address

    api = EtherscanAPI(api_key=api_key)
    transactions = api.get_transactions(address)

    assert transactions is not None, "Failed to fetch transactions."

    df = pd.DataFrame(transactions)
    cleaner = DataCleaner(df)
    cleaned_data = cleaner.clean_data()

    assert not cleaned_data.empty, "Data cleaning failed."

    detector = GuardiantIsolationForest()
    detector.train(cleaned_data)
    assert detector.is_trained
