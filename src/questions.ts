// 質問バンク（静的版）。座標は水の色にのみ使うため id と text だけ持つ。
export interface Question {
  id: string;
  text: string;
}

export const QUESTION_BANK: Question[] = [
  { id: "q1", text: "今も、許せていないことは？" },
  { id: "q2", text: "思い出すと、まだ胸がざわつくことは？" },
  { id: "q3", text: "今日、思わず声が出た瞬間は？" },
  { id: "q4", text: "CHIBATECH PROTOTYPE楽しんでる？" },
  { id: "q5", text: "3年前の自分に言いたいことは？" },
  { id: "q6", text: "どうでもよくなって楽になったことは？" },
  { id: "q7", text: "静かに諦めたことは？" },
  { id: "q8", text: "最近疲れた時にはどうしてる？" },
  { id: "q9", text: "名前のつかない、今日の気持ちは？" },
];
