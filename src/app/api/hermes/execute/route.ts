/**
 * POST /api/hermes/execute
 *
 * Ejecuta una acción aprobada de la cola HERMES.
 * Llamado por la UI (fire-and-forget) después de que el usuario aprueba.
 *
 * Body:   { workspaceId: string, actionId: string }
 * Auth:   Firebase ID token en Authorization header (Bearer <token>)
 *
 * Seguridad:
 *   - El token se verifica antes de ejecutar cualquier acción
 *   - El executor valida que la acción esté en estado "aprobada"
 *   - Nunca expone errores internos al cliente — solo estado + mensaje
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth }   from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase-admin";
import { executeAction } from "@/lib/hermes/executor";

export async function POST(req: NextRequest) {
  // ── Autenticación ─────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    await getAuth(getAdminApp()).verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  // ── Body ──────────────────────────────────────────────────────────────────
  let workspaceId: string;
  let actionId:    string;

  try {
    const body = await req.json();
    workspaceId = String(body.workspaceId ?? "");
    actionId    = String(body.actionId    ?? "");
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!workspaceId || !actionId) {
    return NextResponse.json({ error: "workspaceId y actionId son requeridos" }, { status: 400 });
  }

  // ── Ejecutar ──────────────────────────────────────────────────────────────
  try {
    const resultado = await executeAction(workspaceId, actionId);
    return NextResponse.json({ resultado }, { status: 200 });
  } catch (err) {
    console.error("[HERMES execute]", err);
    return NextResponse.json(
      { error: "Error interno al ejecutar la acción" },
      { status: 500 }
    );
  }
}
