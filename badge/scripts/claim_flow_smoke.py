"""Optimism Sepoliaに実デプロイし、claimForの正常系・異常系を実際にトランザクションで検証する手動スモークテスト。

前提: badge/.env に BADGE_CHAIN=sepolia・OPTIMISM_SEPOLIA_RPC・BADGE_OWNER_PRIVATE_KEY・
      RELAYER_PRIVATE_KEY・BADGE_SECRET_PHRASE・BADGE_METADATA_URI がすべて設定済み。
実行: python claim_flow_smoke.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from dotenv import load_dotenv
from eth_account import Account
from web3 import Web3

import chain

_ENV_PATH = Path(__file__).resolve().parents[1] / ".env"


def main() -> int:
    load_dotenv(_ENV_PATH)
    phrase = os.environ["BADGE_SECRET_PHRASE"]
    uri = os.environ["BADGE_METADATA_URI"]

    relayer = chain.relayer_account()
    code_hash = Web3.keccak(text=phrase)

    print("デプロイ中…")
    address = chain.deploy(relayer.address, code_hash, uri)
    os.environ["BADGE_CONTRACT"] = address
    print(f"deployed: {address}")

    assert chain.remaining() == 200, "初期remainingは200のはず"

    test_wallet = Account.create()
    print(f"test wallet: {test_wallet.address}")

    try:
        chain.claim_for(test_wallet.address, "わざと違う合言葉")
        raise AssertionError("誤った合言葉でrevertしなかった")
    except Exception as e:
        assert "wrong phrase" in str(e), f"想定外のエラー: {e}"
        print("OK: 誤った合言葉はrevertした")

    tx_hash = chain.claim_for(test_wallet.address, phrase)
    print(f"OK: 正しい合言葉でclaim成功 tx={tx_hash}")
    assert chain.remaining() == 199, "claim後はremainingが199のはず"

    try:
        chain.claim_for(test_wallet.address, phrase)
        raise AssertionError("二重claimでrevertしなかった")
    except Exception as e:
        assert "already claimed" in str(e), f"想定外のエラー: {e}"
        print("OK: 二重claimはrevertした")

    print("全チェックOK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
