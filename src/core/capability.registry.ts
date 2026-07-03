/**
 * SOFIAA Sprint E — Capability Registry
 *
 * Catálogo de capabilities disponibles por extensión.
 * Agnóstico de fuente — cada capability declara su providerType y config.
 *
 * Para agregar una nueva capability: agregar una entrada al array CAPABILITY_REGISTRY.
 */

import type { CapabilityDefinition } from "@/core/capability.runtime";

// ── Catálogo ───────────────────────────────────────────────────────────────

export const CAPABILITY_REGISTRY: CapabilityDefinition[] = [
  // ── TEC BI ──────────────────────────────────────────────────────────────
  {
    id:           "ConsultarClientes",
    label:        "Consultar lista y métricas de clientes internos",
    extensionId:  "tec-bi",
    providerType: "firestore",
    providerConfig: { collection: "clientes_internos" },
    requiredRoles: ["admin", "gerente", "analista"],
    outputSchema: {
      resumen:  "Conteo de clientes activos, estado de contratos y distribución por categoría",
      metricas: ["total_clientes", "clientes_activos", "clientes_en_riesgo"],
      insights: ["clientes sin actividad reciente", "categoría con mayor crecimiento"],
    },
  },
  {
    id:           "ResumenProveedores",
    label:        "Evaluación y calificación de proveedores",
    extensionId:  "tec-bi",
    providerType: "firestore",
    providerConfig: { collection: "proveedores" },
    requiredRoles: ["admin", "gerente"],
    outputSchema: {
      resumen:  "Calificación promedio, proveedores activos y alertas de cumplimiento",
      metricas: ["calificacion_promedio", "proveedores_activos", "alertas_activas"],
      insights: ["proveedores con calificación crítica", "tendencia últimos 30 días"],
    },
  },
  {
    id:           "ResumenROI",
    label:        "Análisis de ROI y costos por proyecto",
    extensionId:  "tec-bi",
    providerType: "firestore",
    providerConfig: { collection: "proyectos" },
    requiredRoles: ["admin", "gerente"],
    outputSchema: {
      resumen:  "ROI promedio, costo total y proyectos sobre/bajo presupuesto",
      metricas: ["roi_promedio", "costo_total", "proyectos_sobre_presupuesto"],
      insights: ["proyectos con mejor ROI", "áreas de optimización de costos"],
    },
  },
  {
    id:           "ResumenEmpleados",
    label:        "Métricas del equipo — headcount, evaluaciones y asistencia",
    extensionId:  "tec-bi",
    providerType: "firestore",
    providerConfig: { collection: "empleados" },
    requiredRoles: ["admin", "gerente"],
    outputSchema: {
      resumen:  "Headcount activo, promedio de evaluaciones y alertas de asistencia",
      metricas: ["headcount_activo", "promedio_evaluacion", "ausencias_mes"],
      insights: ["empleados con evaluación baja", "áreas con mayor rotación"],
    },
  },
  {
    id:           "ResumenBriefs",
    label:        "Estado de briefs y proyectos activos",
    extensionId:  "tec-bi",
    providerType: "firestore",
    providerConfig: { collection: "briefs" },
    requiredRoles: ["admin", "gerente", "analista"],
    outputSchema: {
      resumen:  "Briefs en progreso, completados y bloqueados",
      metricas: ["briefs_activos", "briefs_completados", "briefs_bloqueados"],
      insights: ["briefs con fecha vencida", "áreas con mayor carga de trabajo"],
    },
  },

  // ── Marketing Sofia ──────────────────────────────────────────────────────
  {
    id:           "MarketingClientes",
    label:        "Clientes activos de la agencia y sus presupuestos",
    extensionId:  "marketing-sofia",
    providerType: "firestore",
    providerConfig: { collection: "ms_clientes" },
    requiredRoles: ["admin", "gerente"],
    outputSchema: {
      resumen:  "Total de clientes, presupuesto promedio mensual y distribución por sector",
      metricas: ["total_clientes", "presupuesto_promedio", "clientes_activos"],
      insights: ["cliente con mayor presupuesto", "sector con más clientes"],
    },
  },
  {
    id:           "MarketingMetricas",
    label:        "Métricas de campañas: alcance, engagement y conversiones",
    extensionId:  "marketing-sofia",
    providerType: "firestore",
    providerConfig: { collection: "ms_metricas" },
    requiredRoles: ["admin", "gerente"],
    outputSchema: {
      resumen:  "Alcance total, engagement rate promedio y conversiones del período",
      metricas: ["alcance_total", "engagement_rate", "conversiones"],
      insights: ["campaña con mejor rendimiento", "área de mejora detectada"],
    },
  },
  {
    id:           "MarketingFinanzas",
    label:        "Ingresos, gastos y utilidad de la agencia",
    extensionId:  "marketing-sofia",
    providerType: "firestore",
    providerConfig: { collection: "ms_finanzas" },
    requiredRoles: ["admin"],
    outputSchema: {
      resumen:  "Ingresos vs gastos del período, utilidad neta y margen",
      metricas: ["ingresos_total", "gastos_total", "utilidad_neta"],
      insights: ["mes con mayor ingreso", "rubros de mayor gasto"],
    },
  },

  // ── Búsqueda detallada — cross-extension ─────────────────────────────────
  {
    id:           "BuscarRegistro",
    label:        "Buscar un registro específico por nombre o campo en cualquier colección",
    extensionId:  "tec-bi",   // el gateway admin ya ignora este campo
    providerType: "firestore",
    providerConfig: { collection: "" }, // se sobreescribe via params.collection
    requiredRoles: ["admin"],
    outputSchema: {
      resumen:  "Detalle completo del registro encontrado",
      metricas: ["registros_encontrados"],
      insights: ["campos relevantes del registro"],
    },
  },
];

