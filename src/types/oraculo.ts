/**
 * ORÁCULO — Predictive Intelligence Engine
 * Generación 2 · El Olimpo SOFIAA OS
 *
 * Tipos base del motor predictivo.
 * ORÁCULO no genera — anticipa. Motor determinista, sin LLM en el hot path.
 *
 * Firestore paths:
 *   users/{uid}/oracle_predictions/{predId}
 *   users/{uid}/oracle_signals/{signalId}
 *   users/{uid}/oracle_insights/{insightId}
 *   users/{uid}/oracle_forecasts/{forecastId}
 *   system/oraculo — configuración global
 */

// ── Categorías de predicción ──────────────────────────────────────────────────

export type OracleCategory =
  | "operational_risk"       // ATENA: SPC out-of-control, NPR > 100
  | "delivery_risk"          // TEC Bii: urgencyScore alto, cumplimientoRate bajo
  | "marketing_risk"         // PROMETEO: goal off-track, fatiga ALTA/CRITICA
  | "strategic_opportunity"  // NEXO: hypotheses con confidence alto
  | "compliance_risk"        // THEMIS: violations recurrentes, veto ratio alto
  | "resource_risk";         // TEC Bii: equipo sobrecargado o bajo rendimiento

// ── Engines fuente ────────────────────────────────────────────────────────────

export type OracleSourceEngine =
  | "atena"
  | "tec_bii"
  | "prometeo"
  | "nexo"
  | "hermes"
  | "themis";

// ── Severidades ───────────────────────────────────────────────────────────────

export type OracleSeverity = "info" | "warning" | "critical";

// ── Horizontes de predicción ──────────────────────────────────────────────────

export type OracleHorizon = "24h" | "7d" | "30d" | "90d";

// ── OracleSignal — señal cruda de un engine ───────────────────────────────────

export interface OracleSignal {
  /** ID generado en el servidor */
  id:            string;
  /** Engine que emitió la señal */
  sourceEngine:  OracleSourceEngine;
  /**
   * Tipo de señal.
   * Ejemplos: 'spc_violation' | 'npm_critico' | 'goal_at_risk' | 'high_urgency'
   *           | 'quality_declining' | 'creative_fatigue' | 'hypothesis_pending'
   *           | 'hermes_veto_ratio' | 'themis_violations'
   */
  signalType:    string;
  /** Severidad determinada por el scanner */
  severity:      OracleSeverity;
  /** Datos crudos del engine (sin datos sensibles) */
  payload:       Record<string, unknown>;
  /** ID de la entidad fuente (proyectoId, goalId, empleadoId, etc.) */
  entityId:      string;
  /** Nombre legible para el usuario */
  entityLabel:   string;
  /** Categoría predictiva inferida */
  category:      OracleCategory;
  /** Timestamp de captura */
  capturedAt:    number;
  userId:        string;
}

// ── OracleRecommendation — acción propuesta ───────────────────────────────────

export interface OracleRecommendation {
  id:              string;
  /** Descripción concreta en lenguaje natural */
  text:            string;
  /** Tipo de acción */
  actionType:      "hermes_action" | "user_decision" | "review";
  /**
   * Payload listo para enviar a POST /api/hermes/execute.
   * Solo si actionType = 'hermes_action'.
   */
  hermesPayload?:  Record<string, unknown>;
  priority:        "high" | "medium" | "low";
}

// ── OraclePrediction — predicción procesada ───────────────────────────────────

