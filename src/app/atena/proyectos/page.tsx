"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import type { ProjectCharter, Stakeholder } from "@/extensions/atena/schema";

function atenaPath(uid: string, col: string) {
  return `users/${uid}/atena_${col}`;
}

const FASE_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  DEFINE:  { bg: "#1e3a5f", text: "#60a5fa", border: "#1d4ed8" },
  MEASURE: { bg: "#1a3a2a", text: "#34d399", border: "#065f46" },
  ANALYZE: { bg: "#3a2a1a", text: "#fb923c", border: "#9a3412" },
  IMPROVE: { bg: "#2a1a3a", text: "#a78bfa", border: "#6d28d9" },
  CONTROL: { bg: "#1a1a3a", text: "#818cf8", border: "#3730a3" },
};

const ROL_LABEL: Record<string, string> = {
  CHAMPION:      "Champion",
  MBB:           "Master BB",
  BB:            "Black Belt",
  GB:            "Green Belt",
  PROCESS_OWNER: "Process Owner",
  TEAM_MEMBER:   "Team Member",
};

export default function AtenaProyectosPage() {
  const router  = useRouter();
  const [uid,   setUid]      = useState<string | null>(null);
  const [proyectos, setProyectos] = useState<(ProjectCharter & { id: string })[]>([]);
  const [selected, setSelected]   = useState<string | null>(null);
  const [loading,  setLoading]    = useState(true);

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
          query(collection(db, atenaPath(uid, "proyectos")), orderBy("createdAt", "desc"))
        );
        const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProjectCharter, "id">) }));
        setProyectos(data);
        if (data.length > 0) setSelected(data[0].id);
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  const proyecto = proyectos.find((p) => p.id === selected) ?? null;
  const faseStyle = proyecto ? (FASE_COLOR[proyecto.faseActual] ?? FASE_COLOR.DEFINE) : null;

  const FASES = ["DEFINE", "MEASURE", "ANALYZE", "IMPROVE", "CONTROL"];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar nav */}
      <aside className="w-56 border-r border-[#1e1e2e] shrink-0">
        <div className="px-5 py-6 border-b border-[#1e1e2e]">
          <button onClick={() => router.push("/atena")} className="text-lg font-mono font-black text-[#60a5fa] tracking-widest hover:opacity-80">
            ATENA
          </button>
          <div className="text-[10px] text-[#334155] font-mono mt-0.5">Scientific Intelligence Engine</div>
        </div>
        <nav className="py-4 px-2 space-y-0.5">
          {[
            { label: "Centro de Mando", href: "/atena",            icon: "⬡" },
            { label: "Proyectos DMAIC", href: "/atena/proyectos",  icon: "◈", active: true },
            { label: "Análisis ANOVA",  href: "/atena/analisis",   icon: "∑" },
            { label: "Control SPC",     href: "/atena/spc",        icon: "≋" },
            { label: "Riesgos AMEF",    href: "/atena/amef",       icon: "⚠" },
            { label: "Financiero",      href: "/atena/financiero",  icon: "$" },
          ].map((item) => (
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
          <button onClick={() => router.push("/")} className="text-xs text-[#334155] hover:text-[#60a5fa] transition-colors font-mono">
            ← Volver a SOFIAA
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <header className="border-b border-[#1e1e2e] px-8 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">Proyectos DMAIC</h1>
            <p className="text-xs text-[#475569] font-mono mt-0.5">Portafolio de mejora continua · Lean Six Sigma</p>
          </div>
          <button
            onClick={() => router.push("/atena/proyectos/nuevo")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white"
            style={{ background: "#2563eb" }}
          >
            ✨ Nuevo Proyecto
          </button>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <span className="text-[#475569] font-mono text-sm animate-pulse">Cargando proyectos...</span>
          </div>
        ) : proyectos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <span className="text-4xl">◈</span>
            <p className="text-[#475569] font-mono text-sm">Sin proyectos todavía.</p>
            <button
              onClick={() => router.push("/atena/proyectos/nuevo")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white"
              style={{ background: "#2563eb" }}
            >
              ✨ Crear primer proyecto con IA
            </button>
          </div>
        ) : (
          <div className="flex gap-0 h-[calc(100vh-89px)]">
            {/* Lista de proyectos */}
            <div className="w-72 border-r border-[#1e1e2e] overflow-auto shrink-0">
              {proyectos.map((p) => {
                const style = FASE_COLOR[p.faseActual] ?? FASE_COLOR.DEFINE;
                return (
                  <button key={p.id} onClick={() => setSelected(p.id)}
                    className={`w-full text-left p-4 border-b border-[#1e1e2e] hover:bg-[#111118] transition-colors ${selected === p.id ? "bg-[#111118]" : ""}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-white text-sm font-semibold leading-tight line-clamp-2">{p.nombre}</p>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0"
                        style={{ background: style.bg, color: style.text }}>
                        {p.faseActual}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#475569] font-mono">{p.metodologia}</span>
                      <span className="text-[10px] text-[#475569] font-mono">{p.avance}% avance</span>
                    </div>
                    <div className="mt-2 h-1 bg-[#1e1e2e] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${p.avance}%`, background: style.text }} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Detalle del proyecto */}
            {proyecto && faseStyle && (
              <div className="flex-1 overflow-auto p-8 space-y-8">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white leading-tight">{proyecto.nombre}</h2>
                    <p className="text-sm text-[#475569] font-mono mt-1">{proyecto.area} · {proyecto.planta}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-3xl font-mono font-black" style={{ color: faseStyle.text }}>
                      {proyecto.avance}%
                    </div>
                    <div className="text-[10px] text-[#475569] font-mono">Avance global</div>
                  </div>
                </div>

                {/* Fases */}
                <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6">
                  <h3 className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-4">Roadmap DMAIC</h3>
                  <div className="flex items-center gap-0">
                    {FASES.map((fase, i) => {
                      const fIdx = FASES.indexOf(proyecto.faseActual);
                      const done    = i < fIdx;
                      const current = i === fIdx;
                      const pending = i > fIdx;
                      return (
                        <div key={fase} className="flex-1 flex items-center">
                          <div className="flex flex-col items-center gap-2 flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-mono font-bold border-2 transition-all ${
                              done    ? "bg-[#22c55e] border-[#22c55e] text-black" :
                              current ? "border-[#60a5fa] text-[#60a5fa] animate-pulse" :
                                        "border-[#1e1e2e] text-[#334155]"
                            }`}>
                              {done ? "✓" : i + 1}
                            </div>
                            <span className={`text-[10px] font-mono font-bold ${current ? "text-[#60a5fa]" : done ? "text-[#22c55e]" : "text-[#334155]"}`}>
                              {fase}
                            </span>
                          </div>
                          {i < FASES.length - 1 && (
                            <div className={`h-0.5 flex-1 mb-5 ${done ? "bg-[#22c55e]" : "bg-[#1e1e2e]"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Objetivo SMART */}
                <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6">
                  <h3 className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-3">Objetivo SMART</h3>
                  <p className="text-[#cbd5e1] text-sm leading-relaxed">{proyecto.objetivoSMART}</p>
                </div>

                {/* CTQ */}
                {proyecto.ctq?.length > 0 && (
                  <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6">
                    <h3 className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-4">Variables CTQ</h3>
                    <div className="space-y-3">
                      {proyecto.ctq.map((ctq, i) => {
                        const pct = ctq.valorObjetivo > 0
                          ? Math.max(0, Math.min(100, ((ctq.valorActual - ctq.valorObjetivo) / ctq.valorActual) * 100))
                          : 0;
                        return (
                          <div key={i} className="bg-[#0a0a0f] rounded-lg p-4">
                            <div className="flex items-end justify-between mb-2">
                              <span className="text-white text-sm font-semibold">{ctq.nombre}</span>
                              <div className="text-right">
                                <span className="text-white font-mono font-bold">{ctq.valorActual}</span>
                                <span className="text-[#22c55e] font-mono text-sm ml-2">→ {ctq.valorObjetivo}</span>
                                <span className="text-[#475569] text-xs ml-1">{ctq.unidad}</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-[#ef4444] to-[#22c55e] rounded-full"
                                style={{ width: `${pct}%` }} />
                            </div>
                            {(ctq.lsl != null || ctq.usl != null) && (
                              <div className="flex justify-between mt-1">
                                <span className="text-[9px] text-[#334155] font-mono">LSL: {ctq.lsl}</span>
                                <span className="text-[9px] text-[#334155] font-mono">USL: {ctq.usl}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Involucrados */}
                <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6">
                  <h3 className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-4">Matriz de Stakeholders</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] font-mono text-[#475569] uppercase border-b border-[#1e1e2e]">
                          <th className="text-left pb-2 pr-4">Nombre</th>
                          <th className="text-left pb-2 pr-4">Rol LSS</th>
                          <th className="text-left pb-2 pr-4">Departamento</th>
                          <th className="text-left pb-2">Compromiso</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e1e2e]">
                        {(proyecto.involucrados as Stakeholder[]).map((s) => {
                          const compromisoColor =
                            s.nivelCompromiso === "LIDER"        ? "text-[#22c55e]" :
                            s.nivelCompromiso === "PARTICIPATIVO" ? "text-[#60a5fa]" :
                            s.nivelCompromiso === "NEUTRAL"       ? "text-[#94a3b8]" :
                            s.nivelCompromiso === "RESISTENTE"    ? "text-[#f97316]" :
                                                                    "text-[#ef4444]";
                          return (
                            <tr key={s.id} className="hover:bg-[#0a0a0f] transition-colors">
                              <td className="py-2.5 pr-4 text-white font-medium">{s.nombre}</td>
                              <td className="py-2.5 pr-4 font-mono text-xs text-[#60a5fa]">{ROL_LABEL[s.rolLSS] ?? s.rolLSS}</td>
                              <td className="py-2.5 pr-4 text-[#64748b] text-xs">{s.departamento}</td>
                              <td className={`py-2.5 font-mono text-xs font-bold ${compromisoColor}`}>
                                {s.nivelCompromiso}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
