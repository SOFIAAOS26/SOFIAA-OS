"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  subscribeHermesQueue,
  subscribeHermesConnectors,
} from "@/lib/hermes/firestore";
import type { HermesAction, HermesConnectorConfig } from "@/extensions/hermes/schema";
import { CONNECTOR_LABELS, URGENCIA_COLOR, ESTADO_COLOR } from "@/extensions/hermes/schema";

// ── Paleta HERMES ─────────────────────────────────────────────────────────────
const INDIGO  = "#6366f1";
const VIOLET  = "#8b5cf6";
const CYAN    = "#22d3ee";
const GREEN   = "#22c55e";
const YELLOW  = "#f59e0b";
const RED     = "#ef4444";
const TEXT    = "#e2e8f0";
const MUTED   = "#64748b";
const CARD    = "#0f0f1e";
const BORDER  = "#1a1a30";
const BG      = "#06060f";

// ── Helpers de tiempo ─────────────────────────────────────────────────────────

function startOf(unit: "day" | "week"): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (unit === "week") d.setDate(d.getDate() - d.getDay());
  return d.getTime();
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000)  return "hace un momento";
  if (diff < 3_600_000) return `hace ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `hace ${Math.floor(diff / 3_600_000)} h`;
  return new Date(ts).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = INDIGO, icon }: {
  label: string; value: string; sub?: string; color?: string; icon: string;
}) {
  return (
    <div style={{
      background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`,
      padding: "18px 20px", display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          width: 30, height: 30, borderRadius: 8, background: `${color}20`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
        }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: "0.5px" }}>
          {label.toUpperCase()}
        </span>
      </div>
      <p style={{ fontSize: 26, fontWeight: 800, color, margin: 0, letterSpacing: "-0.5px" }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>{sub}</p>}
    </div>
  );
}

