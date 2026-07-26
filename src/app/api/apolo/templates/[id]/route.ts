/**
 * PATCH  /api/apolo/templates/[id]  — editar plantilla
 * DELETE /api/apolo/templates/[id]  — eliminar plantilla
 *
 * Sprint AP-3
 * Auth: Firebase ID token en Authorization: Bearer {token}
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb, getAdminApp }      from "@/lib/firebase-admin";
import { getAuth }                   from "firebase-admin/auth";
import type { ReportType }           from "@/types/apolo";

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

const VALID_TYPES: ReportType[] = [
  "weekly_summary", "campaign_performance", "project_status",
  "quality_report", "executive_brief", "strategic_outlook",
];
const VALID_ENGINES = ["oraculo", "prometeo", "tec_bii", "atena", "nexo"];

// ── PATCH /api/apolo/templates/[id] ──────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await verifyToken(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: {
    name?:           string;
    type?:           string;
    engines?:        string[];
    customBranding?: Record<string, string | undefined>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.name?.trim())                              updates.name    = body.name.trim();
  if (body.type && VALID_TYPES.includes(body.type as ReportType))
                                                      updates.type    = body.type;
  if (Array.isArray(body.engines)) {
    const engines = body.engines.filter(e => VALID_ENGINES.includes(e));
    if (engines.length > 0)                           updates.engines = engines;
  }
  if (body.customBranding !== undefined)              updates.customBranding = body.customBranding;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const ref = adminDb.collection(`users/${userId}/apolo_templates`).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await ref.update(updates);
  return NextResponse.json({ ok: true, updated: updates });
}

// ── DELETE /api/apolo/templates/[id] ─────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await verifyToken(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const ref = adminDb.collection(`users/${userId}/apolo_templates`).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await ref.delete();
  return NextResponse.json({ ok: true });
}
