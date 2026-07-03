/**
 * SOFIAA Sprint G-2 — Agent Tools
 *
 * Los tres tools que el AgentRuntime puede ejecutar en el loop ReAct.
 * Cada tool implementa AgentTool y wrappea infraestructura ya existente
 * en lugar de reinventarla.
 *
 *   query_data    → Capability Runtime (Firestore, Monday, REST, Mock)
 *   search_memory → Memoria a largo plazo + historial de sesión
 *   analyze       → Sub-llamada LLM para análisis profundo de datos
 *
 * Filosofía:
 *   El LLM decide cuándo llamar cada tool.
 *   El tool devuelve SIEMPRE un string legible por el LLM.
 *   Errores → string descriptivo (nunca throw) para que el LLM continúe.
 */

import type { AgentContext, AgentTool } from "./agent.types";

// ── Tipos auxiliares (inline para no crear dependencias circulares) ─────────

interface CapabilityResultPayload {
  resumen?: string;
  metricas?: Record<string, number | string>;
  insights?: string[];
  error?: string;
}

// ── Tool 1: query_data ─────────────────────────────────────────────────────

/**
 * Consulta una capability empresarial via el Capability Gateway.
 * El agente puede solicitar datos de clientes, proyectos, empleados, etc.
 * Los permisos se validan server-side por el gateway.
 */
