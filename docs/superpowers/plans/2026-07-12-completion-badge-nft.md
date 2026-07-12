# 完走証NFT（Completion Badge） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** feed-liteのエピローグまで見た人（および後日noteを読んだ読者）が、MetaMaskで自分のアドレスと合言葉を入力するだけで、ガス代0円でOptimism上のERC1155「完走証」NFTを受け取れるようにする。

**Architecture:** `Epilogue.tsx`が合言葉を表示 → 静的な`claim.html`がMetaMaskからアドレスを読み取り、合言葉と一緒に`/api/relay-claim`（Vercel Serverless Function）へ送信 → 中継用relayerウォレットが`CompletionBadge.sol`の`claimFor(address, phrase)`を実行してガス代を肩代わりする。合言葉一致・二重claim防止・200枚上限の判定はすべてコントラクト側の`require`が担い、relayerは判定ロジックを持たない。

**Tech Stack:** Solidity 0.8.24 / OpenZeppelin Contracts 5.0.2 / web3.py 7.x + py-solc-x（Foundry不使用） / ethers.js v6 / Vercel Serverless Functions（Node.js） / Optimism Sepolia（開発）→ Optimism メインネット（本番）

## Global Constraints

- チェーン: 開発・検証は Optimism Sepolia（chainId 11155420）、本番は Optimism メインネット（chainId 10）。FEED本体（Base Sepolia専用）とは別チェーンなので混同しないこと。
- 規格: ERC1155、単一トークンid（`BADGE_ID = 1`）、上限 `MAX_SUPPLY = 200`。
- OpenZeppelin Contracts は `5.0.2` に固定（FEEDの`FeedNFT.sol`と同じ、mcopy回避のため）。
- 合言葉の実際の文字列は、どのファイルにもコミットしない。`.env`（gitignore対象）からのみ読む。`Epilogue.tsx`側もVite環境変数（`VITE_`接頭辞、ビルド時に埋め込まれる）経由で渡し、ソースに直書きしない。
- 参加者はガス代を一切払わない（relayerが肩代わり）。参加者のウォレット操作は「接続してアドレスを読む」だけで、トランザクション送信・署名は発生しない。
- 締切なし。ownerのみが`setCodeHash`/`setRelayer`/`setURI`を叩ける。
- 本番（Optimismメインネット）へのデプロイは 7/16 当日に行う（Task 7）。Task 1〜6 はすべて Optimism Sepolia（テストネット）で検証する。

---

## Task 1: CompletionBadge.sol の作成とコンパイル確認

**Files:**
- Create: `feed-lite/badge/contracts/package.json`
- Create: `feed-lite/badge/contracts/src/CompletionBadge.sol`
- Create: `feed-lite/badge/requirements.txt`
- Create: `feed-lite/badge/scripts/chain.py`（このタスクでは `abi()` と内部の `_compiled()` のみ実装。`w3()`・`deploy()`・`claim_for()` などはTask 3で追加する）
- Create: `feed-lite/badge/scripts/test_chain.py`
- Modify: `feed-lite/.gitignore`（`.venv/`・`__pycache__/`を追加）

**Interfaces:**
- Produces: `chain.abi() -> list`（コンパイル済みABI。Task 3以降がこれを使ってコントラクトオブジェクトを組み立てる）
- Produces: コントラクトの公開関数シグネチャ — `claimFor(address to, string calldata phrase)`、`remaining() view returns (uint256)`、`setCodeHash(bytes32)`、`setRelayer(address)`、`setURI(string)`、`totalClaimed() view returns (uint256)`、`hasClaimed(address) view returns (bool)`、`relayer() view returns (address)`、`codeHash() view returns (bytes32)`

- [ ] **Step 1: Python仮想環境の作成**

```bash
cd feed-lite/badge
python -m venv .venv
source .venv/Scripts/activate
```

- [ ] **Step 2: requirements.txt を作成し依存をインストール**

`feed-lite/badge/requirements.txt`:
```
web3>=7.0,<8
py-solc-x
eth-account
python-dotenv
httpx
pytest
```

```bash
pip install -r requirements.txt
```
Expected: エラーなくインストール完了。

- [ ] **Step 3: .gitignore にPython関連を追加**

`feed-lite/.gitignore` に以下を追記:
```
.venv/
__pycache__/
*.pyc
```

- [ ] **Step 4: 失敗するテストを書く**

`feed-lite/badge/scripts/test_chain.py`:
```python
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
```

- [ ] **Step 5: テストを実行し、失敗を確認する**

Run: `cd feed-lite/badge && pytest scripts/test_chain.py -v`
Expected: FAIL（`ModuleNotFoundError: No module named 'chain'` または `CompletionBadge.sol`が無くコンパイル失敗）

- [ ] **Step 6: OpenZeppelin Contracts 5.0.2 を用意する**

`feed-lite/badge/contracts/package.json`:
```json
{
  "name": "completion-badge-contracts",
  "private": true,
  "dependencies": {
    "@openzeppelin/contracts": "5.0.2"
  }
}
```

