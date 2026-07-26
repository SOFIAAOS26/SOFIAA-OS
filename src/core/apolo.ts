/**
 * APOLO — Client Intelligence & Reporting Engine
 * Sprint AP-1 · Data Aggregator + buildSections
 * Sprint AP-2 · generateNarrative (Groq) + applyThemisGate + status "ready"
 *
 * Generación 2 · El Sol que Ilumina el Olimpo
 */

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { callGroq } from "@/lib/groq";
import { evaluateAction } from "@/core/themis";
import type {
  ApoloReport,
  ApoloReportSection,
  ApoloDataPoint,
  AggregatedEngineData,
  ApoloContextSummary,
  ReportType,
} from "@/types/apolo";
import type { OraclePrediction, OracleInsight } from "@/types/oraculo";

// ── Helpers de colecciones ────────────────────────────────────────────────────

const atenaCol  = (uid: string, col: string) => adminDb.collection(`users/${uid}/atena_${col}`);
const tecCol    = (uid: string, col: string) => adminDb.collection(`users/${uid}/tec_bii_${col}`);
const nexoCol   = (uid: string)              => adminDb.collection(`users/${uid}/nexo_nodes`);

// ── Engines por tipo de reporte ───────────────────────────────────────────────

const ENGINES_BY_TYPE: Record<ReportType, string[]> = {
  weekly_summary:       ["oraculo", "prometeo", "tec_bii", "atena"],
  campaign_performance: ["prometeo"],
  project_status:       ["tec_bii"],
  quality_report:       ["atena"],
  executive_brief:      ["oraculo", "nexo", "tec_bii", "prometeo"],
  strategic_outlook:    ["oraculo", "nexo"],
};

// ── Período por defecto — últimos 7 días ──────────────────────────────────────

function defaultPeriod(): { from: number; to: number } {
  const to   = Date.now();
  const from = to - 7 * 24 * 60 * 60 * 1000;
  return { from, to };
}

// ══════════════════════════════════════════════════════════════════════════════
// AP-1: aggregateEngineData — lee Firestore en paralelo, sin LLM
// ══════════════════════════════════════════════════════════════════════════════

export async function aggregateEngineData(
  userId: string,
  type:   ReportType,
  period: { from: number; to: number }
): Promise<AggregatedEngineData> {
  const engines = ENGINES_BY_TYPE[type] ?? ["oraculo"];
  const results: Record<string, unknown[]> = {};

  // Lanzar todas las queries en paralelo — si una falla, el resto continúa
  const tasks = engines.map(async (engine) => {
    try {
      switch (engine) {
        case "oraculo":
          results.oraculo = await fetchOraculo(userId);
          break;
        case "prometeo":
          results.prometeo = await fetchPrometeo(userId);
          break;
        case "tec_bii":
          results.tec_bii = await fetchTecBii(userId);
          break;
        case "atena":
          results.atena = await fetchAtena(userId);
          break;
        case "nexo":
          results.nexo = await fetchNexo(userId);
          break;
      }
    } catch (err) {
      console.error(`[APOLO][aggregate] engine ${engine} falló:`, err);
      results[engine] = [];
    }
  });

  await Promise.allSettled(tasks);

  return { userId, type, period, engines: results };
}

// ── Fetchers por engine ───────────────────────────────────────────────────────

async function fetchOraculo(userId: string): Promise<unknown[]> {
  const [predsSnap, insightsSnap] = await Promise.all([
    adminDb
      .collection(`users/${userId}/oracle_predictions`)
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get(),
    adminDb
      .collection(`users/${userId}/oracle_insights`)
      .orderBy("generatedAt", "desc")
      .limit(3)
      .get(),
  ]);

  const predictions = predsSnap.docs.map(d => ({ _type: "prediction", ...d.data() }));
  const insights    = insightsSnap.docs.map(d => ({ _type: "insight", ...d.data() }));
  return [...predictions, ...insights];
}

