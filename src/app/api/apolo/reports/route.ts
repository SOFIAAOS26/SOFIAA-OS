/**
 * GET  /api/apolo/reports  — lista reportes del usuario
 * POST /api/apolo/reports  — genera un nuevo reporte
 *
 * Sprint AP-1: genera con aggregateEngineData + buildSections (sin Groq)
 * Sprint AP-2: añadirá narrativa Groq + THEMIS gate
 *
 * Auth: Firebase ID token en Authorization: Bearer {token}
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb, getAdminApp }      from "@/lib/firebase-admin";
import { getAuth }                   from "firebase-admin/auth";
import { generateReport }            from "@/core/apolo";
import type { ReportType }           from "@/types/apolo";

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

// ── Tipos de reporte válidos ──────────────────────────────────────────────────

const VALID_TYPES: ReportType[] = [
  "weekly_summary",
  "campaign_performance",
  "project_status",
  "quality_report",
  "executive_brief",
  "strategic_outlook",
];

// ── GET /api/apolo/reports ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const userId = await verifyToken(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type   = searchParams.get("type");
  const status = searchParams.get("status");
  const limit  = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

  try {
    let q = adminDb
      .collection(`users/${userId}/apolo_reports`)
      .orderBy("generatedAt", "desc")
      .limit(limit);

    if (type   && VALID_TYPES.includes(type as ReportType)) q = q.where("type",   "==", type)   as typeof q;
    if (status && ["draft","ready","delivered"].includes(status)) q = q.where("status", "==", status) as typeof q;

    const snap = await q.get();
    const reports = snap.docs.map(d => {
      const data = d.data();
      // Omitir secciones completas en la lista — solo metadata
      const { sections: _sections, ...meta } = data;
      return { ...meta, sectionCount: (data.sections ?? []).length };
    });

    return NextResponse.json({ reports, total: reports.length });
  } catch (err) {
    console.error("[APOLO][GET /reports]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ── POST /api/apolo/reports ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const userId = await verifyToken(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    type?:         string;
    workspaceId?:  string;
    clientName?:   string;
    period?:       { from: number; to: number };
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = body.type as ReportType | undefined;
  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `type inválido. Valores válidos: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const report = await generateReport(userId, {
      type,
      workspaceId: body.workspaceId,
      clientName:  body.clientName,
      period:      body.period,
    });

    return NextResponse.json({ ok: true, report }, { status: 201 });
  } catch (err) {
    console.error("[APOLO][POST /reports]", err);
    return NextResponse.json({ error: "Error al generar el reporte" }, { status: 500 });
  }
}
