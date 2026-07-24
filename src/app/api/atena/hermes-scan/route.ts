/**
 * POST /api/atena/hermes-scan
 * GET  /api/atena/hermes-scan   (CRON con CRON_SECRET)
 *
 * Escanea AMEF y SPC de ATENA en busca de condiciones críticas
 * y las encola como HermesActions para aprobación del usuario.
 *
 * POST — Llamado manual desde la UI de ATENA
 *   Headers: Authorization: Bearer <firebase-id-token>
 *   Body:    { workspaceId: string }
 *   El uid se extrae del token verificado.
 *
 * GET — CRON diario (Vercel cron)
 *   Headers: Authorization: Bearer <CRON_SECRET>
 *   Query:   ?workspaceId=xxx&uid=xxx
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth }          from "firebase-admin/auth";
import { getAdminApp }      from "@/lib/firebase-admin";
import { scanAtenaAlerts }  from "@/lib/hermes/atena-bridge";

// ── POST — llamado manual desde UI ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth
  const authHeader = req.headers.get("Authorization") ?? "";
  const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  // Body
  let workspaceId: string;
  try {
    const body  = await req.json();
    workspaceId = String(body.workspaceId ?? "");
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId requerido" }, { status: 400 });
  }

  // Escanear
  try {
    const resultado = await scanAtenaAlerts(uid, workspaceId);
    return NextResponse.json({ ok: true, resultado });
  } catch (err) {
    console.error("[ATENA hermes-scan]", err);
    return NextResponse.json({ error: "Error interno al escanear ATENA" }, { status: 500 });
  }
}

// ── GET — CRON ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Auth con CRON_SECRET
  const secret    = process.env.CRON_SECRET;
  const authHeader = req.headers.get("Authorization") ?? "";
  const provided   = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId      = searchParams.get("workspaceId") ?? "";
  const uid              = searchParams.get("uid")         ?? "";

  if (!workspaceId || !uid) {
    return NextResponse.json(
      { error: "workspaceId y uid son requeridos como query params" },
      { status: 400 }
    );
  }

  try {
    const resultado = await scanAtenaAlerts(uid, workspaceId);
    console.log(`[CRON][atena-hermes-scan] uid=${uid} workspace=${workspaceId}`, resultado);
    return NextResponse.json({ ok: true, resultado, ts: new Date().toISOString() });
  } catch (err) {
    console.error("[CRON][atena-hermes-scan]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