export interface OraclePrediction {
  id:              string;
  userId:          string;
  /** Título corto de la predicción */
  title:           string;
  /**
   * Resumen en lenguaje natural.
   * Sprint O-1: generado por plantilla determinista.
   * Sprint O-2+: opcionalmente enriquecido por Groq post-process.
   */
  summary:         string;
  category:        OracleCategory;
  /** Confidence calculado por el motor de reglas (0.0-1.0) */
  confidence:      number;
  horizon:         OracleHorizon;
  /** Señales que contribuyeron a esta predicción */
  signals:         OracleSignal[];
  recommendations: OracleRecommendation[];
  severity:        OracleSeverity;
  status:          "active" | "acknowledged" | "resolved" | "dismissed";
  // ── THEMIS gate ────────────────────────────────────────────────────────────
  /** true si THEMIS aprobó la predicción antes de persistirse */
  themisApproved:  boolean;
  themisVerdictId?: string;
  // ── Timestamps ─────────────────────────────────────────────────────────────
  createdAt:       number;
  updatedAt:       number;
  resolvedAt?:     number;
  acknowledgedAt?: number;
  /** Nota opcional del usuario al hacer acknowledge/dismiss/resolve */
  userNote?:       string;
}

// ── OracleInsight — insight estratégico cross-engine ─────────────────────────

export interface OracleInsight {
  id:                    string;
  userId:                string;
  title:                 string;
  /** Narrativa estratégica generada por Groq (Sprint O-4) */
  body:                  string;
  relatedPredictionIds:  string[];
  confidence:            number;
  generatedAt:           number;
}

// ── OracleForecast — pronóstico de serie de tiempo ───────────────────────────

export type ForecastMethodology =
  | "linear_regression"
  | "weighted_avg"
  | "rule_based";

export interface OracleForecast {
  id:              string;
  userId:          string;
  /** Nombre de la métrica: 'cumplimiento_rate' | 'spc_violations' | 'roas' */
  metric:          string;
  /** Engine dueño de la métrica */
  engine:          OracleSourceEngine;
  currentValue:    number;
  projectedValue:  number;
  /** Timestamp objetivo del pronóstico */
  projectionDate:  number;
  confidence:      number;
  methodology:     ForecastMethodology;
  dataPoints:      Array<{ timestamp: number; value: number }>;
  createdAt:       number;
}

// ── OracleConfig — system/oraculo ────────────────────────────────────────────

export interface OracleEnginesEnabled {
  atena:    boolean;
  tec_bii:  boolean;
  prometeo: boolean;
  nexo:     boolean;
  hermes:   boolean;
  themis:   boolean;
}

export interface OracleThresholds {
  /** NPR de AMEF que dispara señal crítica (default: 100) */
  nprCritico:          number;
  /** urgencyScore de TEC Bii que dispara señal crítica (default: 0.75) */
  urgencyScoreCritico: number;
  /** Nivel de fatiga que dispara señal (default: 'ALTA') */
  fatigaNivelCritico:  string;
  /** % de desviación bajo objetivo de BrandGoal que es warning (default: 0.2) */
  goalDeviationPct:    number;
  /** Violaciones SPC en 7 días para considerar warning (default: 3) */
  spcViolationCount:   number;
  /** Ratio de acciones vetadas por THEMIS que dispara señal (default: 0.1 = 10%) */
  hermesVetoRatio:     number;
}

export interface OracleConfig {
  enginesEnabled:   OracleEnginesEnabled;
  thresholds:       OracleThresholds;
  /** Horas entre escaneos automáticos (default: 6) */
  scanIntervalHours: number;
}

// ── Configuración por defecto ─────────────────────────────────────────────────

export const DEFAULT_ORACLE_CONFIG: OracleConfig = {
  enginesEnabled: {
    atena:    true,
    tec_bii:  true,
    prometeo: true,
    nexo:     true,
    hermes:   true,
    themis:   true,
  },
  thresholds: {
    nprCritico:          100,
    urgencyScoreCritico: 0.75,
    fatigaNivelCritico:  "ALTA",
    goalDeviationPct:    0.2,
    spcViolationCount:   3,
    hermesVetoRatio:     0.1,
  },
  scanIntervalHours: 6,
};

// ── Request / Response de API ─────────────────────────────────────────────────

export interface OracleScanResponse {
  scannedAt:          string;
  signalsFound:       number;
  predictionsCreated: number;
  predictions:        OraclePrediction[];
}

export interface OraclePredictionsResponse {
  predictions: OraclePrediction[];
  total:       number;
}
