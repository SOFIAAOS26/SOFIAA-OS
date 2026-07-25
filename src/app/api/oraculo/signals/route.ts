/**
 * ORÁCULO — POST /api/oraculo/signals
 *
 * Endpoint motor-a-motor para ingestión de señales en tiempo real.
 * Permite a cualquier dios del Olimpo inyectar una señal directamente
 * sin esperar el ciclo de scan periódico.
 *
 * Auth: INTERNAL_SECRET (Bearer token motor-a-motor).
 * Genera un OracleSignal y opcionalmente dispara una predicción inmediata.
 */

import { NextRequest, NextResponse } from "next/server";
import { ingestSignal } from "@/core/oraculo";
import type { OracleSignal } from "@/types/oraculo";

// ── Auth: INTERNAL_SECRET ─────────────────────────────────────────────────────

function verifyInternalSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return false;
  const token  = authHeader.slice(7);
  const secret = process.env.INTERNAL_SECRET;
  if (!secret) {
    console.error("[ORÁCULO][signals] INTERNAL_SECRET no configurado");
    return false;
  }
  return token === secret;
}

// ── POST /api/oraculo/signals ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!verifyInternalSecret(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  // Validación mínima
  if (!b.sourceEngine || !b.signalType || !b.userId || !b.entityId) {
    return NextResponse.json(
      { error: "sourceEngine, signalType, userId y entityId son requeridos" },
      { status: 400 }
    );
  }

  const signal: OracleSignal = {
    id:           crypto.randomUUID(),
    sourceEngine: b.sourceEngine as OracleSignal["sourceEngine"],
    signalType:   String(b.signalType),
    severity:     (b.severity as OracleSignal["severity"]) ?? "warning",
    payload:      (b.payload  as Record<string, unknown>) ?? {},
    entityId:     String(b.entityId),
    entityLabel:  String(b.entityLabel ?? b.entityId),
    category:     (b.category as OracleSignal["category"]) ?? "operational_risk",
    capturedAt:   Date.now(),
    userId:       String(b.userId),
  };

  try {
    const result = await ingestSignal(signal);
    return NextResponse.json(
      {
        ok:                  true,
        signalId:            result.signalId,
        predictionsTriggered: result.predictionsTriggered,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[ORÁCULO][signals] Error al ingestar señal:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
