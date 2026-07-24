"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { FMEAItem } from "@/extensions/atena/schema";
interface AtenasScanResult {
  accionesEncoladas: number;
  amefCriticos:      number;
  amefAltos:         number;
  spcViolaciones:    number;
  spcIncapaces:      number;
}

function atenaPath(uid: string, col: string) {
  return `users/${uid}/atena_${col}`;
}

const NAV = [
  { label: "Centro de Mando", href: "/atena",            icon: "⬡" },
  { label: "Proyectos DMAIC", href: "/atena/proyectos",  icon: "◈" },
  { label: "Análisis ANOVA",  href: "/atena/analisis",   icon: "∑" },
  { label: "Control SPC",     href: "/atena/spc",        icon: "≋" },
  { label: "Riesgos AMEF",    href: "/atena/amef",       icon: "⚠", active: true },
  { label: "Financiero",      href: "/atena/financiero", icon: "$" },
];

function NPRBadge({ npr }: { npr: number }) {
  const color =
    npr > 200 ? { bg: "#1a0a0a", border: "#7f1d1d", text: "#ef4444" } :
    npr > 100 ? { bg: "#1a1200", border: "#78350f", text: "#f97316" } :
                { bg: "#0a0a0f", border: "#1e1e2e", text: "#94a3b8" };
  return (
    <span
      className="font-mono font-black text-sm px-2 py-0.5 rounded"
      style={{ background: color.bg, border: `1px solid ${color.border}`, color: color.text }}
    >
      {npr}
    </span>
  );
}

function RatingCell({ value, max = 10 }: { value: number; max?: number }) {
  const pct = (value / max) * 100;
  const color = value >= 8 ? "#ef4444" : value >= 6 ? "#f97316" : value >= 4 ? "#eab308" : "#22c55e";
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm font-bold w-4" style={{ color }}>{value}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <div key={i} className="w-1.5 h-3 rounded-sm"
            style={{ background: i < value ? color : "#1e1e2e" }} />
        ))}
      </div>
    </div>
  );
}

