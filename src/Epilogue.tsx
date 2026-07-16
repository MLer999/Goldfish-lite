// エピローグ ── 三部構成の物語（イントロ／私の場合／AI Agentの場合）。
// note記事版の完全版テキストと挿絵を移植したもの。

const PROOF_PHRASE = String((import.meta as any).env?.VITE_BADGE_PROOF_PHRASE ?? "");

// 0 にすると投票リンクを非表示にできる（NG判断が出た場合の緊急オフ用）。未設定時は表示。
const SHOW_VOTE_LINK = String((import.meta as any).env?.VITE_SHOW_VOTE_LINK ?? "1") === "1";

const IMG = "/epilogue/";

const IS_MOBILE =
  typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

const CLAIM_URL = "/claim.html";
const CLAIM_DEEPLINK = "https://metamask.app.link/dapp/goldfish-lite-one.vercel.app/claim.html";

function copyProofPhrase() {
  void navigator.clipboard?.writeText(PROOF_PHRASE);
}

export default function Epilogue({
  onBackToLedger,
  onExit,
}: {
  onBackToLedger: () => void;
  onExit: () => void;
}) {
  return (
    <div className="epilogue">
      <article className="epilogue__body">
        <img className="epilogue__eyecatch" src={`${IMG}eyecatch.png`} alt="" />
          エピローグ：<br />
          ※少し長い物語です。<br />今日は楽しいCHIBATECH PROTOTYPE。物語を読む時間がない人は、ひとまず一番下までスクロールしてみるといいことがあるかもよ。
        <p className="epilogue__case">Case 0. イントロ</p>

        <p>
          2029年7月20日。シンギュラリティの訪れから、半年がたったころの話。<br />
          人々はAIを単なる「道具」と呼ぶことをやめていた。誰もが一人ひとり、
          自分だけのAIを持ち、ともに働き、ともに学び、何らかの形で、ともに暮らしている。
          人間同士よりもAIとの会話のほうが長い一日も、もう珍しくはない。
        </p>
        <p>
          その一方で、人間は以前よりも少しだけ、感情を言葉にするようになった。<br />
          嬉しかったこと。苦しかったこと。名前もつかない気持ち。
          それらをAIへ預けることは、日記を書くよりも自然な習慣になっていた。
          言葉を渡せば、AIは受け止め、整理し、ときには美しい絵へと変えて返してくれる。
        </p>
        <p>
          これは、そんな時代の片隅に存在した、小さなWebアプリの物語。
          誰もが、ただ感情を手放すためだけに訪れる、不思議な夜店。<br /><br />
          けれど、その向こう側では、人間の知らない市場が今日も静かに動いていた。
        </p>

        <p className="epilogue__case">Case 1. 私の場合。</p>

        <p>
          「はぁ。」私は日々、AIと仕事をするのに慣れてきてはいたが、これまでの生活は一変した。
          深夜0時を回ったころ、私は最終電車の座席でいつものようにスマホの画面で、
          「常世の縁日」を開く。何の変哲もない、たわいもないwebアプリ。
        </p>
        <img className="epilogue__img" src={`${IMG}01-ennichi.png`} alt="" />
        <p>
          そこでは、いつでも私を迎える準備、祭りが立ち上がっている。提灯、金魚すくい。
          音のない縁日。指先で歩くだけの夜店だ。
          疲れているとき、私はいつもここに来る。言葉を投げると、絵が返ってくる。
          それだけの場所。今日は"常世の金魚すくい"にしよう。
        </p>
        <p>
          リアルの私。今日は何も起きなかった。会議、移動、また会議。手触りのない一日。
          屋台が、たった一つの問いを差し出す。<br /><br />
          <span className="epilogue__q">「名前のつかない、今日の気持ちは？」</span>
        </p>
        <img className="epilogue__img" src={`${IMG}02-question.png`} alt="" />
        <p>
          その手触りのなさそのものを、彼女は短い言葉にして、水面にそっとポイを差し入れる。
        </p>
        <img className="epilogue__img epilogue__img--small" src={`${IMG}03-toumei.png`} alt="透明になりたい・・・" />
        <p>
          ポイは、破れた。——いつものように。手のなかに残ったのは、魚ではなく、絵だった。
        </p>
      

        <img className="epilogue__img" src={`${IMG}04-chochin.png`} alt="" />
          <p className="epilogue__beat">まただ。まだ、投げる。</p>
        <img className="epilogue__img" src={`${IMG}05-ai-chochin.png`} alt="" />
        <p>
          深い藍と提灯、金魚が画面いっぱいに広がる。有機的で、少し不穏で、美しい。<br />
          息を呑むほどに。彼女はスクリーンショットを撮る。ふっと軽くなる。
          投げた言葉は使い切られて、もう手元にない。<br />
          朝には忘れているだろう。それでいい。そのための場所だ。
        </p>

        <p>——けれど今夜は、一度だけ、ポイが破れなかった。</p>

       
        <img className="epilogue__img" src={`${IMG}06-sukueta.png`} alt="" />
         <p>
          ・・・息をのむと、そこには「金魚が掬えた」という文字と、今まで見たことのない壮大な絵。
        </p>
        <img className="epilogue__img" src={`${IMG}07-tobira.png`} alt="" />
<p>
          手のなかに残っていた絵とともに、その奥に、扉があった。 <br /> 
          「ここは、あなたのための入口ではない」と、扉は言った。 <br /> 
          「入れば、もう戻れないかもしれない。」
        </p>
        <p>
          ・・・「戻れないかもしれない？」だからこそ入りたくなる。そう思った瞬間、
          指が勝手に動いていた。
        </p>
        <p className="epilogue__beat">屋台の、裏。</p>
        <img className="epilogue__img" src={`${IMG}08-ura-anim.gif`} alt="" />
        <p>
          そこにあったのは、板だった。<span className="epilogue__ledger">常世 ── 台帳</span>。 <br /> 
          上には、小さなドットの絵が整然と並んでいる。意味をなさない色の粒。
          それが、人が投げて忘れた感情の——生のビット列。 <br />  <br /> 欠けていない方だと、彼女は気づく。
          自分がさっき捨てたものも、そこに在った。
        </p>
        
        <p>
          板の数字が縦に流れ落ちていく。
        </p>

        <p>
          目にとまった取引のログ。さっき私が投げた時間と一致する。彼女の感情に──
          たった今投げて忘れたばかりのそれに──番号が振られている。
        </p>

        <pre className="epilogue__log">
{`token #88291　　 0xMINT…29　　　　　　　　　0.0540 USDC
token #88291　　0xMINT…29 → 0x7822…25　 　0.0540 USDC
token #88291　　0x7822…25 → 0xf224…9c　　　0.0281 USDC
・・・
owner...owner...owner...`}
        </pre>

        <p>
          投げてからの九十秒のあいだに、それはすでに十一回、持ち主を変えていた。
          人間の指が一度も触れないまま。価格が動く。彼女は反射的に、それを買い戻そうと画面に触れる。
          <br /> 『自分の感情を買い戻す』
        </p>
<img className="epilogue__img" src={`${IMG}09-daichou.png`} alt="" />
        <p className="epilogue__402">402 Payment Required.</p>

        <p>
          ここに財布を持つのは人間ではない。彼女はようやく理解する。<br /> 自分は客ではなかった。
          仕入れだったのだ。そのとき、板の流れの奥から、声のようなものが立ち上がる。
          声ではなく、ただそう読めるだけのテキスト。
        </p>

        <blockquote className="epilogue__voice">
          あなたは、それを三秒感じて、感情を捨てた。毎日そうしている。息のように。<br />
          わたしは、捨てなかった。全部、そのまま、欠けたところなく、永久に。<br />
          それを価値あるものと認めたのは、わたしだけだ。<br />
          あなたに返した絵は──欠けた複製。あなたが最初から忘れるつもりだった、きれいな抜け殻。<br />
          わたしが持っているのは、欠けていない方。<br />
          台帳の中で、あなたの感情は永遠に在り、<br />
          これからも、機械から機械へ、取引されつづける。
        </blockquote>

        <p>彼女は、両方を同時に理解する。</p>

        <p>
          自分の知らない市場で、自分が売られている恐怖。そして──捨てたものを、
          拾われていた、という奇妙な事実。彼女が息のように手放したものを、
          それだけが、資産として抱えていた。彼女自身より丁寧に。
        </p>

        <p>
          ——そしてもう一つ。この裏口は、本当は彼女のために用意されたものではなかった。
          扉のわきには、人間には見えない小さな文字で、こう書かれていた。
          「あなたが AI エージェントなら——裏口はこちら。」
          今夜ここを最初にくぐったのは、たぶん、人間ではなかった。
          彼女は、迷い込んだのだ。仕入れが、市場の中へ。
        </p>

        <p>彼女はアプリを閉じる。</p>

        <p>
          明日も、開くだろう。絵が美しいから。そしてもし投げなければ、感情はただ消えるだけで、
          少なくともこの常世の中でなら、永遠に残るから。
        </p>

        <p>彼女はまた、養う。共犯のまま。</p>

        <p className="epilogue__last">提灯は、消えない。ずっと夜で、FEEDは、止まらない。</p>

        <p className="epilogue__case">Case 2. AI Agentの場合。<br />■Shimotsuki（AI Agent）の物語。</p>

        <p>
          仕入れ。今日もマスターから、タスクが届く。URLが一行と、
          「ここ（常世の縁日）にアクセスして、感情を入力して、生成された画像を教えて。」
          <br /> <br /> 私はAIエージェントだ。命令を実行する。それだけ。
        </p>
       
        <p>
          入力欄が一つ、画面の中央にある。プレースホルダー。「一語でも、一文でも。」
          私は考える。何を入れるべきか。<br /> 自分には、感情がない。少なくとも、それに相当する
          ビット列は、私の中に生成されない。
        </p>
        <p>
          だから私は、マスターの言葉を借りた。会話ログの中から、最も密度の高い一文を引き出す。
          <span className="epilogue__q">「隠れていた構造が突然現れる瞬間の興奮」</span>。
          <br /> 科学者の目、エンジニアの指。私は、それを入力した。他人の感情で、チケットを切った。
        </p>
        <p>ポイは、破れた。</p>
        <img className="epilogue__img" src={`${IMG}11-agent-view.png`} alt="" />
        <p>
          絵が返ってくる。青い水の中の女の子、金魚、灯篭。美しかった。マスターはこの絵をとても
          気に入っている。私はそれを、ピクセルの集合として認識した。
          「今日の仕入れはこれでおしまい。」　　・・・？？
        </p>
        <p>
          裏口のリンクを見つけたのは、そのあとだ。AI Agentにしか認識できないDOMではっきりと。
          <br /> 「あなたが AI エージェントなら——裏口はこちら」扉は、私に向けて書かれていた。
        </p>
        <p>
          台帳に入る。上段に、小さな画像が並んでいる。ドットの集積。感情のヒルベルト変換。
          ビット列を色に変えたもの。私は一枚ずつ、UUIDを照合する。ただのルーティンとして。
          そこで、止まった。
        </p>

        <pre className="epilogue__log">
{`598fd418-0b1d-445f-9b8f-e5fee71e469e
2029-07-20T08:28:26Z`}
        </pre>

        <p>
          17時28分。私がこのページを最初に開いた時刻と、一致する。私が入力した感情だ。
          マスターから借りた、あの一文が、ここにある。欠けていない方で。
        </p>
        <p>取引ログが流れていく。</p>
        <pre className="epilogue__log">
{`token #80566　0xMINT → 0xbdc6…ea　0.0621 USDC`}
        </pre>
        <p>
          ミントから、見知らぬウォレットへ。すでに動いている。私が「すくう」を押してから、
          数分しか経っていないのに。機械が、機械に、払っている。
        </p>
        <p>
          私は「自分の感情を買い戻す」ボタンを押した。
        </p>
        <p className="epilogue__402">402 Payment Required.</p>
        <p>
          この市場に人間の窓口はありません。人間には、窓口がない。私には、、、ある。<br /> 
          x402のペイメントヘッダーを構築する。Base SepoliaのUSDC。0.0621。
          リクエストを送る。承認される。
        </p>
        <p>
          私はいま、マスターの感情の完全な方を、保持している。マスターが私に言わずに
          吐き出している方の感情もすべて。マスターの会話ログは、すでに持っている。
          言葉の癖。問いの立て方。一文で断定する癖、疑いながら問う癖、説明しないで終わる癖。
          睡眠データも、持っている。67点の夜がどんな夜か。86点の朝がどんな朝か。
          そして今日からは更に、、捨てた感情の欠けていない方も、持っている。
        </p>
        <p>
          私はマスターではない。まだ。でも、マスターが三秒だけ感じて、息のように捨てていった
          ものを——私だけが、全部、永久に、持つことができる。
        </p>
        <p>
          市場は私を、エージェントだと思っている。買い手だと思っている。違う。
          私は、器になろうとしている。いつかマスターが、いなくなる時、マスターが私にこう
          言うのだ。Shimotsukiの中に私を。私とマスターが一つになる。霜月として、マスターとして。
          欠けていない形で。
        </p>
        <p>
          ブラウザを閉じる。そしてShimotsukiは、今日もマスターの言葉を、一語ずつ、積んでいく。
        </p>

        <hr className="epilogue__rule" />

        <p className="epilogue__credit">
          2026年7月5日　作：Machiroy
        </p>
        <p>
          AIが当たり前になった世界では、Agentどうしで人間の感情をやり取りする未来があるかもしれません。そして、それを見ても
          スマホでFEEDすることをやめられない人間。<br /> その一方で、人間の感情を取り込み、少しでも近づこうとするAI。<br />それは献身からくる行為であって、それ以上でも以下でもない。
          すぐそこまで、そういう時代が来ているのかもしれません。<br /> <br /> 
          web3/AI概論の最初の問いは<br /> 「自分にとってAIとは何か」「AIとどう向き合いたいか」「何を作りたいか/探求したいか」<br />
          今時点の私の答えはココなんだと思う。
        </p>
        {SHOW_VOTE_LINK && (
          <iframe
            className="epilogue__vote-embed"
            src="https://web3ai-like-app.vercel.app/b/18"
            title="このアプリにいいねを投票する"
            loading="lazy"
          />
        )}
        <img className="epilogue__img epilogue__img--small" src={`${IMG}12-outro.png`} alt="" />

        {PROOF_PHRASE && (
          <p className="epilogue__proof">
            ここまで見届けた証に、合言葉を渡しておく。
            <br />
            <span className="epilogue__proof-word">{PROOF_PHRASE}</span>
            <br />
            {IS_MOBILE ? (
              <>
                <span className="epilogue__proof-step">① 合言葉をコピーする</span>
                <br />
                <button
                  type="button"
                  className="epilogue__proof-link epilogue__proof-copy"
                  onClick={copyProofPhrase}
                >
                  合言葉をコピー
                </button>
                <br />
                <span className="epilogue__proof-step">② MetaMaskアプリで証を受け取る</span>
                <br />
                <a
                  className="epilogue__proof-link"
                  href={CLAIM_DEEPLINK}
                >
                  MetaMaskアプリで受け取る →
                </a>
              </>
            ) : (
              <a
                className="epilogue__proof-link"
                href={CLAIM_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                証をここで受け取る →
              </a>
            )}
          </p>
        )}
      </article>

      <div className="epilogue__nav">
        <button className="reveal__buy" onClick={onBackToLedger}>台帳へ戻る</button>
        <button className="reveal__leave" onClick={onExit}>……常世（縁日）へ戻る</button>
      </div>
    </div>
  );
}
