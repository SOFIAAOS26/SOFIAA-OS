"use client";

/**
 * TEC Bii — Inteligencia (Sprint T2-2)
 * RUMBO A TIER 4
 *
 * Panel de inteligencia cognitiva del área:
 * - Botón "Generar análisis" → llama a Gemini Flash con estado actual
 * - Insights tipificados: riesgo, alerta, oportunidad, patrón, recomendación
 * - Señales de riesgo provenientes del grafo NEXO
 * - Historial de análisis en sesión
 */

import { useState } from "react";
import { useAuth }  from "@/contexts/AuthContext";
import PageGuard    from "@/components/tec-bi/PageGuard";
import type { TecBiiInsight, InsightsResponse } from "@/app/api/tec-bii/insights/route";

// ── Constantes ────────────────────────────────────────────────────────────────

const ACCENT  = "#6366F1";
const ACCENT2 = "#8B5CF6";

const TIPO_META: Record<TecBiiInsight["tipo"], { icon: string; label: string; color: string; bg: string }> = {
  riesgo:         { icon: "⚠",  label: "Riesgo",         color: "#EF4444", bg: "rgba(239,68,68,0.08)"   },
  alerta:         { icon: "🔔", label: "Alerta",          color: "#F59E0B", bg: "rgba(245,158,11,0.08)"  },
  oportunidad:    { icon: "✦",  label: "Oportunidad",     color: "#10B981", bg: "rgba(16,185,129,0.08)"  },
  patron:         { icon: "⌭",  label: "Patrón",          color: "#06B6D4", bg: "rgba(6,182,212,0.08)"   },
  recomendacion:  { icon: "→",  label: "Recomendación",   color: ACCENT,    bg: "rgba(99,102,241,0.08)"  },
};

const PRIORIDAD_COLOR: Record<TecBiiInsight["prioridad"], string> = {
  alta:  "#EF4444",
  media: "#F59E0B",
  baja:  "#6366F1",
};

// ── Sub-componentes ───────────────────────────────────────────────────────────

