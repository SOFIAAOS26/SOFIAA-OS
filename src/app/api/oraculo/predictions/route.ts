/**
 * ORÁCULO — GET /api/oraculo/predictions
 *
 * Lista predicciones del usuario autenticado.
 * Soporta filtros: status, severity, category, limit.
 *
 * Auth: Firebase ID token.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth }     from "firebase-admin/auth";
import { getAdminApp, adminDb } from "@/lib/firebase-admin";
import type { OraclePrediction, OraclePredictionsResponse } from "@/types/oraculo";

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

// ── GET /api/oraculo/predictions ──────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const userId = await verifyUser(req);
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status   = searchParams.get("status")   ?? "active";
  const severity = searchParams.get("severity");  // opcional
  const category = searchParams.get("category");  // opcional
  const limit    = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);

  try {
    let query = adminDb
      .collection(`users/${userId}/oracle_predictions`)
      .where("status", "==", status)
      .orderBy("createdAt", "desc")
      .limit(limit);

    // Nota: Firestore no permite múltiples where en campos diferentes
    // sin índice compuesto. Los filtros adicionales se aplican en memoria.
    const snap   = await query.get();
    let results  = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OraclePrediction));

    if (severity) results = results.filter((p) => p.severity  === severity);
    if (category) results = results.filter((p) => p.category  === category);

    const response: OraclePredictionsResponse = {
      predictions: results,
      total:       results.length,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    console.error("[ORÁCULO][predictions] Error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
