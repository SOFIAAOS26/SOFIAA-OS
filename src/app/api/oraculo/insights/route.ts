/**
 * GET  /api/oraculo/insights  — lista insights (más recientes primero)
 * POST /api/oraculo/insights  — genera insights desde predicciones activas
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb, getAdminApp }      from "@/lib/firebase-admin";
import { getAuth }                   from "firebase-admin/auth";
import { generateInsights }          from "@/core/oraculo";
import type { OracleInsight }        from "@/types/oraculo";

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getUid(req: NextRequest): Promise<string | null> {
  try {
    const auth  = req.headers.get("Authorization") ?? "";
    const token = auth.replace("Bearer ", "").trim();
    if (!token) return null;
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const userId = await getUid(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

  try {
    const snap = await adminDb
      .collection(`users/${userId}/oracle_insights`)
      .orderBy("generatedAt", "desc")
      .limit(limit)
      .get();

    const insights: OracleInsight[] = snap.docs.map(d => {
      const data = d.data();
      return {
        id:                   d.id,
        userId:               data.userId,
        title:                data.title,
        body:                 data.body,
        relatedPredictionIds: data.relatedPredictionIds ?? [],
        confidence:           data.confidence ?? 0,
        generatedAt:          data.generatedAt ?? 0,
      } satisfies OracleInsight;
    });

    return NextResponse.json(
      { insights, total: insights.length },
      {
        headers: {
          "X-Oraculo-Insights": insights.length.toString(),
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("[ORÁCULO][GET /insights]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const userId = await getUid(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const insights = await generateInsights(userId);
    return NextResponse.json(
      { ok: true, insightsCreated: insights.length, insights },
      {
        headers: { "X-Oraculo-Insights": insights.length.toString() },
      }
    );
  } catch (err) {
    console.error("[ORÁCULO][POST /insights]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
