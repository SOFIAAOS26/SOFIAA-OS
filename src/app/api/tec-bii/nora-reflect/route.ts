/**
 * TEC Bii — POST /api/tec-bii/nora-reflect
 * Sprint T2-6: N.O.R.A. Reflection
 *
 * Dispara el motor de reflexión cognitiva de N.O.R.A. sobre el estado
 * operacional del Área de Producción Audiovisual.
 *
 * Body: { force?: boolean }  — force=true omite el cooldown de 6h
 * Respuesta: { success, reflection, skipped, reason?, durationMs }
 */

import { NextRequest, NextResponse }      from "next/server";
import { getAuth }                         from "firebase-admin/auth";
import { getAdminApp }                     from "@/lib/firebase-admin";
import {
  runNoraReflection,
  getNoraReflections,
}                                          from "@/lib/tec-bii/nora-reflection";
import type { NoraReflection }             from "@/lib/tec-bii/nora-reflection";

export const runtime     = "nodejs";
export const maxDuration = 30;

// ── Auth ──────────────────────────────────────────────────────────────────────

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

// ── Tipos de respuesta ────────────────────────────────────────────────────────

export interface NoraReflectResponse {
  success:     boolean;
  reflection?: NoraReflection;
  skipped?:    boolean;
  reason?:     string;
  durationMs?: number;
  error?:      string;
}

export interface NoraHistoryResponse {
  success:     boolean;
  reflexiones: NoraReflection[];
  error?:      string;
}

// ── POST — Generar reflexión ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const uid = await getUid(req);
  if (!uid) {
    return NextResponse.json<NoraReflectResponse>(
      { success: false, error: "No autorizado" },
      { status: 401 }
    );
  }

  let force = false;
  try {
    const body = await req.json() as { force?: boolean };
    force = body.force === true;
  } catch {
    // body vacío — OK
  }

  try {
    const result = await runNoraReflection(uid, force);
    return NextResponse.json<NoraReflectResponse>({
      success:    true,
      reflection: result.reflection,
      skipped:    result.skipped,
      reason:     result.reason,
      durationMs: result.durationMs,
    });
  } catch (err) {
    console.error("[nora-reflect]", err);
    return NextResponse.json<NoraReflectResponse>(
      { success: false, error: "Error en el motor de reflexión N.O.R.A." },
      { status: 500 }
    );
  }
}

// ── GET — Historial de reflexiones ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const uid = await getUid(req);
  if (!uid) {
    return NextResponse.json<NoraHistoryResponse>(
      { success: false, reflexiones: [], error: "No autorizado" },
      { status: 401 }
    );
  }

  try {
    const reflexiones = await getNoraReflections(uid, 5);
    return NextResponse.json<NoraHistoryResponse>({ success: true, reflexiones });
  } catch (err) {
    console.error("[nora-reflect GET]", err);
    return NextResponse.json<NoraHistoryResponse>(
      { success: false, reflexiones: [], error: "Error al obtener historial" },
      { status: 500 }
    );
  }
}