```bash
cd feed-lite/badge/contracts
npm install
```
Expected: `node_modules/@openzeppelin/contracts` が作成される。

- [ ] **Step 7: CompletionBadge.sol を実装する**

`feed-lite/badge/contracts/src/CompletionBadge.sol`:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title CompletionBadge ── 常世の金魚すくい 完走証
/// @notice エピローグを完走した者に贈る記念NFT。合言葉の一致をrelayer経由でオンチェーン検証してmintする。
/// @dev 参加者は一切ガス代を払わない。relayerだけがclaimForを呼べる。
contract CompletionBadge is ERC1155, Ownable {
    uint256 public constant BADGE_ID = 1;
    uint256 public constant MAX_SUPPLY = 200;

    bytes32 public codeHash;
    address public relayer;
    uint256 public totalClaimed;
    mapping(address => bool) public hasClaimed;

    event Claimed(address indexed to, uint256 indexed tokenId);

    modifier onlyRelayer() {
        require(msg.sender == relayer, "not relayer");
        _;
    }

    constructor(
        address initialOwner,
        address initialRelayer,
        bytes32 initialCodeHash,
        string memory uri_
    ) ERC1155(uri_) Ownable(initialOwner) {
        relayer = initialRelayer;
        codeHash = initialCodeHash;
    }

    /// @notice relayerが代理でclaimを実行する。参加者本人は呼ばない。
    function claimFor(address to, string calldata phrase) external onlyRelayer {
        require(!hasClaimed[to], "already claimed");
        require(totalClaimed < MAX_SUPPLY, "sold out");
        require(keccak256(bytes(phrase)) == codeHash, "wrong phrase");
        hasClaimed[to] = true;
        totalClaimed += 1;
        _mint(to, BADGE_ID, 1, "");
        emit Claimed(to, BADGE_ID);
    }

    function remaining() external view returns (uint256) {
        return MAX_SUPPLY - totalClaimed;
    }

    function setCodeHash(bytes32 newCodeHash) external onlyOwner {
        codeHash = newCodeHash;
    }

    function setRelayer(address newRelayer) external onlyOwner {
        relayer = newRelayer;
    }

    function setURI(string calldata newUri) external onlyOwner {
        _setURI(newUri);
    }
}
```

- [ ] **Step 8: chain.py（コンパイル部分のみ）を実装する**

`feed-lite/badge/scripts/chain.py`:
```python
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
```

- [ ] **Step 9: テストを実行し、成功を確認する**

Run: `cd feed-lite/badge && pytest scripts/test_chain.py -v`
Expected: PASS（初回はsolc 0.8.24のダウンロードが走るため数十秒かかることがある）

- [ ] **Step 10: コミット**

```bash
cd feed-lite
git add badge/contracts/package.json badge/contracts/src/CompletionBadge.sol \
        badge/requirements.txt badge/scripts/chain.py badge/scripts/test_chain.py .gitignore
git commit -m "Add CompletionBadge.sol contract and compile check"
```

---

## Task 2: 完走証メタデータをPinataにpinする

**Files:**
- Create: `feed-lite/badge/assets/Demise-goldfish.jpg`（既存の画像をコピー）
- Create: `feed-lite/badge/scripts/pin_badge_metadata.py`
- Create: `feed-lite/badge/scripts/test_pin_badge_metadata.py`
- Create: `feed-lite/badge/.env.example`

**Interfaces:**
- Consumes: なし（このタスクは独立して実行できる）
- Produces: `.env` に書き込まれる `BADGE_METADATA_URI`（Task 3の`deploy_badge.py`が読む）

- [ ] **Step 1: 画像をbadge/assets/にコピーする**

```bash
cp "path/to/Demise-goldfish.jpg" feed-lite/badge/assets/Demise-goldfish.jpg
```
（ユーザーが作成した`Demise-goldfish.jpg`の実際の場所からコピーする）

- [ ] **Step 2: .env.example を作成する（実際の秘密は書かない、テンプレートのみ）**

`feed-lite/badge/.env.example`:
```
# コピーして .env を作り、実際の値を入れる（.env はgitignore対象）
BADGE_CHAIN=sepolia
OPTIMISM_SEPOLIA_RPC=https://sepolia.optimism.io
OPTIMISM_RPC=https://mainnet.optimism.io
BADGE_OWNER_PRIVATE_KEY=
RELAYER_PRIVATE_KEY=
BADGE_SECRET_PHRASE=
PINATA_JWT=
BADGE_METADATA_URI=
BADGE_CONTRACT=
```

- [ ] **Step 3: 失敗するテストを書く（PINATA_JWT未設定時にエラーになることを確認する軽量テスト。ネットワーク不要）**

`feed-lite/badge/scripts/test_pin_badge_metadata.py`:
```python
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import pytest


def test_jwt_missing_raises(monkeypatch):
    monkeypatch.delenv("PINATA_JWT", raising=False)
    import pin_badge_metadata as mod
    with pytest.raises(RuntimeError):
        mod._jwt()