function StatPill({ label, value, color = MUTED }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
      padding: "10px 16px", display: "flex", flexDirection: "column", gap: 2,
    }}>
      <span style={{ fontSize: 16, fontWeight: 800, color }}>{value}</span>
      <span style={{ fontSize: 10, color: MUTED }}>{label}</span>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function HermesDashboard() {
  const { activeWorkspaceId } = useWorkspace();
  const [acciones,   setAcciones]   = useState<HermesAction[]>([]);
  const [conectores, setConectores] = useState<HermesConnectorConfig[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    let first = true;
    const u1 = subscribeHermesQueue(activeWorkspaceId, (data) => {
      setAcciones(data);
      if (first) { setLoading(false); first = false; }
    });
    const u2 = subscribeHermesConnectors(activeWorkspaceId, setConectores);
    return () => { u1(); u2(); };
  }, [activeWorkspaceId]);

  // ── Métricas calculadas ───────────────────────────────────────────────────

  const stats = useMemo(() => {
    const hoyTs    = startOf("day");
    const semanaTs = startOf("week");

    const pendientes     = acciones.filter((a) => a.estado === "pendiente_aprobacion");
    const completadasHoy = acciones.filter((a) => a.estado === "completada" && (a.completadoAt ?? 0) >= hoyTs);
    const fallidasHoy    = acciones.filter((a) => a.estado === "fallida"    && (a.completadoAt ?? a.executedAt ?? 0) >= hoyTs);

    // Tasa de éxito (all time)
    const finalizadas = acciones.filter((a) => ["completada", "fallida"].includes(a.estado));
    const completadas = acciones.filter((a) => a.estado === "completada");
    const tasaExito   = finalizadas.length > 0
      ? Math.round((completadas.length / finalizadas.length) * 100)
      : null;

    // Esta semana
    const estaSemana = acciones.filter((a) => a.createdAt >= semanaTs);

    // Motor más activo
    const motorCount: Record<string, number> = {};
    for (const a of acciones) {
      motorCount[a.sourceEngine] = (motorCount[a.sourceEngine] ?? 0) + 1;
    }
    const motorTop = Object.entries(motorCount).sort((x, y) => y[1] - x[1])[0];

    // Conector más usado (en completadas)
    const connCount: Record<string, number> = {};
    for (const a of completadas) {
      connCount[a.connectorTipo] = (connCount[a.connectorTipo] ?? 0) + 1;
    }
    const connTop = Object.entries(connCount).sort((x, y) => y[1] - x[1])[0];

    // Última actividad
    const ultimaActividad = acciones.length > 0
      ? Math.max(...acciones.map((a) => a.completadoAt ?? a.executedAt ?? a.createdAt))
      : null;

    // Conectores activos (Etapa 1 configurados como activo)
    const conectoresActivos = conectores.filter((c) => c.status === "activo").length;

    // Recientes (últimas 8, sorted por ts más reciente)
    const recientes = [...acciones]
      .sort((a, b) => {
        const tsA = a.completadoAt ?? a.executedAt ?? a.createdAt;
        const tsB = b.completadoAt ?? b.executedAt ?? b.createdAt;
        return tsB - tsA;
      })
      .slice(0, 8);

    // Pendientes por urgencia
    const pendientesSorted = [...pendientes].sort((a, b) => {
      const ord = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };
      return (ord[a.urgencia] ?? 4) - (ord[b.urgencia] ?? 4);
    });

    return {
      pendientes, pendientesSorted,
      completadasHoy, fallidasHoy,
      tasaExito, estaSemana,
      motorTop, connTop,
      ultimaActividad, conectoresActivos,
      recientes, totalAll: acciones.length,
    };
  }, [acciones, conectores]);

  // Conectores por etapa
  const etapa1 = (Object.entries(CONNECTOR_LABELS) as [string, typeof CONNECTOR_LABELS[keyof typeof CONNECTOR_LABELS]][])
    .filter(([, v]) => v.etapa === 1);
  const etapa2 = (Object.entries(CONNECTOR_LABELS) as [string, typeof CONNECTOR_LABELS[keyof typeof CONNECTOR_LABELS]][])
    .filter(([, v]) => v.etapa === 2);

  function connStatus(tipo: string) {
    return conectores.find((c) => c.tipo === tipo)?.status ?? "pendiente_config";
  }

  if (loading && !activeWorkspaceId) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: MUTED }}>
      Selecciona un workspace…
    </div>
  );

  return (
    <div style={{ padding: "32px 24px", maxWidth: 1100, margin: "0 auto", color: TEXT }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `linear-gradient(135deg, ${INDIGO}, ${VIOLET})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, boxShadow: `0 0 20px ${INDIGO}55`,
          }}>⚡</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: TEXT, margin: 0, letterSpacing: "-0.5px" }}>
              HERMES — Centro de Mando
            </h1>
            <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
              Action Execution Layer · SOFIAA piensa. ATENA demuestra. PROMETEO decide. HERMES ejecuta.
            </p>
          </div>
        </div>
        {stats.ultimaActividad && (
          <p style={{ fontSize: 11, color: MUTED, margin: "6px 0 0 52px" }}>
            Última actividad: {relativeTime(stats.ultimaActividad)}
          </p>
        )}
      </div>

      {/* ── KPIs principales ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 14, marginBottom: 16,
      }}>
        <KpiCard
          label="Pendientes"
          value={String(stats.pendientes.length)}
          icon="📥" color={stats.pendientes.length > 0 ? YELLOW : MUTED}
          sub="esperando tu aprobación"
        />
        <KpiCard
          label="Completadas hoy"
          value={String(stats.completadasHoy.length)}
          icon="✅" color={stats.completadasHoy.length > 0 ? GREEN : MUTED}
          sub="ejecutadas con éxito"
        />
        <KpiCard
          label="Fallidas hoy"
          value={String(stats.fallidasHoy.length)}
          icon="❌" color={stats.fallidasHoy.length > 0 ? RED : MUTED}
          sub={stats.fallidasHoy.length > 0 ? "revisar historial" : "sin errores"}
        />
        <KpiCard
          label="Tasa de éxito"
          value={stats.tasaExito !== null ? `${stats.tasaExito}%` : "—"}
          icon="📊"
          color={
            stats.tasaExito === null ? MUTED :
            stats.tasaExito >= 80 ? GREEN :
            stats.tasaExito >= 50 ? YELLOW : RED
          }
          sub="completadas / finalizadas"
        />
      </div>

      {/* ── Stats secundarios ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 10, marginBottom: 28,
      }}>
        <StatPill
          label="Total acciones"
          value={String(stats.totalAll)}
          color={TEXT}
        />
        <StatPill
          label="Esta semana"
          value={String(stats.estaSemana.length)}
          color={INDIGO}
        />
        <StatPill
          label="Conectores activos"
          value={`${stats.conectoresActivos} / 4`}
          color={stats.conectoresActivos > 0 ? GREEN : MUTED}
        />
        <StatPill
          label="Motor más activo"
          value={stats.motorTop ? stats.motorTop[0].toUpperCase() : "—"}
          color={VIOLET}
        />
        <StatPill
          label="Conector más usado"
          value={
            stats.connTop
              ? (CONNECTOR_LABELS[stats.connTop[0] as keyof typeof CONNECTOR_LABELS]?.nombre ?? stats.connTop[0])
              : "—"
          }
          color={CYAN}
        />
      </div>

      {/* ── Cola + Conectores ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

        {/* Cola de pendientes */}
        <div style={{ background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
          <div style={{
            padding: "14px 20px", borderBottom: `1px solid ${BORDER}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>📥 Cola de Acciones</span>
            {stats.pendientes.length > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: YELLOW,
                background: `${YELLOW}20`, padding: "2px 8px", borderRadius: 20,
              }}>
                {stats.pendientes.length} pendiente{stats.pendientes.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {stats.pendientesSorted.length === 0 ? (
            <div style={{ padding: "36px 20px", textAlign: "center", color: MUTED, fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
              Cola vacía — sin acciones pendientes
            </div>
          ) : (
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {stats.pendientesSorted.slice(0, 5).map((a) => (
                <div key={a.id} style={{
                  padding: "11px 20px", borderBottom: `1px solid ${BORDER}`,
                  borderLeft: `3px solid ${URGENCIA_COLOR[a.urgencia]}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{a.titulo}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700,
                      color: URGENCIA_COLOR[a.urgencia],
                      background: `${URGENCIA_COLOR[a.urgencia]}18`,
                      padding: "1px 6px", borderRadius: 4,
                    }}>{a.urgencia}</span>
                  </div>
                  <div style={{ fontSize: 10, color: MUTED, marginBottom: 2 }}>{a.descripcion}</div>
                  <div style={{ fontSize: 9, color: INDIGO }}>
                    {CONNECTOR_LABELS[a.connectorTipo]?.icon} {CONNECTOR_LABELS[a.connectorTipo]?.nombre}
                    {" · "}{a.sourceEngine} · {relativeTime(a.createdAt)}
                  </div>
                </div>
              ))}
              {stats.pendientes.length > 5 && (
                <div style={{ padding: "10px 20px", textAlign: "center", fontSize: 11, color: MUTED }}>
                  +{stats.pendientes.length - 5} más en la cola
                </div>
              )}
            </div>
          )}

          <div style={{ padding: "12px 20px", borderTop: `1px solid ${BORDER}` }}>
            <Link href="/hermes/cola" style={{
              display: "block", textAlign: "center", padding: "8px",
              background: `${INDIGO}20`, border: `1px solid ${INDIGO}44`,
              borderRadius: 8, color: INDIGO, fontSize: 12, fontWeight: 600,
              textDecoration: "none",
            }}>
              {stats.pendientes.length > 0 ? `Revisar ${stats.pendientes.length} acción${stats.pendientes.length !== 1 ? "es" : ""} →` : "Ir a la Cola →"}
            </Link>
          </div>
        </div>

        {/* Conectores */}
        <div style={{ background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>🔌 Estado de Conectores</span>
          </div>

          <div style={{ padding: "12px 20px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "1px", marginBottom: 8 }}>
              ETAPA 1 — DISPONIBLES
            </div>
            {etapa1.map(([tipo, meta]) => {
              const st       = connStatus(tipo);
              const isActivo = st === "activo";
              // Cuántas acciones usaron este conector
              const usos = stats.recientes.filter((a) => a.connectorTipo === tipo).length;
              return (
                <div key={tipo} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 0", borderBottom: `1px solid ${BORDER}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15 }}>{meta.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, color: TEXT }}>{meta.nombre}</div>
                      {usos > 0 && (
                        <div style={{ fontSize: 9, color: MUTED }}>{usos} uso{usos !== 1 ? "s" : ""} reciente{usos !== 1 ? "s" : ""}</div>
                      )}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.5px",
                    color: isActivo ? GREEN : YELLOW,
                    background: isActivo ? `${GREEN}18` : `${YELLOW}18`,
                    padding: "2px 7px", borderRadius: 4,
                  }}>
                    {isActivo ? "ACTIVO" : "CONFIG"}
                  </span>
                </div>
              );
            })}

            <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "1px", margin: "12px 0 8px" }}>
              ETAPA 2 — PRÓXIMAMENTE
            </div>
            {etapa2.map(([tipo, meta]) => (
              <div key={tipo} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "7px 0", borderBottom: `1px solid ${BORDER}`, opacity: 0.5,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{meta.icon}</span>
                  <span style={{ fontSize: 12, color: MUTED }}>{meta.nombre}</span>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: CYAN,
                  background: `${CYAN}18`, padding: "1px 6px", borderRadius: 4,
                }}>ETAPA 2</span>
              </div>
            ))}
          </div>

          <div style={{ padding: "12px 20px", borderTop: `1px solid ${BORDER}` }}>
            <Link href="/hermes/conectores" style={{
              display: "block", textAlign: "center", padding: "8px",
              background: `${INDIGO}20`, border: `1px solid ${INDIGO}44`,
              borderRadius: 8, color: INDIGO, fontSize: 12, fontWeight: 600,
              textDecoration: "none",
            }}>
              Configurar Conectores →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Actividad reciente ── */}
      <div style={{ background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: "hidden", marginBottom: 24 }}>
        <div style={{
          padding: "14px 20px", borderBottom: `1px solid ${BORDER}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>📋 Actividad Reciente</span>
          {stats.totalAll > 0 && (
            <span style={{ fontSize: 11, color: MUTED }}>
              {stats.totalAll} acción{stats.totalAll !== 1 ? "es" : ""} en total
            </span>
          )}
        </div>

        {stats.recientes.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🚀</div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 4 }}>
              Sin actividad todavía
            </div>
            <div style={{ fontSize: 11, color: MUTED }}>
              Genera un Brief en PROMETEO para crear tus primeras acciones
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Acción", "Cliente", "Conector", "Motor", "Urgencia", "Estado", "Tiempo"].map((h) => (
                    <th key={h} style={{
                      padding: "8px 14px", textAlign: "left",
                      fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "0.5px",
                    }}>
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recientes.map((a) => {
                  const ts = a.completadoAt ?? a.executedAt ?? a.createdAt;
                  return (
                    <tr key={a.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ padding: "9px 14px" }}>
                        <span style={{ fontSize: 12, color: TEXT, fontWeight: 500 }}>{a.titulo}</span>
                      </td>
                      <td style={{ padding: "9px 14px", fontSize: 11, color: MUTED }}>
                        {a.clienteNombre ?? "—"}
                      </td>
                      <td style={{ padding: "9px 14px", fontSize: 12, color: MUTED, whiteSpace: "nowrap" }}>
                        {CONNECTOR_LABELS[a.connectorTipo]?.icon} {CONNECTOR_LABELS[a.connectorTipo]?.nombre}
                      </td>
                      <td style={{ padding: "9px 14px" }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: VIOLET,
                          background: `${VIOLET}15`, padding: "1px 6px", borderRadius: 4,
                        }}>{a.sourceEngine}</span>
                      </td>
                      <td style={{ padding: "9px 14px" }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: URGENCIA_COLOR[a.urgencia],
                          background: `${URGENCIA_COLOR[a.urgencia]}15`,
                          padding: "2px 6px", borderRadius: 4,
                        }}>{a.urgencia}</span>
                      </td>
                      <td style={{ padding: "9px 14px" }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: ESTADO_COLOR[a.estado],
                          background: `${ESTADO_COLOR[a.estado]}15`,
                          padding: "2px 6px", borderRadius: 4,
                        }}>{a.estado.replace(/_/g, " ").toUpperCase()}</span>
                      </td>
                      <td style={{ padding: "9px 14px", fontSize: 10, color: MUTED, whiteSpace: "nowrap" }}>
                        {relativeTime(ts)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {stats.recientes.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "flex-end" }}>
            <Link href="/hermes/historial" style={{ fontSize: 11, color: INDIGO, textDecoration: "none" }}>
              Ver historial completo →
            </Link>
          </div>
        )}
      </div>

      {/* ── Vision card ── */}
      <div style={{
        padding: "20px 24px",
        background: `linear-gradient(135deg, ${INDIGO}15, ${VIOLET}10)`,
        border: `1px solid ${INDIGO}33`, borderRadius: 16,
        display: "flex", gap: 16, alignItems: "flex-start",
      }}>
        <span style={{ fontSize: 26, flexShrink: 0 }}>🔭</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: INDIGO, margin: "0 0 4px" }}>
            Arquitectura SOFIAA — Ciclo Cognitivo Completo
          </p>
          <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.7 }}>
            <span style={{ color: "#60a5fa" }}>N.E.X.O.</span> provee contexto y memoria ·{" "}
            <span style={{ color: "#34d399" }}>ATENA</span> valida estadísticamente ·{" "}
            <span style={{ color: "#f97316" }}>PROMETEO</span> decide la estrategia ·{" "}
            <span style={{ color: INDIGO }}>HERMES</span> ejecuta las acciones
            <br />
            Los conectores de <span style={{ color: CYAN }}>Etapa 2</span> (Meta Ads, Google Ads, CRM) están en la hoja de ruta.
          </p>
        </div>
      </div>
    </div>
  );
}
