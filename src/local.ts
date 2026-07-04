// バックエンドの代わりに、すべてブラウザ内で完結させるローカル処理。
// 表の絵は事前に用意した画像から選ぶ。裏のドット画像は事前生成の静的アセット。

import { QUESTION_BANK, type Question } from "./questions";
import { doorOpens } from "./door";

const BASE = import.meta.env.BASE_URL; // 末尾に "/"（Vite が注入）
const ART_COUNT = 20;
const SPECIAL_COUNT = 6;
const DOT_COUNT = 24;

const pad = (n: number) => String(n).padStart(2, "0");
const artUrl = (i: number) => `${BASE}art/art-${pad(i)}.png`;
const specialUrl = (i: number) => `${BASE}special/special-${pad(i)}.png`;

/** 裏に並べる可逆ドット画像（事前生成）のURL一覧。 */
export const dotUrls: string[] = Array.from({ length: DOT_COUNT }, (_, i) => `${BASE}dots/dot-${pad(i + 1)}.png`);

/** 「すくう」演出の下絵（金魚すくいの水槽を真上から）。 */
export const scoopImage = `${BASE}scoop/water.png`;

export function drawQuestion(): Question {
  return QUESTION_BANK[Math.floor(Math.random() * QUESTION_BANK.length)];
}

const pick = (n: number) => 1 + Math.floor(Math.random() * n);

export interface ScoopResult {
  imageUrl: string;
  caught: boolean;
}

/** すくう。少しの「掬う」ラグののち、画像と扉の有無を返す。 */
export async function scoop(answer: string): Promise<ScoopResult> {
  const caught = doorOpens(answer);
  await new Promise((r) => setTimeout(r, 1400)); // ポイを差し入れる演出のための間
  const imageUrl = caught ? specialUrl(pick(SPECIAL_COUNT)) : artUrl(pick(ART_COUNT));
  return { imageUrl, caught };
}
