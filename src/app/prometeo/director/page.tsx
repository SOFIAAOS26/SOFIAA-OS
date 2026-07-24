"use client";

/**
 * PROMETEO — Director Autónomo (Sprint P-5)
 * /prometeo/director
 *
 * Brief diario generado por IA.
 * Analiza goals activos + Creative Memory → produce recomendaciones priorizadas.
 */

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { subscribeDirectorBriefs, accionarRecomendacion } from "@/lib/prometeo/firestore";
import type { DirectorBrief } from "@/extensions/prometeo/schema";

// ── Paleta ────────────────────────────────────────────────────────────────────

const FIRE    = "#f97316";
const CRIMSON = "#ef4444";
const BG      = "#09090f";
const CARD    = "#14141f";
const CARD2   = "#1a1a2e";
const BORDER  = "#1e1e2e";
const TEXT    = "#e2e8f0";
const MUTED   = "#64748b";
const GREEN   = "#22c55e";
const AMBER   = "#f59e0b";
const BLUE    = "#3b82f6";
const GOLD    = "#eab308";

// ── Urgencia meta ─────────────────────────────────────────────────────────────

const URGENCIA_META = {
  ALTA:  { color: CRIMSON, label: "URGENTE",  icon: "🔴" },
  MEDIA: { color: AMBER,   label: "MEDIA",    icon: "🟡" },
  BAJA:  { color: GREEN,   label: "BAJA",     icon: "🟢" },
};

const TIPO_META: Record<string, { icon: string; label: string }> = {
  FATIGA:         { icon: "😴", label: "Fatiga creativa"   },
  ESCALAR:        { icon: "🚀", label: "Escalar presupuesto" },
  PAUSAR:         { icon: "⏸️", label: "Pausar campaña"    },
  NUEVO_CREATIVO: { icon: "✨", label: "Nuevo creativo"    },
  CAMBIAR_CANAL:  { icon: "📡", label: "Cambiar canal"     },
};

// ── KPI chip ──────────────────────────────────────────────────────────────────

