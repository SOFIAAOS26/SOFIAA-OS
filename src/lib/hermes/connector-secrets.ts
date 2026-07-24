/**
 * HERMES — Connector Secrets (Sprint H-6)
 *
 * Guarda y lee credenciales de conectores desde Firestore (Admin SDK).
 * Las credenciales sensibles (API tokens, webhook URLs) se almacenan en:
 *   smm_workspaces/{workspaceId}/hermes_connector_secrets/{tipo}
 *
 * Modelo de seguridad:
 *   - Se leen/escriben solo desde el servidor (Admin SDK)
 *   - Los clientes nunca acceden directamente a esta colección
 *   - En producción, Firestore Security Rules bloquean lectura del cliente
 *   - Las env vars tienen prioridad sobre los secrets de Firestore
 *
 * Server-only — usa Firebase Admin SDK.
 */

import { adminDb } from "@/lib/firebase-admin";

// ── Path ──────────────────────────────────────────────────────────────────────

function secretsDoc(workspaceId: string, tipo: string) {
  return adminDb
    .collection("smm_workspaces")
    .doc(workspaceId)
    .collection("hermes_connector_secrets")
    .doc(tipo);
}

function connectorsDoc(workspaceId: string, tipo: string) {
  return adminDb
    .collection("smm_workspaces")
    .doc(workspaceId)
    .collection("hermes_connectors")
    .doc(tipo);
}

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface ConnectorSecrets {
  apiToken?:   string;   // Monday API Token / HubSpot token / etc.
  webhookUrl?: string;   // Slack Incoming Webhook URL
  updatedAt?:  number;
}

export interface ConnectorMetadata {
  nombre?:            string;
  boardId?:           string;
  channelId?:         string;
  webhookConfigured:  boolean;
  status:             "activo" | "pendiente_config" | "error";
  etapa:              1 | 2;
}

// ── Lectura ───────────────────────────────────────────────────────────────────

/**
 * Lee los secrets de un conector para un workspace.
 * Retorna null si no están configurados.
 */
export async function getConnectorSecrets(
  workspaceId: string,
  tipo:        string,
): Promise<ConnectorSecrets | null> {
  const doc = await secretsDoc(workspaceId, tipo).get();
  if (!doc.exists) return null;
  return doc.data() as ConnectorSecrets;
}

/**
 * Resuelve el API token de Monday para un workspace.
 * Prioridad: env var → Firestore secrets
 */
export async function resolveMondayToken(workspaceId: string): Promise<string | null> {
  if (process.env.MONDAY_API_TOKEN) return process.env.MONDAY_API_TOKEN;
  const secrets = await getConnectorSecrets(workspaceId, "monday_cloud");
  return secrets?.apiToken ?? null;
}

/**
 * Resuelve el Webhook URL de Slack para un workspace.
 * Prioridad: env var → Firestore secrets
 */
export async function resolveSlackWebhook(workspaceId: string): Promise<string | null> {
  if (process.env.SLACK_WEBHOOK_URL) return process.env.SLACK_WEBHOOK_URL;
  const secrets = await getConnectorSecrets(workspaceId, "slack");
  return secrets?.webhookUrl ?? null;
}

// ── Escritura ─────────────────────────────────────────────────────────────────

/**
 * Guarda secrets de un conector (solo desde el servidor).
 * Los campos undefined no sobreescriben valores existentes — usa merge.
 */
export async function saveConnectorSecrets(
  workspaceId: string,
  tipo:        string,
  secrets:     Partial<ConnectorSecrets>,
): Promise<void> {
  const ref = secretsDoc(workspaceId, tipo);
  await ref.set({ ...secrets, updatedAt: Date.now() }, { merge: true });
}

/**
 * Guarda metadata no-sensible de un conector en hermes_connectors/{tipo}.
 * Crea el doc si no existe.
 */
export async function saveConnectorMetadata(
  workspaceId: string,
  tipo:        string,
  metadata:    ConnectorMetadata,
): Promise<void> {
  const ref  = connectorsDoc(workspaceId, tipo);
  const snap = await ref.get();

  if (snap.exists) {
    await ref.update({ ...metadata, tipo, workspaceId, updatedAt: Date.now() });
  } else {
    await ref.set({
      ...metadata,
      id:          tipo,
      tipo,
      workspaceId,
      nombre:      metadata.nombre ?? tipo,
      createdAt:   Date.now(),
      updatedAt:   Date.now(),
    });
  }
}
