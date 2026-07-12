"""チェーン連携（web3.py）── Optimism Sepolia（テスト）/ Optimism メインネット。

CompletionBadge.sol を solcx でコンパイルし、デプロイ / claimFor を行う。
Foundry不要。BADGE_CHAIN=sepolia|mainnet で対象ネットワークを切り替える（既定: sepolia）。
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from solcx import compile_files, install_solc

_BADGE_DIR = Path(__file__).resolve().parents[1]
_CONTRACTS_DIR = _BADGE_DIR / "contracts"
_SOL = _CONTRACTS_DIR / "src" / "CompletionBadge.sol"
_SOLC_VERSION = "0.8.24"

NETWORKS = {
    "sepolia": {
        "chain_id": 11155420,
        "rpc_env": "OPTIMISM_SEPOLIA_RPC",
        "default_rpc": "https://sepolia.optimism.io",
    },
    "mainnet": {
        "chain_id": 10,
        "rpc_env": "OPTIMISM_RPC",
        "default_rpc": "https://mainnet.optimism.io",
    },
}


def network() -> dict:
    name = os.environ.get("BADGE_CHAIN", "sepolia")
    if name not in NETWORKS:
        raise RuntimeError(f"BADGE_CHAIN={name} は不正（sepolia か mainnet）")
    return NETWORKS[name]


@lru_cache(maxsize=1)
def _compiled() -> dict:
    install_solc(_SOLC_VERSION)
    remap = "@openzeppelin/contracts/=node_modules/@openzeppelin/contracts/"
    out = compile_files(
        [str(_SOL)],
        output_values=["abi", "bin"],
        solc_version=_SOLC_VERSION,
        import_remappings=[remap],
        allow_paths=[str(_CONTRACTS_DIR)],
        base_path=str(_CONTRACTS_DIR),
        optimize=True,
    )
    key = next(k for k in out if k.endswith(":CompletionBadge"))
    return out[key]


def abi() -> list:
    return _compiled()["abi"]