export default function AtenaAmefPage() {
  const router = useRouter();
  const { activeWorkspaceId } = useWorkspace();
  const [uid,        setUid]       = useState<string | null>(null);
  const [items,      setItems]     = useState<(FMEAItem & { id: string })[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [soloNpr,    setSoloNpr]   = useState(false);
  const [scanning,   setScanning]  = useState(false);
  const [scanResult, setScanResult] = useState<AtenasScanResult | null>(null);
  const [scanError,  setScanError]  = useState<string | null>(null);

  const handleScan = async () => {
    if (!activeWorkspaceId) { setScanError("Sin workspace activo"); return; }
    setScanning(true);
    setScanResult(null);
    setScanError(null);
    try {
      const currentUser = getAuth().currentUser;
      if (!currentUser) throw new Error("No autenticado");
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/atena/hermes-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ workspaceId: activeWorkspaceId }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setScanResult(data.resultado as AtenasScanResult);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { if (u) setUid(u.uid); });
    return unsub;
  }, []);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, atenaPath(uid, "amef")), orderBy("npr", "desc"))
        );
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FMEAItem, "id">) })));
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  const displayed = soloNpr ? items.filter((i) => i.npr > 200) : items;
  const criticos   = items.filter((i) => i.critico).length;
  const maxNPR     = items[0]?.npr ?? 0;

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
        <header className="border-b border-[#1e1e2e] px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Análisis de Modo y Efecto de Falla — AMEF</h1>
            <p className="text-xs text-[#475569] font-mono mt-0.5">
              Matriz de riesgos · NPR = Severidad × Ocurrencia × Detección
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setSoloNpr((v) => !v)}
              className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors ${
                soloNpr
                  ? "bg-[#1a0a0a] border-[#7f1d1d] text-[#ef4444]"
                  : "bg-[#111118] border-[#1e1e2e] text-[#475569] hover:text-white"
              }`}
            >
              {soloNpr ? "⚠ Solo críticos NPR>200" : "Todos los modos de falla"}
            </button>

            <button
              onClick={handleScan}
              disabled={scanning}
              className="text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors bg-[#0f1e38] border-[#1d4ed8] text-[#60a5fa] hover:bg-[#1e3a5f] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {scanning ? "⟳ Escaneando..." : "⚡ Escanear con HERMES"}
            </button>
          </div>
        </header>

        {/* HERMES scan result badge */}
        {scanError && (
          <div className="mx-8 mt-4 px-4 py-2 rounded-lg border border-[#7f1d1d] bg-[#1a0a0a] text-[#ef4444] text-xs font-mono">
            Error al escanear: {scanError}
          </div>
        )}
        {scanResult && (
          <div className="mx-8 mt-4 px-4 py-3 rounded-lg border border-[#1d4ed8] bg-[#0f1e38] flex items-center gap-6 flex-wrap">
            <span className="text-xs font-mono text-[#93c5fd] font-semibold">HERMES SCAN</span>
            {scanResult.amefCriticos > 0 && (
              <span className="text-xs font-mono text-[#ef4444]">🚨 {scanResult.amefCriticos} críticos AMEF</span>
            )}
            {scanResult.amefAltos > 0 && (
              <span className="text-xs font-mono text-[#f97316]">⚠️ {scanResult.amefAltos} altos AMEF</span>
            )}
            {scanResult.spcViolaciones > 0 && (
              <span className="text-xs font-mono text-[#facc15]">📊 {scanResult.spcViolaciones} violaciones SPC</span>
            )}
            {scanResult.spcIncapaces > 0 && (
              <span className="text-xs font-mono text-[#94a3b8]">📉 {scanResult.spcIncapaces} procesos incapaces</span>
            )}
            <span className="text-xs font-mono text-[#4ade80]">✅ {scanResult.accionesEncoladas} encoladas</span>
            {scanResult.accionesEncoladas > 0 && (
              <button
                onClick={() => router.push("/hermes/cola")}
                className="text-xs font-mono text-[#60a5fa] underline hover:text-white transition-colors ml-auto"
              >
                Ver cola →
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <span className="text-[#475569] font-mono text-sm animate-pulse">Cargando matriz AMEF...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <span className="text-3xl">⚠</span>
            <p className="text-[#475569] font-mono text-sm">Sin datos. Ejecuta <code className="text-[#60a5fa]">npm run atena:seed</code></p>
          </div>
        ) : (
          <div className="px-8 py-8 space-y-6">

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total modos de falla", value: items.length.toString(),   accent: "text-white" },
                { label: "NPR Críticos (>200)",   value: criticos.toString(),       accent: "text-[#ef4444]" },
                { label: "NPR Máximo detectado",  value: maxNPR.toString(),         accent: maxNPR > 200 ? "text-[#ef4444]" : "text-[#f97316]" },
                { label: "Modos bajo control",    value: (items.length - criticos).toString(), accent: "text-[#22c55e]" },
              ].map((k) => (
                <div key={k.label} className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-4 text-center">
                  <div className="text-[10px] font-mono text-[#475569] uppercase mb-2">{k.label}</div>
                  <div className={`text-3xl font-mono font-black ${k.accent}`}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Alerta críticos */}
            {criticos > 0 && (
              <div className="bg-[#1a0a0a] border-2 border-[#7f1d1d] rounded-xl p-4 flex items-center gap-3">
                <span className="text-[#ef4444] text-xl shrink-0">⚠</span>
                <p className="text-[#fca5a5] text-sm font-mono">
                  {criticos} modo{criticos > 1 ? "s" : ""} de falla con NPR &gt; 200 —
                  acción correctiva inmediata requerida antes de continuar a fase IMPROVE
                </p>
              </div>
            )}

            {/* Tabla AMEF */}
            <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#1e1e2e] flex items-center justify-between">
                <h3 className="text-xs font-mono text-[#475569] uppercase tracking-widest">
                  Matriz AMEF — Ordenada por NPR descendente
                </h3>
                <span className="text-xs font-mono text-[#334155]">{displayed.length} registros</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="text-[10px] font-mono text-[#475569] uppercase border-b border-[#1e1e2e] bg-[#0a0a0f]">
                      <th className="text-left px-4 py-3">#</th>
                      <th className="text-left px-4 py-3">Paso del Proceso</th>
                      <th className="text-left px-4 py-3">Modo de Falla</th>
                      <th className="text-center px-3 py-3">S</th>
                      <th className="text-center px-3 py-3">O</th>
                      <th className="text-center px-3 py-3">D</th>
                      <th className="text-center px-4 py-3">NPR</th>
                      <th className="text-left px-4 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#111118]">
                    {displayed.map((item) => {
                      const isCritical = item.npr > 200;
                      const isWarning  = item.npr > 100 && item.npr <= 200;
                      return (
                        <tr key={item.id}
                          className={`transition-colors hover:bg-[#0e0e16] ${
                            isCritical ? "bg-[#0f0707]" : isWarning ? "bg-[#0f0b05]" : ""
                          }`}>
                          <td className="px-4 py-3 font-mono text-[#334155]">{item.numeracion}</td>
                          <td className="px-4 py-3">
                            <div className="text-white font-medium text-xs">{item.pasoDelProceso}</div>
                            <div className="text-[#334155] text-[10px] mt-0.5 font-mono">{item.causaRaiz}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-[#94a3b8] text-xs">{item.modoDeFalla}</div>
                            <div className="text-[#334155] text-[10px] mt-0.5">{item.efectoDelFallo}</div>
                          </td>
                          <td className="px-3 py-3">
                            <RatingCell value={item.severidad} />
                          </td>
                          <td className="px-3 py-3">
                            <RatingCell value={item.ocurrencia} />
                          </td>
                          <td className="px-3 py-3">
                            <RatingCell value={item.deteccion} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <NPRBadge npr={item.npr} />
                            {item.nprReducido != null && (
                              <div className="text-[10px] text-[#22c55e] font-mono mt-1">
                                → {item.nprReducido}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              item.estado === "implementado" ? "bg-[#052e16] text-[#22c55e]" :
                              item.estado === "en_proceso"   ? "bg-[#1e3a5f] text-[#60a5fa]" :
                                                               "bg-[#1a0a0a] text-[#ef4444]"
                            }`}>
                              {item.estado === "implementado" ? "✓ Implementado" :
                               item.estado === "en_proceso"   ? "↻ En proceso" :
                                                                "⚠ Abierto"}
                            </span>
                            {item.accionCorrectiva && (
                              <div className="text-[10px] text-[#334155] mt-1 max-w-[160px] leading-tight">
                                {item.accionCorrectiva}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Leyenda */}
            <div className="flex items-center gap-6 text-[10px] font-mono text-[#334155]">
              <span>S = Severidad &nbsp;·&nbsp; O = Ocurrencia &nbsp;·&nbsp; D = Detección &nbsp;·&nbsp; NPR = S×O×D</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#ef4444] opacity-30" /> NPR &gt; 200 — crítico</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#f97316] opacity-30" /> NPR 100-200 — atención</span>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