export const queryDataTool: AgentTool = {
  name: "query_data",
  description:
    "Consulta datos empresariales en tiempo real: clientes, proyectos, proveedores, " +
    "empleados, métricas financieras o KPIs. Úsalo cuando necesites información " +
    "específica que no está en el historial de conversación.",

  parameters: {
    type: "object",
    properties: {
      capability_id: {
        type: "string",
        description:
          "ID de la capability a consultar " +
          "(ej: ConsultarClientes, ResumenROI, ResumenEmpleados, ResumenBriefs, ResumenProveedores)",
      },
      filtros: {
        type: "string",
        description:
          "Filtros opcionales en lenguaje natural " +
          "(ej: 'activos', 'del último mes', 'con monto > 10000')",
      },
    },
    required: ["capability_id"],
  },

  async execute(params, ctx: AgentContext): Promise<string> {
    const capId   = String(params.capability_id ?? "").trim();
    const filtros = params.filtros ? String(params.filtros) : undefined;

    if (!capId) return "Error: se requiere capability_id para consultar datos.";

    try {
      const body = JSON.stringify({
        capability_id: capId,
        params: filtros ? { filtros } : undefined,
        userId:      ctx.userId,
        userRole:    ctx.userRole,
        extensionId: ctx.extensionId,
        activePath:  ctx.activePath,
      });

      const res = await fetch("/api/capability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => res.statusText);
        return `Error al consultar ${capId}: ${res.status} ${txt}`;
      }

      const data = (await res.json()) as CapabilityResultPayload;

      if (data.error) return `Error en ${capId}: ${data.error}`;

      // Formatear resultado como texto legible para el LLM
      const parts: string[] = [];
      if (data.resumen)   parts.push(data.resumen);
      if (data.metricas && Object.keys(data.metricas).length > 0) {
        const metricLines = Object.entries(data.metricas)
          .map(([k, v]) => `  - ${k}: ${v}`)
          .join("\n");
        parts.push(`Métricas:\n${metricLines}`);
      }
      if (data.insights && data.insights.length > 0) {
        parts.push(`Insights:\n${data.insights.map(i => `  • ${i}`).join("\n")}`);
      }

      return parts.length > 0
        ? parts.join("\n\n")
        : `${capId} respondió sin datos disponibles.`;

    } catch (err) {
      return `Error de red al consultar ${capId}: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
};

// ── Tool 2: search_memory ──────────────────────────────────────────────────

/**
 * Busca en la memoria a largo plazo y el historial de conversación actual.
 * Útil cuando el agente necesita contexto de sesiones anteriores
 * o quiere encontrar si el usuario ya explicó algo antes.
 */
export const searchMemoryTool: AgentTool = {
  name: "search_memory",
  description:
    "Busca en la memoria acumulada del usuario: historial de conversaciones previas, " +
    "preferencias guardadas y contexto de sesiones anteriores. " +
    "Úsalo cuando necesites recordar algo que el usuario mencionó antes.",

  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Qué buscar en la memoria (ej: 'presupuesto', 'preferencias de diseño', 'nombre de proyecto')",
      },
      scope: {
        type: "string",
        enum: ["long_term", "session", "both"],
        description:
          "Dónde buscar: long_term (memoria persistente), session (conversación actual), both (ambas)",
      },
    },
    required: ["query"],
  },

  async execute(params, ctx: AgentContext): Promise<string> {
    const query = String(params.query ?? "").trim().toLowerCase();
    const scope = String(params.scope ?? "both");

    if (!query) return "Error: se requiere una query para buscar en memoria.";

    const results: string[] = [];

    // ── Long-term memory (localStorage — solo disponible en cliente) ───
    if (scope === "long_term" || scope === "both") {
      try {
        // En Edge runtime, localStorage no existe — recuperar del contexto si viene en systemContent
        const longMem = ctx.systemContent.includes("MEMORIA")
          ? ctx.systemContent
              .split("\n")
              .filter(l => l.toLowerCase().includes(query))
              .join("\n")
              .trim()
          : "";

        if (longMem) {
          results.push(`[Memoria larga]\n${longMem.slice(0, 500)}`);
        } else if (scope === "long_term") {
          results.push("[Memoria larga] No se encontraron referencias relevantes.");
        }
      } catch {
        results.push("[Memoria larga] No accesible en este contexto.");
      }
    }

    // ── Session history ─────────────────────────────────────────────────
    if (scope === "session" || scope === "both") {
      const sessionHits = ctx.messages
        .filter(m => m.role === "user" && m.content.toLowerCase().includes(query))
        .slice(-5); // máximo 5 mensajes relevantes

      if (sessionHits.length > 0) {
        const hitText = sessionHits
          .map(m => `  "${m.content.slice(0, 200)}"`)
          .join("\n");
        results.push(`[Sesión actual — ${sessionHits.length} mensaje(s) relevante(s)]\n${hitText}`);
      } else if (scope === "session") {
        results.push("[Sesión actual] No se encontraron mensajes con ese término.");
      }
    }

    return results.length > 0
      ? results.join("\n\n")
      : `No se encontraron referencias a "${query}" en la memoria disponible.`;
  },
};

// ── Tool 3: analyze ────────────────────────────────────────────────────────

/**
 * Lanza una sub-llamada LLM para análisis profundo sobre datos ya recopilados.
 * Ideal para comparar opciones, extraer conclusiones o redactar síntesis
 * sin mezclar el razonamiento interno con el output al usuario.
 */
export const analyzeTool: AgentTool = {
  name: "analyze",
  description:
    "Realiza un análisis profundo sobre datos o texto proporcionado. " +
    "Úsalo para comparar opciones, detectar patrones, extraer conclusiones " +
    "o redactar una síntesis estructurada antes de responder al usuario.",

  parameters: {
    type: "object",
    properties: {
      data: {
        type: "string",
        description: "Los datos o texto a analizar (máx ~2000 caracteres para ser eficiente)",
      },
      instruction: {
        type: "string",
        description:
          "Qué análisis realizar " +
          "(ej: 'compara y ordena por rentabilidad', 'identifica riesgos', 'resume en 3 puntos clave')",
      },
    },
    required: ["data", "instruction"],
  },

  async execute(params, _ctx: AgentContext): Promise<string> {
    const data        = String(params.data ?? "").trim().slice(0, 2000);
    const instruction = String(params.instruction ?? "").trim();

    if (!data)        return "Error: se requieren datos para analizar.";
    if (!instruction) return "Error: se requiere una instrucción de análisis.";

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, instruction }),
      });

      if (!res.ok) {
        // Fallback: análisis básico sin llamada externa
        return `[Análisis local]\nDatos: ${data.slice(0, 300)}...\nInstrucción: ${instruction}\n(Análisis completo no disponible — continúa con los datos anteriores)`;
      }

      const result = await res.json() as { analysis?: string; error?: string };
      return result.analysis ?? result.error ?? "Sin resultado de análisis.";

    } catch (err) {
      // Análisis offline: el agente puede continuar con lo que tiene
      return (
        `[Análisis basado en contexto]\n` +
        `Datos recibidos: ${data.slice(0, 400)}\n` +
        `Instrucción: ${instruction}\n` +
        `(El servicio de análisis no respondió — usa los datos directamente para tu síntesis)`
      );
    }
  },
};

// ── Registro de todos los tools del agente ─────────────────────────────────

/**
 * Array de todos los AgentTools disponibles para el AgentRuntime.
 * Importar este array al instanciar AgentRuntime:
 *
 *   const runtime = new AgentRuntime(AGENT_TOOLS);
 */
export const AGENT_TOOLS: AgentTool[] = [
  queryDataTool,
  searchMemoryTool,
  analyzeTool,
];
