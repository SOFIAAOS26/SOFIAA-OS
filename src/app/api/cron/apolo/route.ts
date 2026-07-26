/**
 * GET /api/cron/apolo
 *
 * CRON lunes 08:00 UTC — genera un Resumen Semanal automático para el usuario
 * principal de SOFIAA OS y lo deja en status "ready" (tras pasar el gate THEMIS).
 *
 * Autenticado con CRON_SECRET en header Authorization.
 * En desarrollo: sin CRON_SECRET → libre.
 *
 * Vercel cron: "0 8 * * 1"  (lunes a las 08:00 UTC)
 *
 * Sprint AP-5
 */

import { NextRequest, NextResponse } from "next/server";
import { generateReport }            from "@/core/apolo";

// ── UID principal de SOFIAA OS ────────────────────────────────────────────────
const PRIMARY_UID = process.env.SOFIAA_PRIMARY_UID ?? "gCu80YTIwshKgCPG91ppNVLsvJt1";

// ── Auth CRON ─────────────────────────────────────────────────────────────────

function authOk(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev: sin secret → libre
  const auth = req.headers.get("Authorization");
  return auth === `Bearer ${secret}`;
}

// ── GET /api/cron/apolo ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  console.log(`[CRON][APOLO] Iniciando resumen semanal — ${now.toISOString()}`);

  try {
    const report = await generateReport(PRIMARY_UID, {
      type: "weekly_summary",
    });

    console.log(
      `[CRON][APOLO] Reporte generado: ${report.id} ` +
      `| status=${report.status} | themis=${report.themisApproved} ` +
      `| secciones=${report.sections.length}`
    );

    return NextResponse.json({
      ok:             true,
      timestamp:      now.toISOString(),
      reportId:       report.id,
      status:         report.status,
      themisApproved: report.themisApproved,
      sections:       report.sections.length,
    });
  } catch (err) {
    console.error("[CRON][APOLO] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
