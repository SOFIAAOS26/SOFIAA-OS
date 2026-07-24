"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { getAuth } from "firebase/auth";
import { subscribeHermesQueue, approveAction, rejectAction } from "@/lib/hermes/firestore";
import type { HermesAction } from "@/extensions/hermes/schema";
import { CONNECTOR_LABELS, URGENCIA_COLOR, ESTADO_COLOR } from "@/extensions/hermes/schema";

const INDIGO = "#6366f1";
const VIOLET = "#8b5cf6";
const GREEN  = "#22c55e";
const YELLOW = "#f59e0b";
const RED    = "#ef4444";
const TEXT   = "#e2e8f0";
const MUTED  = "#64748b";
const CARD   = "#0f0f1e";
const BORDER = "#1a1a30";

interface ExecResult { ok: boolean; titulo: string; mensaje: string }

export default function ColaPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [acciones,   setAcciones]   = useState<HermesAction[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [motivoRec,  setMotivoRec]  = useState<Record<string, string>>({});
  const [notifs,     setNotifs]     = useState<ExecResult[]>([]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    const unsub = subscribeHermesQueue(activeWorkspaceId, (data) => {
      setAcciones(data);
      setLoading(false);
    });
    return () => unsub();
  }, [activeWorkspaceId]);

  const pendientes = acciones.filter((a) => a.estado === "pendiente_aprobacion")
    .sort((a, b) => {
      const urgOrder = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };
      return (urgOrder[a.urgencia] ?? 4) - (urgOrder[b.urgencia] ?? 4);
    });

  const pushNotif = (n: ExecResult) =>
    setNotifs((prev) => [n, ...prev].slice(0, 5));

  const handleApprove = async (accion: HermesAction) => {
    if (!activeWorkspaceId) return;
    setProcesando(accion.id);
    try {
      // 1. Cambiar estado a "aprobada" en Firestore
      await approveAction(activeWorkspaceId, accion.id);

      // 2. Disparar ejecución y capturar resultado
      const currentUser = getAuth().currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        try {
          const res  = await fetch("/api/hermes/execute", {
            method:  "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body:    JSON.stringify({ workspaceId: activeWorkspaceId, actionId: accion.id }),
          });
          const data = await res.json() as { resultado?: { exito: boolean; mensaje: string } };
          const r    = data.resultado;
          pushNotif({
            ok:      r?.exito ?? false,
            titulo:  accion.titulo,
            mensaje: r?.mensaje ?? (res.ok ? "Ejecutado" : "Error al ejecutar"),
          });
        } catch {
          pushNotif({ ok: false, titulo: accion.titulo, mensaje: "Error de red al ejecutar" });
        }
      }
    } catch (e) { console.error(e); }
    finally { setProcesando(null); }
  };

  const handleReject = async (accion: HermesAction) => {
    if (!activeWorkspaceId) return;
    const motivo = motivoRec[accion.id] ?? "";
    setProcesando(accion.id);
    try {
      await rejectAction(activeWorkspaceId, accion.id, motivo);
    } catch (e) { console.error(e); }
    finally { setProcesando(null); }
  };

  return (
    <div style={{ padding: "32px 24px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: TEXT, margin: "0 0 4px" }}>
          📥 Cola de Acciones
        </h1>
        <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
          Revisa y aprueba las acciones generadas por PROMETEO y otros motores. Toda ejecución requiere tu aprobación.
        </p>
      </div>

      {/* Notificaciones de ejecución reciente */}
      {notifs.length > 0 && (
        <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          {notifs.map((n, i) => (
            <div key={i} style={{
              background: n.ok ? `${GREEN}10` : `${RED}10`,
              border: `1px solid ${n.ok ? GREEN : RED}33`,
              borderRadius: 10, padding: "10px 16px",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 16 }}>{n.ok ? "✅" : "❌"}</span>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: n.ok ? GREEN : RED }}>
                  {n.titulo}
                </span>
                <span style={{ fontSize: 12, color: MUTED, marginLeft: 8 }}>{n.mensaje}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: MUTED }}>Cargando cola…</div>
      )}

      {!loading && pendientes.length === 0 && (
        <div style={{
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16,
          padding: "48px 24px", textAlign: "center",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <p style={{ fontSize: 14, color: TEXT, fontWeight: 600, margin: "0 0 6px" }}>Cola vacía</p>
          <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
            No hay acciones pendientes. Cuando PROMETEO genere recomendaciones aprobables, aparecerán aquí.
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {pendientes.map((a) => (
          <div
            key={a.id}
            style={{
              background: CARD, border: `1px solid ${BORDER}`,
              borderLeft: `4px solid ${URGENCIA_COLOR[a.urgencia]}`,
              borderRadius: 14, padding: "20px 24px",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{a.titulo}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: URGENCIA_COLOR[a.urgencia],
                    background: `${URGENCIA_COLOR[a.urgencia]}18`, padding: "1px 6px", borderRadius: 4,
                  }}>{a.urgencia}</span>
                </div>
                <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>{a.descripcion}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 16 }}>{CONNECTOR_LABELS[a.connectorTipo]?.icon}</span>
                <span style={{ fontSize: 11, color: VIOLET }}>{CONNECTOR_LABELS[a.connectorTipo]?.nombre}</span>
              </div>
            </div>

            {/* Justificación */}
            <div style={{
              background: `${INDIGO}10`, border: `1px solid ${INDIGO}22`,
              borderRadius: 8, padding: "10px 14px", marginBottom: 14,
            }}>
              <p style={{ fontSize: 11, color: MUTED, margin: "0 0 2px", fontWeight: 700 }}>
                ¿Por qué recomienda esto {a.sourceEngine}?
              </p>
              <p style={{ fontSize: 12, color: TEXT, margin: 0 }}>{a.justificacion}</p>
            </div>

            {/* Payload preview */}
            {a.clienteNombre && (
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 12 }}>
                Cliente: <span style={{ color: TEXT }}>{a.clienteNombre}</span>
              </div>
            )}

            {/* Rechazo — input motivo */}
            <div style={{ marginBottom: 14 }}>
              <input
                value={motivoRec[a.id] ?? ""}
                onChange={(e) => setMotivoRec((p) => ({ ...p, [a.id]: e.target.value }))}
                placeholder="Motivo de rechazo (opcional)…"
                style={{
                  width: "100%", background: "#0a0a18", border: `1px solid ${BORDER}`,
                  borderRadius: 8, padding: "7px 12px", color: TEXT, fontSize: 12,
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Botones */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => handleApprove(a)}
                disabled={procesando === a.id}
                style={{
                  flex: 1, background: `${GREEN}20`, border: `1px solid ${GREEN}55`,
                  borderRadius: 8, padding: "9px 0", color: GREEN,
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  opacity: procesando === a.id ? 0.5 : 1,
                }}
              >
                {procesando === a.id ? "Procesando…" : "✅ Aprobar y ejecutar"}
              </button>
              <button
                onClick={() => handleReject(a)}
                disabled={procesando === a.id}
                style={{
                  flex: 1, background: `${RED}15`, border: `1px solid ${RED}44`,
                  borderRadius: 8, padding: "9px 0", color: RED,
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  opacity: procesando === a.id ? 0.5 : 1,
                }}
              >
                ✗ Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