```

- [ ] **Step 4: テストを実行し、失敗を確認する**

Run: `cd feed-lite/badge && pytest scripts/test_pin_badge_metadata.py -v`
Expected: FAIL（`ModuleNotFoundError: No module named 'pin_badge_metadata'`）

- [ ] **Step 5: pin_badge_metadata.py を実装する**

`feed-lite/badge/scripts/pin_badge_metadata.py`:
```python
"""Demise-goldfish.jpg と完走証メタデータをPinataにpinし、BADGE_METADATA_URIを.envに書く。

前提: badge/.env に PINATA_JWT。
実行: python pin_badge_metadata.py
"""

from __future__ import annotations

import os
from pathlib import Path

import httpx
from dotenv import load_dotenv

_BADGE_DIR = Path(__file__).resolve().parents[1]
_ENV_PATH = _BADGE_DIR / ".env"
_IMAGE_PATH = _BADGE_DIR / "assets" / "Demise-goldfish.jpg"
PINATA_BASE = "https://api.pinata.cloud"


def _jwt() -> str:
    jwt = os.environ.get("PINATA_JWT")
    if not jwt:
        raise RuntimeError("PINATA_JWT が未設定（badge/.env を確認）")
    return jwt


def pin_image_file(path: Path) -> str:
    headers = {"Authorization": f"Bearer {_jwt()}"}
    with path.open("rb") as f:
        files = {"file": (path.name, f, "image/jpeg")}
        with httpx.Client(timeout=60) as client:
            r = client.post(f"{PINATA_BASE}/pinning/pinFileToIPFS", files=files, headers=headers)
            r.raise_for_status()
            return r.json()["IpfsHash"]


