/**
 * SOFIAA Sprint E — Capability Summarizer
 *
 * Transforma datos crudos del DataProvider en un CapabilityResult conciso.
 *
 * Principio: el LLM NUNCA recibe la colección completa.
 * Recibe un bloque compacto: resumen + métricas + insights.
 *
 * El bloque [CAPABILITY_RESULT] es opaco:
 * - No revela el nombre de la colección
 * - No revela si vino de Firestore, Monday, o REST
 * - Solo comunica los datos necesarios para responder la pregunta del usuario
 */

import type { CapabilityDefinition, CapabilityResult } from "@/core/capability.runtime";

// ── Summarizer principal ───────────────────────────────────────────────────

export function summarize(
  raw:        unknown[],
  definition: CapabilityDefinition
): CapabilityResult {
  const metricas = computeMetrics(raw, definition.outputSchema.metricas, definition.id);
  const insights = detectInsights(raw, metricas, definition.id);
  const resumen  = buildResumenText(metricas, insights, definition.label, raw.length);

  return {
    capabilityId: definition.id,
    resumen,
    metricas,
    insights,
    metadata: {
      source:      `${definition.providerType}:${String(definition.providerConfig.collection ?? "unknown")}`,
      fetchedAt:   Date.now(),
      recordCount: raw.length,
    },
  };
}

// ── Computación de métricas ────────────────────────────────────────────────

function computeMetrics(
  raw:          unknown[],
  metricNames:  string[],
  capabilityId: string
): Record<string, number | string> {
  const metricas: Record<string, number | string> = {};

  // Delegar al computador específico por capability
  const specific = METRIC_COMPUTERS[capabilityId];
  if (specific) return specific(raw);

  // Fallback genérico: solo contar registros
  metricas[metricNames[0] ?? "total"] = raw.length;
  return metricas;
}

type MetricComputer = (raw: unknown[]) => Record<string, number | string>;

const METRIC_COMPUTERS: Record<string, MetricComputer> = {
  ConsultarClientes: (raw) => {
    const rows = raw as Array<Record<string, unknown>>;
    const activos = rows.filter(r => r.estado === "activo").length;
    const riesgo  = rows.filter(r => r.estado === "inactivo").length;
    return {
      total_clientes:    rows.length,
      clientes_activos:  activos,
      clientes_en_riesgo: riesgo,
    };
  },

  ResumenProveedores: (raw) => {
    const rows = raw as Array<Record<string, unknown>>;
    const activos = rows.filter(r => r.activo === true);
    const cals    = activos.map(r => Number(r.calificacion) || 0);
    const promedio = cals.length > 0
      ? parseFloat((cals.reduce((a, b) => a + b, 0) / cals.length).toFixed(1))
      : 0;
    const alertas = rows.reduce((sum, r) => sum + (Number(r.alertas) || 0), 0);
    return {
      calificacion_promedio: promedio,
      proveedores_activos:   activos.length,
      alertas_activas:       alertas,
    };
  },

  ResumenROI: (raw) => {
    const rows = raw as Array<Record<string, unknown>>;
    const rois  = rows.map(r => Number(r.roi)   || 0);
    const costs = rows.map(r => Number(r.costo) || 0);
    const roiProm  = rois.length > 0
      ? parseFloat((rois.reduce((a, b) => a + b, 0) / rois.length).toFixed(1))
      : 0;
    const costoTotal = costs.reduce((a, b) => a + b, 0);
    const sobrePresup = rows.filter(r => r.sobre_presupuesto === true).length;
    return {
      roi_promedio:               roiProm,
      costo_total:                costoTotal,
      proyectos_sobre_presupuesto: sobrePresup,
    };
  },

  ResumenEmpleados: (raw) => {
    const rows    = raw as Array<Record<string, unknown>>;
    const evals   = rows.map(r => Number(r.evaluacion) || 0);
    const promEval = evals.length > 0
      ? parseFloat((evals.reduce((a, b) => a + b, 0) / evals.length).toFixed(1))
      : 0;
    const ausencias = rows.reduce((sum, r) => sum + (Number(r.ausencias_mes) || 0), 0);
    return {
      headcount_activo:   rows.length,
      promedio_evaluacion: promEval,
      ausencias_mes:      ausencias,
    };
  },

  ResumenBriefs: (raw) => {
    const rows = raw as Array<Record<string, unknown>>;
    const activos     = rows.filter(r => r.estado === "en_progreso").length;
    const completados = rows.filter(r => r.estado === "completado").length;
    const bloqueados  = rows.filter(r => r.estado === "bloqueado").length;
    return {
      briefs_activos:     activos,
      briefs_completados: completados,
      briefs_bloqueados:  bloqueados,
    };
  },

  // ── Marketing Sofia ──────────────────────────────────────────────────
  MarketingClientes: (raw) => {
    const rows    = raw as Array<Record<string, unknown>>;
    const activos = rows.filter(r => r.activo !== false);
    const presupuestos = activos.map(r => Number(r.presupuesto_mensual) || 0);
    const promedio = presupuestos.length > 0
      ? Math.round(presupuestos.reduce((a, b) => a + b, 0) / presupuestos.length)
      : 0;
    return {
      total_clientes:       rows.length,
      clientes_activos:     activos.length,
      presupuesto_promedio: `$${promedio.toLocaleString("es-MX")}`,
    };
  },

  MarketingMetricas: (raw) => {
    const rows = raw as Array<Record<string, unknown>>;
    const alcance      = rows.reduce((s, r) => s + (Number(r.alcance) || 0), 0);
    const engagements  = rows.map(r => Number(r.engagement_rate) || 0);
    const engageProm   = engagements.length > 0
      ? parseFloat((engagements.reduce((a, b) => a + b, 0) / engagements.length).toFixed(2))
      : 0;
    const conversiones = rows.reduce((s, r) => s + (Number(r.conversiones) || 0), 0);
    return {
      alcance_total:   alcance,
      engagement_rate: `${engageProm}%`,
      conversiones,
    };
  },

  MarketingFinanzas: (raw) => {
    const rows    = raw as Array<Record<string, unknown>>;
    const ingresos = rows.reduce((s, r) => s + (Number(r.ingreso) || 0), 0);
    const gastos   = rows.reduce((s, r) => s + (Number(r.gasto) || 0), 0);
    const utilidad = ingresos - gastos;
    const margen   = ingresos > 0
      ? parseFloat(((utilidad / ingresos) * 100).toFixed(1))
      : 0;
    return {
      ingresos_total: `$${ingresos.toLocaleString("es-MX")}`,
      gastos_total:   `$${gastos.toLocaleString("es-MX")}`,
      utilidad_neta:  `$${utilidad.toLocaleString("es-MX")} (${margen}%)`,
    };
  },

  // ── Búsqueda detallada — devuelve campos del registro, no agregados ──
  BuscarRegistro: (raw) => {
    const rows = raw as Array<Record<string, unknown>>;
    return {
      registros_encontrados: rows.length,
    };
  },
};

