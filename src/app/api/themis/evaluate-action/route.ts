/**
 * SOFIAA THEMIS — Sprint T-2
 * POST /api/themis/evaluate-action
 *
 * Endpoint interno — motor-to-motor.
 * Autentica con INTERNAL_SECRET para que solo los dioses del Olimpo
 * puedan invocar la balanza de THEMIS.
 *
 * Contrato constitucional:
 *   HERMES → THEMIS: "¿Puedo ejecutar esta acción?"
 *   THEMIS → HERMES: "Aprobada" | "Vetada — veredicto #{id}"
 *
 * Diseño:
 *   - Determinista — sin LLM — < 50ms
 *   - Persiste veredicto a Firestore siempre
 *   - Nunca lanza — errores internos retornan 500 con body estructurado
 */

import { NextRequest, NextResponse } from "next/server";
import { evaluateAction } from "@/core/themis";
import type { ActionEvaluationRequest } from "@/types/themis";

// ── Auth ───────────────────────────────────────────────────────────────────

function verifyInternalSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.slice(7);
  const secret = process.env.INTERNAL_SECRET;

  if (!secret) {
    console.error("[THEMIS][evaluate-action] INTERNAL_SECRET no configurado");
    return false;
  }

  return token === secret;
}

// ── Validación básica del body ────────────────────────────────────────────

function isValidRequest(body: unknown): body is ActionEvaluationRequest {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.actionId      === "string" &&
    typeof b.actionType    === "string" &&
    typeof b.actionPayload === "object" && b.actionPayload !== null &&
    typeof b.requestedBy   === "string" &&
    typeof b.userId        === "string" &&
    typeof b.context       === "object" && b.context !== null
  );
}

// ── Handler ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth — INTERNAL_SECRET
  if (!verifyInternalSecret(req)) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401 }
    );
  }

  // 2. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Body inválido — se esperaba JSON" },
      { status: 400 }
    );
  }

  // 3. Validar estructura mínima
  if (!isValidRequest(body)) {
    return NextResponse.json(
      { error: "Campos requeridos: actionId, actionType, actionPayload, requestedBy, userId, context" },
      { status: 400 }
    );
  }

  // 4. Evaluar con THEMIS
  try {
    const result = await evaluateAction(body);

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "X-Themis-Verdict-Id": result.verdict.id,
        "X-Themis-Approved":   result.approved ? "true" : "false",
        "X-Themis-Severity":   result.verdict.severity,
      },
    });
  } catch (err) {
    console.error("[THEMIS][evaluate-action] Error interno:", err);
    return NextResponse.json(
      { error: "Error interno al evaluar la acción" },
      { status: 500 }
    );
  }
}

// Solo POST — no GET, no PUT
export async function GET() {
  return NextResponse.json({ error: "Método no permitido" }, { status: 405 });
}
