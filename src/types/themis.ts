/**
 * SOFIAA THEMIS — Sprint T-1
 * Governance & Ethics Engine — Tipos base
 *
 * ThemisVerdict es el ciudadano de primera clase de este módulo.
 * Todo juicio de THEMIS produce un veredicto estructurado, persistido
 * y auditable. Nunca un log efímero.
 */

import type { PolicyContext } from "@/core/cognitive.policy";

// ── Enums de estado ────────────────────────────────────────────────────────

/** Nivel máximo de violación encontrado en un veredicto */
export type VerdictSeverity = "clean" | "warn" | "error" | "block";

/** Qué entidad fue evaluada */
export type VerdictSubject = "response" | "action";

// ── Violación individual ───────────────────────────────────────────────────

/**
 * Una violación de política detectada en una respuesta o acción.
 * Más rica que la PolicyViolation de policy.evaluator — incluye
 * evidencia y la instrucción violada para que el veredicto sea
 * autoexplicativo sin consultar el registry.
 */
export interface ThemisPolicyViolation {
  /** ID de la política que fue violada (e.g. "privacy_guard") */
  policyId:     string;
  /** Nombre legible de la política */
  policyName:   string;
  /** ID del constraint específico (e.g. "no_expose_keys") */
  constraintId: string;
  /** Severidad del constraint */
  severity:     "warn" | "error";
  /** El fragmento de texto u objeto que disparó la detección */
  evidence:     string;
  /** La instrucción que se violó — para que el veredicto sea auditable */
  instruction:  string;
}

// ── Veredicto ──────────────────────────────────────────────────────────────

/**
 * El veredicto estructurado de THEMIS.
 * Persiste en Firestore: users/{uid}/themis_verdicts/{id}
 * Es inmutable una vez escrito — la historia de THEMIS no se edita.
 */
export interface ThemisVerdict {
  /** Identificador único (UUID v4) */
  id:                string;
  /** Timestamp ISO 8601 del momento de evaluación */
  timestamp:         string;
  /** Tipo de entidad evaluada */
  subject:           VerdictSubject;
  /** ID del mensaje o acción evaluados (para correlación) */
  subjectId?:        string;
  /** false solo cuando severity === 'block' */
  approved:          boolean;
  /** Lista de violaciones detectadas — vacía si clean */
  violations:        ThemisPolicyViolation[];
  /** Cadena de razonamiento en lenguaje natural */
  reasoning:         string;
  /** IDs de todas las políticas evaluadas */
  policiesEvaluated: string[];
  /** Nivel máximo de violación detectado */
  severity:          VerdictSeverity;
  /** UID del usuario en contexto */
  userId:            string;
  /** YYYY-MM-DD — para queries Firestore por fecha */
  date:              string;
}

// ── Evaluación de acciones (HERMES → THEMIS) ──────────────────────────────

/**
 * Solicitud de evaluación de acción.
 * HERMES llama a THEMIS con esto antes de ejecutar cualquier acción.
 */
export interface ActionEvaluationRequest {
  /** ID de la acción en la cola de HERMES */
  actionId:      string;
  /** Tipo de acción (e.g. 'monday_task', 'slack_message') */
  actionType:    string;
  /** Datos de la acción a evaluar */
  actionPayload: Record<string, unknown>;
  /** Qué dios solicitó la acción (e.g. 'prometeo', 'atena') */
  requestedBy:   string;
  /** UID del usuario en contexto */
  userId:        string;
  /** Contexto de la sesión */
  context:       PolicyContext;
}

/**
 * Respuesta de THEMIS a una solicitud de evaluación de acción.
 */
export interface ActionEvaluationResponse {
  verdict:     ThemisVerdict;
  approved:    boolean;
  /** Condiciones adicionales si approved === true (para Sprint T-2) */
  conditions?: string[];
}

// ── Override de políticas (Sprint T-3) ───────────────────────────────────

/**
 * Override de una política — permite activar/desactivar desde admin
 * sin tocar código. Se persiste en system/themis en Firestore.
 */
export interface PolicyOverride {
  policyId:  string;
  enabled:   boolean;
  updatedAt: string;
  updatedBy: string;
  note?:     string;
}
