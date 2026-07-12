import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import pytest


def test_jwt_missing_raises(monkeypatch):
    monkeypatch.delenv("PINATA_JWT", raising=False)
    import pin_badge_metadata as mod
    with pytest.raises(RuntimeError):
        mod._jwt()
