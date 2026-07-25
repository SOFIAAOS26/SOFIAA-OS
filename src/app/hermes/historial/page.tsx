"use client";

/**
 * HERMES — Historial de ejecuciones (Sprint H-8 · T-2 update)
 *
 * Muestra todas las acciones terminadas (completada / fallida / rechazada / vetada_por_themis)
 * con sus resultados, filtros por estado y conector, y KPIs resumen.
 *
 * Sprint T-2: acciones vetadas por THEMIS aparecen con 🛡 badge y panel
 * expandible con el razonamiento del veredicto.
 */

import { useState, useEffect } from "react";
import { useWorkspace }        from "@/hooks/useWorkspace";
import { subscribeHermesQueue } from "@/lib/hermes/firestore";
import type { HermesAction, HermesConnectorType } from "@/extensions/hermes/schema";
import { CONNECTOR_LABELS, URGENCIA_COLOR, ESTADO_COLOR } from "@/extensions/hermes/schema";

// ── Constantes de color ───────────────────────────────────────────────────────

const INDIGO  = "#6366f1";
const TEXT    = "#e2e8f0";
const MUTED   = "#64748b";
const CARD    = "#0f0f1e";
const BORDER  = "#1a1a30";
const GREEN   = "#22c55e";
const YELLOW  = "#f59e0b";
const RED     = "#ef4444";
const CYAN    = "#22d3ee";
const THEMIS  = "#059669"; // verde THEMIS — la balanza habló

type EstadoFiltro = "todas" | "completada" | "fallida" | "rechazada" | "vetada_por_themis";

const ESTADO_LABEL: Record<EstadoFiltro, string> = {
  todas:             "Todas",
  completada:        "Completadas",
  fallida:           "Fallidas",
  rechazada:         "Rechazadas",
  vetada_por_themis: "Vetadas THEMIS",
};

// ── Componente ────────────────────────────────────────────────────────────────

