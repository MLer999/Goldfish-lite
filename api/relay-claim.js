// Vercel Serverless Function。
// 参加者の代わりにガス代を払ってclaimForを送信するだけの薄い中継層。
// 合言葉一致・二重claim・上限の判定はコントラクトのrequireに完全に委ね、ここでは持たない。
import { ethers } from "ethers";

const ABI = ["function claimFor(address to, string calldata phrase) external"];

// chain.py の NETWORKS と同じ形。BADGE_CHAIN=sepolia|mainnet で切り替える（既定: sepolia）。
const NETWORKS = {
  sepolia: {
    chainId: 11155420,
    rpcEnv: "OPTIMISM_SEPOLIA_RPC",
    defaultRpc: "https://sepolia.optimism.io",
  },
  mainnet: {
    chainId: 10,
    rpcEnv: "OPTIMISM_RPC",
    defaultRpc: "https://mainnet.optimism.io",
  },
};

function network() {
  const raw = process.env.BADGE_CHAIN;
  const name = raw ? raw : "sepolia";
  if (!NETWORKS[name]) {
    throw new Error(`BADGE_CHAIN=${raw} は不正（sepolia か mainnet）`);
  }
  return NETWORKS[name];
}

async function getProvider() {
  const net = network();
  const rpc = process.env[net.rpcEnv] || net.defaultRpc;
  const provider = new ethers.JsonRpcProvider(rpc);
  const actual = await provider.getNetwork();
  if (actual.chainId !== BigInt(net.chainId)) {
    throw new Error(`chain_id=${actual.chainId} は想定(${net.chainId})と不一致。中止。`);
  }
  return provider;
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
    const provider = await getProvider();
    const relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.BADGE_CONTRACT, ABI, relayerWallet);
    const tx = await contract.claimFor(address, phrase);
    const receipt = await tx.wait();
    res.status(200).json({ ok: true, txHash: receipt.hash });
  } catch (err) {
    const code = err?.code;
    const text = `${err?.message || ""} ${err?.shortMessage || ""}`.toLowerCase();
    const isNonceCollision =
      code === "NONCE_EXPIRED" ||
      code === "REPLACEMENT_UNDERPRICED" ||
      text.includes("nonce");
    if (isNonceCollision) {
      res.status(400).json({
        ok: false,
        error: "一時的な混雑で送信できませんでした。少し待ってからもう一度お試しください。",
      });
      return;
    }
    const message = err?.shortMessage || err?.reason || err?.message || "claim failed";
    res.status(400).json({ ok: false, error: message });
  }
}
