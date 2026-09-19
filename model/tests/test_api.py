import pytest
import os
from src.api.etherscan_api import EtherscanAPI

pytestmark = pytest.mark.skipif(
    not os.getenv("ETHERSCAN_API_KEY"),
    reason="ETHERSCAN_API_KEY environment variable not set"
)

@pytest.fixture
def api():
    api_key = os.getenv("ETHERSCAN_API_KEY")
    return EtherscanAPI(api_key=api_key)


def test_get_transactions(api):
    address = os.getenv("ETHERSCAN_ADDRESS")
    assert address, "Ethereum address is missing. Set 'ETHERSCAN_ADDRESS' environment variable."

    transactions = api.get_transactions(address)

    assert transactions is not None, "API call failed to retrieve transactions."
    assert isinstance(transactions, list), "API result is not a list."
    assert len(transactions) > 0, "No transactions retrieved."
