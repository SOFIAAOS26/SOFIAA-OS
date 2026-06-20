// SOFIAA — Metrics Schema
// Estructura versionada para almacenamiento de métricas en localStorage

import type { TelemetryEvent } from "./telemetry.events";

export const TELEMETRY_VERSION = "1.0" as const;
export const TELEMETRY_KEY = "sofiaa_telemetry";
export const MAX_SESSIONS_STORED = 20; // límite de sesiones en localStorage

export interface SessionMetrics {
  /** TTI — Tiempo hasta primera respuesta (ms). Array de un valor por intercambio. */
  tti: number[];
  /** IFC — Fricción de interacción: longitud promedio de mensajes del usuario. */
  ifc: number[];
  /** CVR — Conversión: número de quick actions usadas en la sesión. */
  cvr: number;
  /** CKS — Conocimiento compartido: ¿había memoria de largo plazo al inicio? */
  cks: boolean;
  /** IAI — Índice de anticipación: ratio quick actions / total mensajes enviados. */
  iai: number;
  /** Total de mensajes enviados por el usuario en la sesión. */
  totalMessages: number;
  /** Total de guardrails disparados en la sesión. */
  guardrailsTriggered: number;
  /** ¿Se usó voz al menos una vez? */
  voiceUsed: boolean;
}

export interface TelemetrySession {
  version: typeof TELEMETRY_VERSION;
  sessionId: string;
  startedAt: number;
  endedAt?: number;
  events: TelemetryEvent[];
  metrics: SessionMetrics;
}

export interface TelemetryStore {
  version: typeof TELEMETRY_VERSION;
  sessions: TelemetrySession[];
}

/** Métricas vacías para una sesión nueva */
export function emptyMetrics(): SessionMetrics {
  return {
    tti: [],
    ifc: [],
    cvr: 0,
    cks: false,
    iai: 0,
    totalMessages: 0,
    guardrailsTriggered: 0,
    voiceUsed: false,
  };
}

/** Calcula el promedio de un array numérico */
export function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

/** Lee el store de telemetría desde localStorage */
export function readTelemetryStore(): TelemetryStore {
  if (typeof window === "undefined") return { version: TELEMETRY_VERSION, sessions: [] };
  try {
    const raw = localStorage.getItem(TELEMETRY_KEY);
    if (!raw) return { version: TELEMETRY_VERSION, sessions: [] };
    const parsed = JSON.parse(raw) as TelemetryStore;
    if (parsed.version !== TELEMETRY_VERSION) return { version: TELEMETRY_VERSION, sessions: [] };
    return parsed;
  } catch {
    return { version: TELEMETRY_VERSION, sessions: [] };
  }
}

/** Escribe el store de telemetría en localStorage */
export function writeTelemetryStore(store: TelemetryStore): void {
  if (typeof window === "undefined") return;
  // Limitar a MAX_SESSIONS_STORED sesiones más recientes
  const trimmed = { ...store, sessions: store.sessions.slice(-MAX_SESSIONS_STORED) };
  localStorage.setItem(TELEMETRY_KEY, JSON.stringify(trimmed));
}