def pin_metadata(metadata: dict) -> str:
    headers = {"Authorization": f"Bearer {_jwt()}", "Content-Type": "application/json"}
    payload = {"pinataContent": metadata, "pinataMetadata": {"name": "completion-badge-metadata.json"}}
    with httpx.Client(timeout=60) as client:
        r = client.post(f"{PINATA_BASE}/pinning/pinJSONToIPFS", headers=headers, json=payload)
        r.raise_for_status()
        return r.json()["IpfsHash"]


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
    if not _IMAGE_PATH.exists():
        print(f"{_IMAGE_PATH} が見つかりません。画像を配置してください。")
        return 1
    print("画像をpin中…")
    image_cid = pin_image_file(_IMAGE_PATH)
    print(f"image CID: {image_cid}")
    metadata = {
        "name": "常世の金魚すくい 完走証",
        "description": "エピローグまで見届けた者に贈る、常世からの証。",
        "image": f"ipfs://{image_cid}",
    }
    print("メタデータをpin中…")
    metadata_cid = pin_metadata(metadata)
    uri = f"ipfs://{metadata_cid}"
    print(f"metadata URI: {uri}")
    _set_env_var("BADGE_METADATA_URI", uri)
    print("BADGE_METADATA_URI を .env に保存しました。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 6: テストを実行し、成功を確認する**

Run: `cd feed-lite/badge && pytest scripts/test_pin_badge_metadata.py -v`
Expected: PASS

- [ ] **Step 7: 手動で実行し、実際にPinataへpinする**

```bash
cd feed-lite/badge
cp .env.example .env   # まだ無ければ
# .env に PINATA_JWT を実際の値で記入してから:
python scripts/pin_badge_metadata.py
```
Expected: `BADGE_METADATA_URI` が標準出力に表示され、`.env`に書き込まれる。表示された `ipfs://<CID>` の `<CID>` 部分を `https://gateway.pinata.cloud/ipfs/<CID>` にアクセスして、メタデータJSONが正しく見えることを目視確認する。

- [ ] **Step 8: コミット（.envはgitignore対象なのでコミットされないことを確認する）**

```bash
cd feed-lite
git status   # badge/.env が「Untracked」や「Changes」に出ていないことを確認
git add badge/assets/Demise-goldfish.jpg badge/scripts/pin_badge_metadata.py \
        badge/scripts/test_pin_badge_metadata.py badge/.env.example
git commit -m "Add Pinata metadata pinning script for completion badge"
```

---

## Task 3: chain.py 本実装・relayerウォレット・Optimism Sepoliaへのデプロイと実mint検証

**Files:**
- Modify: `feed-lite/badge/scripts/chain.py`（`w3()`・`owner()`・`relayer_account()`・`deploy()`・`_contract()`・`remaining()`・`claim_for()`を追加）
- Create: `feed-lite/badge/scripts/deploy_badge.py`
- Create: `feed-lite/badge/scripts/claim_flow_smoke.py`

**Interfaces:**
- Consumes: `chain.abi()`（Task 1）、`.env`の`BADGE_METADATA_URI`（Task 2）
- Produces: `chain.deploy(relayer_address: str, code_hash: bytes, uri: str) -> str`、`chain.claim_for(to: str, phrase: str) -> str`（tx hash）、`chain.remaining() -> int`。`.env`に書き込まれる`BADGE_CONTRACT`（Task 4・5が使う）

- [ ] **Step 1: relayer専用ウォレットを新規生成する**

```bash
cd feed-lite/badge
source .venv/Scripts/activate
python -c "
from eth_account import Account
acct = Account.create()
print('RELAYER_ADDRESS=' + acct.address)
print('RELAYER_PRIVATE_KEY=' + acct.key.hex())
"
```
表示された2行を`.env`に貼る（`RELAYER_PRIVATE_KEY=`の行を上書き）。`RELAYER_ADDRESS`は次のステップでdeploy_badge.pyが使うのでメモしておく（`.env`に`RELAYER_ADDRESS=`としても保存しておくとよい）。

- [ ] **Step 2: Optimism Sepolia の faucet でテストネットETHを2つのウォレットに入れる**

- `BADGE_OWNER_PRIVATE_KEY`に対応するアドレス（あなたの検証用ウォレット、無ければ新規生成して`.env`に設定）と、Step 1の`RELAYER_ADDRESS`の両方に、Optimism SepoliaのテストネットETHをfaucetで入れる（例: Superchain Faucet。現行のfaucet URLは変わることがあるので、"Optimism Sepolia faucet"で検索して見つけること）。
- 少額で構わない（デプロイ+数回のclaimFor分）。

- [ ] **Step 3: 失敗するテストを書く（chain.pyにまだ足りない関数を使う）**

`feed-lite/badge/scripts/claim_flow_smoke.py`（このステップでは呼び出す関数がまだ無いのでREDになる）:
```python
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
```

- [ ] **Step 4: 実行し、失敗を確認する**

Run: `cd feed-lite/badge && python scripts/claim_flow_smoke.py`
Expected: FAIL（`AttributeError: module 'chain' has no attribute 'relayer_account'` など）

- [ ] **Step 5: chain.py に残りの関数を実装する**

`feed-lite/badge/scripts/chain.py` の末尾に追記（Task 1で作った`network()`・`_compiled()`・`abi()`はそのまま残す）:
```python
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
```

- [ ] **Step 6: deploy_badge.py を実装する**

`feed-lite/badge/scripts/deploy_badge.py`:
```python
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
```

- [ ] **Step 7: claim_flow_smoke.py の import部分を実際のスクリプト構成に合わせて動かす**

`claim_flow_smoke.py`はStep 3で書いた内容のまま使う（`chain.deploy`・`chain.remaining`・`chain.claim_for`が今実装されたので動くはず）。

- [ ] **Step 8: 実行し、成功を確認する**

```bash
cd feed-lite/badge
source .venv/Scripts/activate
python scripts/claim_flow_smoke.py
```
Expected:
```
デプロイ中…
deployed: 0x...
test wallet: 0x...
OK: 誤った合言葉はrevertした
OK: 正しい合言葉でclaim成功 tx=...
OK: 二重claimはrevertした
全チェックOK
```
`BADGE_CONTRACT`はこのスクリプト内の環境変数にのみ設定されるため、次のステップで`.env`にも保存する。

- [ ] **Step 9: deploy_badge.py を単独実行し、.envにBADGE_CONTRACTを保存する（本番用の最終デプロイはTask 7で改めて行うので、ここではテストネット用として保存しておく）**

```bash
cd feed-lite/badge
python scripts/deploy_badge.py
```
Expected: `CompletionBadge deployed: 0x...` と表示され、`.env`の`BADGE_CONTRACT`が更新される。

- [ ] **Step 10: コミット**

```bash
cd feed-lite
git add badge/scripts/chain.py badge/scripts/deploy_badge.py badge/scripts/claim_flow_smoke.py
git commit -m "Implement chain.py deploy/claimFor and verify end-to-end on Optimism Sepolia"
```

---

## Task 4: relay-claim.js（Vercel Serverless Function）

**Files:**
- Create: `feed-lite/api/relay-claim.js`
- Modify: `feed-lite/package.json`（`ethers`依存を追加）
- Create: `feed-lite/badge/scripts/smoke_relay_claim.mjs`

**Interfaces:**
- Consumes: 環境変数 `BADGE_CHAIN`・`OPTIMISM_SEPOLIA_RPC`・`OPTIMISM_RPC`・`RELAYER_PRIVATE_KEY`・`BADGE_CONTRACT`（Task 3で決まったもの、Vercelの環境変数にも同じ値を設定する）
- Produces: `POST /api/relay-claim` エンドポイント。リクエスト`{address, phrase}` → レスポンス`{ok: true, txHash}`（成功）または`{ok: false, error}`（400番台）

- [ ] **Step 1: ethers を依存に追加する**

```bash
cd feed-lite
npm install ethers@6
```
Expected: `package.json`の`dependencies`に`"ethers": "^6.x.x"`が追加される。

- [ ] **Step 2: relay-claim.js を実装する**

`feed-lite/api/relay-claim.js`:
```javascript
// Vercel Serverless Function。
// 参加者の代わりにガス代を払ってclaimForを送信するだけの薄い中継層。
// 合言葉一致・二重claim・上限の判定はコントラクトのrequireに完全に委ね、ここでは持たない。
import { ethers } from "ethers";

const ABI = ["function claimFor(address to, string calldata phrase) external"];

function getProvider() {
  const isMainnet = process.env.BADGE_CHAIN === "mainnet";
  const rpc = isMainnet
    ? (process.env.OPTIMISM_RPC || "https://mainnet.optimism.io")
    : (process.env.OPTIMISM_SEPOLIA_RPC || "https://sepolia.optimism.io");
  return new ethers.JsonRpcProvider(rpc);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "POST only" });
    return;
  }

  const { address, phrase } = req.body || {};
  if (!address || typeof phrase !== "string" || !phrase || !ethers.isAddress(address)) {
    res.status(400).json({ ok: false, error: "address/phrase invalid" });
    return;
  }

  try {
    const provider = getProvider();
    const relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.BADGE_CONTRACT, ABI, relayerWallet);
    const tx = await contract.claimFor(address, phrase);
    const receipt = await tx.wait();
    res.status(200).json({ ok: true, txHash: receipt.hash });
  } catch (err) {
    const message = err?.shortMessage || err?.reason || err?.message || "claim failed";
    res.status(400).json({ ok: false, error: message });
  }
}
```

- [ ] **Step 3: 失敗するスモークテストを書く（handlerを直接呼び、実際のOptimism Sepolia契約に対して検証する）**

`feed-lite/badge/scripts/smoke_relay_claim.mjs`:
```javascript
// 手動スモークテスト: relay-claim.jsのhandlerを直接呼び、
// 不正な入力は400、正しい合言葉+新規アドレスなら実際にテストネットでclaimされることを確認する。
// 実行: node --env-file=feed-lite/badge/.env feed-lite/badge/scripts/smoke_relay_claim.mjs <正しい合言葉> <テスト用アドレス>
import handler from "../../api/relay-claim.js";

function mockRes() {
  const res = { statusCode: 0, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { res.body = obj; return res; };
  return res;
}

async function call(body) {
  const res = mockRes();
  await handler({ method: "POST", body }, res);
  return res;
}

async function main() {
  const [, , phrase, address] = process.argv;
  if (!phrase || !address) {
    throw new Error("使い方: node smoke_relay_claim.mjs <合言葉> <アドレス>");
  }

  const badReq = await call({ address: "not-an-address", phrase: "x" });
  console.log("invalid address ->", badReq.statusCode, badReq.body);
  if (badReq.statusCode !== 400) throw new Error("invalid addressで400にならなかった");

  const wrongPhrase = await call({ address, phrase: "絶対に違う合言葉のはず" });
  console.log("wrong phrase ->", wrongPhrase.statusCode, wrongPhrase.body);
  if (wrongPhrase.statusCode !== 400) throw new Error("誤った合言葉で400にならなかった");

  const ok = await call({ address, phrase });
  console.log("correct phrase ->", ok.statusCode, ok.body);
  if (ok.statusCode !== 200) throw new Error("正しい合言葉でclaimできなかった");

  console.log("OK: relay-claim smoke test 成功");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 4: 実行し、まず失敗（未実装 or 既にclaim済みアドレス）で挙動を確認する**

```bash
cd feed-lite
node -e "const { Wallet } = require('ethers'); console.log(Wallet.createRandom().address)"
```
出力された新規アドレスを控え、次のコマンドの`<テスト用アドレス>`に使う（Task 3のスモークテストで使ったアドレスは既にclaim済みなので、必ず新しいアドレスを使うこと）。

```bash
node --env-file=feed-lite/badge/.env feed-lite/badge/scripts/smoke_relay_claim.mjs "<.envのBADGE_SECRET_PHRASEと同じ値>" "<新規アドレス>"
```
Expected:
```
invalid address -> 400 { ok: false, error: 'address/phrase invalid' }
wrong phrase -> 400 { ok: false, error: '...wrong phrase...' }
correct phrase -> 200 { ok: true, txHash: '0x...' }
OK: relay-claim smoke test 成功
```

- [ ] **Step 5: コミット**

```bash
cd feed-lite
git add api/relay-claim.js package.json package-lock.json badge/scripts/smoke_relay_claim.mjs
git commit -m "Add relay-claim serverless function for gasless badge minting"
```

---

## Task 5: claim.html（参加者向け静的クレームページ）

**Files:**
- Create: `feed-lite/public/claim.html`

**Interfaces:**
- Consumes: `/api/relay-claim`（Task 4）、コントラクトの`remaining()`（読み取り専用、ethers.js経由で直接RPCから呼ぶ）
- Produces: 人間が操作するUI（自動テストなし、手動QAで検証する）

- [ ] **Step 1: claim.html を作成する**

`feed-lite/public/claim.html`:
```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>常世の金魚すくい ── 完走証を受け取る</title>
<style>
  body {
    background: #0b0708; color: #f3e6c8; font-family: "Yu Mincho", serif;
    display: flex; flex-direction: column; align-items: center; padding: 40px 20px;
    min-height: 100vh; margin: 0; box-sizing: border-box;
  }
  .card {
    max-width: 480px; width: 100%; border: 1px solid #caa049; border-radius: 8px;
    padding: 24px; background: #15100f;
  }
  h1 { font-size: 1.4rem; text-align: center; color: #e9c46a; line-height: 1.6; }
  input {
    width: 100%; padding: 10px; margin: 12px 0; background: #1e1815;
    border: 1px solid #6b5734; color: #f3e6c8; border-radius: 4px; box-sizing: border-box;
  }
  button {
    width: 100%; padding: 12px; background: #caa049; color: #15100f; border: none;
    border-radius: 4px; font-weight: bold; cursor: pointer;
  }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  #status { margin-top: 12px; font-size: 0.9rem; min-height: 1.4em; text-align: center; }
  #remaining { text-align: center; color: #caa049; margin-bottom: 8px; }
</style>
</head>
<body>
<div class="card">
  <h1>常世の金魚すくい<br>完走証を受け取る</h1>
  <div id="remaining">残り -- / 200</div>
  <button id="connect">ウォレットを接続する</button>
  <div id="claimArea" style="display:none;">
    <input id="phrase" placeholder="証明の合言葉" />
    <button id="claim">Claim（無料）</button>
  </div>
  <div id="status"></div>
</div>
<script type="module">
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm";

const CONTRACT_ADDRESS = "__BADGE_CONTRACT__";
const RPC_URL = "__OPTIMISM_RPC__";
const ABI = ["function remaining() view returns (uint256)"];

const statusEl = document.getElementById("status");
const remainingEl = document.getElementById("remaining");
const connectBtn = document.getElementById("connect");
const claimArea = document.getElementById("claimArea");
const claimBtn = document.getElementById("claim");
const phraseInput = document.getElementById("phrase");

let address = null;

const readProvider = new ethers.JsonRpcProvider(RPC_URL);
const readContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, readProvider);

async function loadRemaining() {
  try {
    const remaining = await readContract.remaining();
    remainingEl.textContent = `残り ${remaining} / 200`;
  } catch (e) {
    remainingEl.textContent = "残数の取得に失敗しました";
  }
}

connectBtn.addEventListener("click", async () => {
  if (!window.ethereum) {
    statusEl.textContent = "MetaMaskが見つかりません。インストールしてください。";
    return;
  }
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  address = accounts[0];
  connectBtn.textContent = `接続済み: ${address.slice(0, 6)}...${address.slice(-4)}`;
  connectBtn.disabled = true;
  claimArea.style.display = "block";
});

claimBtn.addEventListener("click", async () => {
  const phrase = phraseInput.value.trim();
  if (!address || !phrase) return;
  claimBtn.disabled = true;
  statusEl.textContent = "送信中…";
  try {
    const res = await fetch("/api/relay-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, phrase }),
    });
    const json = await res.json();
    if (res.ok) {
      statusEl.textContent = `受け取りました！ tx: ${json.txHash}`;
      claimArea.style.display = "none";
    } else {
      statusEl.textContent = `エラー: ${json.error}`;
      claimBtn.disabled = false;
    }
  } catch (e) {
    statusEl.textContent = `通信エラー: ${e.message}`;
    claimBtn.disabled = false;
  }
  loadRemaining();
});