async function fetchPrometeo(userId: string): Promise<unknown[]> {
  // PROMETEO vive en smm_workspaces — buscar todos los workspaces del usuario
  const wsSnap = await adminDb.collection("smm_workspaces").get();
  const all: unknown[] = [];

  await Promise.allSettled(wsSnap.docs.map(async (wsDoc) => {
    const wsId = wsDoc.id;
    const [goalsSnap, fatigaSnap] = await Promise.all([
      adminDb
        .collection(`smm_workspaces/${wsId}/prometeo_goals`)
        .orderBy("updatedAt", "desc")
        .limit(8)
        .get(),
      adminDb
        .collection(`smm_workspaces/${wsId}/prometeo_fatigue_alerts`)
        .orderBy("createdAt", "desc")
        .limit(4)
        .get(),
    ]);
    goalsSnap.docs.forEach(d  => all.push({ _type: "goal",   workspaceId: wsId, ...d.data() }));
    fatigaSnap.docs.forEach(d => all.push({ _type: "fatiga", workspaceId: wsId, ...d.data() }));
  }));

  return all;
}

async function fetchTecBii(userId: string): Promise<unknown[]> {
  const snap = await tecCol(userId, "proyectos")
    .orderBy("updatedAt", "desc")
    .limit(10)
    .get();
  return snap.docs.map(d => ({ _type: "proyecto", ...d.data() }));
}

async function fetchAtena(userId: string): Promise<unknown[]> {
  const [projSnap, spcSnap, amefSnap] = await Promise.all([
    atenaCol(userId, "proyectos").orderBy("updatedAt", "desc").limit(5).get(),
    atenaCol(userId, "spc").orderBy("computedAt", "desc").limit(5).get(),
    atenaCol(userId, "amef").orderBy("npr", "desc").limit(10).get(),
  ]);

  return [
    ...projSnap.docs.map(d => ({ _type: "proyecto", ...d.data() })),
    ...spcSnap.docs.map(d  => ({ _type: "spc",      ...d.data() })),
    ...amefSnap.docs.map(d => ({ _type: "amef",     ...d.data() })),
  ];
}

async function fetchNexo(userId: string): Promise<unknown[]> {
  const snap = await nexoCol(userId)
    .where("weight", ">=", 0.6)
    .orderBy("weight", "desc")
    .limit(8)
    .get();
  return snap.docs.map(d => ({ _type: "nexo_node", ...d.data() }));
}

// ══════════════════════════════════════════════════════════════════════════════
// AP-1: buildSections — transforma datos crudos en ApoloReportSection[]
//        Función determinista — sin LLM
// ══════════════════════════════════════════════════════════════════════════════

export function buildSections(
  aggregated: AggregatedEngineData,
  type:       ReportType
): ApoloReportSection[] {
  const sections: ApoloReportSection[] = [];

  switch (type) {
    case "weekly_summary":
      _addOraculoSection(sections,  aggregated, 0);
      _addPrometeoSection(sections, aggregated, 1);
      _addTecBiiSection(sections,   aggregated, 2);
      _addAtenaSection(sections,    aggregated, 3);
      break;
    case "campaign_performance":
      _addPrometeoSection(sections, aggregated, 0);
      break;
    case "project_status":
      _addTecBiiSection(sections, aggregated, 0);
      break;
    case "quality_report":
      _addAtenaSection(sections, aggregated, 0);
      break;
    case "executive_brief":
      _addOraculoSection(sections,  aggregated, 0);
      _addPrometeoSection(sections, aggregated, 1);
      _addTecBiiSection(sections,   aggregated, 2);
      _addNexoSection(sections,     aggregated, 3);
      break;
    case "strategic_outlook":
      _addOraculoSection(sections, aggregated, 0);
      _addNexoSection(sections,    aggregated, 1);
      break;
  }

  return sections.filter(s => s.dataPoints.length > 0);
}

// ── Builders por engine ───────────────────────────────────────────────────────

