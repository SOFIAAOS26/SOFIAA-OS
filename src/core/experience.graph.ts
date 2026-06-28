/**
 * SOFIAA Sprint D-E — Experience Graph
 *
 * Transforma la memoria lineal (string de texto) en un grafo estructurado
 * de conocimiento sobre el usuario — sus patrones, preferencias y recorrido.
 *
 * No es un grafo DB. Es un JSON enriquecido con semántica de grafo:
 * nodos (entidades) + aristas (relaciones) + pesos que decaen con el tiempo.
 *
 * Diferencia con sofiaa_long_memory (string plano):
 * - Antes: "El usuario habló de presupuesto el lunes" (texto difícil de consultar)
 * - Ahora: nodo topic:"presupuesto" → edge engaged_with → weight:0.82, decay
 *
 * El grafo alimenta al LLM con contexto estructurado, no anecdótico.
 */

// ── Tipos de nodo ─────────────────────────────────────────────────────────

export type NodeType =
  | "topic"       // área temática (presupuesto, producción, duelo, etc.)
  | "goal"        // objetivo completado o abandonado
  | "extension"   // extensión visitada (tec-bi, marketing-sofia, jp-memorial)
  | "preference"  // preferencia inferida (tono, detalle, idioma)
  | "entity";     // entidad nombrada (persona, proyecto, empresa)

export type EdgeType =
  | "engaged_with"  // usuario ↔ topic
  | "completed"     // usuario → goal completado
  | "abandoned"     // usuario → goal abandonado
  | "frequents"     // usuario → extension
  | "related_to"    // topic ↔ topic
  | "led_to"        // goal → extension (navegó después de este goal)
  | "prefers";      // usuario → preference

// ── Estructuras base ──────────────────────────────────────────────────────

export interface ExperienceNode {
  /** ID único — slug legible: "topic:presupuesto", "ext:tec-bi" */
  id:          string;
  type:        NodeType;
  /** Etiqueta legible para el LLM */
  label:       string;
  /** Peso de relevancia 0-1 (decae con el tiempo si no se refuerza) */
  weight:      number;
  /** Número total de interacciones */
  hits:        number;
  /** Timestamp de la primera aparición */
  createdAt:   number;
  /** Timestamp de la última interacción */
  lastSeenAt:  number;
  /** Metadatos opcionales según el tipo */
  meta?: Record<string, unknown>;
}

export interface ExperienceEdge {
  id:        string;
  from:      string; // nodeId
  to:        string; // nodeId
  type:      EdgeType;
  weight:    number;
  createdAt: number;
  updatedAt: number;
}

export interface ExperienceGraph {
  /** Versión del schema — para migraciones futuras */
  version:   number;
  userId:    string | null; // null = sesión anónima
  nodes:     Record<string, ExperienceNode>;
  edges:     Record<string, ExperienceEdge>;
  createdAt: number;
  updatedAt: number;
}

// ── Factory ───────────────────────────────────────────────────────────────

