/**
 * ORÁCULO — GET + POST /api/oraculo/forecasts
 *
 * GET  → lista pronósticos activos del usuario (filtrable por engine, metric)
 * POST → dispara generateForecasts() manualmente (o desde CRON)
 *
 * Auth: Firebase ID token.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth }     from "firebase-admin/auth";
import { getAdminApp, adminDb } from "@/lib/firebase-admin";
import { generateForecasts } from "@/core/oraculo";
import type { OracleForecast } from "@/types/oraculo";

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

// ── GET /api/oraculo/forecasts ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const userId = await verifyUser(req);
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const engine = searchParams.get("engine");  // filtro opcional
  const metric = searchParams.get("metric");  // filtro opcional
  const limit  = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);

  try {
    let query = adminDb
      .collection(`users/${userId}/oracle_forecasts`)
      .orderBy("createdAt", "desc")
      .limit(limit);

    const snap    = await query.get();
    let forecasts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OracleForecast));

    if (engine) forecasts = forecasts.filter((f) => f.engine === engine);
    if (metric) forecasts = forecasts.filter((f) => f.metric === metric);

    return NextResponse.json(
      { forecasts, total: forecasts.length },
      { status: 200 },
    );
  } catch (err) {
    console.error("[ORÁCULO][forecasts] GET error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ── POST /api/oraculo/forecasts ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const userId = await verifyUser(req);
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const forecasts = await generateForecasts(userId);
    return NextResponse.json(
      {
        ok:               true,
        forecastsCreated: forecasts.length,
        forecasts,
      },
      {
        status: 200,
        headers: { "X-Oraculo-Forecasts": String(forecasts.length) },
      },
    );
  } catch (err) {
    console.error("[ORÁCULO][forecasts] POST error:", err);
    return NextResponse.json({ error: "Error interno generando forecasts" }, { status: 500 });
  }
}
