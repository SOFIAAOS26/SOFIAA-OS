"use client";

import { useState, useEffect } from "react";
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
const CARD2   = "#13132a";
const BORDER  = "#1a1a30";
const BG      = "#06060f";

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

export default function HermesDashboard() {
  const { activeWorkspaceId } = useWorkspace();
  const [acciones,    setAcciones]    = useState<HermesAction[]>([]);
  const [conectores,  setConectores]  = useState<HermesConnectorConfig[]>([]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    const u1 = subscribeHermesQueue(activeWorkspaceId, setAcciones);
    const u2 = subscribeHermesConnectors(activeWorkspaceId, setConectores);
    return () => { u1(); u2(); };
  }, [activeWorkspaceId]);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const hoyTs = hoy.getTime();

  const pendientes      = acciones.filter((a) => a.estado === "pendiente_aprobacion");
  const completadasHoy  = acciones.filter((a) => a.estado === "completada" && (a.completadoAt ?? 0) >= hoyTs);
  const fallidasHoy     = acciones.filter((a) => a.estado === "fallida"    && (a.executedAt  ?? 0) >= hoyTs);
  const conectoresActivos = conectores.filter((c) => c.status === "activo");

  // Últimas 5 acciones de cualquier estado
  const recientes = [...acciones]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  // Conectores Etapa 1 con su estado
  const conectoresEtapa1 = (Object.entries(CONNECTOR_LABELS) as [keyof typeof CONNECTOR_LABELS, typeof CONNECTOR_LABELS[keyof typeof CONNECTOR_LABELS]][])
    .filter(([, v]) => v.etapa === 1);
  const conectoresEtapa2 = (Object.entries(CONNECTOR_LABELS) as [keyof typeof CONNECTOR_LABELS, typeof CONNECTOR_LABELS[keyof typeof CONNECTOR_LABELS]][])
    .filter(([, v]) => v.etapa === 2);

  function getConnectorStatus(tipo: string) {
    return conectores.find((c) => c.tipo === tipo)?.status ?? "pendiente_config";
  }

  return (
    <div style={{ padding: "32px 24px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
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
      </div>

      {/* KPIs */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 16, marginBottom: 32,
      }}>
        <KpiCard label="Pendientes"       value={String(pendientes.length)}     icon="📥" color={YELLOW} sub="esperando aprobación" />
        <KpiCard label="Completadas hoy"  value={String(completadasHoy.length)} icon="✅" color={GREEN}  sub="ejecutadas con éxito" />
        <KpiCard label="Fallidas hoy"     value={String(fallidasHoy.length)}    icon="❌" color={RED}    sub="requieren atención" />
        <KpiCard label="Conectores"       value={`${conectoresActivos.length}/4`} icon="🔌" color={INDIGO} sub="Etapa 1 configurados" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}
        className="grid-cols-1 md:grid-cols-2"
      >
        {/* Cola de pendientes */}
        <div style={{ background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
          <div style={{
            padding: "16px 20px", borderBottom: `1px solid ${BORDER}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>📥 Cola de Acciones</span>
            {pendientes.length > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: YELLOW,
                background: `${YELLOW}20`, padding: "2px 8px", borderRadius: 20,
              }}>
                {pendientes.length} pendiente{pendientes.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {pendientes.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: MUTED, fontSize: 13 }}>
              Sin acciones pendientes 🎉
            </div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {pendientes.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: "12px 20px",
                    borderBottom: `1px solid ${BORDER}`,
                    display: "flex", flexDirection: "column", gap: 4,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>{a.titulo}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: "0.5px",
                      color: URGENCIA_COLOR[a.urgencia],
                      background: `${URGENCIA_COLOR[a.urgencia]}18`,
                      padding: "1px 6px", borderRadius: 4,
                    }}>{a.urgencia}</span>
                  </div>
                  <span style={{ fontSize: 10, color: MUTED }}>{a.descripcion}</span>
                  <span style={{ fontSize: 9, color: INDIGO }}>
                    {CONNECTOR_LABELS[a.connectorTipo]?.icon} {CONNECTOR_LABELS[a.connectorTipo]?.nombre} · desde {a.sourceEngine}
                  </span>
                </div>
              ))}
              {pendientes.length > 5 && (
                <div style={{ padding: "10px 20px", textAlign: "center" }}>
                  <Link href="/hermes/cola" style={{ fontSize: 11, color: INDIGO, textDecoration: "none" }}>
                    Ver {pendientes.length - 5} más →
                  </Link>
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
              Ir a la Cola de Acciones →
            </Link>
          </div>
        </div>

        {/* Conectores */}
        <div style={{ background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>🔌 Estado de Conectores</span>
          </div>

          <div style={{ padding: "12px 20px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "1px", marginBottom: 8 }}>
              ETAPA 1 — DISPONIBLES
            </div>
            {conectoresEtapa1.map(([tipo, meta]) => {
              const st = getConnectorStatus(tipo);
              const isActivo = st === "activo";
              return (
                <div key={tipo} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 0", borderBottom: `1px solid ${BORDER}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{meta.icon}</span>
                    <span style={{ fontSize: 12, color: TEXT }}>{meta.nombre}</span>
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.5px",
                    color: isActivo ? GREEN : YELLOW,
                    background: isActivo ? `${GREEN}18` : `${YELLOW}18`,
                    padding: "1px 6px", borderRadius: 4,
                  }}>
                    {isActivo ? "ACTIVO" : "CONFIG"}
                  </span>
                </div>
              );
            })}

            <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "1px", margin: "12px 0 8px" }}>
              ETAPA 2 — PRÓXIMAMENTE
            </div>
            {conectoresEtapa2.map(([tipo, meta]) => (
              <div key={tipo} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "7px 0", borderBottom: `1px solid ${BORDER}`, opacity: 0.5,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{meta.icon}</span>
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

      {/* Actividad reciente */}
      <div style={{ background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>📋 Actividad Reciente</span>
        </div>

        {recientes.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center", color: MUTED, fontSize: 13 }}>
            Sin actividad todavía. Las acciones de PROMETEO aparecerán aquí.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Acción", "Conector", "Origen", "Urgencia", "Estado", "Fecha"].map((h) => (
                  <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "0.5px" }}>
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recientes.map((a) => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ fontSize: 12, color: TEXT, fontWeight: 500 }}>{a.titulo}</span>
                    {a.clienteNombre && (
                      <div style={{ fontSize: 10, color: MUTED }}>{a.clienteNombre}</div>
                    )}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: MUTED }}>
                    {CONNECTOR_LABELS[a.connectorTipo]?.icon} {CONNECTOR_LABELS[a.connectorTipo]?.nombre}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 11, color: VIOLET }}>{a.sourceEngine}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: URGENCIA_COLOR[a.urgencia],
                      background: `${URGENCIA_COLOR[a.urgencia]}18`,
                      padding: "2px 7px", borderRadius: 4,
                    }}>{a.urgencia}</span>
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: ESTADO_COLOR[a.estado],
                      background: `${ESTADO_COLOR[a.estado]}18`,
                      padding: "2px 7px", borderRadius: 4,
                    }}>{a.estado.replace(/_/g, " ").toUpperCase()}</span>
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 11, color: MUTED }}>
                    {new Date(a.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {recientes.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: `1px solid ${BORDER}` }}>
            <Link href="/hermes/historial" style={{ fontSize: 11, color: INDIGO, textDecoration: "none" }}>
              Ver historial completo →
            </Link>
          </div>
        )}
      </div>

      {/* Vision card */}
      <div style={{
        marginTop: 24, padding: "20px 24px",
        background: `linear-gradient(135deg, ${INDIGO}15, ${VIOLET}10)`,
        border: `1px solid ${INDIGO}33`, borderRadius: 16,
        display: "flex", gap: 16, alignItems: "flex-start",
      }}>
        <span style={{ fontSize: 28, flexShrink: 0 }}>🔭</span>
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
            Los conectores de <span style={{ color: CYAN }}>Etapa 2</span> (Meta Ads, Google Ads, CRM) están en la hoja de ruta — el schema ya los contempla.
          </p>
        </div>
      </div>
    </div>
  );
}
