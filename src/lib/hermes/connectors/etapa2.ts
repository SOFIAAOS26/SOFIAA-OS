/**
 * HERMES — Conectores Etapa 2 (stub)
 *
 * Meta Ads, Google Ads, WhatsApp Business, Mailchimp, HubSpot CRM.
 *
 * Etapa 2 es la siguiente fase de HERMES. El schema ya está preparado:
 * los motores (PROMETEO, ATENA) pueden encolar estas acciones HOY y
 * quedarán en estado pendiente_aprobacion hasta que Etapa 2 se active.
 *
 * Cuando el executor recibe una acción de Etapa 2:
 *   1. La aprueba normalmente (Human Gate siempre aplica)
 *   2. Devuelve HermesResultado con exito: false y código ETAPA_2_NOT_IMPLEMENTED
 *   3. La UI muestra al usuario que el conector está en la hoja de ruta
 *   4. La acción queda en estado "fallida" con mensaje informativo (no es un error real)
 *
 * Plan de implementación Etapa 2:
 *   - Meta Ads:     Marketing API v20 · OAuth2 con System User token
 *   - Google Ads:   Google Ads API v17 · OAuth2 con Developer Token
 *   - WhatsApp:     Cloud API (Meta) · Webhook + Phone Number ID
 *   - Mailchimp:    Mailchimp API v3 · API Key en env var
 *   - HubSpot CRM:  HubSpot Private App Token
 */

import type { HermesAction, HermesResultado, HermesConnectorType } from "@/extensions/hermes/schema";

const ETAPA_2_CONNECTORS: HermesConnectorType[] = [
  "meta_ads",
  "google_ads",
  "whatsapp_business",
  "mailchimp",
  "hubspot_crm",
];

export function isEtapa2Connector(tipo: HermesConnectorType): boolean {
  return ETAPA_2_CONNECTORS.includes(tipo);
}

/** Nombres legibles para el mensaje al usuario */
const CONNECTOR_NAMES: Partial<Record<HermesConnectorType, string>> = {
  meta_ads:          "Meta Ads",
  google_ads:        "Google Ads",
  whatsapp_business: "WhatsApp Business",
  mailchimp:         "Mailchimp",
  hubspot_crm:       "HubSpot CRM",
};

/** Requisito de integración por conector */
const CONNECTOR_REQUIREMENTS: Partial<Record<HermesConnectorType, string>> = {
  meta_ads:          "OAuth2 con System User Token de Meta Business Suite",
  google_ads:        "OAuth2 con Developer Token de Google Ads API",
  whatsapp_business: "Phone Number ID + Webhook en Meta Cloud API",
  mailchimp:         "API Key de Mailchimp en MAILCHIMP_API_KEY",
  hubspot_crm:       "Private App Token en HUBSPOT_TOKEN",
};

export async function ejecutarEtapa2Action(accion: HermesAction): Promise<HermesResultado> {
  const nombre    = CONNECTOR_NAMES[accion.connectorTipo]    ?? accion.connectorTipo;
  const requisito = CONNECTOR_REQUIREMENTS[accion.connectorTipo] ?? "integración OAuth2";

  return {
    exito:   false,
    mensaje: `${nombre} (Etapa 2) — La acción "${accion.titulo}" fue aprobada y registrada. ` +
             `Este conector estará disponible próximamente. ` +
             `Requiere: ${requisito}.`,
    errorCode: "ETAPA_2_NOT_IMPLEMENTED",
    datos: {
      connector:    accion.connectorTipo,
      actionType:   accion.tipo,
      etapa:        2,
      scheduledFor: "próxima actualización",
    },
  };
}
