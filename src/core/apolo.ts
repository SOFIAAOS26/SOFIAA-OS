/**
 * APOLO — Client Intelligence & Reporting Engine
 * Sprint AP-0 · Shell con exports vacíos
 *
 * Las implementaciones reales llegan en AP-1 y AP-2.
 * Este archivo existe para que los imports no rompan el build.
 */

import type {
  ApoloReport,
  ApoloContextSummary,
  AggregatedEngineData,
  ApoloReportSection,
  ReportType,
} from "@/types/apolo";

// ── AP-1: Data Aggregator ──────────────────────────────────────────────────────

/**
 * Lee en paralelo los engines relevantes de Firestore para el tipo de reporte.
 * Sin LLM — puras queries. Implementación en Sprint AP-1.
 */
export async function aggregateEngineData(
  _userId:  string,
  _type:    ReportType,
  _period:  { from: number; to: number }
): Promise<AggregatedEngineData> {
  throw new Error("aggregateEngineData: implementación pendiente (Sprint AP-1)");
}

/**
 * Transforma AggregatedEngineData en ApoloReportSection[] con dataPoints.
 * Función determinista — sin LLM. Implementación en Sprint AP-1.
 */
export function buildSections(
  _aggregated: AggregatedEngineData,
  _type:       ReportType
): ApoloReportSection[] {
  return [];
}

// ── AP-2: Report Generator ─────────────────────────────────────────────────────

/**
 * Función principal: agrega → construye → narra → gate THEMIS → persiste.
 * Implementación en Sprint AP-2.
 */
export async function generateReport(
  _userId:  string,
  _options: {
    type:         ReportType;
    workspaceId?: string;
    clientName?:  string;
    period?:      { from: number; to: number };
  }
): Promise<ApoloReport> {
  throw new Error("generateReport: implementación pendiente (Sprint AP-2)");
}

// ── AP-5: Chat Integration ─────────────────────────────────────────────────────

/**
 * Retorna el último reporte 'ready' del usuario para inyectar en el chat.
 * Implementación en Sprint AP-5.
 */
export async function getApoloContext(
  _userId: string
): Promise<ApoloContextSummary | null> {
  return null; // silently returns null hasta AP-5
}

/**
 * Construye el bloque de texto para el system prompt del chat.
 */
export function buildApoloBlock(ctx: ApoloContextSummary | null): string {
  if (!ctx) return "";
  const periodLabel = new Date(ctx.period.from).toLocaleDateString("es-MX", {
    month: "short",
    day:   "numeric",
  }) + " – " + new Date(ctx.period.to).toLocaleDateString("es-MX", {
    month: "short",
    day:   "numeric",
  });
  return (
    `\n\nÚLTIMO REPORTE APOLO — ${ctx.title} (${periodLabel}):\n` +
    ctx.summary +
    `\n\nSi el usuario pregunta sobre el estado del negocio, campañas o proyectos, puedes referenciar este reporte.`
  );
}