loadRemaining();
</script>
</body>
</html>
```

`__BADGE_CONTRACT__`と`__OPTIMISM_RPC__`はプレースホルダー。Task 7でテストネット→本番それぞれの値に書き換える（今はTask 3でデプロイしたテストネットのアドレスと`https://sepolia.optimism.io`に置き換えて動作確認する）。

- [ ] **Step 2: プレースホルダーをテストネット用の実値に置き換える**

`__BADGE_CONTRACT__`をTask 3で`.env`に保存された`BADGE_CONTRACT`の値に、`__OPTIMISM_RPC__`を`https://sepolia.optimism.io`に置き換える。

- [ ] **Step 3: ローカルで起動して手動確認する**

```bash
cd feed-lite
npm run dev
```
ブラウザで `http://localhost:5174/claim.html` を開く。

手動QAチェックリスト:
- [ ] 「残り n / 200」が表示される（Task 3のスモークテストで1件claimしていれば`残り 199 / 200`のはず）
- [ ] 「ウォレットを接続する」を押すとMetaMaskが立ち上がり、接続後ボタンが「接続済み: 0x...」になる
- [ ] MetaMaskの ネットワークをOptimism Sepoliaに切り替えていない状態でも remaining の表示自体は取れる（読み取りは`RPC_URL`に直接アクセスするため、MetaMaskのネットワーク設定に依存しない）
- [ ] 未claimの新しいMetaMaskアカウントで、正しい合言葉を入れて「Claim（無料）」を押すと、数秒後に「受け取りました！ tx: 0x...」と表示される
- [ ] 表示された`tx`をOptimism Sepolia用エクスプローラ（`https://sepolia-optimism.etherscan.io/tx/<tx>`）で開き、`Claimed`イベントが発火していることを確認する
- [ ] 同じアカウントでもう一度Claimを押すと「エラー: ...already claimed...」と表示される
- [ ] 間違った合言葉を入れると「エラー: ...wrong phrase...」と表示される

