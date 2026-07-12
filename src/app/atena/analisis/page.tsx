"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import type { AnovaResult, MediaPorGrupo } from "@/extensions/atena/schema";

function atenaPath(uid: string, col: string) {
  return `users/${uid}/atena_${col}`;
}

const NAV = [
  { label: "Centro de Mando", href: "/atena",           icon: "⬡" },
  { label: "Proyectos DMAIC", href: "/atena/proyectos", icon: "◈" },
  { label: "Análisis ANOVA",  href: "/atena/analisis",  icon: "∑", active: true },
  { label: "Control SPC",     href: "/atena/spc",       icon: "≋" },
  { label: "Riesgos AMEF",    href: "/atena/amef",      icon: "⚠" },
  { label: "Financiero",      href: "/atena/financiero", icon: "$" },
];

// ── Barra de medias por grupo ─────────────────────────────────────────────────
function GroupBar({ grupo, media, stdDev, n, maxMedia }: MediaPorGrupo & { maxMedia: number }) {
  const pct = maxMedia > 0 ? (media / maxMedia) * 100 : 0;
  const colors = ["#60a5fa", "#34d399", "#a78bfa", "#fb923c"];
  const colorIndex = ["Línea A", "Línea B", "Línea C"].indexOf(grupo);
  const color = colors[colorIndex >= 0 ? colorIndex : 0];

  return (
    <div className="flex items-center gap-4">
      <div className="w-20 text-right text-xs font-mono text-[#94a3b8] shrink-0">{grupo}</div>
      <div className="flex-1 h-8 bg-[#0a0a0f] rounded-lg overflow-hidden relative">
        <div
          className="h-full rounded-lg flex items-center px-3 transition-all duration-700"
          style={{ width: `${pct}%`, background: `${color}22`, borderLeft: `3px solid ${color}` }}
        />
        <div className="absolute inset-0 flex items-center px-3 gap-4">
          <span className="font-mono font-bold text-sm" style={{ color }}>{media.toFixed(1)}s</span>
          <span className="text-[#475569] text-xs font-mono">±{stdDev.toFixed(1)}σ</span>
          <span className="text-[#334155] text-xs font-mono">n={n}</span>
        </div>
      </div>
    </div>
  );
}

