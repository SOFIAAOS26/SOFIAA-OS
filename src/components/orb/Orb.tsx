"use client";

import { OrbState } from "./orb.states";

// Neuronas hemisferio izquierdo (azul/cian) — dentro del círculo r=86 centrado en (105,105)
const L_NEURONS: [number, number][] = [
  [45, 65], [58, 48], [72, 60], [48, 85], [68, 78],
  [55, 100], [42, 115], [65, 125], [78, 108], [52, 138],
  [70, 148], [48, 162], [78, 155], [38, 88], [62, 170],
];

// Neuronas hemisferio derecho (rosa/magenta/naranja)
const R_NEURONS: [number, number][] = [
  [122, 48], [140, 55], [155, 45], [128, 72], [145, 80],
  [162, 68], [130, 100], [155, 95], [168, 62], [135, 120],
  [152, 118], [162, 135], [142, 148], [125, 158], [158, 145],
];

// Conexiones izquierda
const L_CONNS: [number, number][] = [
  [0,1],[0,2],[0,3],[1,2],[2,4],[3,4],[3,5],[3,13],
  [4,8],[5,6],[5,7],[5,8],[6,9],[6,13],[7,8],[7,9],
  [9,10],[9,11],[10,12],[10,14],[11,14],[12,14],
];

// Conexiones derecha
const R_CONNS: [number, number][] = [
  [0,1],[0,3],[1,2],[1,3],[1,4],[2,5],[2,8],[3,4],
  [3,6],[4,5],[4,7],[5,7],[5,8],[6,7],[6,9],[7,10],
  [9,10],[9,12],[10,11],[11,12],[11,14],[12,13],[12,14],
];

const STATE_CFG: Record<OrbState, { speed: number; glow: string; waves: boolean; tint?: string }> = {
  idle:       { speed: 3.5, glow: "rgba(100,130,255,0.22)", waves: false },
  listening:  { speed: 1.8, glow: "rgba(79,124,255,0.55)",  waves: true  },
  thinking:   { speed: 1.0, glow: "rgba(155,75,210,0.50)",  waves: true  },
  responding: { speed: 0.8, glow: "rgba(233,30,140,0.55)",  waves: true  },
  cache_hit:  { speed: 0.5, glow: "rgba(0,210,200,0.65)",   waves: true,  tint: "rgba(0,220,210,0.18)" },
  error:      { speed: 2.0, glow: "rgba(255,80,60,0.55)",   waves: true,  tint: "rgba(255,60,40,0.12)" },
  success:    { speed: 0.6, glow: "rgba(52,199,89,0.65)",   waves: true,  tint: "rgba(52,199,89,0.14)" },
};