function _addOraculoSection(
  sections:   ApoloReportSection[],
  aggregated: AggregatedEngineData,
  order:      number
): void {
  const raw = (aggregated.engines.oraculo ?? []) as Array<Record<string, unknown>>;
  if (raw.length === 0) return;

  const predictions = raw.filter(d => d._type === "prediction") as Array<Record<string, unknown>>;
  const insights    = raw.filter(d => d._type === "insight")    as Array<Record<string, unknown>>;

  const dataPoints: ApoloDataPoint[] = [];

  // KPIs de predicciones activas
  const critical = predictions.filter(p => p.severity === "critical").length;
  const warning  = predictions.filter(p => p.severity === "warning").length;
  if (predictions.length > 0) {
    dataPoints.push({
      label: "Predicciones activas",
      value: String(predictions.length),
      trend: critical > 0 ? "down" : "stable",
      engine: "oraculo",
    });
  }
  if (critical > 0) {
    dataPoints.push({
      label: "Alertas críticas",
      value: String(critical),
      trend: "down",
      engine: "oraculo",
    });
  }
  if (warning > 0) {
    dataPoints.push({
      label: "Alertas de advertencia",
      value: String(warning),
      trend: "down",
      engine: "oraculo",
    });
  }

  // Top 3 predicciones como dataPoints
  predictions.slice(0, 3).forEach(p => {
    dataPoints.push({
      label:    String(p.title ?? "Predicción"),
      value:    `${(Number(p.confidence ?? 0) * 100).toFixed(0)}% confianza`,
      trend:    p.severity === "critical" ? "down" : p.severity === "warning" ? "stable" : "up",
      engine:   "oraculo",
      entityId: String(p.id ?? ""),
    });
  });

  // Insight más reciente
  if (insights.length > 0) {
    const top = insights[0];
    dataPoints.push({
      label:  "Insight estratégico más reciente",
      value:  String(top.title ?? ""),
      engine: "oraculo",
    });
  }

  sections.push({
    id:         `oraculo-${Date.now()}`,
    title:      "Inteligencia Predictiva — ORÁCULO",
    body:       "", // AP-2 completa con Groq
    dataPoints,
    engine:     "oraculo",
    order,
  });
}

function _addPrometeoSection(
  sections:   ApoloReportSection[],
  aggregated: AggregatedEngineData,
  order:      number
): void {
  const raw = (aggregated.engines.prometeo ?? []) as Array<Record<string, unknown>>;
  if (raw.length === 0) return;

  const goals  = raw.filter(d => d._type === "goal")   as Array<Record<string, unknown>>;
  const fatig  = raw.filter(d => d._type === "fatiga")  as Array<Record<string, unknown>>;

  const dataPoints: ApoloDataPoint[] = [];

  if (goals.length > 0) {
    dataPoints.push({
      label:  "Objetivos de marketing activos",
      value:  String(goals.length),
      trend:  "stable",
      engine: "prometeo",
    });

    // % progreso promedio
    const avgPct = goals.reduce((sum, g) => {
      const objetivo = Number(g.valorObjetivo ?? 0);
      const actual   = Number(g.valorActual   ?? 0);
      return sum + (objetivo > 0 ? Math.min(actual / objetivo, 1) : 0);
    }, 0) / goals.length;

    dataPoints.push({
      label:  "Progreso promedio de objetivos",
      value:  `${(avgPct * 100).toFixed(0)}%`,
      trend:  avgPct >= 0.7 ? "up" : avgPct >= 0.4 ? "stable" : "down",
      engine: "prometeo",
    });

    // Objetivos en riesgo (actual < 50% del objetivo con deadline cercano)
    const now  = Date.now();
    const risk = goals.filter(g => {
      const objetivo   = Number(g.valorObjetivo ?? 0);
      const actual     = Number(g.valorActual   ?? 0);
      const deadline   = Number(g.fechaLimite   ?? 0);
      const pct        = objetivo > 0 ? actual / objetivo : 1;
      const diasRestantes = (deadline - now) / (1000 * 60 * 60 * 24);
      return pct < 0.5 && diasRestantes < 14;
    });
    if (risk.length > 0) {
      dataPoints.push({
        label:  "Objetivos en riesgo (últimos 14 días)",
        value:  String(risk.length),
        trend:  "down",
        engine: "prometeo",
      });
    }

    // Top objetivo por progreso
    const sorted = [...goals].sort((a, b) => {
      const pctA = Number(a.valorActual ?? 0) / Math.max(Number(a.valorObjetivo ?? 1), 1);
      const pctB = Number(b.valorActual ?? 0) / Math.max(Number(b.valorObjetivo ?? 1), 1);
      return pctB - pctA;
    });
    if (sorted[0]) {
      const g   = sorted[0];
      const pct = (Number(g.valorActual ?? 0) / Math.max(Number(g.valorObjetivo ?? 1), 1) * 100).toFixed(0);
      dataPoints.push({
        label:  `Objetivo líder: ${String(g.titulo ?? g.clienteNombre ?? "—")}`,
        value:  `${pct}% (${String(g.valorActual ?? "—")} / ${String(g.valorObjetivo ?? "—")} ${String(g.unidad ?? "")})`,
        trend:  "up",
        engine: "prometeo",
      });
    }
  }

  // Alertas de fatiga
  const fatigaCritica = fatig.filter(f => f.nivelFatiga === "CRITICA" || f.nivelFatiga === "ALTA");
  if (fatigaCritica.length > 0) {
    dataPoints.push({
      label:  "Alertas de fatiga publicitaria (Alta/Crítica)",
      value:  String(fatigaCritica.length),
      trend:  "down",
      engine: "prometeo",
    });
  }

  sections.push({
    id:         `prometeo-${Date.now()}`,
    title:      "Rendimiento de Marketing — PROMETEO",
    body:       "",
    dataPoints,
    engine:     "prometeo",
    order,
  });
}

