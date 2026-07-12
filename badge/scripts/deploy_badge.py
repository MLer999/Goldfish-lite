"""CompletionBadge をデプロイし、アドレスを .env の BADGE_CONTRACT に書き込む。

前提: badge/.env に BADGE_CHAIN・(OPTIMISM_SEPOLIA_RPC or OPTIMISM_RPC)・
      BADGE_OWNER_PRIVATE_KEY・RELAYER_PRIVATE_KEY・BADGE_SECRET_PHRASE・BADGE_METADATA_URI。
実行: python deploy_badge.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from dotenv import load_dotenv
from web3 import Web3

import chain

_ENV_PATH = Path(__file__).resolve().parents[1] / ".env"


def _set_env_var(key: str, value: str) -> None:
    lines = _ENV_PATH.read_text(encoding="utf-8").splitlines() if _ENV_PATH.exists() else []
    out, found = [], False
    for ln in lines:
        if ln.strip().startswith(key + "="):
            out.append(f"{key}={value}")
            found = True
        else:
            out.append(ln)
    if not found:
        out.append(f"{key}={value}")
    _ENV_PATH.write_text("\n".join(out) + "\n", encoding="utf-8")


def main() -> int:
    load_dotenv(_ENV_PATH)

    phrase = os.environ.get("BADGE_SECRET_PHRASE")
    if not phrase:
        print("BADGE_SECRET_PHRASE が未設定。.env を確認してください。")
        return 1
    metadata_uri = os.environ.get("BADGE_METADATA_URI")
    if not metadata_uri:
        print("BADGE_METADATA_URI が未設定。先に pin_badge_metadata.py を実行してください。")
        return 1

    conn = chain.w3()
    acct = chain.owner()
    relayer = chain.relayer_account()
    bal = conn.eth.get_balance(acct.address)
    print(f"network : {os.environ.get('BADGE_CHAIN', 'sepolia')}")
    print(f"owner   : {acct.address}")
    print(f"relayer : {relayer.address}")
    print(f"chainId : {conn.eth.chain_id}")
    print(f"balance : {conn.from_wei(bal, 'ether')} ETH")
    if bal == 0:
        print("owner残高ゼロ。ETHを入れてから再実行してください。")
        return 1

    code_hash = Web3.keccak(text=phrase)
    print("デプロイ中…")
    address = chain.deploy(relayer.address, code_hash, metadata_uri)
    _set_env_var("BADGE_CONTRACT", address)
    print(f"CompletionBadge deployed: {address}")
    print("BADGE_CONTRACT を .env に保存しました。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
