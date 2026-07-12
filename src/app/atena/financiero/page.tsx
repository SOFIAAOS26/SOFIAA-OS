"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import type { FinancialProjection, CashFlowPeriod } from "@/extensions/atena/schema";

function atenaPath(uid: string, col: string) {
  return `users/${uid}/atena_${col}`;
}

const NAV = [
  { label: "Centro de Mando", href: "/atena",            icon: "⬡" },
  { label: "Proyectos DMAIC", href: "/atena/proyectos",  icon: "◈" },
  { label: "Análisis ANOVA",  href: "/atena/analisis",   icon: "∑" },
  { label: "Control SPC",     href: "/atena/spc",        icon: "≋" },
  { label: "Riesgos AMEF",    href: "/atena/amef",       icon: "⚠" },
  { label: "Financiero",      href: "/atena/financiero", icon: "$", active: true },
];

function formatMXN(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

// ── Curva de Flujo de Caja SVG ───────────────────────────────────────────────
function CashFlowChart({ flujos }: { flujos: CashFlowPeriod[] }) {
  const W = 800, H = 260;
  const PAD = { top: 20, right: 20, bottom: 36, left: 70 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const vals = flujos.map((f) => f.flujoAcumulado);
  const yMin = Math.min(...vals, 0) * 1.15;
  const yMax = Math.max(...vals, 0) * 1.15;
  const yRange = yMax - yMin || 1;
  const n = flujos.length;

  function fy(v: number) { return PAD.top + cH - ((v - yMin) / yRange) * cH; }
  function fx(i: number) { return PAD.left + (i / (n - 1)) * cW; }

  // Zero line
  const zeroY = fy(0);

  // SVG path for accumulated cash flow
  const acumPath = flujos
    .map((f, i) => `${i === 0 ? "M" : "L"}${fx(i).toFixed(1)},${fy(f.flujoAcumulado).toFixed(1)}`)
    .join(" ");

  // Area fill
  const areaPath = `${acumPath} L${fx(n - 1).toFixed(1)},${zeroY.toFixed(1)} L${fx(0).toFixed(1)},${zeroY.toFixed(1)} Z`;

  // Breakeven point (first positive cumulative)
  const breakEvenIdx = flujos.findIndex((f) => f.flujoAcumulado >= 0);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[500px]">
        {/* Zero line */}
        <line x1={PAD.left} y1={zeroY} x2={PAD.left + cW} y2={zeroY}
          stroke="#1e1e2e" strokeWidth={1.5} strokeDasharray="4,4" />

        {/* Area */}
        <path d={areaPath} fill="#22c55e" fillOpacity={0.06} />

        {/* Curve */}
        <path d={acumPath} fill="none" stroke="#22c55e" strokeWidth={2} />

        {/* Data points */}
        {flujos.map((f, i) => (
          <circle key={i}
            cx={fx(i)} cy={fy(f.flujoAcumulado)} r={3}
            fill={f.flujoAcumulado >= 0 ? "#22c55e" : "#ef4444"}
            fillOpacity={0.9}
          />
        ))}

        {/* Breakeven marker */}
        {breakEvenIdx > 0 && (
          <g>
            <line x1={fx(breakEvenIdx)} y1={PAD.top}
              x2={fx(breakEvenIdx)} y2={PAD.top + cH}
              stroke="#60a5fa" strokeWidth={1} strokeDasharray="4,4" />
            <text x={fx(breakEvenIdx) + 4} y={PAD.top + 14}
              fill="#60a5fa" fontSize={9} fontFamily="monospace">
              Payback: {flujos[breakEvenIdx]?.label}
            </text>
          </g>
        )}

        {/* Y axis labels */}
        {[yMin, 0, yMax].map((v) => (
          <text key={v} x={PAD.left - 6} y={fy(v) + 4}
            textAnchor="end" fill="#475569" fontSize={9} fontFamily="monospace">
            {formatMXN(v)}
          </text>
        ))}

        {/* X axis labels */}
        {flujos.filter((_, i) => i % 2 === 0 || i === n - 1).map((f) => (
          <text key={f.mes} x={fx(f.mes - 1)} y={PAD.top + cH + 16}
            textAnchor="middle" fill="#475569" fontSize={9} fontFamily="monospace">
            {f.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ── Monte Carlo Histogram (simplified) ───────────────────────────────────────
function MonteCarloViz({ p10, p50, p90 }: { p10: number; p50: number; p90: number }) {
  const max = p90 * 1.1;
  const toX = (v: number) => (v / max) * 100;

  return (
    <div className="space-y-3">
      {[
        { label: "P10 — Pesimista",  value: p10, color: "#ef4444" },
        { label: "P50 — Base",       value: p50, color: "#60a5fa" },
        { label: "P90 — Optimista",  value: p90, color: "#22c55e" },
      ].map((s) => (
        <div key={s.label}>
          <div className="flex justify-between text-xs font-mono mb-1">
            <span className="text-[#475569]">{s.label}</span>
            <span style={{ color: s.color }} className="font-bold">{s.value.toFixed(1)} meses</span>
          </div>
          <div className="h-5 bg-[#0a0a0f] rounded overflow-hidden">
            <div className="h-full rounded transition-all duration-700"
              style={{ width: `${toX(s.value)}%`, background: `${s.color}44`, borderRight: `2px solid ${s.color}` }} />
          </div>
        </div>
      ))}
      <p className="text-[10px] text-[#334155] font-mono pt-1">
        10,000 simulaciones Monte Carlo · Distribución de período de retorno
      </p>
    </div>
  );
}

export default function AtenaFinancieroPage() {
  const router = useRouter();
  const [uid,      setUid]  = useState<string | null>(null);
  const [fin,      setFin]  = useState<(FinancialProjection & { id: string }) | null>(null);
  const [loading,  setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { if (u) setUid(u.uid); });
    return unsub;
  }, []);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, atenaPath(uid, "financiero")), orderBy("computedAt", "desc"), limit(1))
        );
        if (!snap.empty) {
          setFin({ id: snap.docs[0].id, ...(snap.docs[0].data() as Omit<FinancialProjection, "id">) });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

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
          <h1 className="text-xl font-bold text-white">Proyección Financiera</h1>
          <p className="text-xs text-[#475569] font-mono mt-0.5">
            VAN · TIR · Flujo de Caja · Monte Carlo — {fin?.moneda ?? "MXN"}
          </p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <span className="text-[#475569] font-mono text-sm animate-pulse">Cargando proyección financiera...</span>
          </div>
        ) : !fin ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <span className="text-3xl">$</span>
            <p className="text-[#475569] font-mono text-sm">Sin datos. Ejecuta <code className="text-[#60a5fa]">npm run atena:seed</code></p>
          </div>
        ) : (
          <div className="px-8 py-8 space-y-8 max-w-5xl">

            {/* Hero KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "VAN",             value: formatMXN(fin.van),             sub: "Valor Actual Neto",        accent: "text-[#22c55e]" },
                { label: "TIR",             value: `${(fin.tir * 100).toFixed(0)}%`, sub: "Tasa Interna de Retorno", accent: fin.tir > fin.tasaDescuento ? "text-[#22c55e]" : "text-[#ef4444]" },
                { label: "Payback",         value: `${fin.periodoRetornoMeses.toFixed(1)} m`, sub: "Período de retorno",    accent: "text-[#60a5fa]" },
                { label: "Ahorro Neto",     value: formatMXN(fin.ahorroNetoAnual),  sub: "Anual",                   accent: "text-[#a78bfa]" },
              ].map((k) => (
                <div key={k.label} className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-5 text-center">
                  <div className="text-[10px] font-mono text-[#475569] uppercase mb-2">{k.label}</div>
                  <div className={`text-3xl font-mono font-black mb-1 ${k.accent}`}>{k.value}</div>
                  <div className="text-[10px] text-[#334155] font-mono">{k.sub}</div>
                </div>
              ))}
            </div>

            {/* VAN positivo banner */}
            {fin.van > 0 && (
              <div className="bg-[#0a1f0a] border-2 border-[#166534] rounded-xl p-5 flex items-start gap-4">
                <span className="text-[#22c55e] text-2xl shrink-0">✓</span>
                <div>
                  <p className="text-[#86efac] font-bold text-lg">Proyecto Financieramente Viable</p>
                  <p className="text-[#14532d] text-sm font-mono mt-1">
                    TIR ({(fin.tir * 100).toFixed(0)}%) &gt; WACC ({(fin.tasaDescuento * 100).toFixed(0)}%) ·
                    VAN positivo de {formatMXN(fin.van)} MXN ·
                    ROI proyectado en {fin.periodoRetornoMeses.toFixed(1)} meses
                  </p>
                </div>
              </div>
            )}

            {/* Desglose de costos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Costo Actual Anual",       value: fin.costoActualAnual,     color: "#ef4444" },
                { label: "Costo Proyectado Anual",   value: fin.costoProyectadoAnual, color: "#f97316" },
                { label: "Costo de Implementación",  value: fin.costoImplementacion,  color: "#eab308" },
              ].map((c) => (
                <div key={c.label} className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-4">
                  <div className="text-[10px] font-mono text-[#475569] uppercase mb-2">{c.label}</div>
                  <div className="text-2xl font-mono font-black" style={{ color: c.color }}>
                    {formatMXN(c.value)}
                  </div>
                  <div className="text-[10px] text-[#334155] font-mono mt-1">MXN</div>
                </div>
              ))}
            </div>

            {/* Flujo de caja */}
            <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6">
              <h3 className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-4">
                Curva de Flujo de Caja Acumulado — {fin.moneda}
              </h3>
              <CashFlowChart flujos={fin.flujoDeCaja} />
              <div className="mt-4 flex items-center gap-6 text-[10px] font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 bg-[#22c55e] inline-block" />
                  <span className="text-[#475569]">Flujo acumulado</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 bg-[#60a5fa] inline-block border-dashed" />
                  <span className="text-[#475569]">Punto de equilibrio</span>
                </span>
              </div>
            </div>

            {/* Monte Carlo */}
            <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-xs font-mono text-[#475569] uppercase tracking-widest">
                    Simulación Monte Carlo — Período de Retorno
                  </h3>
                  <p className="text-[10px] text-[#334155] font-mono mt-1">
                    {fin.monteCarlo.iteraciones.toLocaleString()} iteraciones · distribución de escenarios
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-mono font-black text-[#60a5fa]">
                    {fin.monteCarlo.p50.toFixed(1)} m
                  </div>
                  <div className="text-[10px] text-[#334155] font-mono">mediana</div>
                </div>
              </div>
              <MonteCarloViz
                p10={fin.monteCarlo.p10}
                p50={fin.monteCarlo.p50}
                p90={fin.monteCarlo.p90}
              />
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
