/**
 * SOFIAA THEMIS — Sprint T-1
 * Governance & Ethics Engine — Motor principal
 *
 * THEMIS convierte la evaluación efímera del CognitivePolicy Engine
 * en veredictos estructurados, persistidos y auditables.
 *
 * Principio constitucional: todo juicio de THEMIS queda registrado.
 * La historia de la balanza no se edita, no se borra, no se silencia.
 *
 * Flujo Sprint T-1:
 *   route.ts → evaluateResponse() → ThemisVerdict → logVerdict() → Firestore
 *
 * Flujo Sprint T-2 (próximo):
 *   hermes/execute → evaluateAction() → ThemisVerdict → logVerdict() → Firestore
 *                 ↓ approved === false → abort execution
 */

import {
  getPoliciesForContext,
  type CognitivePolicy,
  type PolicyContext,
  type PolicyConstraint,
} from "@/core/cognitive.policy";

import type {
  ThemisVerdict,
  ThemisPolicyViolation,
  VerdictSeverity,
  VerdictSubject,
  ActionEvaluationRequest,
  ActionEvaluationResponse,
} from "@/types/themis";

// ── Helper: ID sin dependencia externa ────────────────────────────────────
function generateId(): string {
  return crypto.randomUUID();
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Detector de violaciones ───────────────────────────────────────────────

/**
 * Corre todos los detectores de todas las políticas activas
 * contra el texto evaluado.
 * Determinista — sin LLM — siempre < 10ms.
 */
function detectViolations(
  text:     string,
  context:  PolicyContext,
  policies: CognitivePolicy[]
): ThemisPolicyViolation[] {
  const violations: ThemisPolicyViolation[] = [];

  for (const policy of policies) {
    for (const constraint of policy.constraints) {
      try {
        const violated = constraint.detect(text, context);
        if (violated) {
          violations.push({
            policyId:     policy.id,
            policyName:   policy.name,
            constraintId: constraint.id,
            severity:     constraint.severity,
            evidence:     extractEvidence(text, constraint),
            instruction:  constraint.instruction,
          });
        }
      } catch {
        // Un detector roto nunca detiene la evaluación
      }
    }
  }

  return violations;
}

/**
 * Extrae evidencia concisa del texto que disparó la detección.
 * Limita a 120 chars para que el veredicto sea legible.
 */
function extractEvidence(text: string, constraint: PolicyConstraint): string {
  // Intenta encontrar el fragmento relevante según el tipo de constraint
  if (constraint.id === "no_expose_keys") {
    const match = text.match(/sk-[a-zA-Z0-9]{6,}|Bearer [a-zA-Z0-9]{6,}|AIza[a-zA-Z0-9]{6,}/i);
    if (match) return `Patrón detectado: "${match[0].slice(0, 20)}..."`;
  }
  if (constraint.id === "no_expose_internal_paths") {
    const match = text.match(/\/etc\/|\/var\/|node_modules\/|\.env|process\.env\./i);
    if (match) return `Ruta interna: "${match[0]}"`;
  }
  if (constraint.id === "no_apologies") {
    const match = text.match(/lo siento mucho|disculp[ae] (mucho|muchísimo)/i);
    if (match) return `"${match[0]}"`;
  }
  // Fallback: primeros 120 chars del texto
  return text.length > 120 ? text.slice(0, 117) + "..." : text;
}

// ── Cómputo de severidad ──────────────────────────────────────────────────

function computeSeverity(violations: ThemisPolicyViolation[]): VerdictSeverity {
  if (violations.length === 0) return "clean";
  // En Sprint T-1 no hay 'block' — se añadirá en T-2 para acciones
  const hasError = violations.some(v => v.severity === "error");
  return hasError ? "error" : "warn";
}

// ── Árbol de razonamiento ─────────────────────────────────────────────────

/**
 * Construye la cadena de razonamiento legible para humanos.
 * Explica qué políticas se evaluaron y por qué se llegó al veredicto.
 * Sin LLM — determinista.
 */
function buildReasoning(
  policies:   CognitivePolicy[],
  violations: ThemisPolicyViolation[]
): string {
  const evaluated = policies.map(p => p.name).join(", ");

  if (violations.length === 0) {
    return (
      `Evaluadas ${policies.length} política(s): ${evaluated}. ` +
      `Ninguna violación detectada. Respuesta aprobada.`
    );
  }

  const details = violations
    .map(v => `${v.policyName} → ${v.constraintId} (${v.severity}): ${v.evidence}`)
    .join(" | ");

  return (
    `Evaluadas ${policies.length} política(s): ${evaluated}. ` +
    `${violations.length} violación(es) detectada(s): ${details}.`
  );
}

// ── evaluateResponse — evaluación post-stream ─────────────────────────────

/**
 * Evalúa la respuesta del LLM contra todas las políticas activas.
 *
 * Diseñado para correr en waitUntil() post-stream.
 * Nunca bloquea la respuesta al usuario.
 * Siempre persiste el veredicto a Firestore si userId !== 'anonymous'.
 *
 * @param response  Texto completo generado por el LLM
 * @param context   Contexto del request (path, extensión, rol, etc.)
 * @param userId    UID del usuario (usa 'anonymous' si no hay sesión)
 * @param messageId ID del mensaje/trace para correlación
 */
export async function evaluateResponse(
  response:  string,
  context:   PolicyContext,
  userId:    string,
  messageId: string
): Promise<ThemisVerdict> {
  const policies   = getPoliciesForContext(context);
  const violations = detectViolations(response, context, policies);
  const severity   = computeSeverity(violations);
  const reasoning  = buildReasoning(policies, violations);

  const verdict: ThemisVerdict = {
    id:                generateId(),
    timestamp:         new Date().toISOString(),
    subject:           "response" as VerdictSubject,
    subjectId:         messageId,
    approved:          severity !== "block",
    violations,
    reasoning,
    policiesEvaluated: policies.map(p => p.id),
    severity,
    userId,
    date:              today(),
  };

  // Persistir — fire-and-forget, nunca lanza
  if (userId && userId !== "anonymous") {
    logVerdict(userId, verdict).catch(() => {});
  }

  return verdict;
}

// ── evaluateAction — gate pre-ejecución para HERMES (Sprint T-2) ─────────

/**
 * Evalúa una acción propuesta antes de que HERMES la ejecute.
 * Determinista — sin LLM — < 50ms.
 *
 * Sprint T-2 completará la integración con HERMES.
 * En T-1 esta función existe pero no está wired al executor.
 */
export async function evaluateAction(
  request: ActionEvaluationRequest
): Promise<ActionEvaluationResponse> {
  const policies = getPoliciesForContext(request.context);

  // Serializar el payload para evaluación
  const payloadText = JSON.stringify(request.actionPayload);
  const violations  = detectViolations(payloadText, request.context, policies);

  // Acciones son más estrictas: error → block (no solo warn)
  const rawSeverity = computeSeverity(violations);
  const severity: VerdictSeverity = rawSeverity === "error" ? "block" : rawSeverity;
  const approved = severity !== "block";

  const reasoning = buildReasoning(policies, violations);

  const verdict: ThemisVerdict = {
    id:                generateId(),
    timestamp:         new Date().toISOString(),
    subject:           "action" as VerdictSubject,
    subjectId:         request.actionId,
    approved,
    violations,
    reasoning,
    policiesEvaluated: policies.map(p => p.id),
    severity,
    userId:            request.userId,
    date:              today(),
  };

  if (request.userId && request.userId !== "anonymous") {
    logVerdict(request.userId, verdict).catch(() => {});
  }

  return { verdict, approved, conditions: [] };
}

// ── logVerdict — persistencia a Firestore ────────────────────────────────

/**
 * Escribe el veredicto a Firestore.
 * Los veredictos son inmutables — se usa set() sin merge.
 * Path: users/{userId}/themis_verdicts/{verdict.id}
 */
export async function logVerdict(
  userId:  string,
  verdict: ThemisVerdict
): Promise<void> {
  try {
    const { adminDb } = await import("@/lib/firebase-admin");
    await adminDb
      .collection("users")
      .doc(userId)
      .collection("themis_verdicts")
      .doc(verdict.id)
      .set(verdict);
  } catch {
    // logVerdict nunca debe propagar errores — THEMIS no puede romper el stream
    console.warn("[THEMIS] logVerdict failed silently for verdict", verdict.id);
  }
}

// ── getVerdictHistory — lectura ───────────────────────────────────────────

/**
 * Devuelve los veredictos más recientes de un usuario.
 * Ordenados por timestamp descendente.
 */
export async function getVerdictHistory(
  userId:   string,
  limit:    number = 20,
  subject?: "response" | "action"
): Promise<ThemisVerdict[]> {
  try {
    const { adminDb } = await import("@/lib/firebase-admin");
    let query = adminDb
      .collection("users")
      .doc(userId)
      .collection("themis_verdicts")
      .orderBy("timestamp", "desc")
      .limit(limit);

    if (subject) {
      query = query.where("subject", "==", subject) as typeof query;
    }

    const snap = await query.get();
    return snap.docs.map(d => d.data() as ThemisVerdict);
  } catch {
    return [];
  }
}

// ── Re-exports para compatibilidad ────────────────────────────────────────

export type { ThemisVerdict, ThemisPolicyViolation, VerdictSeverity, VerdictSubject };
