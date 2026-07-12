"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import type { SPCData, SPCPoint } from "@/extensions/atena/schema";

function atenaPath(uid: string, col: string) {
  return `users/${uid}/atena_${col}`;
}

const NAV = [
  { label: "Centro de Mando", href: "/atena",           icon: "⬡" },
  { label: "Proyectos DMAIC", href: "/atena/proyectos", icon: "◈" },
  { label: "Análisis ANOVA",  href: "/atena/analisis",  icon: "∑" },
  { label: "Control SPC",     href: "/atena/spc",       icon: "≋", active: true },
  { label: "Riesgos AMEF",    href: "/atena/amef",      icon: "⚠" },
  { label: "Financiero",      href: "/atena/financiero", icon: "$" },
];

// ── Carta de Control SVG ──────────────────────────────────────────────────────
function SPCChart({ spc }: { spc: SPCData }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 900, H = 320;
  const PAD = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const puntos = spc.puntos;
  const n      = puntos.length;

  // Escala Y
  const allVals = puntos.map((p) => p.valor);
  const yMin = Math.min(...allVals, spc.lci) - 20;
  const yMax = Math.max(...allVals, spc.lcs) + 20;
  const yRange = yMax - yMin;

  function fy(v: number) { return PAD.top + chartH - ((v - yMin) / yRange) * chartH; }
  function fx(i: number) { return PAD.left + (i / (n - 1)) * chartW; }

  // Línea de puntos
  const path = puntos
    .map((p, i) => `${i === 0 ? "M" : "L"}${fx(i).toFixed(1)},${fy(p.valor).toFixed(1)}`)
    .join(" ");

  // Líneas horizontales de referencia
  const hLines = [
    { y: spc.lcs,      color: "#ef4444", dash: "",          label: `LCS ${spc.lcs}` },
    { y: spc.lcs2sigma, color: "#f97316", dash: "4,4",       label: `+2σ ${spc.lcs2sigma}` },
    { y: spc.media,    color: "#60a5fa", dash: "",          label: `X̄ ${spc.media}` },
    { y: spc.lci2sigma, color: "#f97316", dash: "4,4",       label: `-2σ ${spc.lci2sigma}` },
    { y: spc.lci,      color: "#ef4444", dash: "",          label: `LCI ${spc.lci}` },
  ];

  return (
    <div className="overflow-x-auto">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[600px]">
        {/* Zona de control (+/-3σ) */}
        <rect
          x={PAD.left} y={fy(spc.lcs)}
          width={chartW} height={fy(spc.lci) - fy(spc.lcs)}
          fill="#22c55e" fillOpacity={0.04}
        />

        {/* Líneas de referencia */}
        {hLines.map((line) => (
          <g key={line.label}>
            <line
              x1={PAD.left} y1={fy(line.y)}
              x2={PAD.left + chartW} y2={fy(line.y)}
              stroke={line.color} strokeWidth={line.y === spc.media ? 1.5 : 1}
              strokeDasharray={line.dash} strokeOpacity={0.8}
            />
            <text
              x={PAD.left + chartW + 4} y={fy(line.y) + 4}
              fill={line.color} fontSize={10} fontFamily="monospace" fillOpacity={0.9}
            >
              {line.label}
            </text>
          </g>
        ))}

        {/* Eje X */}
        <line
          x1={PAD.left} y1={PAD.top + chartH}
          x2={PAD.left + chartW} y2={PAD.top + chartH}
          stroke="#1e1e2e" strokeWidth={1}
        />

        {/* Eje Y ticks */}
        {[spc.lci, spc.media, spc.lcs].map((v) => (
          <text key={v}
            x={PAD.left - 6} y={fy(v) + 4}
            textAnchor="end" fill="#475569" fontSize={10} fontFamily="monospace">
            {v}
          </text>
        ))}

        {/* Línea de datos */}
        <path d={path} fill="none" stroke="#60a5fa" strokeWidth={1.5} strokeOpacity={0.7} />

        {/* Puntos */}
        {puntos.map((p, i) => (
          <g key={i}>
            <circle
              cx={fx(i)} cy={fy(p.valor)} r={p.fueraDeControl ? 6 : 4}
              fill={p.fueraDeControl ? "#ef4444" : "#60a5fa"}
              fillOpacity={p.fueraDeControl ? 1 : 0.8}
              stroke={p.fueraDeControl ? "#fca5a5" : "none"}
              strokeWidth={2}
            />
            {p.fueraDeControl && (
              <text
                x={fx(i)} y={fy(p.valor) - 10}
                textAnchor="middle" fill="#ef4444"
                fontSize={9} fontFamily="monospace" fontWeight="bold">
                {p.valor}
              </text>
            )}
          </g>
        ))}

        {/* Eje X labels — cada 5 puntos */}
        {puntos.filter((_, i) => i % 5 === 0 || i === puntos.length - 1).map((p) => (
          <text key={p.index}
            x={fx(p.index - 1)} y={PAD.top + chartH + 16}
            textAnchor="middle" fill="#475569" fontSize={9} fontFamily="monospace">
            {p.index}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AtenaSPCPage() {
  const router = useRouter();
  const [uid,     setUid]  = useState<string | null>(null);
  const [spc,     setSpc]  = useState<(SPCData & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { if (u) setUid(u.uid); });
    return unsub;
  }, []);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, atenaPath(uid, "spc")), orderBy("computedAt", "desc"), limit(1))
        );
        if (!snap.empty) {
          setSpc({ id: snap.docs[0].id, ...(snap.docs[0].data() as Omit<SPCData, "id">) });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  const puntosFuera = spc?.puntos.filter((p: SPCPoint) => p.fueraDeControl) ?? [];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-[#1e1e2e] shrink-0">
        <div className="px-5 py-6 border-b border-[#1e1e2e]">
          <button onClick={() => router.push("/atena")}
            className="text-lg font-mono font-black text-[#60a5fa] tracking-widest hover:opacity-80">
            ATENA
          </button>
          <div className="text-[10px] text-[#334155] font-mono mt-0.5">Scientific Intelligence Engine</div>
        </div>
        <nav className="py-4 px-2 space-y-0.5">
          {NAV.map((item) => (
            <button key={item.href} onClick={() => router.push(item.href)}
              className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-mono transition-colors ${
                item.active ? "bg-[#1e3a5f] text-[#60a5fa]" : "text-[#94a3b8] hover:bg-[#111118] hover:text-white"
              }`}>
              <span className="text-[#60a5fa] w-4 text-center">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-4 pb-4">
          <button onClick={() => router.push("/")}
            className="text-xs text-[#334155] hover:text-[#60a5fa] transition-colors font-mono">
            ← Volver a SOFIAA
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <header className="border-b border-[#1e1e2e] px-8 py-5">
          <h1 className="text-xl font-bold text-white">Control Estadístico de Proceso — SPC</h1>
          <p className="text-xs text-[#475569] font-mono mt-0.5">
            Carta de Control X̄ · Límites ±3σ · Reglas Western Electric
          </p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <span className="text-[#475569] font-mono text-sm animate-pulse">Cargando datos SPC...</span>
          </div>
        ) : !spc ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <span className="text-3xl">≋</span>
            <p className="text-[#475569] font-mono text-sm">Sin datos. Ejecuta <code className="text-[#60a5fa]">npm run atena:seed</code></p>
          </div>
        ) : (
          <div className="px-8 py-8 space-y-8 max-w-5xl">

            {/* Status banner */}
            <div className="bg-[#1a0a0a] border-2 border-[#7f1d1d] rounded-xl p-5 flex items-start gap-4">
              <span className="text-[#ef4444] text-2xl shrink-0">⚠</span>
              <div>
                <p className="text-[#fca5a5] font-bold text-lg">
                  Proceso FUERA de Control Estadístico
                </p>
                <p className="text-[#7f1d1d] text-sm font-mono mt-1">{spc.interpretacion}</p>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: "Media X̄",      value: `${spc.media}s`,      accent: "text-[#60a5fa]" },
                { label: "Desv. Est. σ",  value: `${spc.stdDev}s`,     accent: "text-[#a78bfa]" },
                { label: "Cp",            value: spc.cp.toFixed(2),    accent: spc.cp >= 1 ? "text-[#22c55e]" : "text-[#ef4444]" },
                { label: "Cpk",           value: spc.cpk.toFixed(2),   accent: spc.cpk >= 1 ? "text-[#22c55e]" : "text-[#ef4444]" },
                { label: "Nivel σ",       value: `${spc.sigmaLevel}σ`, accent: "text-[#f97316]" },
              ].map((k) => (
                <div key={k.label} className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-4 text-center">
                  <div className="text-[10px] font-mono text-[#475569] uppercase mb-2">{k.label}</div>
                  <div className={`text-2xl font-mono font-black ${k.accent}`}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Límites */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "LCS (+3σ)",  value: spc.lcs,   color: "#ef4444" },
                { label: "X̄ (Media)", value: spc.media,  color: "#60a5fa" },
                { label: "LCI (-3σ)",  value: spc.lci,   color: "#ef4444" },
              ].map((l) => (
                <div key={l.label} className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-4">
                  <div className="text-[10px] font-mono text-[#475569] uppercase mb-1">{l.label}</div>
                  <div className="text-2xl font-mono font-black" style={{ color: l.color }}>{l.value}s</div>
                </div>
              ))}
            </div>

            {/* Carta de control */}
            <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-mono text-[#475569] uppercase tracking-widest">
                  Carta de Control — {spc.variable}
                </h3>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#60a5fa] inline-block" />
                    <span className="text-[#475569]">Normal</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#ef4444] inline-block" />
                    <span className="text-[#ef4444]">Fuera de control</span>
                  </span>
                </div>
              </div>
              <SPCChart spc={spc} />
            </div>

            {/* Violaciones */}
            {puntosFuera.length > 0 && (
              <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6">
                <h3 className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-4">
                  Puntos Fuera de Control ({puntosFuera.length} detecciones)
                </h3>
                <div className="space-y-2">
                  {puntosFuera.map((p: SPCPoint) => (
                    <div key={p.index} className="flex items-center gap-4 bg-[#1a0a0a] border border-[#7f1d1d] rounded-lg px-4 py-3">
                      <span className="font-mono font-bold text-[#ef4444] w-16 shrink-0">Punto {p.index}</span>
                      <span className="font-mono font-black text-white w-16 shrink-0">{p.valor}s</span>
                      <span className="text-[#7f1d1d] text-xs font-mono">{p.reglaViolada}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-[#0a0a0f] rounded-lg">
                  <p className="text-xs font-mono text-[#475569]">
                    ⚠ Causa especial de variación detectada — investigar fuente de los puntos extremos antes de implementar mejoras de proceso
                  </p>
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
