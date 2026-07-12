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