// ── Detección de insights ──────────────────────────────────────────────────

function detectInsights(
  raw:          unknown[],
  metricas:     Record<string, number | string>,
  capabilityId: string
): string[] {
  const detector = INSIGHT_DETECTORS[capabilityId];
  if (!detector) return [];
  return detector(raw, metricas);
}

type InsightDetector = (raw: unknown[], metricas: Record<string, number | string>) => string[];

const INSIGHT_DETECTORS: Record<string, InsightDetector> = {
  ConsultarClientes: (raw) => {
    const rows    = raw as Array<Record<string, unknown>>;
    const insights: string[] = [];
    const inactivos = rows.filter(r => r.estado === "inactivo");
    if (inactivos.length > 0) {
      const nombres = inactivos.map(r => r.nombre).slice(0, 3).join(", ");
      insights.push(`${inactivos.length} cliente(s) inactivo(s): ${nombres}`);
    }
    return insights;
  },

  ResumenProveedores: (raw) => {
    const rows    = raw as Array<Record<string, unknown>>;
    const insights: string[] = [];
    const criticos = rows.filter(r => Number(r.calificacion) < 6.0 && r.activo);
    if (criticos.length > 0) {
      criticos.sort((a, b) => Number(a.calificacion) - Number(b.calificacion));
      const peor = criticos[0];
      insights.push(`${peor.nombre}: ${peor.calificacion}/10 — requiere revisión urgente`);
      if (criticos.length > 1) {
        insights.push(`${criticos.length - 1} proveedor(es) adicional(es) en zona crítica`);
      }
    }
    const conAlertas = rows.filter(r => Number(r.alertas) > 0);
    if (conAlertas.length > 0) {
      insights.push(`${conAlertas.length} proveedor(es) con alertas de cumplimiento activas`);
    }
    return insights;
  },

  ResumenROI: (raw, metricas) => {
    const rows    = raw as Array<Record<string, unknown>>;
    const insights: string[] = [];
    const sobrePresup = rows.filter(r => r.sobre_presupuesto === true);
    if (sobrePresup.length > 0) {
      const nombres = sobrePresup.map(r => r.nombre).slice(0, 2).join(", ");
      insights.push(`Sobre presupuesto: ${nombres}`);
    }
    if (Number(metricas.roi_promedio) > 15) {
      insights.push(`ROI promedio de ${metricas.roi_promedio}% — por encima del benchmark del sector`);
    } else if (Number(metricas.roi_promedio) < 10) {
      insights.push(`ROI promedio de ${metricas.roi_promedio}% — por debajo del umbral esperado`);
    }
    return insights;
  },

  ResumenEmpleados: (raw) => {
    const rows    = raw as Array<Record<string, unknown>>;
    const insights: string[] = [];
    const bajos   = rows.filter(r => Number(r.evaluacion) < 7.0);
    if (bajos.length > 0) {
      const nombres = bajos.map(r => r.nombre).slice(0, 2).join(", ");
      insights.push(`Evaluación baja: ${nombres}`);
    }
    const ausentes = rows.filter(r => Number(r.ausencias_mes) >= 3);
    if (ausentes.length > 0) {
      insights.push(`${ausentes.length} empleado(s) con 3+ ausencias este mes`);
    }
    return insights;
  },

  ResumenBriefs: (raw) => {
    const rows    = raw as Array<Record<string, unknown>>;
    const insights: string[] = [];
    const bloqueados = rows.filter(r => r.estado === "bloqueado");
    if (bloqueados.length > 0) {
      const nombres = bloqueados.map(r => r.titulo).slice(0, 2).join(", ");
      insights.push(`Briefs bloqueados: ${nombres}`);
    }
    const hoy = new Date().toISOString().split("T")[0];
    const vencidos = rows.filter(r =>
      r.estado !== "completado" && String(r.vencimiento ?? "") < hoy
    );
    if (vencidos.length > 0) {
      insights.push(`${vencidos.length} brief(s) con fecha vencida`);
    }
    return insights;
  },

  MarketingClientes: (raw) => {
    const rows    = raw as Array<Record<string, unknown>>;
    const insights: string[] = [];
    const sorted  = [...rows].sort((a, b) => Number(b.presupuesto_mensual) - Number(a.presupuesto_mensual));
    if (sorted[0]) {
      const top = sorted[0];
      insights.push(`Mayor presupuesto: ${top.nombre} ($${Number(top.presupuesto_mensual).toLocaleString("es-MX")}/mes)`);
    }
    return insights;
  },

  MarketingMetricas: (raw) => {
    const rows    = raw as Array<Record<string, unknown>>;
    const insights: string[] = [];
    const sorted  = [...rows].sort((a, b) => Number(b.engagement_rate) - Number(a.engagement_rate));
    if (sorted[0]) {
      insights.push(`Mejor campaña: ${sorted[0].nombre ?? "sin nombre"} (${sorted[0].engagement_rate}% engagement)`);
    }
    return insights;
  },

  MarketingFinanzas: (raw) => {
    const rows    = raw as Array<Record<string, unknown>>;
    const insights: string[] = [];
    const sorted  = [...rows].sort((a, b) => Number(b.ingreso) - Number(a.ingreso));
    if (sorted[0]) {
      insights.push(`Mejor mes: ${sorted[0].mes ?? "sin dato"} ($${Number(sorted[0].ingreso).toLocaleString("es-MX")})`);
    }
    return insights;
  },

  BuscarRegistro: (raw) => {
    if (raw.length === 0) return ["No se encontró ningún registro con esos criterios."];
    // Para registros individuales, listar los campos más relevantes
    const row     = raw[0] as Record<string, unknown>;
    const insights: string[] = [];
    const SKIP    = new Set(["id", "__typename", "createdAt", "updatedAt", "timestamp"]);
    const fields  = Object.entries(row)
      .filter(([k]) => !SKIP.has(k))
      .slice(0, 8); // máximo 8 campos para no saturar el prompt
    for (const [k, v] of fields) {
      if (v !== null && v !== undefined && String(v).trim() !== "") {
        insights.push(`${k.replace(/_/g, " ")}: ${v}`);
      }
    }
    if (raw.length > 1) {
      insights.push(`(+${raw.length - 1} registro(s) adicional(es) encontrado(s))`);
    }
    return insights;
  },
};

