/**
 * TEC Bii — GET /api/tec-bii/refine  (CRON) + POST (trigger manual)
 * Sprint M-7: Gemini Refinement CRON
 *
 * Vercel Cron (vercel.json):
 *   { "path": "/api/tec-bii/refine", "schedule": "0 11 * * *" }
 *   (11 AM UTC = 5 AM CST México, después del decay 9h y reflect 10h)
 *
 * GET  — para Vercel CRON, autenticado con CRON_SECRET
 * POST — trigger manual desde el Centro de Mando, autenticado con Bearer token
 */

import { NextRequest, NextResponse }   from "next/server";
import { getAuth }                      from "firebase-admin/auth";
import { getAdminApp }                  from "@/lib/firebase-admin";
import { runRefinement, getLastRefineLog } from "@/lib/tec-bii/refine";
import type { RefineResult }            from "@/lib/tec-bii/refine";

export const runtime     = "nodejs";
export const maxDuration = 300; // 5 min — batch puede tardar

// ── Respuesta ─────────────────────────────────────────────────────────────────

export interface RefineResponse {
  success:  boolean;
  result?:  RefineResult;
  error?:   string;
}

export interface RefineLastLogResponse {
  success:   boolean;
  lastRun?:  RefineResult;
  error?:    string;
}

// ── Auth CRON (GET) ───────────────────────────────────────────────────────────

function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev sin CRON_SECRET configurado
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

// ── Auth Bearer (POST) ────────────────────────────────────────────────────────

async function getUid(req: NextRequest): Promise<string | null> {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

// ── GET — CRON Job ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json<RefineResponse>(
      { success: false, error: "No autorizado" },
      { status: 401 }
    );
  }

  try {
    const result = await runRefinement();
    return NextResponse.json<RefineResponse>({ success: true, result });
  } catch (err) {
    console.error("[tec-bii/refine GET]", err);
    return NextResponse.json<RefineResponse>(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}

// ── POST — Trigger manual desde Centro de Mando ───────────────────────────────

export async function POST(req: NextRequest) {
  // Permitir CRON_SECRET también en POST (para tests y CI)
  const cronOk = isCronAuthorized(req);
  const userOk = !cronOk ? !!(await getUid(req)) : true;

  if (!cronOk && !userOk) {
    return NextResponse.json<RefineResponse>(
      { success: false, error: "No autorizado" },
      { status: 401 }
    );
  }

  try {
    const result = await runRefinement();
    return NextResponse.json<RefineResponse>({ success: true, result });
  } catch (err) {
    console.error("[tec-bii/refine POST]", err);
    return NextResponse.json<RefineResponse>(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}

// ── PATCH — Último log (rápido, no ejecuta batch) ────────────────────────────

export async function PATCH(req: NextRequest) {
  const uid = await getUid(req);
  if (!uid) {
    return NextResponse.json<RefineLastLogResponse>(
      { success: false, error: "No autorizado" },
      { status: 401 }
    );
  }

  try {
    const lastRun = await getLastRefineLog();
    return NextResponse.json<RefineLastLogResponse>({ success: true, lastRun: lastRun ?? undefined });
  } catch (err) {
    return NextResponse.json<RefineLastLogResponse>(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