export default function AtenaAnalisisPage() {
  const router = useRouter();
  const [uid,     setUid]     = useState<string | null>(null);
  const [analisis, setAnalisis] = useState<(AnovaResult & { id: string }) | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { if (u) setUid(u.uid); });
    return unsub;
  }, []);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, atenaPath(uid, "analisis")), orderBy("computedAt", "desc"), limit(1))
        );
        if (!snap.empty) {
          setAnalisis({ id: snap.docs[0].id, ...(snap.docs[0].data() as Omit<AnovaResult, "id">) });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  const maxMedia = analisis
    ? Math.max(...analisis.mediasPorGrupo.map((g) => g.media))
    : 0;

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
          <h1 className="text-xl font-bold text-white">Análisis de Varianza — ANOVA</h1>
          <p className="text-xs text-[#475569] font-mono mt-0.5">
            Motor estadístico determinista · Resultados exactos del cómputo científico
          </p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <span className="text-[#475569] font-mono text-sm animate-pulse">Cargando resultados del motor...</span>
          </div>
        ) : !analisis ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <span className="text-3xl">∑</span>
            <p className="text-[#475569] font-mono text-sm">Sin datos. Ejecuta <code className="text-[#60a5fa]">npm run atena:seed</code></p>
          </div>
        ) : (
          <div className="px-8 py-8 space-y-8 max-w-5xl">

            {/* Resultado principal */}
            <div className={`rounded-xl p-6 border-2 ${
              analisis.significativo
                ? "bg-[#0a1f0a] border-[#166534]"
                : "bg-[#1a0a0a] border-[#7f1d1d]"
            }`}>
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-1">
                    Resultado ANOVA — {analisis.variableDependiente}
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-2xl font-bold ${analisis.significativo ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                      {analisis.significativo ? "✓ Diferencia Significativa" : "✗ Sin Diferencia Significativa"}
                    </span>
                  </div>
                  <p className="text-[#94a3b8] text-sm leading-relaxed max-w-2xl">
                    {analisis.interpretacion}
                  </p>
                </div>
              </div>
            </div>

            {/* Tabla de estadísticos */}
            <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6">
              <h3 className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-5">
                Estadísticos del Motor
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: "F-Statistic",     value: analisis.fStat.toFixed(2),                    accent: "text-[#fb923c]" },
                  { label: "p-value",          value: analisis.pValue.toFixed(4),                   accent: analisis.pValue < 0.05 ? "text-[#22c55e]" : "text-[#ef4444]" },
                  { label: "Nivel Confianza",  value: `${(analisis.nivelConfianza * 100).toFixed(0)}%`, accent: "text-[#60a5fa]" },
                  { label: "GL Entre Grupos",  value: analisis.gradosLibertadEntreGrupos.toString(), accent: "text-[#a78bfa]" },
                  { label: "GL Intra Grupos",  value: analisis.gradosLibertadIntraGrupos.toString(), accent: "text-[#a78bfa]" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-[#0a0a0f] rounded-lg p-4 text-center">
                    <div className="text-[10px] font-mono text-[#475569] uppercase mb-2">{stat.label}</div>
                    <div className={`text-2xl font-mono font-black ${stat.accent}`}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Regla de decisión */}
              <div className="mt-5 p-3 bg-[#0a0a0f] rounded-lg border border-[#1e1e2e]">
                <span className="text-xs font-mono text-[#475569]">Regla de decisión: </span>
                <span className="text-xs font-mono text-[#94a3b8]">
                  p-value ({analisis.pValue.toFixed(4)}) {analisis.significativo ? "<" : "≥"} α (0.0500)
                  → Se {analisis.significativo ? "rechaza" : "acepta"} H₀
                </span>
              </div>
            </div>

            {/* Medias por grupo */}
            <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6">
              <h3 className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-5">
                Medias por Grupo — Tiempo de Ciclo (segundos)
              </h3>
              <div className="space-y-4">
                {analisis.mediasPorGrupo
                  .slice()
                  .sort((a, b) => b.media - a.media)
                  .map((g) => (
                    <GroupBar key={g.grupo} {...g} maxMedia={maxMedia} />
                  ))}
              </div>

              {/* Diferencia entre extremos */}
              {analisis.mediasPorGrupo.length >= 2 && (() => {
                const sorted  = [...analisis.mediasPorGrupo].sort((a, b) => b.media - a.media);
                const max     = sorted[0];
                const min     = sorted[sorted.length - 1];
                const diff    = (max.media - min.media).toFixed(1);
                const pctDiff = ((max.media - min.media) / max.media * 100).toFixed(1);
                return (
                  <div className="mt-5 p-4 bg-[#0a1a0a] border border-[#166534] rounded-lg">
                    <p className="text-[#86efac] text-sm font-semibold">
                      Δ {diff}s entre {max.grupo} y {min.grupo} ({pctDiff}% de diferencia)
                    </p>
                    <p className="text-[#14532d] text-xs font-mono mt-1">
                      Estandarizar prácticas de {min.grupo} en todas las líneas → ahorro potencial de {diff}s por ciclo
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Tabla detallada */}
            <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6">
              <h3 className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-4">
                Estadísticos Descriptivos por Grupo
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] font-mono text-[#475569] uppercase border-b border-[#1e1e2e]">
                      <th className="text-left pb-2 pr-6">Grupo</th>
                      <th className="text-right pb-2 pr-6">n</th>
                      <th className="text-right pb-2 pr-6">Media (s)</th>
                      <th className="text-right pb-2 pr-6">Desv. Est.</th>
                      <th className="text-right pb-2 pr-6">Mín</th>
                      <th className="text-right pb-2">Máx</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e1e2e]">
                    {analisis.mediasPorGrupo.map((g, i) => {
                      const colors = ["text-[#60a5fa]", "text-[#34d399]", "text-[#a78bfa]"];
                      return (
                        <tr key={g.grupo} className="hover:bg-[#0a0a0f] transition-colors">
                          <td className={`py-3 pr-6 font-mono font-bold ${colors[i] ?? "text-white"}`}>{g.grupo}</td>
                          <td className="py-3 pr-6 text-right font-mono text-[#94a3b8]">{g.n}</td>
                          <td className="py-3 pr-6 text-right font-mono font-bold text-white">{g.media.toFixed(1)}</td>
                          <td className="py-3 pr-6 text-right font-mono text-[#94a3b8]">{g.stdDev.toFixed(1)}</td>
                          <td className="py-3 pr-6 text-right font-mono text-[#64748b]">{g.min}</td>
                          <td className="py-3 text-right font-mono text-[#64748b]">{g.max}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
