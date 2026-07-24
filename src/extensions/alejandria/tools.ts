/**
 * ALEJANDRÍA — Extension Tools
 * Sprint AJ-4 · Herramientas de búsqueda en la memoria histórica
 *
 * Tools expuestos al LLM:
 *   - buscar_en_alejandria         búsqueda semántica por query libre
 *   - listar_modulos_sofiaa        catálogo de módulos con descripción
 *   - buscar_decision_arquitectura filtro por tipo decision_arquitectura
 */

import { ExtensionToolRegistry, ExtensionContext } from "@/types/sofiaa-platform";
import { semanticSearchAlejandria }                from "@/lib/alejandria/search";
import { getNodesByTipo, getNodesByModulo }        from "@/lib/alejandria/firestore";
import type { AlejandriaModulo }                   from "@/extensions/alejandria/schema";

// ── Catálogo estático de módulos ──────────────────────────────────────────────

const MODULOS_SOFIAA: Record<AlejandriaModulo, string> = {
  SOFIAA:     "Sistema operativo de IA central. Orquesta todos los módulos, gestiona sesiones, historial y el flujo conversacional con el usuario.",
  NEXO:       "Motor de memoria persistente. Almacena hechos, contactos, proyectos y conocimiento del usuario en Firestore con búsqueda semántica (embeddings).",
  PROMETEO:   "Motor de razonamiento profundo. Ejecuta reflexiones multi-paso, análisis complejos y síntesis de información usando modelos de alta capacidad.",
  NORA:       "Módulo de bienestar y seguimiento emocional. Registra el estado de ánimo del usuario, ofrece soporte y detecta patrones de bienestar a lo largo del tiempo.",
  HERMES:     "Bus de mensajería e integración. Conecta SOFIAA con servicios externos (email, calendario, APIs) y gestiona webhooks y notificaciones.",
  ATENA:      "Módulo de Six Sigma y calidad industrial. Implementa metodología DMAIC, SPC, AMEF y análisis estadístico para proyectos de mejora de procesos.",
  TEC_BII:    "Extensión de inteligencia de negocios técnica. Análisis de datos, dashboards y métricas operacionales para equipos técnicos.",
  ALEJANDRIA: "Memoria histórica de ingeniería. Knowledge Graph de decisiones, sprints, especificaciones y evolución técnica del propio sistema SOFIAA.",
  LIVE_SDK:   "SDK de integración en tiempo real. Permite embeber capacidades de SOFIAA en aplicaciones externas mediante WebSockets y API streaming.",
};

// ── Implementaciones ──────────────────────────────────────────────────────────

async function buscar_en_alejandria(
  args: Record<string, unknown>,
  ctx:  ExtensionContext,
): Promise<string> {
  const query = String(args.query ?? "").trim();
  if (!query) return "Error: el parámetro `query` es obligatorio.";

  const limit  = Math.min(Number(args.limit ?? 5), 10);
  const uid    = ctx.userId;
  if (!uid || uid === "anonymous") return "Error: se requiere sesión autenticada.";

  const results = await semanticSearchAlejandria(uid, query, limit);
  if (results.length === 0) {
    return `No encontré documentos relevantes para: "${query}". El corpus puede no contener información sobre ese tema.`;
  }

  const lines = results.map((r, i) => {
    const n = r.node;
    const score = (r.score * 100).toFixed(1);
    const modulos = n.modulos_afectados?.join(", ") ?? "—";
    const sprint  = n.sprint_referencia ? ` · Sprint ${n.sprint_referencia}` : "";
    return [
      `${i + 1}. [${n.tipo.toUpperCase()}] ${n.titulo} (${score}% relevancia)`,
      `   Fecha: ${n.fecha}${sprint} · Módulos: ${modulos}`,
      `   ${n.resumen}`,
    ].join("\n");
  });

  return [
    `ALEJANDRÍA — ${results.length} resultado(s) para: "${query}"`,
    "",
    ...lines,
  ].join("\n");
}

async function listar_modulos_sofiaa(
  _args: Record<string, unknown>,
  _ctx:  ExtensionContext,
): Promise<string> {
  const lines = (Object.entries(MODULOS_SOFIAA) as [AlejandriaModulo, string][])
    .map(([modulo, desc]) => `• ${modulo}: ${desc}`);

  return [
    "SOFIAA OS — Catálogo de Módulos",
    "",
    ...lines,
    "",
    `Total: ${lines.length} módulos registrados en el sistema.`,
  ].join("\n");
}

