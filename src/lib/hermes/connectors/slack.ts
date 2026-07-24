/**
 * HERMES — Conector Slack (Etapa 1)
 *
 * Envía mensajes a Slack via Incoming Webhooks.
 * Requiere: SLACK_WEBHOOK_URL en .env.local
 *
 * Acciones soportadas:
 *   slack_notificar         → mensaje estándar
 *   slack_notificar_urgente → mensaje con ⚠️ y mention @channel
 */

import type { HermesAction, HermesResultado } from "@/extensions/hermes/schema";
import { resolveSlackWebhook }                 from "@/lib/hermes/connector-secrets";

interface SlackBlock {
  type:  string;
  text?: { type: string; text: string };
}

async function postSlack(webhookUrl: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(webhookUrl, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Slack webhook devolvió ${res.status}: ${body}`);
  }
}

export async function ejecutarSlackAction(accion: HermesAction): Promise<HermesResultado> {
  // Resolver webhook: env var tiene prioridad, luego Firestore secrets (H-6)
  const webhookUrl = await resolveSlackWebhook(accion.workspaceId).catch(() => null);
  if (!webhookUrl) {
    return {
      exito:     false,
      mensaje:   "Slack no está configurado. Ve a HERMES → Conectores y agrega el Webhook URL.",
      errorCode: "CONNECTOR_NOT_CONFIGURED",
    };
  }

  const p       = accion.payload;
  const texto   = String(p.mensaje ?? p.texto ?? accion.descripcion);
  const urgente = accion.tipo === "slack_notificar_urgente";

  try {
    const blocks: SlackBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: urgente ? `⚠️ *[URGENTE]* ${texto}` : texto,
        },
      },
    ];

    // Contexto adicional: fuente + cliente
    const contextLines: string[] = [];
    if (accion.clienteNombre) contextLines.push(`*Cliente:* ${accion.clienteNombre}`);
    if (accion.sourceEngine)  contextLines.push(`*Motor:* ${accion.sourceEngine.toUpperCase()}`);
    if (accion.urgencia)      contextLines.push(`*Urgencia:* ${accion.urgencia}`);

    if (contextLines.length > 0) {
      blocks.push({
        type: "context",
        text: { type: "mrkdwn", text: contextLines.join(" · ") },
      } as SlackBlock);
    }

    await postSlack(webhookUrl, {
      text:   urgente ? `⚠️ [URGENTE] ${texto}` : texto,
      blocks,
      ...(p.channel ? { channel: String(p.channel) } : {}),
    });

    return {
      exito:   true,
      mensaje: `Mensaje enviado a Slack${urgente ? " (urgente)" : ""}`,
    };
  } catch (err) {
    return {
      exito:     false,
      mensaje:   String(err),
      errorCode: "SLACK_ERROR",
    };
  }
}
