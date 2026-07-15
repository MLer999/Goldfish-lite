// バックエンドの代わりに、すべてブラウザ内で完結させるローカル処理。
// 表の絵は事前に用意した画像から選ぶ。裏のドット画像は事前生成の静的アセット。

import { QUESTION_BANK, type Question } from "./questions";
import { doorOpens } from "./door";

const BASE = import.meta.env.BASE_URL; // 末尾に "/"（Vite が注入）
const DOT_COUNT = 25;

// public/art/ 配下の実ファイル名一覧（連番以外の名前の画像も含む）。
const ART_FILES = [
  "android_017.png",
  "art-01.png", "art-02.png", "art-03.png", "art-04.png", "art-05.png",
  "art-06.png", "art-07.png", "art-08.png", "art-09.png", "art-10.png",
  "art-11.png", "art-12.png", "art-13.png", "art-14.png", "art-15.png",
  "art-16.png", "art-17.png", "art-18.png", "art-19.png", "art-20.png",
  "goldfish_main_011.png",
  "goldfish_main_044.png", "goldfish_main_046.png", "goldfish_main_047.png",
  "goldfish_main_055.png", "goldfish_main_057.png",
  "hiru_012.png", "hiru_014.png", "hiru_019.png",
  "modern_001.png", "modern_002.png", "modern_003.png", "modern_005.png",
  "modern_006.png", "modern_007.png", "modern_008.png", "modern_009.png",
  "modern_010.png", "modern_011.png", "modern_012.png", "modern_013.png",
  "modern_017.png", "modern_018.png", "modern_019.png",
  "special-04.png", "special-06.png",
  "waso_001.png", "waso_002.png", "waso_003.png", "waso_004.png",
  "waso_005.png", "waso_006.png", "waso_007.png", "waso_008.png",
  "waso_009.png", "waso_016.png", "waso_017.png",
  "yoru_001.png", "yoru_002.png", "yoru_004.png", "yoru_006.png",
  "yoru_010.png", "yoru_012.png", "yoru_014.png", "yoru_016.png",
  "yoru_017.png", "yoru_018.png", "yoru_019.png",
];

// public/special/ 配下の実ファイル名一覧（大きな金魚＝レア演出）。
const SPECIAL_FILES = [
  "goldfish_main_009.png", "goldfish_main_012.png", "goldfish_main_014.png",
  "goldfish_main_015.png", "goldfish_main_025.png", "goldfish_main_028.png",
  "goldfish_main_034.png", "goldfish_main_050.png",
  "special-01.png", "special-02.png", "special-05.png",
];

const pad = (n: number) => String(n).padStart(2, "0");
const artUrl = (name: string) => `${BASE}art/${name}`;
const specialUrl = (name: string) => `${BASE}special/${name}`;

/** 裏に並べる可逆ドット画像（事前生成）のURL一覧。 */
export const dotUrls: string[] = Array.from({ length: DOT_COUNT }, (_, i) => `${BASE}dots/dot-${pad(i + 1)}.png`);

/** 「すくう」演出の下絵（金魚すくいの水槽を真上から）。 */
export const scoopImage = `${BASE}scoop/water.png`;

export function drawQuestion(): Question {
  return QUESTION_BANK[Math.floor(Math.random() * QUESTION_BANK.length)];
}

const pickFrom = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

export interface ScoopResult {
  imageUrl: string;
  caught: boolean;
}

/** すくう。少しの「掬う」ラグののち、画像と扉の有無を返す。 */
export async function scoop(answer: string): Promise<ScoopResult> {
  const caught = doorOpens(answer);
  await new Promise((r) => setTimeout(r, 1400)); // ポイを差し入れる演出のための間
  const imageUrl = caught ? specialUrl(pickFrom(SPECIAL_FILES)) : artUrl(pickFrom(ART_FILES));
  return { imageUrl, caught };
}