async function buscar_decision_arquitectura(
  args: Record<string, unknown>,
  ctx:  ExtensionContext,
): Promise<string> {
  const uid = ctx.userId;
  if (!uid || uid === "anonymous") return "Error: se requiere sesión autenticada.";

  // Si hay query, usar búsqueda semántica filtrada; si hay módulo, filtrar por módulo
  const query  = String(args.query  ?? "").trim();
  const modulo = String(args.modulo ?? "").trim().toUpperCase() as AlejandriaModulo;

  let nodes = modulo && modulo in MODULOS_SOFIAA
    ? await getNodesByModulo(uid, modulo)
    : await getNodesByTipo(uid, "decision_arquitectura");

  // Filtrar solo decisiones si vino de getNodesByModulo
  nodes = nodes.filter(n => n.tipo === "decision_arquitectura");

  if (nodes.length === 0) {
    const ctx2 = modulo ? ` para el módulo ${modulo}` : "";
    return `No hay decisiones de arquitectura registradas${ctx2}.`;
  }

  // Si hay query libre, re-rankear semánticamente
  if (query) {
    const allResults = await semanticSearchAlejandria(uid, query, 20);
    const decisionIds = new Set(nodes.map(n => n.id));
    nodes = allResults
      .filter(r => decisionIds.has(r.node.id))
      .map(r => r.node)
      .slice(0, 8);
  } else {
    nodes = nodes.slice(0, 8);
  }

  const lines = nodes.map((n, i) => {
    const modulos = n.modulos_afectados?.join(", ") ?? "—";
    const sprint  = n.sprint_referencia ? ` · Sprint ${n.sprint_referencia}` : "";
    const decs    = n.decisiones?.slice(0, 2).map(d =>
      `     → ${d.decision} (${d.justificacion.slice(0, 80)}...)`
    ).join("\n") ?? "";

    return [
      `${i + 1}. ${n.titulo} [${n.fecha}${sprint}]`,
      `   Módulos: ${modulos}`,
      `   ${n.resumen}`,
      decs,
    ].filter(Boolean).join("\n");
  });

  const header = modulo
    ? `ALEJANDRÍA — Decisiones de arquitectura · ${modulo}`
    : "ALEJANDRÍA — Decisiones de arquitectura";

  return [header, "", ...lines].join("\n");
}

// ── Registry ──────────────────────────────────────────────────────────────────

export const alejandriaTools: ExtensionToolRegistry = {
  tools: [
    {
      name: "buscar_en_alejandria",
      description:
        "Busca en la memoria histórica de ingeniería de SOFIAA (ALEJANDRÍA). " +
        "Usa búsqueda semántica sobre sprints, decisiones de arquitectura, especificaciones de módulos, " +
        "brainstormings y experimentos. Úsala cuando el usuario pregunte sobre cómo funciona SOFIAA, " +
        "por qué se tomó una decisión técnica, qué se hizo en un sprint, o cómo está implementado un módulo.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type:        "string",
            description: "Pregunta o tema a buscar en la memoria histórica. Texto libre en español.",
          },
          limit: {
            type:        "number",
            description: "Máximo de resultados a retornar (1–10). Por defecto 5.",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "listar_modulos_sofiaa",
      description:
        "Retorna el catálogo completo de módulos de SOFIAA OS con sus descripciones. " +
        "Úsala cuando el usuario pregunte qué módulos existen, cuántos son, o quiera un overview del sistema.",
      parameters: {
        type:       "object",
        properties: {},
        required:   [],
      },
    },
    {
      name: "buscar_decision_arquitectura",
      description:
        "Filtra y retorna decisiones de arquitectura del corpus ALEJANDRÍA. " +
        "Más específico que buscar_en_alejandria: solo retorna documentos de tipo decisión técnica. " +
        "Úsala cuando el usuario pregunte por qué se eligió una tecnología, patrón o enfoque, " +
        "o quiera ver las decisiones de diseño de un módulo específico.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type:        "string",
            description: "Búsqueda libre sobre el tipo de decisión. Opcional si se provee módulo.",
          },
          modulo: {
            type:        "string",
            description: "Filtrar decisiones por módulo: SOFIAA, NEXO, PROMETEO, NORA, HERMES, ATENA, TEC_BII, ALEJANDRIA, LIVE_SDK.",
          },
        },
        required: [],
      },
    },
  ],

  handler: async (toolName, args, ctx) => {
    switch (toolName) {
      case "buscar_en_alejandria":
        return buscar_en_alejandria(args, ctx);
      case "listar_modulos_sofiaa":
        return listar_modulos_sofiaa(args, ctx);
      case "buscar_decision_arquitectura":
        return buscar_decision_arquitectura(args, ctx);
      default:
        throw new Error(`[ALEJANDRÍA] Tool desconocida: ${toolName}`);
    }
  },
};
