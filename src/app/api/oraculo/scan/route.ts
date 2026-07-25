/**
 * ORÁCULO — POST /api/oraculo/scan
 *
 * Trigger un scan completo de todos los engines habilitados.
 * Devuelve las predicciones nuevas generadas.
 *
 * Auth: Firebase ID token (usuario autenticado).
 * Se puede llamar manualmente o desde el scheduler de HERMES (Sprint O-5).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth }     from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase-admin";
import { scanAllEngines, generatePredictions } from "@/core/oraculo";
import type { OracleScanResponse } from "@/types/oraculo";

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

// ── POST /api/oraculo/scan ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const userId = await verifyUser(req);
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const scannedAt = new Date().toISOString();

    // 1. Escanear todos los engines habilitados
    const signals = await scanAllEngines(userId);

    // 2. Convertir señales en predicciones (con THEMIS gate)
    const predictions = await generatePredictions(signals, userId);

    const response: OracleScanResponse = {
      scannedAt,
      signalsFound:       signals.length,
      predictionsCreated: predictions.length,
      predictions,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "X-Oraculo-Signals":     String(signals.length),
        "X-Oraculo-Predictions": String(predictions.length),
      },
    });
  } catch (err) {
    console.error("[ORÁCULO][scan] Error:", err);
    return NextResponse.json({ error: "Error interno en el scan" }, { status: 500 });
  }
}