function InsightCard({ ins }: { ins: TecBiiInsight }) {
  const [hover, setHover] = useState(false);
  const meta = TIPO_META[ins.tipo];

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background:   hover ? "rgba(255,255,255,0.04)" : meta.bg,
        border:       `1px solid ${hover ? meta.color + "44" : meta.color + "22"}`,
        borderLeft:   `3px solid ${meta.color}`,
        borderRadius: 14,
        padding:      "14px 18px",
        transition:   "all 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>
          {meta.icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0" }}>{ins.titulo}</span>
            <span style={{
              fontSize: 9, fontWeight: 700, color: meta.color,
              background: meta.bg, border: `1px solid ${meta.color}33`,
              borderRadius: 99, padding: "1px 7px",
            }}>
              {meta.label}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700,
              color:    PRIORIDAD_COLOR[ins.prioridad],
              background: PRIORIDAD_COLOR[ins.prioridad] + "18",
              border:   `1px solid ${PRIORIDAD_COLOR[ins.prioridad]}33`,
              borderRadius: 99, padding: "1px 7px",
            }}>
              {ins.prioridad.toUpperCase()}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(226,232,240,0.6)", lineHeight: 1.6 }}>
            {ins.cuerpo}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, color, sub,
}: {
  label: string; value: string | number; color: string; sub?: string;
}) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 14, padding: "14px 18px", flex: "1 1 130px",
    }}>
      <p style={{ margin: "0 0 3px", fontSize: 10, color: "rgba(226,232,240,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color }}>{value}</p>
      {sub && <p style={{ margin: "2px 0 0", fontSize: 10, color: "rgba(226,232,240,0.25)" }}>{sub}</p>}
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function InteligenciaPage() {
  const { user }              = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState<InsightsResponse | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const runAnalysis = async () => {
    if (!user || loading) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res   = await fetch("/api/tec-bii/insights", {
        method:  "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });
      const json  = await res.json() as InsightsResponse;
      if (!json.success) throw new Error("Error en el servidor");
      setData(json);
      setLastRun(new Date());
    } catch {
      setError("No se pudo generar el análisis. Verifica tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  const insightsByPrioridad = data
    ? [
        ...data.insights.filter((i) => i.prioridad === "alta"),
        ...data.insights.filter((i) => i.prioridad === "media"),
        ...data.insights.filter((i) => i.prioridad === "baja"),
      ]
    : [];

  return (
    <>
      <PageGuard section="proyectos" />
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <div>
              <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#E2E8F0" }}>
                ✦ Inteligencia
              </h1>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(99,102,241,0.7)", fontWeight: 600 }}>
                TEC Bii · Análisis cognitivo del área · RUMBO A TIER 4
              </p>
            </div>

            <button
              onClick={runAnalysis}
              disabled={loading}
              style={{
                background:   loading
                  ? "rgba(99,102,241,0.2)"
                  : "linear-gradient(135deg, #6366F1, #8B5CF6)",
                border:       "none",
                borderRadius: 12,
                padding:      "10px 22px",
                fontSize:     13,
                fontWeight:   700,
                color:        loading ? "rgba(226,232,240,0.4)" : "#fff",
                cursor:       loading ? "not-allowed" : "pointer",
                display:      "flex",
                alignItems:   "center",
                gap:          8,
                boxShadow:    loading ? "none" : "0 0 20px rgba(99,102,241,0.35)",
                transition:   "all 0.2s",
              }}
            >
              {loading ? (
                <>
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>◌</span>
                  Analizando con Gemini…
                </>
              ) : (
                <>✦ Generar análisis</>
              )}
            </button>
          </div>

          {lastRun && (
            <p style={{ marginTop: 8, fontSize: 11, color: "rgba(226,232,240,0.25)" }}>
              Último análisis: {lastRun.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>

        {/* ── Estado vacío ─────────────────────────────────────────────── */}
        {!data && !loading && !error && (
          <div style={{
            textAlign: "center", padding: "64px 24px",
            background: "rgba(99,102,241,0.04)",
            border: "1px solid rgba(99,102,241,0.12)",
            borderRadius: 20,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, margin: "0 auto 20px",
              boxShadow: "0 0 30px rgba(99,102,241,0.2)",
            }}>
              ✦
            </div>
            <h2 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 800, color: "#E2E8F0" }}>
              Motor de inteligencia listo
            </h2>
            <p style={{ margin: "0 0 24px", fontSize: 13, color: "rgba(226,232,240,0.4)", maxWidth: 400, lineHeight: 1.6 }}>
              SOFIAA analizará el estado de tus proyectos, detectará riesgos, patrones y oportunidades usando el grafo cognitivo NEXO.
            </p>
            <button
              onClick={runAnalysis}
              style={{
                background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                border: "none", borderRadius: 12, padding: "11px 28px",
                fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer",
                boxShadow: "0 0 24px rgba(99,102,241,0.4)",
              }}
            >
              ✦ Activar análisis cognitivo
            </button>
          </div>
        )}

        {/* ── Loading ───────────────────────────────────────────────────── */}
        {loading && (
          <div style={{
            textAlign: "center", padding: "48px 24px",
            background: "rgba(99,102,241,0.04)",
            border: "1px dashed rgba(99,102,241,0.2)",
            borderRadius: 20,
          }}>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              border: "2px solid rgba(99,102,241,0.2)",
              borderTop: "2px solid #6366F1",
              margin: "0 auto 20px",
              animation: "spin 1s linear infinite",
            }} />
            <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "#E2E8F0" }}>
              Analizando el estado del área…
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(226,232,240,0.35)" }}>
              Gemini Flash está procesando tus proyectos y detectando patrones
            </p>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────── */}
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 14, padding: "14px 18px", marginBottom: 20,
          }}>
            <p style={{ margin: 0, fontSize: 13, color: "#EF4444" }}>⚠ {error}</p>
          </div>
        )}

        {/* ── Resultados ───────────────────────────────────────────────── */}
        {data && !loading && (
          <>
            {/* KPIs del análisis */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
              <StatCard label="Proyectos analizados" value={data.proyectos}  color="#E2E8F0" />
              <StatCard label="Urgentes"             value={data.urgentes}   color="#EF4444" sub="urgencia ≥ 70%" />
              <StatCard label="En grafo NEXO"        value={data.enGrafo}    color={ACCENT}  sub="conectados al motor" />
              <StatCard label="Insights generados"   value={data.insights.length} color={ACCENT2} />
            </div>

            {/* Resumen IA */}
            <div style={{
              background:   "rgba(99,102,241,0.06)",
              border:       "1px solid rgba(99,102,241,0.2)",
              borderLeft:   "4px solid #6366F1",
              borderRadius: 14,
              padding:      "14px 18px",
              marginBottom: 24,
              display:      "flex",
              gap:          12,
              alignItems:   "flex-start",
            }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>✦</span>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Diagnóstico SOFIAA
                </p>
                <p style={{ margin: 0, fontSize: 13, color: "rgba(226,232,240,0.75)", lineHeight: 1.65 }}>
                  {data.resumenIA}
                </p>
              </div>
            </div>

            {/* Insights ordenados por prioridad */}
            {insightsByPrioridad.length > 0 ? (
              <div>
                <p style={{
                  margin: "0 0 14px",
                  fontSize: 10, fontWeight: 700,
                  color: "rgba(226,232,240,0.3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}>
                  Insights · {insightsByPrioridad.length} detectados
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {insightsByPrioridad.map((ins) => (
                    <InsightCard key={ins.id} ins={ins} />
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: "center", padding: "32px 24px",
                background: "rgba(16,185,129,0.05)",
                border: "1px solid rgba(16,185,129,0.15)",
                borderRadius: 16,
              }}>
                <p style={{ margin: "0 0 6px", fontSize: 20 }}>✓</p>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#10B981" }}>
                  Sin alertas activas
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "rgba(226,232,240,0.35)" }}>
                  El área opera dentro de parámetros normales
                </p>
              </div>
            )}

            {/* Footer */}
            <p style={{ marginTop: 24, textAlign: "center", fontSize: 11, color: "rgba(226,232,240,0.18)" }}>
              Análisis generado por Gemini Flash · {new Date(data.generadoEn).toLocaleString("es-MX")} · TEC Bii v2
            </p>
          </>
        )}
      </div>
    </>
  );
}
