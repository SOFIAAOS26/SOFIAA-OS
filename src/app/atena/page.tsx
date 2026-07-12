"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import type { ProjectCharter } from "@/extensions/atena/schema";

// ── Helpers ───────────────────────────────────────────────────────────────────

function atenaPath(uid: string, col: string) {
  return `users/${uid}/atena_${col}`;
}

const FASE_ORDER: Record<string, number> = {
  DEFINE: 1, MEASURE: 2, ANALYZE: 3, IMPROVE: 4, CONTROL: 5,
};

const FASE_COLOR: Record<string, string> = {
  DEFINE:  "bg-[#1e3a5f] text-[#60a5fa]",
  MEASURE: "bg-[#1a3a2a] text-[#34d399]",
  ANALYZE: "bg-[#3a2a1a] text-[#fb923c]",
  IMPROVE: "bg-[#2a1a3a] text-[#a78bfa]",
  CONTROL: "bg-[#1a1a3a] text-[#818cf8]",
};

function FaseBadge({ fase }: { fase: string }) {
  return (
    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${FASE_COLOR[fase] ?? "bg-gray-800 text-gray-400"}`}>
      {fase}
    </span>
  );
}

function KPICard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-5 flex flex-col gap-1">
      <span className="text-xs text-[#64748b] uppercase tracking-widest font-mono">{label}</span>
      <span className={`text-3xl font-bold font-mono ${accent ?? "text-white"}`}>{value}</span>
      {sub && <span className="text-xs text-[#475569]">{sub}</span>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AtenaPage() {
  const router = useRouter();
  const [proyecto, setProyecto] = useState<(ProjectCharter & { id: string }) | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [uid,      setUid]      = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setUid(user.uid);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, atenaPath(uid, "proyectos")), orderBy("createdAt", "desc"), limit(1))
        );
        if (!snap.empty) {
          setProyecto({ id: snap.docs[0].id, ...(snap.docs[0].data() as Omit<ProjectCharter, "id">) });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  // ── Nav items ──────────────────────────────────────────────────────────────
  const NAV = [
    { label: "Centro de Mando",  href: "/atena",              icon: "⬡" },
    { label: "Proyectos DMAIC",  href: "/atena/proyectos",    icon: "◈" },
    { label: "Análisis ANOVA",   href: "/atena/analisis",     icon: "∑" },
    { label: "Control SPC",      href: "/atena/spc",          icon: "≋" },
    { label: "Riesgos AMEF",     href: "/atena/amef",         icon: "⚠" },
    { label: "Financiero",       href: "/atena/financiero",   icon: "$" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl font-mono font-bold text-[#60a5fa] tracking-widest">ATENA</div>
          <div className="text-xs text-[#475569] font-mono animate-pulse">Inicializando motor científico...</div>
        </div>
      </div>
    );
  }

  const faseIndex = proyecto ? FASE_ORDER[proyecto.faseActual] ?? 0 : 0;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-[#1e1e2e] flex flex-col shrink-0">
        <div className="px-5 py-6 border-b border-[#1e1e2e]">
          <div className="text-lg font-mono font-black text-[#60a5fa] tracking-widest">ATENA</div>
          <div className="text-[10px] text-[#334155] font-mono mt-0.5">Scientific Intelligence Engine</div>
        </div>
        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {NAV.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#94a3b8] hover:bg-[#111118] hover:text-white transition-colors font-mono"
            >
              <span className="text-[#60a5fa] w-4 text-center">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-[#1e1e2e]">
          <button
            onClick={() => router.push("/")}
            className="text-xs text-[#334155] hover:text-[#60a5fa] transition-colors font-mono"
          >
            ← Volver a SOFIAA
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="border-b border-[#1e1e2e] px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Centro de Mando</h1>
            <p className="text-xs text-[#475569] font-mono mt-0.5">
              Motor estadístico determinista · Cero alucinaciones numéricas
            </p>
          </div>
          {proyecto && (
            <FaseBadge fase={proyecto.faseActual} />
          )}
        </header>

        <div className="px-8 py-8 space-y-8 max-w-6xl">

          {!proyecto ? (
            // Empty state
            <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-12 text-center space-y-4">
              <div className="text-4xl">🔬</div>
              <p className="text-[#64748b] font-mono text-sm">No hay proyectos ATENA cargados.</p>
              <p className="text-[#334155] font-mono text-xs">
                Ejecuta: <code className="bg-[#0a0a0f] px-2 py-0.5 rounded text-[#60a5fa]">npm run atena:seed</code>
              </p>
            </div>
          ) : (
            <>
              {/* Proyecto activo */}
              <section>
                <h2 className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-4">
                  Proyecto Activo
                </h2>
                <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-white font-bold text-lg leading-tight">{proyecto.nombre}</h3>
                      <p className="text-[#475569] text-xs font-mono mt-1">{proyecto.planta}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-mono font-black text-white">{proyecto.avance}%</div>
                      <div className="text-[10px] text-[#475569] font-mono">Avance</div>
                    </div>
                  </div>

                  {/* Barra de progreso DMAIC */}
                  <div>
                    <div className="flex justify-between mb-2">
                      {["DEFINE","MEASURE","ANALYZE","IMPROVE","CONTROL"].map((fase, i) => (
                        <div key={fase} className="flex flex-col items-center gap-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold border-2 transition-all ${
                            i + 1 < faseIndex  ? "bg-[#22c55e] border-[#22c55e] text-black" :
                            i + 1 === faseIndex ? "bg-[#60a5fa] border-[#60a5fa] text-black animate-pulse" :
                                                  "bg-transparent border-[#1e1e2e] text-[#334155]"
                          }`}>
                            {i + 1}
                          </div>
                          <span className={`text-[9px] font-mono ${i + 1 === faseIndex ? "text-[#60a5fa]" : "text-[#334155]"}`}>
                            {fase.slice(0,3)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="h-1 bg-[#1e1e2e] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#60a5fa] to-[#a78bfa] rounded-full transition-all"
                        style={{ width: `${proyecto.avance}%` }}
                      />
                    </div>
                  </div>

                  {/* CTQ Summary */}
                  {proyecto.ctq?.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      {proyecto.ctq.map((ctq, i) => (
                        <div key={i} className="bg-[#0a0a0f] rounded-lg p-3">
                          <div className="text-[10px] text-[#475569] font-mono truncate">{ctq.nombre}</div>
                          <div className="flex items-end gap-2 mt-1">
                            <span className="text-lg font-mono font-bold text-white">{ctq.valorActual}</span>
                            <span className="text-xs text-[#22c55e] font-mono mb-0.5">→ {ctq.valorObjetivo}</span>
                          </div>
                          <div className="text-[9px] text-[#334155] font-mono">{ctq.unidad}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* KPIs rápidos */}
              <section>
                <h2 className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-4">
                  Indicadores del Motor
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KPICard label="Nivel Sigma" value="2.1σ"   sub="Objetivo: 4.5σ"         accent="text-[#f97316]" />
                  <KPICard label="Cpk"          value="0.34"   sub="Proceso incapaz (< 1.0)" accent="text-[#ef4444]" />
                  <KPICard label="VAN Proy."    value="$3.24M" sub="MXN · WACC 12%"          accent="text-[#22c55e]" />
                  <KPICard label="TIR"           value="34%"    sub="Payback: 5.3 meses"      accent="text-[#60a5fa]" />
                </div>
              </section>

              {/* Alertas críticas */}
              <section>
                <h2 className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-4">
                  Alertas del Sistema
                </h2>
                <div className="space-y-3">
                  <div className="bg-[#1a0a0a] border border-[#7f1d1d] rounded-xl p-4 flex items-start gap-3">
                    <span className="text-[#ef4444] text-lg shrink-0">⚠</span>
                    <div>
                      <p className="text-[#fca5a5] text-sm font-semibold">SPC — Proceso fuera de control estadístico</p>
                      <p className="text-[#7f1d1d] text-xs font-mono mt-0.5">3 violaciones Western Electric detectadas · Cpk = 0.34</p>
                    </div>
                  </div>
                  <div className="bg-[#1a0a0a] border border-[#7f1d1d] rounded-xl p-4 flex items-start gap-3">
                    <span className="text-[#f97316] text-lg shrink-0">◈</span>
                    <div>
                      <p className="text-[#fed7aa] text-sm font-semibold">AMEF — 2 modos de falla críticos (NPR &gt; 200)</p>
                      <p className="text-[#7c2d12] text-xs font-mono mt-0.5">Desalineación SMD (NPR=270) · Temperatura horno (NPR=240)</p>
                    </div>
                  </div>
                  <div className="bg-[#0a1a0a] border border-[#14532d] rounded-xl p-4 flex items-start gap-3">
                    <span className="text-[#22c55e] text-lg shrink-0">✓</span>
                    <div>
                      <p className="text-[#86efac] text-sm font-semibold">ANOVA — Diferencia significativa confirmada (p = 0.0012)</p>
                      <p className="text-[#14532d] text-xs font-mono mt-0.5">Línea C opera 32s más rápido que Línea A · Oportunidad de estandarización</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Equipo */}
              <section>
                <h2 className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-4">
                  Equipo del Proyecto
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {proyecto.involucrados?.slice(0, 6).map((s) => (
                    <div key={s.id} className="bg-[#111118] border border-[#1e1e2e] rounded-lg p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1e3a5f] flex items-center justify-center text-xs font-mono font-bold text-[#60a5fa] shrink-0">
                        {s.nombre.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-xs font-semibold truncate">{s.nombre.replace(/^(Dr\.|Ing\.|Lic\.)\s*/, "")}</p>
                        <p className="text-[#475569] text-[10px] font-mono">{s.rolLSS}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
