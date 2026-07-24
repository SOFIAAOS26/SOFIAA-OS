"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { subscribeHermesConnectors } from "@/lib/hermes/firestore";
import type { HermesConnectorConfig, HermesConnectorType } from "@/extensions/hermes/schema";
import { CONNECTOR_LABELS } from "@/extensions/hermes/schema";

const INDIGO = "#6366f1";
const CYAN   = "#22d3ee";
const GREEN  = "#22c55e";
const YELLOW = "#f59e0b";
const TEXT   = "#e2e8f0";
const MUTED  = "#64748b";
const CARD   = "#0f0f1e";
const BORDER = "#1a1a30";

const STATUS_BADGE: Record<string, { color: string; label: string }> = {
  activo:           { color: GREEN,  label: "ACTIVO" },
  pendiente_config: { color: YELLOW, label: "CONFIGURAR" },
  proximamente:     { color: CYAN,   label: "ETAPA 2" },
  error:            { color: "#ef4444", label: "ERROR" },
};

export default function ConectoresPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [conectores, setConectores] = useState<HermesConnectorConfig[]>([]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    return subscribeHermesConnectors(activeWorkspaceId, setConectores);
  }, [activeWorkspaceId]);

  function getConfig(tipo: HermesConnectorType): HermesConnectorConfig | undefined {
    return conectores.find((c) => c.tipo === tipo);
  }

  const etapa1 = (Object.keys(CONNECTOR_LABELS) as HermesConnectorType[]).filter(
    (t) => CONNECTOR_LABELS[t].etapa === 1
  );
  const etapa2 = (Object.keys(CONNECTOR_LABELS) as HermesConnectorType[]).filter(
    (t) => CONNECTOR_LABELS[t].etapa === 2
  );

  return (
    <div style={{ padding: "32px 24px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: TEXT, margin: "0 0 4px" }}>🔌 Conectores</h1>
        <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
          Estado de las plataformas externas. Las credenciales se configuran en variables de entorno.
        </p>
      </div>

      {/* Etapa 1 */}
      <h2 style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: "0 0 12px" }}>
        Etapa 1 — Disponibles ahora
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 32 }}>
        {etapa1.map((tipo) => {
          const meta   = CONNECTOR_LABELS[tipo];
          const config = getConfig(tipo);
          const status = config?.status ?? "pendiente_config";
          const badge  = STATUS_BADGE[status] ?? STATUS_BADGE.pendiente_config;

          return (
            <div key={tipo} style={{
              background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "18px 20px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{meta.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{meta.nombre}</span>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: badge.color,
                  background: `${badge.color}18`, padding: "2px 8px", borderRadius: 4,
                }}>{badge.label}</span>
              </div>

              {status === "activo" ? (
                <div style={{ fontSize: 11, color: MUTED }}>
                  {config?.webhookConfigured && "✓ Webhook configurado"}
                  {config?.boardId && ` · Board: ${config.boardId}`}
                  {config?.channelId && ` · Canal: ${config.channelId}`}
                </div>
              ) : (
                <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>
                  {tipo === "monday_cloud" && "Agrega MONDAY_WEBHOOK_URL y MONDAY_API_KEY en .env.local"}
                  {tipo === "slack" && "Agrega SLACK_WEBHOOK_URL en .env.local"}
                  {tipo === "calendario_smm" && "Conector interno — disponible automáticamente"}
                  {tipo === "hermes_interno" && "Conector interno — activo por defecto"}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Etapa 2 */}
      <h2 style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>
        Etapa 2 — En la hoja de ruta
      </h2>
      <p style={{ fontSize: 11, color: MUTED, margin: "0 0 14px" }}>
        El schema de HERMES ya contempla estos conectores. Se activarán cuando se configuren las API keys de cada plataforma.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {etapa2.map((tipo) => {
          const meta = CONNECTOR_LABELS[tipo];
          return (
            <div key={tipo} style={{
              background: CARD, border: `1px dashed ${BORDER}`,
              borderRadius: 12, padding: "16px 20px", opacity: 0.6,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{meta.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: MUTED }}>{meta.nombre}</span>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: CYAN,
                  background: `${CYAN}15`, padding: "2px 8px", borderRadius: 4,
                }}>ETAPA 2</span>
              </div>
              <p style={{ fontSize: 10, color: MUTED, margin: "8px 0 0" }}>
                {tipo === "meta_ads" && "Requiere Meta Business App + OAuth2 · Crear / pausar campañas"}
                {tipo === "google_ads" && "Requiere Google Ads Developer Token · Campañas y bids"}
                {tipo === "whatsapp_business" && "Requiere WhatsApp Business API aprobada · Templates"}
                {tipo === "mailchimp" && "Requiere Mailchimp API Key · Campañas de email"}
                {tipo === "hubspot_crm" && "Requiere HubSpot Private App Token · Contactos y deals"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
