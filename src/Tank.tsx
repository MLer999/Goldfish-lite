// 水槽演出：質問座標を「水の色」に写す（仕様書 §6）。座標は表示しない。
// 金魚は Canvas で常に泳ぐ（CSSの視差軽減設定に左右されない）。
// マウス/タッチが近づくと逃げる。

import { useEffect, useRef } from "react";

interface TankProps {
  questionId?: string;
  scooping?: boolean;
}

// 高覚醒・負（q1,q2）＝赤く濁った水、凪いだ中心（q9）＝静かで淡い水。
const WATER: Record<string, { top: string; bottom: string }> = {
  q1: { top: "#7a1f28", bottom: "#2a0d12" },
  q2: { top: "#6e2530", bottom: "#241016" },
  q3: { top: "#b5701f", bottom: "#3a2409" },
  q4: { top: "#a85a2a", bottom: "#341a0d" },
  q5: { top: "#3f6f74", bottom: "#142a2c" },
  q6: { top: "#3a5f6b", bottom: "#132227" },
  q7: { top: "#2f3f5c", bottom: "#0f1626" },
  q8: { top: "#33474a", bottom: "#111a1b" },
  q9: { top: "#4a5570", bottom: "#171b28" },
};
const DEFAULT = { top: "#26304d", bottom: "#0c0f1a" };

// 金魚の体色（水の色に関係なく金魚らしい暖色）
const FISH_COLORS = ["#ff7a3c", "#ff5a2c", "#ffa14d", "#e23b2a", "#ffd08a", "#ff8f5e"];

const FLEE_RADIUS = 130; // これより近いと逃げ始める
const CRUISE = 0.55; // 巡航速度(px/frame)
const MAX_SPEED = 7;

interface Fish {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
}

export default function Tank({ questionId, scooping }: TankProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointer = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      w = canvas!.clientWidth;
      h = canvas!.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    // 金魚を生成
    const count = Math.max(8, Math.min(16, Math.round((w * h) / 90000)));
    const fishes: Fish[] = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * CRUISE,
      vy: (Math.random() - 0.5) * CRUISE,
      size: 9 + (i % 4) * 4,
      color: FISH_COLORS[i % FISH_COLORS.length],
    }));

    function step() {
      ctx!.clearRect(0, 0, w, h);
      const p = pointer.current;
      const fleeBoost = scooping ? 1.6 : 1;

      for (const f of fishes) {
        // ゆらぎ（常に少し方向を変えて漂う）
        f.vx += (Math.random() - 0.5) * 0.08;
        f.vy += (Math.random() - 0.5) * 0.08;

        // マウス/タッチから逃げる
        if (p.active) {
          const dx = f.x - p.x;
          const dy = f.y - p.y;
          const d = Math.hypot(dx, dy) || 0.0001;
          if (d < FLEE_RADIUS) {
            const force = ((FLEE_RADIUS - d) / FLEE_RADIUS) * 1.4 * fleeBoost;
            f.vx += (dx / d) * force;
            f.vy += (dy / d) * force;
          }
        }

        // 速度の調整：遅すぎたら巡航速度へ戻す／速すぎたら抑える
        let sp = Math.hypot(f.vx, f.vy);
        if (sp < CRUISE) {
          const k = CRUISE / (sp || 0.0001);
          f.vx *= k;
          f.vy *= k;
          sp = CRUISE;
        }
        if (sp > MAX_SPEED) {
          const k = MAX_SPEED / sp;
          f.vx *= k;
          f.vy *= k;
        }
        f.vx *= 0.98; // 減衰（逃げた後は落ち着く）
        f.vy *= 0.98;

        f.x += f.vx;
        f.y += f.vy;

        // 画面端で反対側へ回り込む
        const m = f.size * 2;
        if (f.x < -m) f.x = w + m;
        if (f.x > w + m) f.x = -m;
        if (f.y < -m) f.y = h + m;
        if (f.y > h + m) f.y = -m;

        drawFish(ctx!, f);
      }
      raf = requestAnimationFrame(step);
    }

    function drawFish(c: CanvasRenderingContext2D, f: Fish) {
      const angle = Math.atan2(f.vy, f.vx);
      c.save();
      c.translate(f.x, f.y);
      c.rotate(angle);
      c.globalAlpha = 0.9;
      c.shadowColor = "rgba(0,0,0,0.35)";
      c.shadowBlur = 6;
      c.fillStyle = f.color;
      // 尾びれ
      c.beginPath();
      c.moveTo(-f.size * 0.9, 0);
      c.lineTo(-f.size * 1.7, -f.size * 0.6);
      c.lineTo(-f.size * 1.7, f.size * 0.6);
      c.closePath();
      c.fill();
      // 胴体
      c.beginPath();
      c.ellipse(0, 0, f.size, f.size * 0.52, 0, 0, Math.PI * 2);
      c.fill();
      // 目
      c.shadowBlur = 0;
      c.fillStyle = "rgba(20,10,10,0.85)";
      c.beginPath();
      c.arc(f.size * 0.55, -f.size * 0.12, f.size * 0.12, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    function onPointerMove(e: PointerEvent) {
      pointer.current = { x: e.clientX, y: e.clientY, active: true };
    }
    function onPointerLeave() {
      pointer.current.active = false;
    }

    let raf = requestAnimationFrame(step);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerout", onPointerLeave);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerLeave);
      window.removeEventListener("resize", resize);
    };
  }, [scooping]);

  const col = (questionId && WATER[questionId]) || DEFAULT;
  return (
    <div
      className={`tank ${scooping ? "tank--scooping" : ""}`}
      style={{ background: `radial-gradient(120% 90% at 50% 0%, ${col.top} 0%, ${col.bottom} 75%)` }}
      aria-hidden
    >
      <div className="lanterns">
        {[...Array(6)].map((_, i) => (
          <span className="lantern" style={{ left: `${8 + i * 16}%`, animationDelay: `${i * 0.7}s` }} key={i} />
        ))}
      </div>
      <canvas ref={canvasRef} className="tank__canvas" />
      <div className="caustics" />
    </div>
  );
}