- [ ] **Step 4: コミット**

```bash
cd feed-lite
git add public/claim.html
git commit -m "Add static claim page for completion badge"
```

---

## Task 6: Epilogue.tsx に「証明の合言葉」を追加する

**Files:**
- Modify: `feed-lite/src/Epilogue.tsx`
- Modify: `feed-lite/src/styles.css`
- Modify: `feed-lite/.env.example`（無ければ作成）と `README.md`（環境変数の説明を追記）

**Interfaces:**
- Consumes: Vite環境変数 `VITE_BADGE_PROOF_PHRASE`（ビルド時に埋め込まれる。`door.ts`の`VITE_DOOR_SECRET_WORD`と同じパターン）
- Produces: エピローグ最終盤に表示される合言葉ブロックと`claim.html`へのリンク

- [ ] **Step 1: Epilogue.tsx の先頭に環境変数読み込みを追加する**

`feed-lite/src/Epilogue.tsx`の冒頭（importなし、コメントの直後）に追記:
```tsx
const PROOF_PHRASE = String((import.meta as any).env?.VITE_BADGE_PROOF_PHRASE ?? "");
```

- [ ] **Step 2: `<div className="epilogue__nav">`の直前に合言葉ブロックを追加する**

`feed-lite/src/Epilogue.tsx`の`<p className="epilogue__last">提灯は、消えない。ずっと夜で、FEEDは、止まらない。</p>`の直後、`</article>`より前に追記:
```tsx
        {PROOF_PHRASE && (
          <p className="epilogue__proof">
            ここまで見届けた証に、合言葉を渡しておく。
            <br />
            <span className="epilogue__proof-word">{PROOF_PHRASE}</span>
            <br />
            <a
              className="epilogue__proof-link"
              href="/claim.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              証をここで受け取る →
            </a>
          </p>
        )}
```

