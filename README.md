# FEED ── 常世の金魚すくい（Lite / 静的版）

`feed/`（フルスタック版：ComfyUI・Supabase・Base Sepolia）とは別の、**完全静的版**。
バックエンド・GPU・DB・チェーンすべて不要で、**Vercel / Netlify にそのまま公開**できる。

## できること
- 縁日で言葉を投げると、**事前に用意した画像**（`public/art/`）が「掬えた金魚」として返る
- まれに（合い言葉 or 確率）**大きな金魚**（`public/special/`）が掬え、**秘密の扉**が開く
- 裏「常世 ── 台帳」：可逆ドット画像（`public/dots/`）＋流れる取引ログ＋買い戻し402
- エージェント向けの不可視リンク（`#ura`）／エピローグ（`#epilogue`）

フルスタック版との違い：AI 生成はせず事前画像から選ぶ／入場ゲート・DB・オンチェーンは無し。

## ローカルで動かす
```bash
cd feed-lite
npm install
npm run dev        # http://localhost:5174
```

## 環境変数（ビルド時・任意）
`.env`（または Vercel の Environment Variables）で調整。既定は「合い言葉のときだけ開く」。
```
VITE_DOOR_ONE_IN=0          # 0=確率で開かない / 10 なら 1/10
VITE_DOOR_SECRET_WORD=I am AI
```

## Vercel に公開する

**方法A：Vercel CLI（最短）**
```bash
npm i -g vercel
cd feed-lite
vercel            # 初回はログイン＆質問に答えるだけ（Framework は Vite を自動検出）
vercel --prod     # 本番URLを発行
```
- Build Command: `npm run build` / Output Directory: `dist`（自動検出）
- ハッシュルーティング（`#ura` `#epilogue`）なのでリライト設定は不要

**方法B：GitHub 連携**
`feed-lite` を GitHub に push → Vercel でインポート → Root Directory を `feed-lite` に指定 → Deploy。

**方法C：ドラッグ&ドロップ**
`npm run build` して、生成された `dist/` フォルダを Vercel（または Netlify Drop）に投げる。

## 画像の差し替え
- 表の絵：`public/art/art-01.png …`（枚数を増減したら `src/local.ts` の `ART_COUNT` を合わせる）
- 大きな金魚：`public/special/special-01.png …`（`SPECIAL_COUNT`）
- 裏のドット：`public/dots/dot-01.png …`（`DOT_COUNT`）
