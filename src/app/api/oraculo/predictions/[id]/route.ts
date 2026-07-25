/**
 * ORÁCULO — GET + PATCH /api/oraculo/predictions/[id]
 *
 * GET  → detalle de una predicción específica
 * PATCH → actualizar status (acknowledge | dismiss | resolve) + nota opcional
 *
 * Auth: Firebase ID token.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth }     from "firebase-admin/auth";
import { getAdminApp, adminDb } from "@/lib/firebase-admin";
import { updatePredictionStatus } from "@/core/oraculo";
import type { OraclePrediction } from "@/types/oraculo";

// ── Auth helper ───────────────────────────────────────────────────────────────

async function verifyUser(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

// ── GET /api/oraculo/predictions/[id] ────────────────────────────────────────

export async function GET(
  req:     NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await verifyUser(req);
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const snap = await adminDb
      .collection(`users/${userId}/oracle_predictions`)
      .doc(id)
      .get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Predicción no encontrada" }, { status: 404 });
    }

    const prediction = { id: snap.id, ...snap.data() } as OraclePrediction;
    return NextResponse.json({ prediction }, { status: 200 });
  } catch (err) {
    console.error("[ORÁCULO][predictions/id] GET error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ── PATCH /api/oraculo/predictions/[id] ──────────────────────────────────────

export async function PATCH(
  req:     NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await verifyUser(req);
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const b      = body as Record<string, unknown>;
  const status = b.status as string | undefined;
  const note   = b.note   as string | undefined;

  const ALLOWED = ["acknowledged", "dismissed", "resolved"] as const;
  type AllowedStatus = typeof ALLOWED[number];

  if (!status || !ALLOWED.includes(status as AllowedStatus)) {
    return NextResponse.json(
      { error: `status debe ser uno de: ${ALLOWED.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    // Verificar que la predicción pertenece al usuario
    const snap = await adminDb
      .collection(`users/${userId}/oracle_predictions`)
      .doc(id)
      .get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Predicción no encontrada" }, { status: 404 });
    }

    await updatePredictionStatus(userId, id, status as AllowedStatus, note);

    return NextResponse.json(
      { ok: true, id, status, note: note ?? null },
      { status: 200 },
    );
  } catch (err) {
    console.error("[ORÁCULO][predictions/id] PATCH error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
