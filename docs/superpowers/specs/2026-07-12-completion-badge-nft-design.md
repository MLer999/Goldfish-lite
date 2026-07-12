# 完走証NFT（Completion Badge）設計書

## 背景・目的

2026-07-16 に千葉工大「AI概論」発表会で feed-lite を出店する。エピローグまで完全に見た人（および後日noteの記事を読んだ読者）向けに、記念NFTを発行したい。

発行者（ユーザー本人）はオンチェーン操作の初心者であり、今回の目的は「代わりに全部実装する」ことではなく、**FEED本体で構築済みの Solidity + web3.py デプロイパイプラインを流用しながら、本人が手を動かして学べる**規模の題材にすること。

前例: 同講義で過去に配布された「Jibot x Web3 Gairon: Handshake」(ERC1155, Optimism, 69 owners) がある。今回もチェーンをOptimismに揃え、参加者（既にMetaMaskを持っている）が違和感なく扱えるようにする。

## 要件

- チェーン: Optimism メインネット（開発・検証は Optimism Sepolia テストネットで先に行う）
- 規格: ERC1155、単一トークンid（全員同じ画像・メタデータの「完走証」）
- 上限: 200枚、先着順（コントラクトの `require` で強制）
- 画像: `Demise-goldfish.jpg`（金文字タイトル入りの完成版アートワーク、JPGで問題なし。Pinata/IPFSはファイル形式を問わない）
- 対象者の確認方法: エピローグ最後に表示される「証明の合言葉」を、別ページ(`claim.html`)でコントラクトに送信して claim する
- 締切なし: イベント当日限定にはしない。note記事を後日読んだ読者もclaim可能にする
- ガス代: コントラクトのデプロイ（1回)はユーザー（発行者）が負担。各参加者のclaimトランザクションは参加者自身が負担（Optimismはガスが非常に安い）
- 合言葉の運用: 今回は性善説で割り切る（共有の1フレーズ、流出リスクは200枚上限とノベルティ的性質で許容）。**合言葉の実際の文字列は、このリポジトリのどのファイルにもコミットしない**。デプロイスクリプト実行時に環境変数（例: `.env` の `BADGE_SECRET_PHRASE`、gitignore対象）から読み、`keccak256(phrase)` だけをコントラクトにオンチェーンで渡す。

### 検討し、見送った代替案

- **署名式（ウォレットごとに一意な証明）**: サーバーレス関数で `msg.sender` 宛の署名を発行し、コントラクトで `ecrecover` 検証する方式。流出耐性は本物だが、今回は開発期間4日・発行者が初心者であることを優先し、共有合言葉のシンプルな方式を採用。将来 note 読者向けに `claimWithSignature()` をV2として追加する余地は残す（コントラクトのロジックを分離しておけば追加は容易）。
- **ノーコード配布プラットフォーム（Manifold/Zora等）**: 合言葉ゲートのような独自条件に対応しているか不明瞭なため見送り、自前実装に一本化。
- **発行者による手動一括mint**: 参加者のガス代負担はなくなるが、リアルタイム性がなく、発行者がN人分のガス代と収集作業を負う。今回は不採用。

## アーキテクチャ

```
[feed-lite: エピローグ画面 Epilogue.tsx]
   └─ 最後まで見ると「証明の合言葉」を表示（既存の裏口"I am AI"演出と同じテイストの追加要素）
              │
              ▼
[claim.html]（feed-lite/public/ 配下、ビルド不要の単一静的ファイル）
   ├─ ethers.js(CDN) で MetaMask 接続
   ├─ chainId が Optimism(10) でなければ wallet_switchEthereumChain で切替を促す
   ├─ 合言葉の入力欄 + 「Claim」ボタン → contract.claim(phrase) を直接呼ぶ
   ├─ remaining() を表示（「残り n / 200」）
   └─ 状態: 未接続 / 入力可 / 送信中 / 成功 / 既にclaim済み / 完売
              │
              ▼
[CompletionBadge.sol]（Optimism上にデプロイ、ERC1155, OpenZeppelin 5.0.2）
   ├─ codeHash: bytes32（owner設定、合言葉のkeccak256）
   ├─ claim(string calldata phrase):
   │     require(!hasClaimed[msg.sender])
   │     require(totalClaimed < 200)
   │     require(keccak256(bytes(phrase)) == codeHash)
   │     _mint(msg.sender, 1, 1, ""); hasClaimed[msg.sender]=true; totalClaimed++;
   ├─ setCodeHash(bytes32) onlyOwner
   ├─ setURI(string) onlyOwner
   └─ remaining() view returns (200 - totalClaimed)
```

