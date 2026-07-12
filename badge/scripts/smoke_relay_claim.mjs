// 手動スモークテスト: relay-claim.jsのhandlerを直接呼び、
// 不正な入力は400、正しい合言葉+新規アドレスなら実際にテストネットでclaimされることを確認する。
// 実行: node --env-file=feed-lite/badge/.env feed-lite/badge/scripts/smoke_relay_claim.mjs <正しい合言葉> <テスト用アドレス>
import handler from "../../api/relay-claim.js";

function mockRes() {
  const res = { statusCode: 0, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { res.body = obj; return res; };
  return res;
}

async function call(body) {
  const res = mockRes();
  await handler({ method: "POST", body }, res);
  return res;
}

async function main() {
  const [, , phrase, address] = process.argv;
  if (!phrase || !address) {
    throw new Error("使い方: node smoke_relay_claim.mjs <合言葉> <アドレス>");
  }

  const badReq = await call({ address: "not-an-address", phrase: "x" });
  console.log("invalid address ->", badReq.statusCode, badReq.body);
  if (badReq.statusCode !== 400) throw new Error("invalid addressで400にならなかった");

  const wrongPhrase = await call({ address, phrase: "絶対に違う合言葉のはず" });
  console.log("wrong phrase ->", wrongPhrase.statusCode, wrongPhrase.body);
  if (wrongPhrase.statusCode !== 400) throw new Error("誤った合言葉で400にならなかった");

  const ok = await call({ address, phrase });
  console.log("correct phrase ->", ok.statusCode, ok.body);
  if (ok.statusCode !== 200) throw new Error("正しい合言葉でclaimできなかった");

  console.log("OK: relay-claim smoke test 成功");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
