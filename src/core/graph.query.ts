/**
 * SOFIAA Sprint D-E — Graph Query
 *
 * Interfaz de consulta del ExperienceGraph optimizada para el LLM.
 * Transforma el grafo en bloques de texto listos para inyectar en el system prompt.
 *
 * Principio: el LLM no recibe el grafo crudo — recibe resúmenes semánticos
 * concisos que informan sin sobrecargar el contexto.
 */

import type { ExperienceGraph } from "@/core/experience.graph";
import { getTopNodes } from "@/core/experience.graph";

// ── Query principal ───────────────────────────────────────────────────────

export interface GraphContext {
  /** Bloque de texto para inyectar en el system prompt */
  promptBlock: string;
  /** Topics más relevantes (para telemetría) */
  topTopics: string[];
  /** Extensiones más frecuentadas */
  topExtensions: string[];
  /** Tiene suficiente datos para ser útil */
  hasSignal: boolean;
}

/**
 * Genera el contexto completo del grafo para el LLM.
 * Se adapta al path activo para ser más relevante.
 */
export function buildGraphContext(
  graph:      ExperienceGraph,
  activePath?: string
): GraphContext {
  const topics     = getTopNodes(graph, "topic",      5);
  const extensions = getTopNodes(graph, "extension",  3);
  const goals      = getTopNodes(graph, "goal",       3);
  const prefs      = getTopNodes(graph, "preference", 3);

  const hasSignal = topics.length > 0 || extensions.length > 0 || goals.length > 0;

  if (!hasSignal) {
    return {
      promptBlock:   "",
      topTopics:     [],
      topExtensions: [],
      hasSignal:     false,
    };
  }

  const lines: string[] = [];

  // Temas de mayor interés del usuario
  if (topics.length > 0) {
    const topicList = topics
      .map(t => `${t.label} (×${t.hits})`)
      .join(", ");
    lines.push(`Áreas de mayor interés del usuario: ${topicList}.`);
  }

  // Extensiones frecuentadas — contexto de dónde opera normalmente
  if (extensions.length > 0) {
    const extList = extensions.map(e => e.label).join(", ");
    lines.push(`Extensiones que usa con frecuencia: ${extList}.`);
  }

  // Objetivos que ha completado
  const completedGoals = goals.filter(g => g.meta?.status === "completed");
  if (completedGoals.length > 0) {
    const goalList = completedGoals.map(g => g.label).join(", ");
    lines.push(`Ha completado estos objetivos: ${goalList}.`);
  }

  // Preferencias inferidas
  if (prefs.length > 0) {
    const prefList = prefs.map(p => p.label).join(", ");
    lines.push(`Preferencias detectadas: ${prefList}.`);
  }

  // Si estamos en una extensión específica, destacar afinidad
  if (activePath) {
    const extAffinity = getExtensionAffinity(graph, activePath);
    if (extAffinity > 0.6) {
      lines.push(`El usuario tiene alta familiaridad con esta extensión (afinidad: ${(extAffinity * 100).toFixed(0)}%).`);
    }
  }

  const promptBlock = lines.length > 0
    ? `\n\nCONTEXTO DE EXPERIENCIA DEL USUARIO:\n${lines.join("\n")}`
    : "";

  return {
    promptBlock,
    topTopics:     topics.map(t => t.label),
    topExtensions: extensions.map(e => e.label),
    hasSignal:     true,
  };
}

// ── Consultas específicas ─────────────────────────────────────────────────

/**
 * Nivel de afinidad del usuario con una extensión (0-1).
 * Basado en el peso del nodo de extensión y sus aristas.
 */
export function getExtensionAffinity(
  graph:      ExperienceGraph,
  activePath: string
): number {
  // Mapear path a id de nodo
  const pathToNodeId: Record<string, string> = {
    "/tec-bi":          "ext:tec-bi",
    "/marketing-sofia": "ext:marketing-sofia",
    "/jp-memorial":     "ext:jp-memorial",
  };

  const nodeId = Object.entries(pathToNodeId)
    .find(([prefix]) => activePath.startsWith(prefix))?.[1];

  if (!nodeId) return 0;

  const node = graph.nodes[nodeId];
  return node?.weight ?? 0;
}

/**
 * Devuelve los topics más relevantes para un mensaje específico.
 * Útil para enriquecer la detección de intención.
 */
export function getRelevantTopicsForMessage(
  graph:   ExperienceGraph,
  message: string
): string[] {
  const allTopics = getTopNodes(graph, "topic", 10);

  // Filtrar los que son semánticamente cercanos al mensaje
  return allTopics
    .filter(t => {
      const label = t.label.toLowerCase();
      const msg   = message.toLowerCase();
      return msg.includes(label) || label.split(" ").some(w => msg.includes(w));
    })
    .map(t => t.label);
}

/**
 * Devuelve el nivel de experiencia general del usuario (0-1).
 * 0 = usuario nuevo, 1 = usuario muy experimentado.
 */
export function getUserExperienceLevel(graph: ExperienceGraph): number {
  const totalNodes  = Object.keys(graph.nodes).length;
  const totalHits   = Object.values(graph.nodes).reduce((acc, n) => acc + n.hits, 0);
  const avgWeight   = totalNodes > 0
    ? Object.values(graph.nodes).reduce((acc, n) => acc + n.weight, 0) / totalNodes
    : 0;

  // Fórmula: combina volumen de interacción con peso promedio
  const rawScore = Math.min(1, (totalHits / 50) * 0.6 + avgWeight * 0.4);
  return parseFloat(rawScore.toFixed(2));
}

/**
 * Serialización mínima para enviar en el body del API request.
 * Solo los campos necesarios para buildGraphContext en el servidor.
 */
export function serializeGraphForAPI(graph: ExperienceGraph): {
  nodes: Record<string, { type: string; label: string; weight: number; hits: number; meta?: Record<string, unknown> }>;
} {
  const lightNodes = Object.fromEntries(
    Object.entries(graph.nodes)
      .filter(([, n]) => n.weight >= 0.15) // solo nodos con señal
      .map(([id, n]) => [id, {
        type:   n.type,
        label:  n.label,
        weight: n.weight,
        hits:   n.hits,
        meta:   n.meta,
      }])
  );

  return { nodes: lightNodes };
}