function _addTecBiiSection(
  sections:   ApoloReportSection[],
  aggregated: AggregatedEngineData,
  order:      number
): void {
  const raw = (aggregated.engines.tec_bii ?? []) as Array<Record<string, unknown>>;
  if (raw.length === 0) return;

  const proyectos = raw.filter(d => d._type === "proyecto") as Array<Record<string, unknown>>;
  if (proyectos.length === 0) return;

  const dataPoints: ApoloDataPoint[] = [];

  dataPoints.push({
    label:  "Proyectos en seguimiento",
    value:  String(proyectos.length),
    trend:  "stable",
    engine: "tec_bii",
  });

  // Proyectos activos (no entregados ni cancelados)
  const activos = proyectos.filter(p =>
    p.estado !== "Entregado" && p.estado !== "Cancelado"
  );
  if (activos.length !== proyectos.length) {
    dataPoints.push({
      label:  "Proyectos activos",
      value:  String(activos.length),
      trend:  "stable",
      engine: "tec_bii",
    });
  }

  // Proyectos urgentes (urgencyScore > 0.75)
  const urgentes = proyectos.filter(p => Number(p.urgencyScore ?? 0) > 0.75);
  if (urgentes.length > 0) {
    dataPoints.push({
      label:  "Proyectos con urgencia crítica",
      value:  String(urgentes.length),
      trend:  "down",
      engine: "tec_bii",
    });
    // Listar los top 2
    urgentes.slice(0, 2).forEach(p => {
      dataPoints.push({
        label:    `⚠ ${String(p.titulo ?? p.nombre ?? "Proyecto")}`,
        value:    `Urgencia ${(Number(p.urgencyScore ?? 0) * 100).toFixed(0)}%`,
        trend:    "down",
        engine:   "tec_bii",
        entityId: String(p.id ?? ""),
      });
    });
  }

  // Proyectos en riesgo (alertaRiesgo = true)
  const enRiesgo = proyectos.filter(p => p.alertaRiesgo === true);
  if (enRiesgo.length > 0) {
    dataPoints.push({
      label:  "Proyectos con alerta de riesgo",
      value:  String(enRiesgo.length),
      trend:  "down",
      engine: "tec_bii",
    });
  }

  sections.push({
    id:         `tec_bii-${Date.now()}`,
    title:      "Estado Operacional — TEC Bii",
    body:       "",
    dataPoints,
    engine:     "tec_bii",
    order,
  });
}

