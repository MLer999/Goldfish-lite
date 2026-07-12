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
