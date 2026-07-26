/**
 * GET /api/cron/oraculo
 *
 * CRON cada 6 horas — escanea todos los engines de ORÁCULO y genera
 * insights estratégicos una vez al día (a las 07:00 UTC).
 *
 * Autenticado con CRON_SECRET en header Authorization.
 * En desarrollo: sin CRON_SECRET → libre.
 *
 * Vercel cron: "0 *\/6 * * *"
 *
 * Patrón idéntico a /api/cron/prometeo-brief.
 */

import { NextRequest, NextResponse } from "next/server";
import { scanAllEngines, generatePredictions, generateInsights } from "@/core/oraculo";

// ── UID principal de SOFIAA OS ────────────────────────────────────────────────
// En producción este es el userId del owner del sistema.
const PRIMARY_UID = process.env.SOFIAA_PRIMARY_UID ?? "gCu80YTIwshKgCPG91ppNVLsvJt1";

// ── Auth CRON ─────────────────────────────────────────────────────────────────

function authOk(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev: sin secret → libre
  const auth = req.headers.get("Authorization");
  return auth === `Bearer ${secret}`;
}

// ── GET /api/cron/oraculo ─────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  console.log(`[CRON][ORÁCULO] Iniciando scan — ${now.toISOString()}`);

  try {
    // 1. Scan de todos los engines
    const signals     = await scanAllEngines(PRIMARY_UID);
    const predictions = await generatePredictions(signals, PRIMARY_UID);

    console.log(`[CRON][ORÁCULO] Scan completo: ${signals.length} señales, ${predictions.length} predicciones`);

    // 2. Insights estratégicos — corre una vez al día junto con el scan
    const insights = await generateInsights(PRIMARY_UID);
    const insightsCreated = insights.length;
    console.log(`[CRON][ORÁCULO] Insights generados: ${insightsCreated}`);

    return NextResponse.json({
      ok:               true,
      timestamp:        now.toISOString(),
      signalsDetected:  signals.length,
      predictionsCreated: predictions.length,
      insightsCreated,
    });
  } catch (err) {
    console.error("[CRON][ORÁCULO] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
