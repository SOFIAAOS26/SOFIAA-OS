/**
 * N.E.X.O. — Nexus Extension de Conocimiento y Operaciones
 * Sprint N-0 · Contratos y tipos base
 *
 * N.E.X.O. es la capa de ingesta de contexto real de SOFIAA.
 * Convierte lo que el usuario ve en internet en conocimiento estructurado
 * que SOFIAA recuerda, decae con el tiempo y usa proactivamente.
 */

// ── Categorías de contenido capturado ────────────────────────────────────────

export type NexoCategory =
  | "food"       // restaurantes, recetas, platillos
  | "work"       // artículos, herramientas, proyectos profesionales
  | "travel"     // lugares, hoteles, itinerarios
  | "shopping"   // productos, comparaciones, precios
  | "research"   // papers, noticias, investigación
  | "social"     // posts de redes sociales, personas
  | "media"      // videos, podcasts, entretenimiento
  | "other";     // fallback

// ── Fuente de la captura ──────────────────────────────────────────────────────

export type NexoSource =
  | "chrome_extension"  // extensión de Chrome
  | "pwa_share"         // PWA Share Target mobile
  | "screenshot"        // imagen / captura de pantalla via Gemini Vision
  | "manual";           // pegado manual en el chat

// ── Payload que llega al endpoint /api/nexo/ingest ────────────────────────────

export interface NexoIngestPayload {
  /** URL de la página capturada (puede ser null para screenshots) */
  url:         string | null;
  /** Título de la página o post */
  title:       string;
  /** Texto extraído del DOM o del OCR */
  text:        string;
  /** URL pública de imagen principal (opcional) */
  imageUrl?:   string;
  /** Base64 de screenshot (solo en fuente "screenshot") */
  imageBase64?: string;
  /** Fuente de la captura */
  source:      NexoSource;
  /** Timestamp del cliente (ms) */
  capturedAt:  number;
}

// ── Nodo N.E.X.O. en el ExperienceGraph ──────────────────────────────────────

export interface NexoNode {
  /** ID único — formato: "nexo:{category}:{slug}" */
  id:              string;
  /** Categoría semántica */
  category:        NexoCategory;
  /** Título legible para el LLM */
  title:           string;
  /** Resumen semántico extraído por el LLM (~100 palabras) */
  summary:         string;
  /** Entidades clave: lugar, persona, producto, precio, hashtags */
  entities:        NexoEntities;
  /** URL original */
  url:             string | null;
  /** URL de imagen representativa */
  imageUrl:        string | null;
  /** Fuente de captura */
  source:          NexoSource;
  /**
   * Peso de relevancia 0.0 → 1.0
   * Decae exponencialmente con el tiempo si no se referencia.
   * Empieza en 0.6 para capturas nuevas.
   */
  weight:          number;
  /**
   * Score de importancia asignado en ingesta por el LLM.
   * 0.0 = basura / spam, 1.0 = contenido muy relevante para el usuario.
   */
  importanceScore: number;
  /** Tasa de decaimiento individual. Default: 0.05 (65% en 21 días) */
  decayRate:       number;
  /** Timestamp de la última vez que SOFIAA lo referenció en conversación */
  lastReinforced:  number;
  /** Timestamp de la captura original */
  capturedAt:      number;
  /** Timestamp de creación en Firestore */
  createdAt:       number;
}

// ── Entidades extraídas del contenido ────────────────────────────────────────

export interface NexoEntities {
  /** Lugar mencionado (restaurante, ciudad, hotel, etc.) */
  place?:    string;
  /** Persona mencionada */
  person?:   string;
  /** Producto o servicio */
  product?:  string;
  /** Precio detectado */
  price?:    string;
  /** Hashtags encontrados */
  hashtags?: string[];
  /** Marca o negocio */
  brand?:    string;
  /** Cualquier otro dato estructurado */
  extra?:    Record<string, string>;
}

// ── Evento de pipeline N.E.X.O. (para N.O.R.A) ───────────────────────────────

export interface NexoEvent {
  id:              string;
  userId:          string;
  nodeId:          string;
  action:          "captured" | "reinforced" | "decayed" | "pruned";
  source:          NexoSource;
  category:        NexoCategory;
  importanceScore: number;
  tokensUsed:      number;
  durationMs:      number;
  timestamp:       number;
}

// ── Respuesta del endpoint /api/nexo/ingest ───────────────────────────────────

export interface NexoIngestResponse {
  success:    boolean;
  nodeId:     string;
  category:   NexoCategory;
  importanceScore: number;
  summary:    string;
  entities:   NexoEntities;
  /** Milisegundos que tardó el procesamiento */
  durationMs: number;
}

// ── Contexto que se inyecta al system prompt de SOFIAA ───────────────────────

export interface NexoContext {
  /** Top nodos por peso, ya comprimidos para el LLM */
  topNodes: NexoContextNode[];
  /** Total de nodos activos en el grafo del usuario */
  totalNodes: number;
  /** Clusters de intereses detectados */
  clusters: string[];
}

export interface NexoContextNode {
  title:    string;
  category: NexoCategory;
  summary:  string;
  weight:   number;
  /** Días desde la última captura */
  daysAgo:  number;
}

// ── Constantes ────────────────────────────────────────────────────────────────

export const NEXO_COLLECTION = "nexo_nodes" as const;
export const NEXO_INITIAL_WEIGHT   = 0.60;
export const NEXO_DECAY_RATE       = 0.05;
export const NEXO_PRUNE_THRESHOLD  = 0.05;
export const NEXO_MAX_CONTEXT_NODES = 5;

/** Días sin referencia para cada categoría antes de considerar decay agresivo */
export const NEXO_DECAY_DAYS: Record<NexoCategory, number> = {
  work:     30, // trabajo decae más lento — sigue siendo relevante
  research: 30,
  travel:   21,
  food:     14, // comida es más volátil
  shopping: 14,
  social:   10,
  media:    10,
  other:    14,
};
