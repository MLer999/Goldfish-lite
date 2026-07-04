// 質問バンク（静的版）。座標は水の色にのみ使うため id と text だけ持つ。
export interface Question {
  id: string;
  text: string;
}

export const QUESTION_BANK: Question[] = [
  { id: "q1", text: "今も、許せていないことは？" },
  { id: "q2", text: "思い出すと、まだ胸がざわつくことは？" },
  { id: "q3", text: "今日、思わず声が出た瞬間は？" },
  { id: "q4", text: "心臓が跳ねたのは？" },
  { id: "q5", text: "ほっと息を吐いたのは？" },
  { id: "q6", text: "どうでもよくなって楽になったことは？" },
  { id: "q7", text: "静かに諦めたことは？" },
  { id: "q8", text: "今日、手触りのなかった時間は？" },
  { id: "q9", text: "名前のつかない、今日の気持ちは？" },
];
