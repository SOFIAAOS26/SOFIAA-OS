/**
 * N.E.X.O. — GET /api/nexo/reflect (Sprint M-0)
 * Reflection Engine — Vercel Cron Job diario
 *
 * Vercel.json:
 *   { "path": "/api/nexo/reflect", "schedule": "0 10 * * *" }
 *   (10 AM UTC = 4 AM CST México, corre después del decay de las 9 AM UTC)
 *
 * Seguridad:
 *   - Bearer token con CRON_SECRET (Vercel inyecta automáticamente en Cron Jobs)
 *   - POST manual acepta { uid } para disparar reflexión individual
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb }                 from "@/lib/firebase-admin";
import { runReflection }              from "@/lib/nexo/reflection";

export const runtime     = "nodejs";
export const maxDuration = 60;

// ── Autenticación compartida ──────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // dev sin secret configurado
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${cronSecret}`;
}

// ── GET — CRON Job: reflexión para todos los usuarios ────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const start = Date.now();
  const db    = getAdminDb();

  const summary: Array<{
    uid:             string;
    insightsCreated: number;
    skipped:         boolean;
    reason?:         string;
    durationMs:      number;
    error?:          string;
  }> = [];

  try {
    // Obtener UIDs únicos con nodos NEXO activos
    const allNodesSnap = await db
      .collectionGroup("nexo_nodes")
      .where("type", "!=", "insight") // solo nodos capturados para contar usuarios
      .select()
      .limit(500)
      .get();

    const uids = new Set<string>();
    allNodesSnap.docs.forEach(d => {
      const parts = d.ref.path.split("/");
      if (parts.length >= 2) uids.add(parts[1]);
    });

    // Reflexión por usuario
    for (const uid of uids) {
      try {
        const result = await runReflection(uid);
        summary.push({ uid: uid.slice(0, 8) + "…", ...result });
      } catch (err) {
        summary.push({
          uid:             uid.slice(0, 8) + "…",
          insightsCreated: 0,
          skipped:         true,
          durationMs:      0,
          error:           String(err),
        });
      }
    }

    const totalInsights = summary.reduce((s, r) => s + r.insightsCreated, 0);
    const totalSkipped  = summary.filter(r => r.skipped).length;

    console.log(
      `[M-0 reflect CRON] users=${uids.size} insights=${totalInsights} ` +
      `skipped=${totalSkipped} dt=${Date.now() - start}ms`
    );

    return NextResponse.json({
      success:        true,
      usersProcessed: uids.size,
      totalInsights,
      totalSkipped,
      durationMs:     Date.now() - start,
      runAt:          new Date().toISOString(),
      summary,
    });

  } catch (error) {
    console.error("[M-0 reflect CRON] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// ── POST — Manual: reflexión para un usuario específico ──────────────────────

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let uid: string;
  try {
    const body = await req.json();
    uid = body.uid;
    if (!uid || typeof uid !== "string") throw new Error("uid requerido");
  } catch {
    return NextResponse.json({ error: "Body inválido — requiere { uid }" }, { status: 400 });
  }

  try {
    const result = await runReflection(uid);
    return NextResponse.json({ success: true, uid, ...result });
  } catch (error) {
    console.error("[M-0 reflect POST]", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
