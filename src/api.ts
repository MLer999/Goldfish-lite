// feed（本体バックエンド）から、常世台帳の本物のデータを取得するクライアント。
// feed-lite は静的サイトなので、自前のバックエンドは持たない。
// ここでは feed/backend が公開しているエンドポイントを直接叩く。

// トンネルURLは常設ではないため、feed 側の起動状況によって変わる。
// 再起動時は VITE_FEED_API_BASE を更新してビルドし直すこと。
const API_BASE: string =
  (import.meta as any).env?.VITE_FEED_API_BASE ?? "https://sin-renewable-teeth-jokes.trycloudflare.com";

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(joinUrl(API_BASE, path));
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export interface RevealRecord {
  ticket_id: string;
  at: string;
}

export interface OnchainLogEntry {
  token_id: number;
  tx_hash: string;
  to: string;
  at: string;
}

/** feed 側・裏の直近の記録一覧（可逆ドット画像を並べる元）。 */
export const revealRecords = (limit = 24) =>
  get<{ records: RevealRecord[] }>(`/reveal/records?limit=${limit}`);

/** feed 側・ある記録の可逆ドット画像URL。 */
export const revealImageSrc = (ticketId: string) => joinUrl(API_BASE, `/reveal/image/${ticketId}.png`);

/** feed 側・実際に Base Sepolia へ mint された取引ログ（本物の tx hash）。 */
export const onchainLog = (limit = 20) =>
  get<{ contract: string; entries: OnchainLogEntry[] }>(`/reveal/onchain-log?limit=${limit}`);