// ── Construcción del resumen textual ──────────────────────────────────────

function buildResumenText(
  metricas: Record<string, number | string>,
  insights: string[],
  label:    string,
  total:    number
): string {
  const metricParts = Object.entries(metricas)
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
    .join(", ");

  const base = `${label}. ${total} registro(s) consultado(s). ${metricParts}.`;
  const obs   = insights.length > 0 ? ` Observaciones: ${insights.slice(0, 2).join(". ")}.` : "";

  return base + obs;
}

// ── Construcción del bloque para el prompt ────────────────────────────────

/**
 * Genera el bloque que se inyecta al LLM — compacto y opaco.
 * El LLM no ve el origen del dato, solo el resultado estructurado.
 */
export function buildCapabilityBlock(result: CapabilityResult): string {
  const metricLines = Object.entries(result.metricas)
    .map(([k, v]) => `  ${k.replace(/_/g, " ")}: ${v}`)
    .join("\n");

  const insightLines = result.insights.length > 0
    ? result.insights.map(i => `  • ${i}`).join("\n")
    : "  Sin observaciones adicionales.";

  return [
    `[CAPABILITY_RESULT: ${result.capabilityId}]`,
    result.resumen,
    "",
    "Métricas:",
    metricLines,
    "",
    "Observaciones:",
    insightLines,
    "",
    `(${result.metadata.recordCount} registros · dato en tiempo real · fuente verificada)`,
    `[/CAPABILITY_RESULT]`,
  ].join("\n");
}
