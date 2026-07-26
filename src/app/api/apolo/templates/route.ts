/**
 * GET  /api/apolo/templates  — lista plantillas del usuario
 * POST /api/apolo/templates  — crea nueva plantilla
 *
 * Sprint AP-3: CRUD de ApoloTemplate
 * Auth: Firebase ID token en Authorization: Bearer {token}
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb, getAdminApp }      from "@/lib/firebase-admin";
import { getAuth }                   from "firebase-admin/auth";
import { FieldValue }                from "firebase-admin/firestore";
import type { ApoloTemplate, ReportType } from "@/types/apolo";

// ── Auth helper ───────────────────────────────────────────────────────────────

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

// ── GET /api/apolo/templates ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const userId = await verifyToken(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const snap = await adminDb
      .collection(`users/${userId}/apolo_templates`)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const templates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ templates, total: templates.length });
  } catch (err) {
    console.error("[APOLO][GET /templates]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ── POST /api/apolo/templates ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const userId = await verifyToken(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    name?:          string;
    type?:          string;
    engines?:       string[];
    customBranding?: {
      primaryColor?: string;
      clientName?:   string;
      footerText?:   string;
    };
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validaciones
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name es requerido" }, { status: 400 });
  }
  if (!body.type || !VALID_TYPES.includes(body.type as ReportType)) {
    return NextResponse.json({ error: `type inválido. Válidos: ${VALID_TYPES.join(", ")}` }, { status: 400 });
  }
  const engines = (body.engines ?? []).filter(e => VALID_ENGINES.includes(e));
  if (engines.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos un engine" }, { status: 400 });
  }

  const template: Omit<ApoloTemplate, "id"> = {
    userId,
    name:    body.name.trim(),
    type:    body.type as ReportType,
    engines,
    customBranding: body.customBranding ?? {},
    createdAt: Date.now(),
  };

  try {
    const ref = adminDb.collection(`users/${userId}/apolo_templates`).doc();
    await ref.set({ ...template, _serverTs: FieldValue.serverTimestamp() });

    return NextResponse.json({ ok: true, template: { id: ref.id, ...template } }, { status: 201 });
  } catch (err) {
    console.error("[APOLO][POST /templates]", err);
    return NextResponse.json({ error: "Error al crear plantilla" }, { status: 500 });
  }
}