- [ ] **Step 3: styles.css にスタイルを追加する**

`feed-lite/src/styles.css`の`.epilogue__last`ブロックの直後に追記:
```css
.epilogue__proof {
  text-align: center;
  margin-top: 2rem;
  padding: 1.2rem 1rem;
  border: 1px solid rgba(233, 196, 106, 0.4);
  border-radius: 6px;
  background: rgba(233, 196, 106, 0.06);
  line-height: 1.9;
}
.epilogue__proof-word {
  display: inline-block;
  margin-top: 0.4rem;
  font-size: 1.1rem;
  letter-spacing: 0.15em;
  color: #e9c46a;
}
.epilogue__proof-link {
  display: inline-block;
  margin-top: 0.8rem;
  color: #ffd6a0;
  text-decoration: underline;
}
```

- [ ] **Step 4: .env.example と README.md に環境変数の説明を追加する**

`feed-lite/.env.example`が無ければ作成し、既存の`VITE_DOOR_*`と並べて追記:
```
VITE_DOOR_ONE_IN=0
VITE_DOOR_SECRET_WORD=I am AI
VITE_BADGE_PROOF_PHRASE=
```

`feed-lite/README.md`の「環境変数（ビルド時・任意）」セクションのコードブロックに1行追記:
```
VITE_BADGE_PROOF_PHRASE=      # 完走証NFTの合言葉。claim.htmlで使うものと同じ値を入れる
```

- [ ] **Step 5: ローカルで手動確認する**

```bash
cd feed-lite
echo "VITE_BADGE_PROOF_PHRASE=<.envのBADGE_SECRET_PHRASEと同じ値>" >> .env.local
npm run dev
```
ブラウザで `http://localhost:5174` を開き、エピローグ（`#epilogue`）まで進める。

手動QAチェックリスト:
- [ ] エピローグ最終盤に、金色の枠で囲まれた「ここまで見届けた証に、合言葉を渡しておく。」ブロックが表示される
- [ ] 合言葉が正しく表示されている（`.env.local`に設定した値と一致）
- [ ] 「証をここで受け取る →」のリンクをクリックすると、新しいタブで`/claim.html`が開く
- [ ] `.env.local`から`VITE_BADGE_PROOF_PHRASE`を一時的に削除して再起動すると、合言葉ブロック自体が表示されない（空文字なら非表示になることの確認）

- [ ] **Step 6: コミット**

```bash
cd feed-lite
git add src/Epilogue.tsx src/styles.css .env.example README.md
git commit -m "Reveal completion-badge proof phrase at the end of the Epilogue"
```

---

## Task 7: 7/16当日 ── Optimismメインネットへの本番デプロイと公開

**Files:**
- Modify: `feed-lite/public/claim.html`（プレースホルダーを本番値に置き換え）
- Modify: `feed-lite/.env.local` または Vercel Environment Variables（`VITE_BADGE_PROOF_PHRASE`を本番の合言葉に）
- Vercel Environment Variables（`BADGE_CHAIN`・`OPTIMISM_RPC`・`RELAYER_PRIVATE_KEY`・`BADGE_CONTRACT`を`/api/relay-claim.js`用に設定）

**Interfaces:**
- Consumes: Task 1〜6で作った全部品
- Produces: 本番稼働するNFT配布フロー一式

- [ ] **Step 1: 本番用ウォレットを準備する**