export default function Orb({ state }: { state: OrbState }) {
  const cfg = STATE_CFG[state] ?? STATE_CFG.idle;
  const s = cfg.speed;
  const spinning = state === "thinking";

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: "clamp(150px, 38vw, 260px)", height: "clamp(150px, 38vw, 260px)" }}
    >
      {/* Anillos de energía */}
      {cfg.waves && [0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: `1.5px solid ${cfg.glow}`,
            animation: `waveExpand 2.6s ease-out ${i * 0.85}s infinite`,
            opacity: 0,
          }}
        />
      ))}

      {/* Orb SVG */}
      <div
        className="w-full h-full"
        style={{ animation: spinning ? "orbSpin 14s linear infinite" : "none" }}
      >
        <svg
          viewBox="0 0 210 210"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          style={{
            filter: `drop-shadow(0 0 ${state === "idle" ? 10 : 24}px ${cfg.glow})
                     drop-shadow(0 0 ${state === "idle" ? 4  : 10}px ${cfg.glow})`,
          }}
        >
          <defs>
            {/* Gradiente principal de la esfera */}
            <radialGradient id="orbSphere" cx="38%" cy="33%" r="68%">
              <stop offset="0%"   stopColor="#C0D8FF" stopOpacity="0.95" />
              <stop offset="20%"  stopColor="#6690FF" stopOpacity="0.98" />
              <stop offset="42%"  stopColor="#7B40E0" stopOpacity="0.98" />
              <stop offset="65%"  stopColor="#D43098" stopOpacity="0.98" />
              <stop offset="85%"  stopColor="#FF5540" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#FF8020" stopOpacity="0.90" />
            </radialGradient>

            {/* Profundidad interna */}
            <radialGradient id="orbDepth" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="rgba(0,0,0,0)"    />
              <stop offset="65%"  stopColor="rgba(0,0,20,0.12)" />
              <stop offset="100%" stopColor="rgba(0,0,30,0.38)" />
            </radialGradient>

            {/* Anillo cromado */}
            <linearGradient id="chrome" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.92" />
              <stop offset="22%"  stopColor="#B0B8D8" stopOpacity="0.45" />
              <stop offset="48%"  stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="72%"  stopColor="#8890C0" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#E0E0FF" stopOpacity="0.88" />
            </linearGradient>

            {/* Clip circular */}
            <clipPath id="orbClip">
              <circle cx="105" cy="105" r="86" />
            </clipPath>

            {/* Glow para neuronas */}
            <filter id="nGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Base esfera */}
          <circle cx="105" cy="105" r="86" fill="url(#orbSphere)" />
          <circle cx="105" cy="105" r="86" fill="url(#orbDepth)" />
          {/* Tinte de estado (error=rojo, cache_hit=cian, success=verde) */}
          {cfg.tint && (
            <circle cx="105" cy="105" r="86" fill={cfg.tint} clipPath="url(#orbClip)"
              style={{ transition: "fill 0.4s ease" }} />
          )}

          {/* Conexiones izquierda — azul */}
          <g clipPath="url(#orbClip)">
            {L_CONNS.map(([a, b], i) => (
              <line
                key={`lc${i}`}
                x1={L_NEURONS[a][0]} y1={L_NEURONS[a][1]}
                x2={L_NEURONS[b][0]} y2={L_NEURONS[b][1]}
                stroke="#80B8FF"
                strokeWidth="0.75"
                style={{
                  animation: `connPulse ${s * 1.4 + (i * 0.17 % 0.9)}s ease-in-out ${i * 0.13}s infinite alternate`,
                }}
              />
            ))}
          </g>

          {/* Conexiones derecha — rosa */}
          <g clipPath="url(#orbClip)">
            {R_CONNS.map(([a, b], i) => (
              <line
                key={`rc${i}`}
                x1={R_NEURONS[a][0]} y1={R_NEURONS[a][1]}
                x2={R_NEURONS[b][0]} y2={R_NEURONS[b][1]}
                stroke="#FF55A8"
                strokeWidth="0.75"
                style={{
                  animation: `connPulse ${s * 1.3 + (i * 0.15 % 0.8)}s ease-in-out ${i * 0.11}s infinite alternate`,
                }}
              />
            ))}
          </g>

          {/* Neuronas izquierda */}
          <g clipPath="url(#orbClip)" filter="url(#nGlow)">
            {L_NEURONS.map(([x, y], i) => (
              <circle
                key={`ln${i}`}
                cx={x} cy={y}
                r={i % 4 === 0 ? 3.2 : 2.2}
                fill={i % 3 === 0 ? "#B0D0FF" : "#70A8FF"}
                style={{
                  animation: `neuronPulse ${s + (i * 0.28 % 2.2)}s ease-in-out ${i * 0.19}s infinite`,
                }}
              />
            ))}
          </g>

          {/* Neuronas derecha */}
          <g clipPath="url(#orbClip)" filter="url(#nGlow)">
            {R_NEURONS.map(([x, y], i) => (
              <circle
                key={`rn${i}`}
                cx={x} cy={y}
                r={i % 4 === 0 ? 3.2 : 2.2}
                fill={i % 3 === 0 ? "#FF9060" : "#FF40A0"}
                style={{
                  animation: `neuronPulse ${s + (i * 0.23 % 2)}s ease-in-out ${i * 0.17}s infinite`,
                }}
              />
            ))}
          </g>

          {/* Divisor vertical central */}
          <line x1="105" y1="20" x2="105" y2="190"
            stroke="url(#chrome)" strokeWidth="1.5" strokeOpacity="0.3"
            clipPath="url(#orbClip)" />

          {/* Lente central */}
          <circle cx="105" cy="105" r="11"  fill="rgba(2,8,40,0.88)"    clipPath="url(#orbClip)" />
          <circle cx="105" cy="105" r="7"   fill="rgba(80,150,255,0.18)" clipPath="url(#orbClip)" />
          <circle cx="105" cy="105" r="3.2" fill="#C8DEFF"               clipPath="url(#orbClip)" />
          <circle cx="105" cy="105" r="1.3" fill="rgba(255,255,255,0.9)" clipPath="url(#orbClip)" />

          {/* Reflejo superior izquierdo */}
          <ellipse cx="68" cy="52" rx="25" ry="12"
            fill="rgba(255,255,255,0.13)"
            transform="rotate(-22, 68, 52)"
            clipPath="url(#orbClip)" />
          <ellipse cx="72" cy="56" rx="11" ry="5"
            fill="rgba(255,255,255,0.20)"
            transform="rotate(-22, 72, 56)"
            clipPath="url(#orbClip)" />

          {/* Anillo cromado exterior */}
          <circle cx="105" cy="105" r="86"   fill="none" stroke="url(#chrome)"               strokeWidth="3"   />
          <circle cx="105" cy="105" r="90"   fill="none" stroke="rgba(255,255,255,0.16)"      strokeWidth="1.5" />
          <circle cx="105" cy="105" r="82.5" fill="none" stroke="rgba(255,255,255,0.055)"     strokeWidth="1"   />
        </svg>
      </div>
    </div>
  );
}