function _addAtenaSection(
  sections:   ApoloReportSection[],
  aggregated: AggregatedEngineData,
  order:      number
): void {
  const raw = (aggregated.engines.atena ?? []) as Array<Record<string, unknown>>;
  if (raw.length === 0) return;

  const proyectos = raw.filter(d => d._type === "proyecto") as Array<Record<string, unknown>>;
  const spcItems  = raw.filter(d => d._type === "spc")      as Array<Record<string, unknown>>;
  const amefItems = raw.filter(d => d._type === "amef")     as Array<Record<string, unknown>>;

  const dataPoints: ApoloDataPoint[] = [];

  if (proyectos.length > 0) {
    dataPoints.push({
      label:  "Proyectos DMAIC activos",
      value:  String(proyectos.length),
      trend:  "stable",
      engine: "atena",
    });

    // Avance promedio
    const avgAvance = proyectos.reduce((s, p) => s + Number(p.avance ?? 0), 0) / proyectos.length;
    dataPoints.push({
      label:  "Avance promedio DMAIC",
      value:  `${avgAvance.toFixed(0)}%`,
      trend:  avgAvance >= 60 ? "up" : avgAvance >= 30 ? "stable" : "down",
      engine: "atena",
    });
  }

  if (spcItems.length > 0) {
    const totalViolaciones = spcItems.reduce((s, sp) => s + Number(sp.violacionesWesternElectric ?? 0), 0);
    dataPoints.push({
      label:  "Violaciones SPC (Western Electric)",
      value:  String(totalViolaciones),
      trend:  totalViolaciones === 0 ? "up" : totalViolaciones <= 2 ? "stable" : "down",
      engine: "atena",
    });
  }

  if (amefItems.length > 0) {
    const criticos = amefItems.filter(a => Number(a.npr ?? 0) > 100);
    const maxNPR   = amefItems.reduce((max, a) => Math.max(max, Number(a.npr ?? 0)), 0);
    if (criticos.length > 0) {
      dataPoints.push({
        label:  "Items AMEF con NPR > 100",
        value:  String(criticos.length),
        trend:  "down",
        engine: "atena",
      });
    }
    dataPoints.push({
      label:  "NPR máximo detectado",
      value:  String(maxNPR),
      trend:  maxNPR > 200 ? "down" : maxNPR > 100 ? "stable" : "up",
      engine: "atena",
    });
  }

  if (dataPoints.length === 0) return;

  sections.push({
    id:         `atena-${Date.now()}`,
    title:      "Calidad y Riesgo — ATENA",
    body:       "",
    dataPoints,
    engine:     "atena",
    order,
  });
}

