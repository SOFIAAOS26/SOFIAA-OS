"use client";

/**
 * TEC Bii — Análisis de Costos V2 (Sprint T2-7)
 * RUMBO A TIER 4
 *
 * Análisis agregado de evaluaciones: costos, horas, calidad, cumplimiento.
 * Datos en tiempo real desde Firestore.
 */

import { useState, useEffect } from "react";
import { useAuth }             from "@/contexts/AuthContext";
import PageGuard               from "@/components/tec-bii/PageGuard";
import {
  subscribeEvaluacionesV2,
  subscribeProyectosV2,
} from "@/lib/tec-bii/firestore";
import type { EvaluacionV2, ProyectoV2 } from "@/extensions/tec-bii/schema";

const ACCENT  = "#6366F1";
const ACCENT2 = "#8B5CF6";

const MXN = new Intl.NumberFormat("es-MX", {
  style:                 "currency",
  currency:              "MXN",
  maximumFractionDigits: 0,
});

function scoreColor(s: number): string {
  if (s >= 4.5) return "#10B981";
  if (s >= 3.5) return "#F59E0B";
  if (s >= 2.5) return ACCENT;
  return "#EF4444";
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 14, padding: "16px 20px", flex: "1 1 160px",
    }}>
      <p style={{ margin: "0 0 4px", fontSize: 10, color: "rgba(226,232,240,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: color ?? "#E2E8F0", lineHeight: 1.1 }}>{value}</p>
      {sub && <p style={{ margin: "3px 0 0", fontSize: 10, color: "rgba(226,232,240,0.3)" }}>{sub}</p>}
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "rgba(226,232,240,0.55)" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

export default function AnalisisPage() {
  const { user }                      = useAuth();
  const [evals, setEvals]             = useState<EvaluacionV2[]>([]);
  const [proyectos, setProyectos]     = useState<ProyectoV2[]>([]);
  const [filterTipo, setFilterTipo]   = useState<"todos" | "Interno" | "Externo">("todos");
  const [filterMes,  setFilterMes]    = useState<string>("todos");

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    const u1 = subscribeEvaluacionesV2(uid, setEvals);
    const u2 = subscribeProyectosV2(uid, setProyectos);
    return () => { u1(); u2(); };
  }, [user?.uid]);

  // ── Filtrado ──────────────────────────────────────────────────────────────────
  const mesesDisponibles = Array.from(
    new Set(evals.map((e) => new Date(e.fecha).toISOString().slice(0, 7)))
  ).sort().reverse();

  const filtered = evals.filter((e) => {
    const mesOk  = filterMes === "todos" || new Date(e.fecha).toISOString().slice(0, 7) === filterMes;
    const tipoOk = filterTipo === "todos" || e.tipo === filterTipo;
    return mesOk && tipoOk;
  });

  // ── Métricas globales ─────────────────────────────────────────────────────────
  const totalEvals    = filtered.length;
  const internos      = filtered.filter((e) => e.tipo === "Interno");
  const externos      = filtered.filter((e) => e.tipo === "Externo");

  const promedioCalidad = totalEvals > 0
    ? filtered.reduce((s, e) => s + (e.metricas.calidadGeneral + e.metricas.creatividad + e.metricas.ejecucionTecnica + e.metricas.alineacionBrief) / 4, 0) / totalEvals
    : 0;

  const aTiempo     = filtered.filter((e) => e.cumplimientoTiempo === "A tiempo").length;
  const tarde       = filtered.filter((e) => e.cumplimientoTiempo === "Tarde").length;
  const temprano    = filtered.filter((e) => e.cumplimientoTiempo === "Temprano").length;
  const pctATiempo  = totalEvals > 0 ? Math.round((aTiempo / totalEvals) * 100) : 0;

  // Costos internos
  const totalHorasNormales = internos.reduce((s, e) => s + (e.datosInternos?.horasNormales ?? 0), 0);
  const totalHorasExtra    = internos.reduce((s, e) => s + (e.datosInternos?.horasExtra ?? 0), 0);
  const totalHoras         = totalHorasNormales + totalHorasExtra;

  // Costos externos
  const totalCotizado  = externos.reduce((s, e) => s + (e.datosExternos?.costoCotizado ?? 0), 0);
  const totalFinal     = externos.reduce((s, e) => s + (e.datosExternos?.costoFinal ?? 0), 0);
  const variacionCosto = totalCotizado > 0
    ? ((totalFinal - totalCotizado) / totalCotizado) * 100
    : 0;

  // Valor generado
  const totalValor     = filtered.reduce((s, e) => s + (e.valorProyecto ?? 0), 0);
  const totalUnidades  = filtered.reduce((s, e) => s + (e.unidadesProducidas ?? 0), 0);

  // Proyectos con evaluaciones
  const proyectosConEval = new Set(filtered.map((e) => e.proyectoId)).size;

  // Calidad por tipo
  const promedioInterno = internos.length > 0
    ? internos.reduce((s, e) => s + (e.metricas.calidadGeneral + e.metricas.creatividad + e.metricas.ejecucionTecnica + e.metricas.alineacionBrief) / 4, 0) / internos.length
    : 0;
  const promedioExterno = externos.length > 0
    ? externos.reduce((s, e) => s + (e.metricas.calidadGeneral + e.metricas.creatividad + e.metricas.ejecucionTecnica + e.metricas.alineacionBrief) / 4, 0) / externos.length
    : 0;

  // Tabla de evaluaciones recientes
  const recientes = [...filtered]
    .sort((a, b) => b.fecha - a.fecha)
    .slice(0, 10);

  const proyectoMap = Object.fromEntries(proyectos.map((p) => [p.id, p.titulo]));

  const selectS: React.CSSProperties = {
    padding: "7px 12px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, fontSize: 12, color: "#E2E8F0",
    outline: "none", cursor: "pointer",
  };

  return (
    <>
      <PageGuard />
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#E2E8F0" }}>📊 Análisis de Costos</h1>
          <p style={{ margin: 0, fontSize: 12, color: `${ACCENT}B0`, fontWeight: 600 }}>
            TEC Bii · Inteligencia de Producción · RUMBO A TIER 4
          </p>
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
          <select style={selectS} value={filterTipo} onChange={(e) => setFilterTipo(e.target.value as typeof filterTipo)}>
            <option value="todos">Todos los tipos</option>
            <option value="Interno">Interno</option>
            <option value="Externo">Externo</option>
          </select>
          <select style={selectS} value={filterMes} onChange={(e) => setFilterMes(e.target.value)}>
            <option value="todos">Todos los meses</option>
            {mesesDisponibles.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {(filterTipo !== "todos" || filterMes !== "todos") && (
            <button
              onClick={() => { setFilterTipo("todos"); setFilterMes("todos"); }}
              style={{ ...selectS, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", cursor: "pointer" }}
            >
              ✕ Limpiar filtros
            </button>
          )}
        </div>

        {/* KPIs principales */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          <KpiCard label="Evaluaciones"       value={totalEvals}           sub="en el período"                  />
          <KpiCard label="Calidad promedio"   value={`${promedioCalidad.toFixed(1)}/5`} color={scoreColor(promedioCalidad)} sub="todas las métricas" />
          <KpiCard label="Cumplimiento"       value={`${pctATiempo}%`}     sub="a tiempo"          color={pctATiempo >= 70 ? "#10B981" : pctATiempo >= 50 ? "#F59E0B" : "#EF4444"} />
          <KpiCard label="Proyectos cubiertos" value={proyectosConEval}    sub="con evaluación"                 />
          <KpiCard label="Valor generado"     value={MXN.format(totalValor)} sub="en proyectos evaluados"       color="#34D399" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>

          {/* Bloque interno */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(6,182,212,0.15)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#06B6D4", textTransform: "uppercase", letterSpacing: "0.07em" }}>👥 Interno</span>
              <span style={{ fontSize: 11, color: "rgba(226,232,240,0.3)" }}>{internos.length} eval.</span>
            </div>
            <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 10, color: "rgba(226,232,240,0.3)", textTransform: "uppercase" }}>Horas normales</p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#E2E8F0" }}>{totalHorasNormales}h</p>
              </div>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 10, color: "rgba(226,232,240,0.3)", textTransform: "uppercase" }}>Horas extra</p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#F59E0B" }}>{totalHorasExtra}h</p>
              </div>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 10, color: "rgba(226,232,240,0.3)", textTransform: "uppercase" }}>Total horas</p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#E2E8F0" }}>{totalHoras}h</p>
              </div>
            </div>
            {totalHoras > 0 && (
              <>
                <BarRow label="Horas normales" value={totalHorasNormales} max={totalHoras} color="#06B6D4" />
                <BarRow label="Horas extra"    value={totalHorasExtra}    max={totalHoras} color="#F59E0B" />
              </>
            )}
            <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(6,182,212,0.05)", borderRadius: 8 }}>
              <span style={{ fontSize: 11, color: "rgba(226,232,240,0.4)" }}>Calidad promedio: </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor(promedioInterno) }}>{promedioInterno.toFixed(1)}/5</span>
            </div>
          </div>

          {/* Bloque externo */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(167,139,250,0.15)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#A78BFA", textTransform: "uppercase", letterSpacing: "0.07em" }}>🏢 Externo</span>
              <span style={{ fontSize: 11, color: "rgba(226,232,240,0.3)" }}>{externos.length} eval.</span>
            </div>
            <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 10, color: "rgba(226,232,240,0.3)", textTransform: "uppercase" }}>Cotizado</p>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#E2E8F0" }}>{MXN.format(totalCotizado)}</p>
              </div>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 10, color: "rgba(226,232,240,0.3)", textTransform: "uppercase" }}>Final</p>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: variacionCosto > 0 ? "#EF4444" : "#10B981" }}>{MXN.format(totalFinal)}</p>
              </div>
            </div>
            {totalCotizado > 0 && (
              <div style={{ padding: "8px 12px", background: variacionCosto > 10 ? "rgba(239,68,68,0.07)" : "rgba(16,185,129,0.07)", borderRadius: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: "rgba(226,232,240,0.4)" }}>Variación vs cotizado: </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: variacionCosto > 0 ? "#EF4444" : "#10B981" }}>
                  {variacionCosto > 0 ? "+" : ""}{variacionCosto.toFixed(1)}%
                </span>
              </div>
            )}
            <div style={{ padding: "8px 12px", background: "rgba(167,139,250,0.05)", borderRadius: 8 }}>
              <span style={{ fontSize: 11, color: "rgba(226,232,240,0.4)" }}>Calidad promedio: </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor(promedioExterno) }}>{promedioExterno.toFixed(1)}/5</span>
            </div>
          </div>
        </div>

        {/* Cumplimiento de tiempos */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 20px", marginBottom: 24 }}>
          <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, color: "rgba(226,232,240,0.6)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            ⏱ Cumplimiento de tiempos
          </p>
          <div style={{ display: "flex", gap: 20, marginBottom: 14, flexWrap: "wrap" }}>
            {[
              { label: "A tiempo",  value: aTiempo,  color: "#10B981" },
              { label: "Tarde",     value: tarde,     color: "#EF4444" },
              { label: "Temprano",  value: temprano,  color: ACCENT    },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <p style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 800, color }}>{value}</p>
                <p style={{ margin: 0, fontSize: 10, color: "rgba(226,232,240,0.35)" }}>{label}</p>
              </div>
            ))}
          </div>
          {totalEvals > 0 && (
            <>
              <BarRow label="A tiempo"  value={aTiempo}  max={totalEvals} color="#10B981" />
              <BarRow label="Tarde"     value={tarde}    max={totalEvals} color="#EF4444" />
              <BarRow label="Temprano"  value={temprano} max={totalEvals} color={ACCENT}  />
            </>
          )}
        </div>

        {/* Tabla evaluaciones recientes */}
        {recientes.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 20px", marginBottom: 24 }}>
            <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, color: "rgba(226,232,240,0.6)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              📋 Evaluaciones recientes
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {["Proyecto", "Tipo", "Calidad", "Cumplimiento", "Valor", "Fecha"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "6px 10px", color: "rgba(226,232,240,0.3)", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recientes.map((e) => {
                    const prom = (e.metricas.calidadGeneral + e.metricas.creatividad + e.metricas.ejecucionTecnica + e.metricas.alineacionBrief) / 4;
                    const cumplColor = e.cumplimientoTiempo === "A tiempo" ? "#10B981" : e.cumplimientoTiempo === "Tarde" ? "#EF4444" : ACCENT;
                    return (
                      <tr key={e.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td style={{ padding: "8px 10px", color: "#E2E8F0", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {proyectoMap[e.proyectoId] ?? e.proyectoId.slice(0, 8) + "…"}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: e.tipo === "Interno" ? "#06B6D4" : "#A78BFA", background: e.tipo === "Interno" ? "rgba(6,182,212,0.1)" : "rgba(167,139,250,0.1)", borderRadius: 99, padding: "2px 8px" }}>{e.tipo}</span>
                        </td>
                        <td style={{ padding: "8px 10px", fontWeight: 700, color: scoreColor(prom) }}>{prom.toFixed(1)}</td>
                        <td style={{ padding: "8px 10px", color: cumplColor, fontWeight: 600 }}>{e.cumplimientoTiempo}</td>
                        <td style={{ padding: "8px 10px", color: "#34D399" }}>{e.valorProyecto > 0 ? MXN.format(e.valorProyecto) : "—"}</td>
                        <td style={{ padding: "8px 10px", color: "rgba(226,232,240,0.4)" }}>
                          {new Date(e.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {totalEvals === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>📊</p>
            <p style={{ color: "rgba(226,232,240,0.4)", fontSize: 13 }}>
              {filterTipo !== "todos" || filterMes !== "todos"
                ? "Sin evaluaciones para los filtros seleccionados."
                : "Aún no hay evaluaciones. Registra la primera en el módulo Evaluaciones."}
            </p>
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: "rgba(226,232,240,0.12)" }}>
          TEC Bii v2 · Análisis de Costos · RUMBO A TIER 4
        </p>
      </div>
    </>
  );
}
