"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { subscribeHermesQueue } from "@/lib/hermes/firestore";
import type { HermesAction } from "@/extensions/hermes/schema";
import { CONNECTOR_LABELS, URGENCIA_COLOR, ESTADO_COLOR } from "@/extensions/hermes/schema";

const INDIGO = "#6366f1";
const TEXT   = "#e2e8f0";
const MUTED  = "#64748b";
const CARD   = "#0f0f1e";
const BORDER = "#1a1a30";
const GREEN  = "#22c55e";
const RED    = "#ef4444";

export default function HistorialPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [acciones, setAcciones] = useState<HermesAction[]>([]);
  const [filtro,   setFiltro]   = useState<"todas" | "completada" | "fallida" | "rechazada">("todas");

  useEffect(() => {
    if (!activeWorkspaceId) return;
    return subscribeHermesQueue(activeWorkspaceId, setAcciones);
  }, [activeWorkspaceId]);

  const terminadas = acciones
    .filter((a) => ["completada", "fallida", "rechazada"].includes(a.estado))
    .filter((a) => filtro === "todas" || a.estado === filtro)
    .sort((a, b) => (b.completadoAt ?? b.executedAt ?? b.createdAt) - (a.completadoAt ?? a.executedAt ?? a.createdAt));

  return (
    <div style={{ padding: "32px 24px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: TEXT, margin: "0 0 4px" }}>📋 Historial</h1>
        <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>Registro completo de acciones ejecutadas.</p>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["todas", "completada", "fallida", "rechazada"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            style={{
              padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
              background: filtro === f ? INDIGO : `${INDIGO}20`,
              color: filtro === f ? "#fff" : MUTED,
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {terminadas.length === 0 ? (
        <div style={{
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16,
          padding: "48px 24px", textAlign: "center",
        }}>
          <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Sin acciones en el historial todavía.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {terminadas.map((a) => (
            <div key={a.id} style={{
              background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 20px",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{a.titulo}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: ESTADO_COLOR[a.estado],
                      background: `${ESTADO_COLOR[a.estado]}18`, padding: "1px 6px", borderRadius: 4,
                    }}>{a.estado.replace(/_/g, " ").toUpperCase()}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: URGENCIA_COLOR[a.urgencia],
                      background: `${URGENCIA_COLOR[a.urgencia]}15`, padding: "1px 6px", borderRadius: 4,
                    }}>{a.urgencia}</span>
                  </div>
                  <p style={{ fontSize: 12, color: MUTED, margin: "0 0 6px" }}>{a.descripcion}</p>

                  {/* Resultado */}
                  {a.resultado && (
                    <div style={{
                      background: a.resultado.exito ? `${GREEN}10` : `${RED}10`,
                      border: `1px solid ${a.resultado.exito ? GREEN : RED}33`,
                      borderRadius: 8, padding: "8px 12px", marginTop: 8,
                    }}>
                      <p style={{ fontSize: 11, color: a.resultado.exito ? GREEN : RED, margin: 0 }}>
                        {a.resultado.exito ? "✅" : "❌"} {a.resultado.mensaje}
                      </p>
                      {a.resultado.linkAccion && (
                        <a
                          href={a.resultado.linkAccion}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 11, color: INDIGO, display: "block", marginTop: 4 }}
                        >
                          Ver resultado →
                        </a>
                      )}
                    </div>
                  )}

                  {/* Motivo de rechazo */}
                  {a.estado === "rechazada" && a.motivoRechazo && (
                    <p style={{ fontSize: 11, color: MUTED, margin: "6px 0 0", fontStyle: "italic" }}>
                      Motivo: {a.motivoRechazo}
                    </p>
                  )}
                </div>

                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: MUTED }}>
                    {CONNECTOR_LABELS[a.connectorTipo]?.icon} {CONNECTOR_LABELS[a.connectorTipo]?.nombre}
                  </div>
                  <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>
                    {new Date(a.completadoAt ?? a.executedAt ?? a.createdAt).toLocaleDateString("es-MX", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