export function createGraph(userId: string | null = null): ExperienceGraph {
  return {
    version:   1,
    userId,
    nodes:     {},
    edges:     {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ── Operaciones sobre nodos ───────────────────────────────────────────────

/**
 * Agrega o refuerza un nodo.
 * Si ya existe, incrementa hits y recalcula el peso con decay.
 */
export function upsertNode(
  graph:   ExperienceGraph,
  id:      string,
  type:    NodeType,
  label:   string,
  meta?:   Record<string, unknown>
): ExperienceGraph {
  const now = Date.now();
  const existing = graph.nodes[id];

  if (existing) {
    // Refuerzo: peso sube, nunca supera 1
    const newWeight = Math.min(1, existing.weight + 0.12);
    return {
      ...graph,
      updatedAt: now,
      nodes: {
        ...graph.nodes,
        [id]: { ...existing, weight: newWeight, hits: existing.hits + 1, lastSeenAt: now },
      },
    };
  }

  return {
    ...graph,
    updatedAt: now,
    nodes: {
      ...graph.nodes,
      [id]: { id, type, label, weight: 0.40, hits: 1, createdAt: now, lastSeenAt: now, meta },
    },
  };
}

/**
 * Aplica decaimiento temporal a todos los nodos.
 * Llamar una vez por sesión al cargar el grafo.
 */
export function applyDecay(graph: ExperienceGraph, decayRate = 0.05): ExperienceGraph {
  const now = Date.now();
  const dayMs = 86_400_000;

  const decayedNodes = Object.fromEntries(
    Object.entries(graph.nodes).map(([id, node]) => {
      const daysSince = (now - node.lastSeenAt) / dayMs;
      const decayFactor = Math.pow(1 - decayRate, daysSince);
      const newWeight = Math.max(0.05, node.weight * decayFactor);
      return [id, { ...node, weight: parseFloat(newWeight.toFixed(3)) }];
    })
  );

  // Eliminar nodos irrelevantes (peso < 0.06 y hits < 2)
  const pruned = Object.fromEntries(
    Object.entries(decayedNodes).filter(([, n]) => n.weight >= 0.06 || n.hits >= 2)
  );

  return { ...graph, nodes: pruned, updatedAt: now };
}

// ── Operaciones sobre aristas ─────────────────────────────────────────────

export function upsertEdge(
  graph: ExperienceGraph,
  from:  string,
  to:    string,
  type:  EdgeType,
  weightBoost = 0.10
): ExperienceGraph {
  const now = Date.now();
  const edgeId = `${from}→${type}→${to}`;
  const existing = graph.edges[edgeId];

  if (existing) {
    return {
      ...graph,
      updatedAt: now,
      edges: {
        ...graph.edges,
        [edgeId]: {
          ...existing,
          weight: Math.min(1, existing.weight + weightBoost),
          updatedAt: now,
        },
      },
    };
  }

  return {
    ...graph,
    updatedAt: now,
    edges: {
      ...graph.edges,
      [edgeId]: { id: edgeId, from, to, type, weight: 0.35, createdAt: now, updatedAt: now },
    },
  };
}

// ── Detección de topics desde texto libre ─────────────────────────────────

const TOPIC_PATTERNS: Array<{ pattern: RegExp; label: string; id: string }> = [
  { pattern: /presupuesto|costo|precio|tarifa|cotiz/i,      id: "topic:presupuesto",    label: "Presupuesto" },
  { pattern: /producción|video|fotografía|filmación/i,      id: "topic:produccion_av",  label: "Producción AV" },
  { pattern: /brief|proyecto|propuesta/i,                   id: "topic:briefs",         label: "Briefs y Proyectos" },
  { pattern: /emplead|equipo|personal|staff/i,              id: "topic:equipo",         label: "Gestión de Equipo" },
  { pattern: /cliente|contrato|venta/i,                     id: "topic:clientes",       label: "Clientes" },
  { pattern: /marketing|redes|contenido|post|social/i,      id: "topic:marketing",      label: "Marketing Digital" },
  { pattern: /memorial|duelo|falleci|funeral|jardin/i,      id: "topic:memorial",       label: "JP Memorial" },
  { pattern: /roi|rentabilidad|retorno|impacto/i,           id: "topic:roi",            label: "ROI y Métricas" },
  { pattern: /monday|webhook|sincroniz|integraci/i,         id: "topic:integraciones",  label: "Integraciones" },
  { pattern: /ia|inteligencia artificial|modelo|llm/i,      id: "topic:ia",             label: "Inteligencia Artificial" },
  { pattern: /servidor|infraestructura|deploy|vercel/i,     id: "topic:infra",          label: "Infraestructura" },
  { pattern: /estrategia|plan|sprint|roadmap/i,             id: "topic:estrategia",     label: "Estrategia" },
];

/**
 * Extrae topics relevantes del texto del mensaje del usuario.
 */
export function detectTopics(text: string): Array<{ id: string; label: string }> {
  return TOPIC_PATTERNS
    .filter(({ pattern }) => pattern.test(text))
    .map(({ id, label }) => ({ id, label }));
}

// ── Detección de extensiones desde el path ────────────────────────────────

const EXTENSION_MAP: Record<string, { id: string; label: string }> = {
  "/tec-bi":          { id: "ext:tec-bi",          label: "TEC BI" },
  "/marketing-sofia": { id: "ext:marketing-sofia",  label: "Marketing Sofia" },
  "/jp-memorial":     { id: "ext:jp-memorial",      label: "JP Memorial" },
};

export function detectExtensionNode(activePath: string): { id: string; label: string } | null {
  for (const [prefix, ext] of Object.entries(EXTENSION_MAP)) {
    if (activePath.startsWith(prefix)) return ext;
  }
  return null;
}

// ── Consultas de alto nivel ───────────────────────────────────────────────

/** Devuelve los N nodos más relevantes de un tipo dado */
export function getTopNodes(
  graph:  ExperienceGraph,
  type:   NodeType,
  limit = 5
): ExperienceNode[] {
  return Object.values(graph.nodes)
    .filter(n => n.type === type)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}

/** Devuelve los vecinos directos de un nodo */
export function getNeighbors(
  graph:  ExperienceGraph,
  nodeId: string
): ExperienceNode[] {
  const neighborIds = Object.values(graph.edges)
    .filter(e => e.from === nodeId || e.to === nodeId)
    .map(e => e.from === nodeId ? e.to : e.from);

  return neighborIds
    .map(id => graph.nodes[id])
    .filter(Boolean);
}

/** Tamaño del grafo */
export function graphStats(graph: ExperienceGraph) {
  return {
    nodes:     Object.keys(graph.nodes).length,
    edges:     Object.keys(graph.edges).length,
    updatedAt: graph.updatedAt,
  };
}