export default function HistorialPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [acciones,      setAcciones]      = useState<HermesAction[]>([]);
  const [estadoFiltro,  setEstadoFiltro]  = useState<EstadoFiltro>("todas");
  const [connFiltro,    setConnFiltro]    = useState<HermesConnectorType | "todos">("todos");
  const [expandido,     setExpandido]     = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    return subscribeHermesQueue(activeWorkspaceId, setAcciones);
  }, [activeWorkspaceId]);

  // Solo acciones terminadas, más recientes primero
  const terminadas = acciones.filter((a) =>
    ["completada", "fallida", "rechazada", "vetada_por_themis"].includes(a.estado)
  ).sort((a, b) =>
    (b.completadoAt ?? b.executedAt ?? b.createdAt) -
    (a.completadoAt ?? a.executedAt ?? a.createdAt)
  );

  // Stats
  const stats = {
    total:             terminadas.length,
    completada:        terminadas.filter((a) => a.estado === "completada").length,
    fallida:           terminadas.filter((a) => a.estado === "fallida").length,
    rechazada:         terminadas.filter((a) => a.estado === "rechazada").length,
    vetada_por_themis: terminadas.filter((a) => a.estado === "vetada_por_themis").length,
    exitoPct:          terminadas.length
      ? Math.round((terminadas.filter((a) => a.resultado?.exito).length / terminadas.length) * 100)
      : 0,
  };

  // Conectores presentes en el historial
  const conectoresPresentes = Array.from(
    new Set(terminadas.map((a) => a.connectorTipo))
  ) as HermesConnectorType[];

  // Lista filtrada
  const filtradas = terminadas
    .filter((a) => estadoFiltro === "todas" || a.estado === estadoFiltro)
    .filter((a) => connFiltro  === "todos"  || a.connectorTipo === connFiltro);

  // ── Helpers de UI ───────────────────────────────────────────────────────────

  function fmtDate(ts?: number) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("es-MX", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function estadoColor(e: string) {
    return ESTADO_COLOR[e as keyof typeof ESTADO_COLOR] ?? MUTED;
  }

  function estadoIcon(a: HermesAction): string {
    if (a.estado === "vetada_por_themis")                   return "🛡";
    if (a.estado === "completada" && a.resultado?.exito)    return "✅";
    if (a.estado === "completada" && !a.resultado?.exito)   return "⚠️";
    if (a.estado === "fallida")                             return "❌";
    return "🚫";
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "32px 24px", maxWidth: 920, margin: "0 auto" }}>

      {/* Encabezado */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: TEXT, margin: "0 0 4px" }}>
          📋 Historial de Ejecuciones
        </h1>
        <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
          Registro de todas las acciones procesadas por HERMES.
        </p>
      </div>

      {/* KPI chips */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total",        val: stats.total,             color: CYAN   },
          { label: "Completadas",  val: stats.completada,        color: GREEN  },
          { label: "Fallidas",     val: stats.fallida,           color: RED    },
          { label: "Rechazadas",   val: stats.rechazada,         color: YELLOW },
          { label: "🛡 Vetadas",   val: stats.vetada_por_themis, color: THEMIS },
        ].map((k) => (
          <div key={k.label} style={{
            background: CARD, border: `1px solid ${BORDER}`,
            borderRadius: 12, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tasa de éxito */}
      {stats.total > 0 && (
        <div style={{
          background: `${GREEN}08`, border: `1px solid ${GREEN}25`,
          borderRadius: 10, padding: "10px 16px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 14 }}>🎯</span>
          <span style={{ fontSize: 12, color: TEXT }}>
            Tasa de éxito: <strong style={{ color: GREEN }}>{stats.exitoPct}%</strong>
            <span style={{ color: MUTED, marginLeft: 8 }}>
              ({terminadas.filter((a) => a.resultado?.exito).length} de {stats.total} con resultado exitoso)
            </span>
          </span>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {/* Filtro por estado */}
        {(["todas", "completada", "fallida", "rechazada", "vetada_por_themis"] as EstadoFiltro[]).map((f) => (
          <button key={f} onClick={() => setEstadoFiltro(f)} style={{
            padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer",
            fontSize: 11, fontWeight: 600,
            background: estadoFiltro === f
              ? (f === "vetada_por_themis" ? THEMIS : INDIGO)
              : `${f === "vetada_por_themis" ? THEMIS : INDIGO}20`,
            color: estadoFiltro === f ? "#fff" : MUTED,
          }}>
            {ESTADO_LABEL[f]}
          </button>
        ))}

        {/* Separador */}
        <div style={{ width: 1, background: BORDER, margin: "0 4px" }} />

        {/* Filtro por conector */}
        <button onClick={() => setConnFiltro("todos")} style={{
          padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer",
          fontSize: 11, fontWeight: 600,
          background: connFiltro === "todos" ? "#334155" : `#33415520`,
          color:      connFiltro === "todos" ? TEXT       : MUTED,
        }}>
          Todos los conectores
        </button>
        {conectoresPresentes.map((c) => {
          const meta = CONNECTOR_LABELS[c];
          return (
            <button key={c} onClick={() => setConnFiltro(c)} style={{
              padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer",
              fontSize: 11, fontWeight: 600,
              background: connFiltro === c ? "#334155" : `#33415520`,
              color:      connFiltro === c ? TEXT       : MUTED,
            }}>
              {meta?.icon} {meta?.nombre}
            </button>
          );
        })}
      </div>

      {/* Conteo filtrado */}
      {filtradas.length > 0 && (
        <p style={{ fontSize: 11, color: MUTED, margin: "0 0 14px" }}>
          {filtradas.length} {filtradas.length === 1 ? "acción" : "acciones"}
        </p>
      )}

      {/* Lista vacía */}
      {filtradas.length === 0 && (
        <div style={{
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16,
          padding: "48px 24px", textAlign: "center",
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
          <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
            {terminadas.length === 0
              ? "Sin acciones en el historial todavía. Aprueba acciones desde la Cola."
              : "No hay acciones con este filtro."}
          </p>
        </div>
      )}

      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtradas.map((a) => {
          const isExp    = expandido === a.id;
          const ec       = estadoColor(a.estado);
          const isVetada = a.estado === "vetada_por_themis";

          return (
            <div
              key={a.id}
              style={{
                background: isVetada ? `${THEMIS}08` : CARD,
                border:     `1px solid ${isExp ? (isVetada ? THEMIS : INDIGO) : (isVetada ? `${THEMIS}40` : BORDER)}`,
                borderLeft: `4px solid ${ec}`,
                borderRadius: 12, overflow: "hidden",
                transition: "border-color 0.2s",
              }}
            >
              {/* Fila principal */}
              <div
                onClick={() => setExpandido(isExp ? null : a.id)}
                style={{
                  padding: "14px 18px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 12,
                }}
              >
                {/* Ícono estado */}
                <span style={{ fontSize: 16, flexShrink: 0 }}>
                  {estadoIcon(a)}
                </span>

                {/* Título + badges */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{a.titulo}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: ec,
                      background: `${ec}18`, padding: "1px 6px", borderRadius: 4,
                    }}>{a.estado.replace(/_/g, " ").toUpperCase()}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: URGENCIA_COLOR[a.urgencia],
                      background: `${URGENCIA_COLOR[a.urgencia]}15`, padding: "1px 6px", borderRadius: 4,
                    }}>{a.urgencia}</span>
                    {isVetada && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, color: THEMIS,
                        background: `${THEMIS}20`, padding: "1px 8px", borderRadius: 4,
                        border: `1px solid ${THEMIS}40`,
                      }}>🛡 THEMIS</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {isVetada
                      ? (a.motivoRechazo ?? "Acción vetada por THEMIS — veredicto persistido")
                      : (a.resultado?.mensaje ?? a.descripcion)}
                  </div>
                </div>

                {/* Meta derecha */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: MUTED }}>
                    {CONNECTOR_LABELS[a.connectorTipo]?.icon} {CONNECTOR_LABELS[a.connectorTipo]?.nombre}
                  </div>
                  <div style={{ fontSize: 10, color: MUTED, marginTop: 3 }}>
                    {fmtDate(a.completadoAt ?? a.executedAt)}
                  </div>
                </div>

                {/* Chevron */}
                <span style={{ color: MUTED, fontSize: 11, flexShrink: 0 }}>
                  {isExp ? "▲" : "▼"}
                </span>
              </div>

              {/* Panel expandido */}
              {isExp && (
                <div style={{ borderTop: `1px solid ${isVetada ? `${THEMIS}30` : BORDER}`, padding: "16px 20px", background: "#0a0a1a" }}>

                  {/* 🛡 Panel THEMIS — solo para acciones vetadas */}
                  {isVetada && (
                    <div style={{
                      background: `${THEMIS}10`,
                      border: `1px solid ${THEMIS}40`,
                      borderRadius: 10, padding: "14px 16px", marginBottom: 16,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 16 }}>🛡</span>
                        <p style={{ fontSize: 12, fontWeight: 800, color: THEMIS, margin: 0 }}>
                          Veredicto THEMIS
                        </p>
                        {a.themisVerdictId && (
                          <span style={{
                            fontSize: 9, color: MUTED,
                            background: `${THEMIS}15`, padding: "1px 6px", borderRadius: 4,
                            fontFamily: "monospace",
                          }}>
                            #{a.themisVerdictId.slice(0, 8)}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: TEXT, margin: 0, lineHeight: 1.6 }}>
                        {a.motivoRechazo ?? "THEMIS vetó esta acción antes de ejecutarse. El veredicto ha sido persistido."}
                      </p>
                      <p style={{ fontSize: 10, color: MUTED, margin: "8px 0 0" }}>
                        La acción fue interceptada antes de cruzar el umbral al mundo real. Ningún conector externo fue contactado.
                      </p>
                    </div>
                  )}

                  {/* Descripción */}
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 11, color: MUTED, margin: "0 0 4px", fontWeight: 700 }}>Descripción</p>
                    <p style={{ fontSize: 12, color: TEXT, margin: 0 }}>{a.descripcion}</p>
                  </div>

                  {/* Justificación */}
                  {a.justificacion && (
                    <div style={{ marginBottom: 14 }}>
                      <p style={{ fontSize: 11, color: MUTED, margin: "0 0 4px", fontWeight: 700 }}>
                        Justificación ({a.sourceEngine})
                      </p>
                      <p style={{ fontSize: 12, color: TEXT, margin: 0 }}>{a.justificacion}</p>
                    </div>
                  )}

                  {/* Resultado — solo para no-vetadas */}
                  {!isVetada && a.resultado && (
                    <div style={{
                      background: a.resultado.exito ? `${GREEN}10` : `${RED}10`,
                      border: `1px solid ${a.resultado.exito ? GREEN : RED}33`,
                      borderRadius: 8, padding: "10px 14px", marginBottom: 12,
                    }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: a.resultado.exito ? GREEN : RED, margin: "0 0 4px" }}>
                        Resultado
                      </p>
                      <p style={{ fontSize: 12, color: TEXT, margin: 0 }}>{a.resultado.mensaje}</p>
                      {a.resultado.linkAccion && (
                        <a
                          href={a.resultado.linkAccion}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 11, color: INDIGO, display: "inline-block", marginTop: 6 }}
                        >
                          Ver en plataforma →
                        </a>
                      )}
                    </div>
                  )}

                  {/* Motivo rechazo — solo para rechazadas por usuario */}
                  {a.estado === "rechazada" && a.motivoRechazo && (
                    <div style={{
                      background: `${YELLOW}10`, border: `1px solid ${YELLOW}30`,
                      borderRadius: 8, padding: "10px 14px", marginBottom: 12,
                    }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: YELLOW, margin: "0 0 4px" }}>
                        Motivo de rechazo
                      </p>
                      <p style={{ fontSize: 12, color: TEXT, margin: 0 }}>{a.motivoRechazo}</p>
                    </div>
                  )}

                  {/* Meta */}
                  <div style={{ display: "flex", gap: 24, fontSize: 11, color: MUTED, flexWrap: "wrap" }}>
                    {a.clienteNombre && <span>Cliente: <span style={{ color: TEXT }}>{a.clienteNombre}</span></span>}
                    {a.aprobadoPor   && <span>Aprobado por: <span style={{ color: TEXT }}>{a.aprobadoPor}</span></span>}
                    {a.reintentos != null && a.reintentos > 0 && <span>Reintentos: <span style={{ color: TEXT }}>{a.reintentos}</span></span>}
                    <span>Motor: <span style={{ color: TEXT }}>{a.sourceEngine ?? "—"}</span></span>
                    {isVetada && a.themisVerdictId && (
                      <span>Veredicto: <span style={{ color: THEMIS, fontFamily: "monospace" }}>{a.themisVerdictId.slice(0, 12)}…</span></span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
