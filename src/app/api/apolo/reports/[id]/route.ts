/**
 * GET   /api/apolo/reports/[id]  — detalle completo de un reporte
 * PATCH /api/apolo/reports/[id]  — actualizar status o clientName
 *
 * Auth: Firebase ID token en Authorization: Bearer {token}
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb, getAdminApp }      from "@/lib/firebase-admin";
import { getAuth }                   from "firebase-admin/auth";

async function verifyToken(req: NextRequest): Promise<string | null> {
  const auth  = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

// ── GET /api/apolo/reports/[id] ───────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await verifyToken(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ref  = adminDb.collection(`users/${userId}/apolo_reports`).doc(params.id);
  const snap = await ref.get();

  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ report: snap.data() });
}

// ── PATCH /api/apolo/reports/[id] ────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await verifyToken(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { status?: string; clientName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.status && ["draft", "ready", "delivered"].includes(body.status)) {
    updates.status = body.status;
    if (body.status === "delivered") updates.deliveredAt = Date.now();
  }
  if (body.clientName !== undefined) {
    updates.clientName = body.clientName;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const ref = adminDb.collection(`users/${userId}/apolo_reports`).doc(params.id);
  await ref.update(updates);

  return NextResponse.json({ ok: true, updated: updates });
}