バックエンドサーバーは不要（完全に静的サイト＋オンチェーン検証）。

## コンポーネント詳細

**CompletionBadge.sol**
FEEDの `FeedNFT.sol` と同じ OpenZeppelin 5.0.2 系（mcopy回避のため固定）を使い、`ERC1155` + `Ownable` を継承。1ウォレット1枚、200枚上限、合言葉一致の3条件をrequireで強制。イベント `Claimed(address indexed to, uint256 tokenId)` を発火し、フロントやEtherscan/OP Explorerで追跡できるようにする。

**デプロイスクリプト**
FEEDの `feed/scripts/deploy_contract.py`（web3.py 7.x + py-solc-x, solc 0.8.24）をベースに、`feed-lite/badge/scripts/deploy_badge.py` として作成。`.env` から `BADGE_SECRET_PHRASE` と `MINTER_PRIVATE_KEY`（発行者のウォレット）を読み、`keccak256` を計算してコンストラクタ引数に渡す。デプロイ後、コントラクトアドレスを `.env` に書き込む（FEEDの `FEED_NFT_CONTRACT` と同じパターン）。

**claim.html**
ビルドステップなしの単一HTML（ethers.js を CDN 読み込み）。コントラクトアドレス・ABI・チェーンIDのみを埋め込み、秘密情報は一切持たない。`feed-lite/public/claim.html` に置くことで、feed-lite と同じドメインから配信される。

**Epilogue.tsx の変更**
既存の裏口演出（`door.ts` の合言葉判定・`.agent-note` 等）と同じ視覚言語で、エピローグ最終盤に「証明の合言葉: ○○○○」の一節を追加し、`claim.html` へのリンクを添える。

## メタデータ

Pinataに `Demise-goldfish.jpg` をpinし、`{name, description, image}` のJSON も別途pinしてtokenURIとする。FEEDの `ipfs.py`（Pinata pinFile/pinJSON）をそのまま流用可能。

## テスト・検証計画

1. **単体**: Solidityの`claim`が「合言葉不一致」「二重claim」「200枚超過」でそれぞれrevertすることを、Optimism Sepolia上の実デプロイで確認（Foundry不使用の方針を踏襲し、Pythonスクリプトで叩く）。
2. **結合**: claim.htmlからテストネット契約に対して実際にMetaMaskでclaimし、トークンが届くこと・`remaining()`の表示が減ることを確認。
3. **本番リハーサル**: 7/16当日、メインネットデプロイ直後に発行者自身の別ウォレットで実際に1回claimし、問題ないことを確認してから公開する。

## 段取り（4日）

- 7/12-7/14: Optimism Sepoliaで契約作成・デプロイ・claim.html動作確認（学習のメインパート）
- 7/15: 合言葉最終決定・メタデータ最終化・リハーサル
- 7/16: Optimismメインネットへ本番デプロイ → codeHash設定 → Epilogue/claim.htmlを本番用に更新して公開

## 将来の拡張余地（今回はスコープ外）

- 署名式 `claimWithSignature()` の追加（note読者向けに流出耐性を上げたい場合）
- owner専用の `pause()` / `closeClaim()`（当日以降に手動で締め切りたくなった場合のための保険。今回は要件外のため実装しないが、`Ownable`を継承しているため後日追加は容易）
