/**
 * N.E.X.O. — Cognitive Variables (Sprint M-3)
 *
 * Perfil cognitivo del usuario: variables persistentes que adaptan el
 * comportamiento de SOFIAA según patrones de uso acumulados a lo largo
 * de todas las sesiones.
 *
 * Arquitectura híbrida:
 *   - Rule-based: se actualiza async post-stream en cada conversación
 *   - Gemini refinement: CRON periódico para análisis más profundo (Fase 2)
 *
 * Almacenado en: users/{uid}/cognitive_profile/v1
 */

// ── Tipos base ────────────────────────────────────────────────────────────────

/** Nivel de detalle preferido en las respuestas */
export type DepthPreference = "concise" | "balanced" | "deep";

/** Mapa de afinidad temática: tema → score 0.0–1.0 */
export type TopicAffinity = Record<string, number>;

// ── Perfil principal ──────────────────────────────────────────────────────────

export interface CognitiveProfile {
  /** UID del usuario dueño del perfil */
  uid: string;

  /**
   * Profundidad de respuesta preferida.
   * Evoluciona cuando el usuario pide "más detalle" o "más corto".
   */
  preferredDepth: DepthPreference;

  /**
   * Confianza en el valor de preferredDepth (0–1).
   * Sube con cada señal explícita. Bajo = recién inicializado.
   */
  depthConfidence: number;

  /**
   * Score de formalidad: 0.0 = muy casual, 1.0 = muy formal.
   * Default: 0.5 (neutro).
   */
  formalityScore: number;

  /**
   * Afinidad temática acumulada de conversaciones y nodos NEXO.
   * Ejemplo: { "trabajo": 0.8, "tecnología": 0.6 }
   */
  topicAffinity: TopicAffinity;

  /** Número de sesiones de chat registradas */
  sessionCount: number;

  /** Timestamp de la última sesión activa (ms) */
  lastActiveAt: number;

  /** Timestamp de creación del perfil (ms) */
  createdAt: number;

  /** Timestamp de la última actualización (ms) */
  updatedAt: number;
}

// ── Señales cognitivas ────────────────────────────────────────────────────────

export type CognitiveSignalType =
  | "depth_increase"   // usuario pidió más detalle
  | "depth_decrease"   // usuario pidió respuesta más corta
  | "formality_up"     // lenguaje más formal detectado
  | "formality_down"   // lenguaje más casual detectado
  | "topic_mention";   // mención explícita de un tema

export interface CognitiveSignal {
  type:       CognitiveSignalType;
  /** Tema detectado (solo para type === "topic_mention") */
  topic?:     string;
  /** Confianza en la señal detectada (0–1) */
  confidence: number;
  /** Timestamp de detección (ms) */
  detectedAt: number;
}

// ── Perfil por defecto ────────────────────────────────────────────────────────

export const DEFAULT_COGNITIVE_PROFILE = {
  preferredDepth:  "balanced" as DepthPreference,
  depthConfidence: 0,
  formalityScore:  0.5,
  topicAffinity:   {} as TopicAffinity,
  sessionCount:    0,
} as const;

// ── Constantes ────────────────────────────────────────────────────────────────

/** Ruta del documento en Firestore (subcollection con doc único) */
export const COGNITIVE_PROFILE_PATH = (uid: string) =>
  `users/${uid}/cognitive_profile/v1`;

/** Días sin actividad antes de mostrar saludo de retorno */
export const COGNITIVE_RETURN_THRESHOLD_DAYS = 3;