`feed-lite/badge/.env`の`BADGE_CHAIN`を`mainnet`に変更。`BADGE_OWNER_PRIVATE_KEY`をあなたの本番ウォレット（少額ETHが入っているもの）に、`RELAYER_PRIVATE_KEY`を新規生成した本番用の使い捨てウォレットに設定する（Task 3のStep 1と同じ手順で新規生成）。

```bash
cd feed-lite/badge
python -c "
from eth_account import Account
acct = Account.create()
print('RELAYER_ADDRESS=' + acct.address)
print('RELAYER_PRIVATE_KEY=' + acct.key.hex())
"
```

- [ ] **Step 2: ガス代を実測する（1件だけ本番で自分宛にclaimしてみる）**

```bash
cd feed-lite/badge
source .venv/Scripts/activate
python scripts/deploy_badge.py
```
Expected: `CompletionBadge deployed: 0x...`（Optimismメインネット上）。デプロイ直後、Optimismのブロックエクスプローラ（`https://optimistic.etherscan.io/address/<address>`)でトランザクションのGas欄を確認し、実際にかかったETH量をメモする。

- [ ] **Step 3: relayerウォレットに200件分＋余裕のOP ETHを入金する**

Step 2で確認した1件あたりのガス代 × 220件（200件+予備20件）分のETHを、Step 1の`RELAYER_ADDRESS`に送金する。

- [ ] **Step 4: relayer経由の実claimを1回試す（発行者自身の別ウォレットで）**

```bash
cd feed-lite
node --env-file=feed-lite/badge/.env feed-lite/badge/scripts/smoke_relay_claim.mjs "<本番の合言葉>" "<発行者の別ウォレットアドレス>"
```
Expected: `correct phrase -> 200 { ok: true, txHash: '0x...' }`。Optimismメインネットのエクスプローラでトランザクションと`Claimed`イベントを確認する。

- [ ] **Step 5: claim.html を本番用の値に更新する**

`feed-lite/public/claim.html`の`__BADGE_CONTRACT__`をStep 2でデプロイしたメインネットのコントラクトアドレスに、`__OPTIMISM_RPC__`を`https://mainnet.optimism.io`に置き換える。

注意: `claim.html`の`CONTRACT_ADDRESS`/`RPC_URL`と、Step 6でVercelに設定する`BADGE_CONTRACT`/`OPTIMISM_RPC`は互いを検証しない独立した値。両方を同時に同じコントラクト・同じネットワークへ更新すること。片方だけ更新すると、ページ上の残数表示やclaim先が実際にmintされるコントラクトと食い違い、参加者に古い/誤った状態を表示してしまう。

- [ ] **Step 6: Vercelの環境変数を本番用に設定する**

Vercelダッシュボード（またはVercel CLIの`vercel env add`）で、Productionの環境変数に以下を設定する（Step 5の`claim.html`と同じコントラクト・ネットワークを指すことを必ず確認する）:
```
BADGE_CHAIN=mainnet
OPTIMISM_RPC=https://mainnet.optimism.io
RELAYER_PRIVATE_KEY=<Step1の値>
BADGE_CONTRACT=<Step2のアドレス>
VITE_BADGE_PROOF_PHRASE=<本番の合言葉>
```

- [ ] **Step 7: 本番デプロイする**

```bash
cd feed-lite
vercel --prod
```
Expected: 本番URLが発行される。

- [ ] **Step 8: 本番URLで最終確認する**

手動QAチェックリスト（本番URLに対して）:
- [ ] トップページからエピローグまで進み、合言葉ブロックが表示される
- [ ] `/claim.html`を開き、「残り n / 200」が正しい残数で表示される（Step 4で1件claim済みなら`199`のはず）
- [ ] 発行者以外の第三者用テストアカウント（余っているMetaMaskアカウントなど）で、実際に一連の流れ（接続→合言葉入力→Claim→成功表示）を1回通しで確認する

- [ ] **Step 9: コミット**

```bash
cd feed-lite
git add public/claim.html
git commit -m "Point claim.html at the Optimism mainnet CompletionBadge deployment"
```

---

## Self-Review メモ

- **spec coverage**: 設計書（`docs/superpowers/specs/2026-07-12-completion-badge-nft-design.md`）の各要件 ── チェーン(OP Sepolia→OP mainnet)/ERC1155/200枚上限/画像JPG/合言葉ゲート/締切なし/ガス肩代わり/合言葉非コミット ── はそれぞれTask 1・3・5・6・7でカバー済み。見送った代替案（署名式・ノーコード・手動一括mint）は実装対象外のままで一致。
- **placeholder scan**: `claim.html`内の`__BADGE_CONTRACT__`/`__OPTIMISM_RPC__`は意図的なプレースホルダーで、Task 5 Step2・Task 7 Step5でそれぞれ実値に置き換える手順を明記済み（TBD放置ではない）。
- **type consistency**: `chain.claim_for(to, phrase) -> str`（tx hash）、`chain.remaining() -> int`、コントラクトの`claimFor(address, string)`のシグネチャはTask 1〜4を通して一貫。
