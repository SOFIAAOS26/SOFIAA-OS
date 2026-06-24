"use client";
import { useRef, useEffect } from "react";
import { OrbState } from "./orb.states";

// ── Estado → parámetros de animación ───────────────────────────────────────
type WaveState = "idle" | "listening" | "thinking" | "speaking";

const STATE_MAP: Record<OrbState, WaveState> = {
  idle:       "idle",
  listening:  "listening",
  thinking:   "thinking",
  responding: "speaking",
  cache_hit:  "speaking",
  error:      "thinking",
  success:    "speaking",
};

const SP: Record<WaveState, { amp: number; spd: number; alpha: number }> = {
  idle:      { amp: 0.24, spd: 0.38, alpha: 0.72 },  // respira, no muere
  listening: { amp: 0.48, spd: 0.80, alpha: 0.88 },
  thinking:  { amp: 0.10, spd: 0.22, alpha: 0.50 },
  speaking:  { amp: 1.00, spd: 2.60, alpha: 1.00 },
};

// ── Definición de ondas — colores de la paleta SOFIAA ──────────────────────
const WD = [
  { a: 0.230, f: 1.05, s: 0.50, p: 0.00, r:  79, g: 124, b: 255, lw: 2.8 }, // azul SOFIAA
  { a: 0.185, f: 1.68, s: 0.84, p: 1.15, r: 155, g:  79, b: 217, lw: 2.2 }, // violeta SOFIAA
  { a: 0.145, f: 2.32, s: 1.24, p: 2.25, r: 233, g:  30, b: 140, lw: 1.9 }, // rosa SOFIAA
  { a: 0.105, f: 3.08, s: 1.70, p: 3.40, r: 138, g:  32, b: 255, lw: 1.6 }, // púrpura
  { a: 0.072, f: 2.68, s: 2.08, p: 4.20, r: 255, g:  88, b: 200, lw: 1.3 }, // pink suave
  { a: 0.046, f: 3.90, s: 2.65, p: 0.90, r:  79, g: 170, b: 255, lw: 1.0 }, // azul claro
];

const N   = 110;
const BUF = new Float32Array(N * 2);

function drawWave(
  ctx: CanvasRenderingContext2D,
  W: number, H: number, t: number,
  wd: typeof WD[0],
  p: { amp: number; spd: number; alpha: number },
  flip: boolean
) {
  const cy    = H / 2;
  const ampPx = H * wd.a * p.amp;
  if (ampPx < 1) return;

  const sign = flip ? 1 : -1;
  const ph   = flip ? wd.p + Math.PI * 0.58 : wd.p;

  for (let i = 0; i < N; i++) {
    const θ = (i / (N - 1)) * Math.PI * 2 * wd.f + t * wd.s * p.spd + ph;
    BUF[i * 2]     = (i / (N - 1)) * W;
    BUF[i * 2 + 1] = cy + sign * (
      Math.sin(θ)               * ampPx * 0.54 +
      Math.sin(θ * 2.10 + 0.8)  * ampPx * 0.27 +
      Math.sin(θ * 0.72 - 1.1)  * ampPx * 0.19
    );
  }

  const { r, g, b, lw } = wd;

  ctx.save();
  ctx.lineCap = "round";

  // Relleno degradado bajo la onda
  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    i === 0
      ? ctx.moveTo(BUF[i * 2], BUF[i * 2 + 1])
      : ctx.lineTo(BUF[i * 2], BUF[i * 2 + 1]);
  }
  ctx.lineTo(W, cy);
  ctx.lineTo(0, cy);
  ctx.closePath();

  const fg = flip
    ? ctx.createLinearGradient(0, cy, 0, cy + ampPx)
    : ctx.createLinearGradient(0, cy - ampPx, 0, cy);
  fg.addColorStop(0, flip ? `rgba(${r},${g},${b},0)` : `rgba(${r},${g},${b},0.18)`);
  fg.addColorStop(1, flip ? `rgba(${r},${g},${b},0.18)` : `rgba(${r},${g},${b},0)`);
  ctx.fillStyle   = fg;
  ctx.globalAlpha = p.alpha * 0.36;
  ctx.fill();

  // Trazar la onda: halo ancho → glow → línea nítida
  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    i === 0
      ? ctx.moveTo(BUF[i * 2], BUF[i * 2 + 1])
      : ctx.lineTo(BUF[i * 2], BUF[i * 2 + 1]);
  }

  // Halo exterior
  ctx.lineWidth   = lw * 9;
  ctx.globalAlpha = p.alpha * 0.035;
  ctx.strokeStyle = `rgb(${r},${g},${b})`;
  ctx.stroke();

  // Glow medio
  ctx.lineWidth   = lw * 3.8;
  ctx.globalAlpha = p.alpha * 0.13;
  ctx.stroke();

  // Línea core
  ctx.lineWidth   = lw;
  ctx.globalAlpha = p.alpha * 0.90;
  ctx.strokeStyle = `rgba(${r},${g},${b},0.92)`;
  ctx.stroke();

  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
interface Props { state: OrbState }

export default function SofiaWave({ state }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef  = useRef<OrbState>(state);
  const pRef      = useRef({ amp: 0.07, spd: 0.28, alpha: 0.60 });

  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext("2d")!;
    let raf: number, t = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width  = width  * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const frame = () => {
      t += 0.016;
      const { width: W, height: H } = canvas.getBoundingClientRect();
      const cur = stateRef.current;
      const p   = pRef.current;
      const tp  = SP[STATE_MAP[cur]];

      p.amp   += (tp.amp   - p.amp)   * 0.038;
      p.spd   += (tp.spd   - p.spd)   * 0.038;
      p.alpha += (tp.alpha - p.alpha) * 0.038;

      // Fondo transparente
      ctx.clearRect(0, 0, W, H);

      // Ondas
      WD.forEach(wd => {
        drawWave(ctx, W, H, t, wd, p, false);
        drawWave(ctx, W, H, t, wd, p, true);
      });

      // Fade en bordes — borra el alpha de lo dibujado para que las orillas se disuelvan
      const FADE = W * 0.13;
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      const lf = ctx.createLinearGradient(0, 0, FADE, 0);
      lf.addColorStop(0, "rgba(0,0,0,1)");
      lf.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = lf;
      ctx.fillRect(0, 0, FADE, H);
      const rf = ctx.createLinearGradient(W - FADE, 0, W, 0);
      rf.addColorStop(0, "rgba(0,0,0,0)");
      rf.addColorStop(1, "rgba(0,0,0,1)");
      ctx.fillStyle = rf;
      ctx.fillRect(W - FADE, 0, FADE, H);
      ctx.restore();

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