// ── Resolvers ──────────────────────────────────────────────────────────────

export function resolveCapability(id: string): CapabilityDefinition | null {
  return CAPABILITY_REGISTRY.find(c => c.id === id) ?? null;
}

export function getCapabilitiesForExtension(extensionId: string): CapabilityDefinition[] {
  return CAPABILITY_REGISTRY.filter(c => c.extensionId === extensionId);
}

/**
 * Genera el bloque de menú de capabilities para el system prompt.
 * extensionId = "*" → incluye TODAS las capabilities (para admin desde cualquier ruta).
 * El LLM conoce qué puede pedir — pero no cómo ni de dónde.
 */
export function buildCapabilityMenuBlock(extensionId: string): string {
  const caps = extensionId === "*"
    ? CAPABILITY_REGISTRY.filter(c => c.id !== "BuscarRegistro") // BuscarRegistro se explica aparte
    : getCapabilitiesForExtension(extensionId);

  if (caps.length === 0) return "";

  // Agrupar por extensión cuando es vista de admin (*)
  let lines: string;
  if (extensionId === "*") {
    const byExt: Record<string, CapabilityDefinition[]> = {};
    for (const c of caps) {
      (byExt[c.extensionId] ??= []).push(c);
    }
    lines = Object.entries(byExt)
      .map(([ext, defs]) => `  [${ext}]\n${defs.map(d => `    - ${d.id}: ${d.label}`).join("\n")}`)
      .join("\n");
  } else {
    lines = caps.map(c => `  - ${c.id}: ${c.label}`).join("\n");
  }

  const buscarNota = extensionId === "*"
    ? "\n  - BuscarRegistro: Buscar un registro específico por nombre (ej: cliente 'Acme', proveedor 'LogiCorp'). Requiere params: {collection: 'nombre_coleccion', campo: 'nombre', valor: 'X'}"
    : "";

  return `\n\nCAPACIDADES DE DATOS DISPONIBLES:\nPuedes solicitar datos en tiempo real usando la función request_capability con uno de estos IDs:\n${lines}${buscarNota}\n\nÚsalas cuando el usuario pida información específica que no está en tu conocimiento base. Cuando el usuario pregunte de datos empresariales, SIEMPRE usa estas capabilities en lugar de sugerir navegar a una extensión.`;
}
