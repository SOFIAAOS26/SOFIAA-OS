/**
 * POST /api/hermes/conectores/config
 *
 * Guarda la configuración (secretos + metadata) de un conector HERMES.
 * Los secretos se almacenan en Firestore via Admin SDK — nunca en .env.local.
 *
 * Headers: Authorization: Bearer <firebase-id-token>
 * Body: {
 *   workspaceId: string
 *   tipo:        HermesConnectorType
 *   secrets:     { apiToken?: string; webhookUrl?: string }
 *   metadata:    { boardId?: string; channelId?: string; nombre?: string }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth }                   from "firebase-admin/auth";
import { getAdminApp }               from "@/lib/firebase-admin";
import {
  saveConnectorSecrets,
  saveConnectorMetadata,
}                                    from "@/lib/hermes/connector-secrets";

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    await getAuth(getAdminApp()).verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  // ── Body ──────────────────────────────────────────────────────────────────
  let body: {
    workspaceId: string;
    tipo:        string;
    secrets?:    { apiToken?: string; webhookUrl?: string };
    metadata?:   { boardId?: string; channelId?: string; nombre?: string };
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { workspaceId, tipo, secrets = {}, metadata = {} } = body;
  if (!workspaceId || !tipo) {
    return NextResponse.json({ error: "workspaceId y tipo son requeridos" }, { status: 400 });
  }

  // ── Determinar si está configurado ───────────────────────────────────────
  const tieneToken   = Boolean(secrets.apiToken?.trim());
  const tieneWebhook = Boolean(secrets.webhookUrl?.trim());

  const webhookConfigured =
    tipo === "monday_cloud" ? tieneToken :
    tipo === "slack"        ? tieneWebhook :
    true; // interno y calendario son siempre activos

  const status: "activo" | "pendiente_config" =
    webhookConfigured ? "activo" : "pendiente_config";

  const etapa: 1 | 2 = ["monday_cloud", "slack", "calendario_smm", "hermes_interno"].includes(tipo) ? 1 : 2;

  try {
    // Guardar secrets (solo los que no están vacíos)
    const secretsToSave: Record<string, string> = {};
    if (tieneToken)   secretsToSave.apiToken   = secrets.apiToken!.trim();
    if (tieneWebhook) secretsToSave.webhookUrl = secrets.webhookUrl!.trim();

    if (Object.keys(secretsToSave).length > 0) {
      await saveConnectorSecrets(workspaceId, tipo, secretsToSave);
    }

    // Guardar metadata
    await saveConnectorMetadata(workspaceId, tipo, {
      boardId:          metadata.boardId?.trim() || undefined,
      channelId:        metadata.channelId?.trim() || undefined,
      nombre:           metadata.nombre?.trim() || undefined,
      webhookConfigured,
      status,
      etapa,
    });

    return NextResponse.json({ ok: true, status, webhookConfigured });
  } catch (err) {
    console.error("[hermes/conectores/config]", err);
    return NextResponse.json({ error: "Error interno al guardar configuración" }, { status: 500 });
  }
}