function _addNexoSection(
  sections:   ApoloReportSection[],
  aggregated: AggregatedEngineData,
  order:      number
): void {
  const raw = (aggregated.engines.nexo ?? []) as Array<Record<string, unknown>>;
  if (raw.length === 0) return;

  const nodes = raw.filter(d => d._type === "nexo_node") as Array<Record<string, unknown>>;
  if (nodes.length === 0) return;

  const dataPoints: ApoloDataPoint[] = [];

  dataPoints.push({
    label:  "Nodos de conocimiento estratégico (weight ≥ 0.6)",
    value:  String(nodes.length),
    trend:  "up",
    engine: "nexo",
  });

  // Top 3 nodos por weight
  const sorted = [...nodes].sort((a, b) => Number(b.weight ?? 0) - Number(a.weight ?? 0));
  sorted.slice(0, 3).forEach(n => {
    const label = String(n.title ?? n.content ?? "Nodo").slice(0, 60);
    dataPoints.push({
      label:  label,
      value:  `Peso ${(Number(n.weight ?? 0) * 100).toFixed(0)}%`,
      trend:  "up",
      engine: "nexo",
    });
  });

  sections.push({
    id:         `nexo-${Date.now()}`,
    title:      "Conocimiento Estratégico — NEXO",
    body:       "",
    dataPoints,
    engine:     "nexo",
    order,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// AP-2: generateNarrative — Groq genera cuerpo narrativo por sección + summary
// ══════════════════════════════════════════════════════════════════════════════

async function generateNarrative(
  sections:    ApoloReportSection[],
  type:        ReportType,
  period:      { from: number; to: number },
  clientName?: string
): Promise<{ sections: ApoloReportSection[]; summary: string }> {
  const periodLabel =
    new Date(period.from).toLocaleDateString("es-MX", { month: "long", day: "numeric" }) +
    " al " +
    new Date(period.to).toLocaleDateString("es-MX", { month: "long", day: "numeric", year: "numeric" });

  const clientCtx = clientName ? `Cliente: ${clientName}.` : "Uso interno.";

  // ── Generar body por sección en paralelo ─────────────────────────────────
  const enriched = await Promise.all(sections.map(async (sec) => {
    const dpLines = sec.dataPoints
      .map(dp => `• ${dp.label}: ${dp.value}${dp.trend ? ` (tendencia: ${dp.trend})` : ""}`)
      .join("\n");

    const prompt =
      `Eres APOLO, motor de inteligencia de negocios de SOFIAA OS.\n` +
      `Genera una narrativa ejecutiva para la sección "${sec.title}" del reporte.\n` +
      `${clientCtx} Período: ${periodLabel}.\n\n` +
      `Datos disponibles:\n${dpLines}\n\n` +
      `Instrucciones:\n` +
      `- 2 párrafos concisos en español ejecutivo, orientados al cliente\n` +
      `- Interpreta los datos, no los repitas literalmente\n` +
      `- Lenguaje profesional de consultoría de negocios\n` +
      `- Sin emojis, sin markdown, solo texto plano\n` +
      `- Máximo 180 palabras`;

    const body = await callGroq(prompt, { maxTokens: 300, temperature: 0.4 });
    return { ...sec, body: body ?? `Análisis de ${sec.title} para el período ${periodLabel}.` };
  }));

  // ── Resumen ejecutivo global ──────────────────────────────────────────────
  const typeLabels: Record<ReportType, string> = {
    weekly_summary:       "Resumen Semanal",
    campaign_performance: "Rendimiento de Campaña",
    project_status:       "Estado de Proyectos",
    quality_report:       "Reporte de Calidad",
    executive_brief:      "Brief Ejecutivo",
    strategic_outlook:    "Outlook Estratégico",
  };

  const sectionDigest = enriched
    .map(s => `${s.title}: ${s.body.slice(0, 120)}…`)
    .join("\n");

  const summaryPrompt =
    `Eres APOLO. Genera un resumen ejecutivo de máximo 120 palabras para este reporte.\n` +
    `Tipo: ${typeLabels[type]}. ${clientCtx} Período: ${periodLabel}.\n\n` +
    `Secciones del reporte:\n${sectionDigest}\n\n` +
    `El resumen debe ser una visión integral del estado del negocio.\n` +
    `Español ejecutivo. Sin markdown. Sin emojis.`;

  const summary = await callGroq(summaryPrompt, { maxTokens: 200, temperature: 0.3 });
  const fallbackSummary =
    `Reporte ${typeLabels[type]} generado el ${new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}. ` +
    `Contiene ${sections.length} sección(es) analizadas por APOLO.`;

  return { sections: enriched, summary: summary ?? fallbackSummary };
}

// ══════════════════════════════════════════════════════════════════════════════
// AP-2: applyThemisGate — THEMIS evalúa si el reporte es seguro para "ready"
// ══════════════════════════════════════════════════════════════════════════════

async function applyThemisGate(
  userId:    string,
  reportId:  string,
  type:      ReportType,
  sections:  ApoloReportSection[]
): Promise<{ approved: boolean; verdictId?: string }> {
  try {
    const response = await evaluateAction({
      actionId:      `apolo-report-${reportId}`,
      actionType:    "generate_report",
      actionPayload: {
        reportId,
        type,
        sectionCount:  sections.length,
        engines:       [...new Set(sections.map(s => s.engine))],
      },
      requestedBy: "apolo",
      userId,
      context: {
        extensionId: "apolo",
        activePath:  "/apolo",
      },
    });

    return {
      approved:  response.approved,
      verdictId: response.verdict.id,
    };
  } catch (err) {
    // THEMIS no bloquea la operación si falla — el reporte queda en "draft"
    console.error("[APOLO][themisGate] error:", err);
    return { approved: false };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// AP-2: generateReport — pipeline completo con Groq + THEMIS
// ══════════════════════════════════════════════════════════════════════════════

export async function generateReport(
  userId:  string,
  options: {
    type:         ReportType;
    workspaceId?: string;
    clientName?:  string;
    period?:      { from: number; to: number };
  }
): Promise<ApoloReport> {
  const period = options.period ?? defaultPeriod();

  // 1. Agregar datos de engines + construir secciones estructuradas
  const aggregated = await aggregateEngineData(userId, options.type, period);
  const rawSections = buildSections(aggregated, options.type);

  const titleMap: Record<ReportType, string> = {
    weekly_summary:       "Resumen Semanal",
    campaign_performance: "Rendimiento de Campaña",
    project_status:       "Estado de Proyectos",
    quality_report:       "Reporte de Calidad",
    executive_brief:      "Brief Ejecutivo",
    strategic_outlook:    "Outlook Estratégico",
  };

  const periodLabel =
    new Date(period.from).toLocaleDateString("es-MX", { month: "short", day: "numeric" }) +
    " – " +
    new Date(period.to).toLocaleDateString("es-MX", { month: "short", day: "numeric", year: "numeric" });

  // 2. Generar narrativa Groq por sección + resumen ejecutivo
  const { sections, summary } = await generateNarrative(
    rawSections,
    options.type,
    period,
    options.clientName
  );

  // 3. Persistir en Firestore (draft primero, se actualiza después del gate)
  const ref = adminDb.collection(`users/${userId}/apolo_reports`).doc();
  const reportId = ref.id;

  // 4. Evaluar con THEMIS
  const gate = await applyThemisGate(userId, reportId, options.type, sections);

  const report: ApoloReport = {
    id:              reportId,
    userId,
    workspaceId:     options.workspaceId,
    type:            options.type,
    title:           `${titleMap[options.type]} · ${periodLabel}`,
    clientName:      options.clientName,
    period,
    sections,
    summary,
    status:          gate.approved ? "ready" : "draft",
    themisApproved:  gate.approved,
    themisVerdictId: gate.verdictId,
    generatedAt:     Date.now(),
  };

  await ref.set({ ...report, _serverTs: FieldValue.serverTimestamp() });

  return report;
}

// ══════════════════════════════════════════════════════════════════════════════
// AP-5: Chat Integration (shell — implementación en AP-5)
// ══════════════════════════════════════════════════════════════════════════════

export async function getApoloContext(
  userId: string
): Promise<ApoloContextSummary | null> {
  try {
    const snap = await adminDb
      .collection(`users/${userId}/apolo_reports`)
      .where("status", "==", "ready")
      .orderBy("generatedAt", "desc")
      .limit(1)
      .get();

    if (snap.empty) return null;

    const data = snap.docs[0].data() as ApoloReport;
    return {
      reportId:    data.id,
      type:        data.type,
      title:       data.title,
      summary:     data.summary,
      period:      data.period,
      generatedAt: data.generatedAt,
    };
  } catch {
    return null;
  }
}

export function buildApoloBlock(ctx: ApoloContextSummary | null): string {
  if (!ctx) return "";
  const periodLabel =
    new Date(ctx.period.from).toLocaleDateString("es-MX", { month: "short", day: "numeric" }) +
    " – " +
    new Date(ctx.period.to).toLocaleDateString("es-MX", { month: "short", day: "numeric" });
  // Truncar resumen a 150 chars para no saturar el contexto
  const summarySnippet = ctx.summary.length > 150
    ? ctx.summary.slice(0, 150) + "..."
    : ctx.summary;
  return (
    `\n\nÚLTIMO REPORTE APOLO — ${ctx.title} (${periodLabel}): ${summarySnippet}` +
    ` → ir a /apolo/reportes para el detalle completo.`
  );
}
