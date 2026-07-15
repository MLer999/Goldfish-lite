// 効果音（外部音源なし・Web Audio APIでその場で合成する）。
// BGMを足す場合はここに <audio loop> ベースの再生関数を追加すればよい。

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** 一粒の「ぽちゃん」（下がるトーン＋水しぶきノイズ）。 */
function playDrip(audio: AudioContext, startTime: number, baseFreq: number) {
  const osc = audio.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(baseFreq, startTime);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.35, startTime + 0.18);

  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.5, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22);

  osc.connect(gain).connect(audio.destination);
  osc.start(startTime);
  osc.stop(startTime + 0.25);

  const bufferSize = Math.floor(audio.sampleRate * 0.15);
  const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = audio.createBufferSource();
  noise.buffer = buffer;

  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1800;

  const noiseGain = audio.createGain();
  noiseGain.gain.setValueAtTime(0.15, startTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.15);

  noise.connect(filter).connect(noiseGain).connect(audio.destination);
  noise.start(startTime);
}

/** 「ぴちょん、ぴちょん」── ポイを水に差し入れる音。 */
export function playScoopSound() {
  try {
    const audio = getCtx();
    const now = audio.currentTime;
    playDrip(audio, now, 900);
    playDrip(audio, now + 0.22, 700);
  } catch {
    // Web Audio 非対応・自動再生ブロック等は無視（演出上必須ではない）
  }
}

/** 重い扉が軋みながら開く音（低い衝撃音＋軋みノイズ＋開ききった衝撃音）。 */
export function playDoorOpenSound() {
  try {
    const audio = getCtx();
    const now = audio.currentTime;

    // 動き出しの重い衝撃（低音のドスン）
    const thud = audio.createOscillator();
    thud.type = "sine";
    thud.frequency.setValueAtTime(90, now);
    thud.frequency.exponentialRampToValueAtTime(45, now + 0.3);
    const thudGain = audio.createGain();
    thudGain.gain.setValueAtTime(0.0001, now);
    thudGain.gain.exponentialRampToValueAtTime(0.6, now + 0.02);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    thud.connect(thudGain).connect(audio.destination);
    thud.start(now);
    thud.stop(now + 0.5);

    // 軋み（バンドパスノイズの中心周波数をゆっくり下げる）
    const creakDuration = 1.3;
    const bufferSize = Math.floor(audio.sampleRate * creakDuration);
    const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const creak = audio.createBufferSource();
    creak.buffer = buffer;

    const bandpass = audio.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.Q.value = 8;
    bandpass.frequency.setValueAtTime(420, now + 0.1);
    bandpass.frequency.exponentialRampToValueAtTime(140, now + 0.1 + creakDuration);

    const creakGain = audio.createGain();
    creakGain.gain.setValueAtTime(0.0001, now + 0.1);
    creakGain.gain.exponentialRampToValueAtTime(0.35, now + 0.35);
    creakGain.gain.linearRampToValueAtTime(0.2, now + 0.1 + creakDuration * 0.7);
    creakGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1 + creakDuration);

    creak.connect(bandpass).connect(creakGain).connect(audio.destination);
    creak.start(now + 0.1);

    // 開ききった瞬間の低い着地音
    const land = audio.createOscillator();
    land.type = "sine";
    land.frequency.setValueAtTime(70, now + creakDuration);
    const landGain = audio.createGain();
    landGain.gain.setValueAtTime(0.0001, now + creakDuration);
    landGain.gain.exponentialRampToValueAtTime(0.5, now + creakDuration + 0.02);
    landGain.gain.exponentialRampToValueAtTime(0.0001, now + creakDuration + 0.4);
    land.connect(landGain).connect(audio.destination);
    land.start(now + creakDuration);
    land.stop(now + creakDuration + 0.4);
  } catch {
    // Web Audio 非対応・自動再生ブロック等は無視（演出上必須ではない）
  }
}