function KpiChip({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      background: CARD2, border: `1px solid ${BORDER}`,
      borderRadius: 12, padding: "14px 16px", textAlign: "center",
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: color ?? TEXT }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ── Fecha legible ─────────────────────────────────────────────────────────────

function fechaLegible(fecha: string): string {
  try {
    return new Date(fecha + "T12:00:00").toLocaleDateString("es-MX", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  } catch {
    return fecha;
  }
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function DirectorPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [briefs,     setBriefs]     = useState<DirectorBrief[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [generating,        setGenerating]        = useState(false);
  const [error,             setError]             = useState<string | null>(null);
  const [selected,          setSelected]          = useState<DirectorBrief | null>(null);
  const [accionesEncoladas, setAccionesEncoladas] = useState<number | null>(null);

  // ── Subscribe briefs ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeWorkspaceId) return;
    return subscribeDirectorBriefs(activeWorkspaceId, (list) => {
      setBriefs(list);
      if (list.length > 0 && !selected) setSelected(list[0]);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaceId]);

  const activeBrief = selected ?? briefs[0] ?? null;

  // ── Generar brief ─────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!activeWorkspaceId) return;
    setGenerating(true);
    setError(null);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) throw new Error("Sin autenticación");

      const res = await fetch("/api/prometeo/director/brief", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ workspaceId: activeWorkspaceId }),
      });

      const data = await res.json() as {
        ok?: boolean;
        brief?: DirectorBrief;
        error?: string;
        hermes?: { accionesEncoladas: number };
      };
      if (!data.ok) throw new Error(data.error ?? "Error generando brief");
      if (data.brief) setSelected(data.brief);
      if (data.hermes?.accionesEncoladas !== undefined) {
        setAccionesEncoladas(data.hermes.accionesEncoladas);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setGenerating(false);
    }
  };

  // ── Accionar recomendación ────────────────────────────────────────────────
  const handleAccionar = async (briefId: string, clienteId: string) => {
    if (!activeWorkspaceId) return;
    await accionarRecomendacion(activeWorkspaceId, briefId, clienteId);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "28px 24px", color: TEXT, minHeight: "100vh", background: BG }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🤖</span>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>
              Director Autónomo
            </h1>
            <span style={{
              fontSize: 10, fontWeight: 700, color: GOLD, letterSpacing: "1px",
              background: `${GOLD}18`, padding: "2px 7px", borderRadius: 4,
            }}>P-5</span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: MUTED }}>
            Brief ejecutivo diario generado por IA — recomendaciones priorizadas por urgencia
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            background: generating
              ? BORDER
              : `linear-gradient(135deg, ${GOLD}, ${FIRE})`,
            border: "none", borderRadius: 10, padding: "10px 18px",
            color: generating ? MUTED : "#fff", fontWeight: 700,
            fontSize: 14, cursor: generating ? "not-allowed" : "pointer",
            boxShadow: generating ? "none" : `0 0 20px ${GOLD}44`,
            transition: "all 0.2s",
          }}
        >
          {generating ? "⏳ Analizando…" : "⚡ Generar Brief del Día"}
        </button>
      </div>

      {error && (
        <div style={{
          marginBottom: 16, fontSize: 13, color: CRIMSON,
          background: `${CRIMSON}12`, borderRadius: 10, padding: "10px 14px",
          border: `1px solid ${CRIMSON}33`,
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Banner HERMES — acciones encoladas */}
      {accionesEncoladas !== null && (
        <div style={{
          marginBottom: 20, display: "flex", alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #6366f115, #8b5cf610)",
          border: "1px solid #6366f133", borderRadius: 12, padding: "12px 18px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚡</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
                {accionesEncoladas > 0
                  ? `${accionesEncoladas} acción${accionesEncoladas !== 1 ? "es" : ""} enviada${accionesEncoladas !== 1 ? "s" : ""} a HERMES`
                  : "Brief generado — sin acciones nuevas para HERMES"}
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                {accionesEncoladas > 0
                  ? "Revisa y aprueba cada acción antes de ejecutarla"
                  : "El brief fue guardado correctamente"}
              </div>
            </div>
          </div>
          {accionesEncoladas > 0 && (
            <a
              href="/hermes/cola"
              style={{
                background: "#6366f1", color: "#fff", borderRadius: 8,
                padding: "7px 14px", fontSize: 12, fontWeight: 700,
                textDecoration: "none", flexShrink: 0,
              }}
            >
              Ver cola →
            </a>
          )}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", color: MUTED, padding: 60 }}>Cargando…</div>
      )}

      {!loading && briefs.length === 0 && (
        <div style={{
          textAlign: "center", padding: "60px 24px",
          background: CARD, borderRadius: 16, border: `1px dashed ${BORDER}`,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Sin briefs generados</div>
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 20 }}>
            El Director Autónomo analiza tus objetivos activos y Creative Memory
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              background: GOLD, border: "none", borderRadius: 8,
              padding: "10px 20px", color: "#fff", fontWeight: 700, cursor: "pointer",
            }}
          >
            {generating ? "Generando…" : "Generar primer brief"}
          </button>
        </div>
      )}

      {!loading && briefs.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, alignItems: "start" }}>

          {/* ── Historial de briefs ── */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: "1px", marginBottom: 8 }}>
              HISTORIAL
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {briefs.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelected(b)}
                  style={{
                    background: activeBrief?.id === b.id ? `${GOLD}18` : CARD,
                    border: `1px solid ${activeBrief?.id === b.id ? GOLD + "55" : BORDER}`,
                    borderRadius: 10, padding: "10px 12px", cursor: "pointer",
                    textAlign: "left", width: "100%", color: TEXT,
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: activeBrief?.id === b.id ? 700 : 400 }}>
                    {b.fecha}
                  </div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                    {b.recomendaciones.length} rec · {b.totalClientes} clientes
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Brief activo ── */}
          {activeBrief && (
            <div>
              {/* Fecha */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>
                  {fechaLegible(activeBrief.fecha)}
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                  Generado a las {new Date(activeBrief.generadoAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>

              {/* KPIs ejecutivos */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
                <KpiChip label="Clientes activos" value={activeBrief.totalClientes} />
                <KpiChip label="Con fatiga" value={activeBrief.clientesConFatiga} color={activeBrief.clientesConFatiga > 0 ? CRIMSON : GREEN} />
                <KpiChip label="Sin meta" value={activeBrief.clientesSinMeta} color={activeBrief.clientesSinMeta > 2 ? AMBER : TEXT} />
                <KpiChip label="ROAS promedio" value={`${activeBrief.roasPromedio}x`} color={activeBrief.roasPromedio >= 3 ? GREEN : AMBER} />
              </div>

              {/* Inversión */}
              {activeBrief.inversionSemana > 0 && (
                <div style={{
                  background: `${FIRE}12`, border: `1px solid ${FIRE}33`,
                  borderRadius: 12, padding: "12px 16px", marginBottom: 20,
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span style={{ fontSize: 20 }}>💰</span>
                  <div>
                    <div style={{ fontSize: 12, color: MUTED }}>INVERSIÓN TOTAL EN OBJETIVOS ACTIVOS</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: FIRE }}>
                      ${activeBrief.inversionSemana.toLocaleString()} MXN
                    </div>
                  </div>
                </div>
              )}

              {/* Recomendaciones */}
              {activeBrief.recomendaciones.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, letterSpacing: "1px", marginBottom: 12 }}>
                    📋 RECOMENDACIONES DEL DÍA
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {[...activeBrief.recomendaciones]
                      .sort((a, b) => {
                        const order = { ALTA: 0, MEDIA: 1, BAJA: 2 };
                        return order[a.urgencia] - order[b.urgencia];
                      })
                      .map((rec, i) => {
                        const urg  = URGENCIA_META[rec.urgencia];
                        const tipo = TIPO_META[rec.tipo] ?? { icon: "•", label: rec.tipo };
                        return (
                          <div
                            key={i}
                            style={{
                              background: rec.accionada ? `${GREEN}08` : CARD,
                              border: `1px solid ${rec.accionada ? GREEN + "33" : urg.color + "33"}`,
                              borderRadius: 12, padding: "14px 16px",
                              opacity: rec.accionada ? 0.7 : 1,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                              <div style={{ fontSize: 22, flexShrink: 0 }}>{tipo.icon}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                                  <span style={{ fontSize: 13, fontWeight: 700 }}>{rec.clienteNombre}</span>
                                  <span style={{
                                    fontSize: 10, padding: "1px 7px", borderRadius: 4, fontWeight: 700,
                                    background: `${urg.color}22`, color: urg.color,
                                  }}>
                                    {urg.icon} {urg.label}
                                  </span>
                                  <span style={{ fontSize: 11, color: MUTED }}>{tipo.label}</span>
                                </div>
                                <div style={{ fontSize: 13, color: TEXT, lineHeight: 1.5 }}>
                                  {rec.descripcion}
                                </div>
                              </div>
                              {!rec.accionada ? (
                                <button
                                  onClick={() => handleAccionar(activeBrief.id, rec.clienteId)}
                                  style={{
                                    flexShrink: 0, background: `${GREEN}18`,
                                    border: `1px solid ${GREEN}44`, borderRadius: 7,
                                    padding: "5px 10px", color: GREEN,
                                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                                  }}
                                >
                                  ✓ Accionar
                                </button>
                              ) : (
                                <span style={{ fontSize: 11, color: GREEN, flexShrink: 0 }}>✓ Hecho</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Oportunidades */}
              {activeBrief.oportunidades.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, letterSpacing: "1px", marginBottom: 12 }}>
                    🌟 OPORTUNIDADES DETECTADAS
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {activeBrief.oportunidades.map((op, i) => (
                      <div
                        key={i}
                        style={{
                          background: `${GOLD}10`, border: `1px solid ${GOLD}33`,
                          borderRadius: 12, padding: "14px 16px",
                          display: "flex", gap: 12, alignItems: "flex-start",
                        }}
                      >
                        <span style={{ fontSize: 20, flexShrink: 0 }}>💡</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                            {op.clienteId}
                          </div>
                          <div style={{ fontSize: 13, color: TEXT, lineHeight: 1.5 }}>
                            {op.descripcion}
                          </div>
                          <div style={{
                            marginTop: 6, display: "inline-block",
                            fontSize: 11, fontWeight: 700, color: GOLD,
                            background: `${GOLD}18`, padding: "2px 8px", borderRadius: 5,
                          }}>
                            {op.potencial}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
