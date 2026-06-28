/**
 * SOFIAA Sprint D-D — Policy Evaluator
 *
 * Evalúa la respuesta del LLM contra las políticas activas.
 * Corre post-stream, de forma asíncrona — nunca bloquea la respuesta al usuario.
 *
 * Output:
 *   - PolicyReport: score 0-1 + lista de violations
 *   - Se despacha al EventBus para telemetría/observabilidad
 *   - Puede desencadenar auto-retry en versiones futuras (flag retrySuggested)
 */

import type { CognitivePolicy, PolicyContext, PolicyConstraint } from "@/core/cognitive.policy";

// ── Tipos de salida ───────────────────────────────────────────────────────

export interface PolicyViolation {
  policyId:      string;
  constraintId:  string;
  severity:      "warn" | "error";
  description:   string;
}

export interface PolicyReport {
  /** 0 = falló todo, 1 = perfecto */
  score:           number;
  violations:      PolicyViolation[];
  /** true si hay al menos un error de severidad "error" */
  hasErrors:       boolean;
  /** Sugerencia para el Orchestrator: reintentar con contexto adicional */
  retrySuggested:  boolean;
  /** Resumen legible para logs */
  summary:         string;
}

// ── Evaluador principal ───────────────────────────────────────────────────

/**
 * Evalúa la respuesta contra todas las políticas activas.
 * Es síncrono pero diseñado para correr asíncronamente post-stream.
 *
 * @param response  - Texto completo generado por el LLM
 * @param policies  - Políticas resueltas para este contexto
 * @param ctx       - Contexto del request (path, extensión, rol, etc.)
 */
export function evaluateResponse(
  response:   string,
  policies:   CognitivePolicy[],
  ctx:        PolicyContext
): PolicyReport {

  const violations: PolicyViolation[] = [];

  for (const policy of policies) {
    for (const constraint of policy.constraints) {
      try {
        const violated = constraint.detect(response, ctx);
        if (violated) {
          violations.push({
            policyId:     policy.id,
            constraintId: constraint.id,
            severity:     constraint.severity,
            description:  constraint.description,
          });
        }
      } catch {
        // Evaluar nunca debe romper el flujo principal
      }
    }
  }

  // Score: empieza en 1, baja según violaciones
  const totalConstraints = policies.reduce((acc, p) => acc + p.constraints.length, 0);
  const errorWeight   = violations.filter(v => v.severity === "error").length * 2;
  const warnWeight    = violations.filter(v => v.severity === "warn").length;
  const penaltyWeight = errorWeight + warnWeight;
  const score = totalConstraints > 0
    ? Math.max(0, 1 - penaltyWeight / (totalConstraints * 2))
    : 1;

  const hasErrors       = violations.some(v => v.severity === "error");
  const retrySuggested  = hasErrors && violations.some(
    v => ["no_expose_keys", "exact_routes", "spanish_first"].includes(v.constraintId)
  );

  const summary = violations.length === 0
    ? `✓ OK (score: ${score.toFixed(2)})`
    : `${violations.length} violation(s) [score: ${score.toFixed(2)}]: ${violations.map(v => `${v.policyId}/${v.constraintId}`).join(", ")}`;

  return { score, violations, hasErrors, retrySuggested, summary };
}

// ── Helpers de telemetría ─────────────────────────────────────────────────

/**
 * Convierte el PolicyReport a payload para el EventBus.
 */
export function reportToEventPayload(
  report:     PolicyReport,
  traceId:    string,
  provider:   string,
  extensionId?: string | null
): Record<string, unknown> {
  return {
    traceId,
    provider,
    extensionId: extensionId ?? "none",
    score:           report.score,
    violationCount:  report.violations.length,
    hasErrors:       report.hasErrors,
    retrySuggested:  report.retrySuggested,
    violations:      report.violations.map(v => ({
      policy:     v.policyId,
      constraint: v.constraintId,
      severity:   v.severity,
    })),
    summary: report.summary,
  };
}

// ── Score rápido (sin PolicyReport completo) ──────────────────────────────

/**
 * Versión ligera para casos donde solo se necesita el score,
 * por ejemplo para decidir si mostrar un indicador en el Admin Panel.
 */
export function quickScore(
  response:  string,
  policies:  CognitivePolicy[],
  ctx:       PolicyContext
): number {
  return evaluateResponse(response, policies, ctx).score;
}

// ── Clasificador de calidad ───────────────────────────────────────────────

export type QualityLabel = "excellent" | "good" | "acceptable" | "poor";

export function classifyQuality(score: number): QualityLabel {
  if (score >= 0.90) return "excellent";
  if (score >= 0.75) return "good";
  if (score >= 0.50) return "acceptable";
  return "poor";
}
