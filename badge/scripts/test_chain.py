import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import chain


def test_compiled_abi_has_expected_functions():
    names = {f["name"] for f in chain.abi() if f.get("type") == "function"}
    expected = {
        "claimFor", "remaining", "setCodeHash", "setRelayer", "setURI",
        "totalClaimed", "hasClaimed", "relayer", "codeHash",
    }
    assert expected <= names
