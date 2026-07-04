// 秘密の扉の開扉判定（静的版・ブラウザ内）。
// ビルド時の環境変数で調整:
//   VITE_DOOR_ONE_IN     … 0（既定）=確率で開かない / 10 なら 1/10
//   VITE_DOOR_SECRET_WORD … 既定「I am AI」。回答に含めば必ず開く（大小・空白無視）

const ONE_IN = Number((import.meta as any).env?.VITE_DOOR_ONE_IN ?? 0) || 0;
const SECRET = String((import.meta as any).env?.VITE_DOOR_SECRET_WORD ?? "I am AI");

export function doorOpens(answer: string): boolean {
  const word = SECRET.trim().toLowerCase();
  if (word && (answer || "").trim().toLowerCase().includes(word)) return true;
  if (ONE_IN > 0) return Math.floor(Math.random() * ONE_IN) === 0;
  return false;
}
