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


from eth_account import Account
from web3 import Web3


def _rpc() -> str:
    net = network()
    return os.environ.get(net["rpc_env"], net["default_rpc"])


@lru_cache(maxsize=1)
def w3() -> Web3:
    conn = Web3(Web3.HTTPProvider(_rpc(), request_kwargs={"timeout": 60}))
    cid = conn.eth.chain_id
    expected = network()["chain_id"]
    if cid != expected:
        raise RuntimeError(f"chain_id={cid} は想定({expected})と不一致。中止。")
    return conn


@lru_cache(maxsize=1)
def owner() -> "Account":
    pk = os.environ.get("BADGE_OWNER_PRIVATE_KEY")
    if not pk:
        raise RuntimeError("BADGE_OWNER_PRIVATE_KEY が未設定")
    return Account.from_key(pk)


@lru_cache(maxsize=1)
def relayer_account() -> "Account":
    pk = os.environ.get("RELAYER_PRIVATE_KEY")
    if not pk:
        raise RuntimeError("RELAYER_PRIVATE_KEY が未設定")
    return Account.from_key(pk)


def _send(tx: dict, acct: "Account") -> dict:
    conn = w3()
    tx.setdefault("from", acct.address)
    tx.setdefault("nonce", conn.eth.get_transaction_count(acct.address))
    tx.setdefault("chainId", network()["chain_id"])
    if "gas" not in tx:
        tx["gas"] = int(conn.eth.estimate_gas(tx) * 1.2)
    tx.setdefault("maxFeePerGas", conn.eth.gas_price * 2)
    tx.setdefault("maxPriorityFeePerGas", conn.to_wei(0.001, "gwei"))
    signed = acct.sign_transaction(tx)
    tx_hash = conn.eth.send_raw_transaction(signed.raw_transaction)
    return conn.eth.wait_for_transaction_receipt(tx_hash, timeout=180)


def deploy(relayer_address: str, code_hash: bytes, uri: str) -> str:
    """CompletionBadge をデプロイし、コントラクトアドレスを返す。"""
    conn = w3()
    c = _compiled()
    acct = owner()
    Contract = conn.eth.contract(abi=c["abi"], bytecode=c["bin"])
    tx = Contract.constructor(
        acct.address, Web3.to_checksum_address(relayer_address), code_hash, uri
    ).build_transaction({"from": acct.address, "nonce": conn.eth.get_transaction_count(acct.address)})
    receipt = _send(tx, acct)
    return receipt["contractAddress"]


def _contract():
    conn = w3()
    addr = os.environ.get("BADGE_CONTRACT")
    if not addr:
        raise RuntimeError("BADGE_CONTRACT が未設定（先に deploy が必要）")
    return conn.eth.contract(address=Web3.to_checksum_address(addr), abi=abi())


def remaining() -> int:
    return _contract().functions.remaining().call()


def claim_for(to: str, phrase: str) -> str:
    """relayerとしてclaimForを送信し、tx_hashを返す。"""
    conn = w3()
    contract = _contract()
    acct = relayer_account()
    tx = contract.functions.claimFor(Web3.to_checksum_address(to), phrase).build_transaction(
        {"from": acct.address, "nonce": conn.eth.get_transaction_count(acct.address)}
    )
    receipt = _send(tx, acct)
    return receipt["transactionHash"].hex()
