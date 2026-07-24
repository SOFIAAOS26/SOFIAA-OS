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
  | "food"           // restaurantes, recetas, platillos
  | "work"           // artículos, herramientas, proyectos profesionales
  | "travel"         // lugares, hoteles, itinerarios
  | "shopping"       // productos, comparaciones, precios
  | "research"       // papers, noticias, investigación
  | "social"         // posts de redes sociales, personas
  | "media"          // videos, podcasts, entretenimiento
  | "brand_identity" // Brand DNA, identidad de marca — PROMETEO (Sprint P-1)
  | "other";         // fallback

// ── Fuente de la captura ──────────────────────────────────────────────────────

export type NexoSource =
  | "chrome_extension"  // extensión de Chrome
  | "pwa_share"         // PWA Share Target mobile
  | "screenshot"        // imagen / captura de pantalla via Gemini Vision
  | "manual"            // pegado manual en el chat
  | "pdf_library"       // documento PDF subido a la biblioteca (Sprint M-1)
  | "tec_bii"           // entidades TEC Bii publicadas al grafo (Sprint T2-1)
  | "prometeo"          // Brand DNA y entidades PROMETEO (Sprint P-1)
  | "marketing_sofia";  // clientes y métricas SMM publicadas al grafo (Sprint P-8)

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

export type NexoNodeType = "captured" | "insight";

export interface NexoNode {
  /** ID único — formato: "nexo:{category}:{slug}" */
  id:              string;
  /**
   * Tipo de nodo.
   * "captured" — capturado por el usuario (default si ausente)
   * "insight"  — generado por el Reflection Engine (Sprint M-0)
   */
  type?:           NexoNodeType;
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
  /**
   * Número de veces que el nodo fue seleccionado por el Attention Engine.
   * Aumenta cuando el nodo es inyectado en el contexto de una conversación.
   * Sprint M-2.
   */
  reinforceCount?: number;
  /**
   * Embedding semántico del nodo (título + resumen) generado por Gemini text-embedding-004.
   * Usado por el Semantic Retrieval Engine (Sprint M-4) para ranking por similitud coseno.
   * Ausente en nodos anteriores a M-4 — el sistema hace fallback a ranking por peso.
   */
  embedding?: number[];
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
  /**
   * IDs de los nodos que fueron seleccionados para esta llamada.
   * El Attention Engine (Sprint M-2) usa esto para reforzar solo los nodos que SOFIAA usó.
   */
  nodeIds: string[];
  /**
   * Nodos con hybridScore ≥ NEXO_PROACTIVE_THRESHOLD.
   * SOFIAA los menciona explícitamente en su respuesta (Proactive Surface, Sprint M-5).
   * Subconjunto de topNodes — máximo 2 para no saturar el prompt.
   */
  proactiveNodes: NexoContextNode[];
  /**
   * Score híbrido más alto visto en esta query (útil para analytics y debug).
   * Sprint M-5.
   */
  topScore: number;
}

export interface NexoContextNode {
  title:    string;
  category: NexoCategory;
  summary:  string;
  weight:   number;
  /** Días desde la última captura */
  daysAgo:  number;
  /** URL original del nodo (para que el LLM genere links correctos) */
  url?:     string | null;
}

// ── Biblioteca de documentos PDF (Sprint M-1) ─────────────────────────────────

/**
 * Documento en la biblioteca personal de SOFIAA.
 * Almacenado en: users/{uid}/biblioteca/{docId}
 */
export interface BibliotecaDoc {
  /** ID único — formato: "bib:{slugname}:{timestamp}" */
  id:           string;
  /** Título extraído por Gemini del documento */
  title:        string;
  /** Nombre original del archivo */
  filename:     string;
  /** Autor detectado (puede ser vacío) */
  author:       string;
  /** Tamaño en bytes */
  sizeBytes:    number;
  /** Número de nodos N.E.X.O. creados */
  nodesCreated: number;
  /** Estado del procesamiento */
  status:       "processing" | "processed" | "error";
  /** Timestamp de procesamiento completo */
  processedAt:  number;
  /** Timestamp de creación del documento */
  createdAt:    number;
  /** Mensaje de error si status === "error" */
  errorMsg?:    string;
}

// ── Constantes ────────────────────────────────────────────────────────────────

export const NEXO_COLLECTION = "nexo_nodes" as const;
export const NEXO_INITIAL_WEIGHT    = 0.60;
export const NEXO_DECAY_RATE        = 0.05;
export const NEXO_PRUNE_THRESHOLD   = 0.05;
export const NEXO_MAX_CONTEXT_NODES = 5;
/**
 * Umbral de hybridScore para activar la superficie proactiva (Sprint M-5).
 * Nodos con score ≥ 0.65 son mencionados explícitamente por SOFIAA.
 */
export const NEXO_PROACTIVE_THRESHOLD = 0.65;
/** Máximo de nodos proactivos por request — evita saturar el prompt. */
export const NEXO_MAX_PROACTIVE_NODES = 2;

/** Días sin referencia para cada categoría antes de considerar decay agresivo */
export const NEXO_DECAY_DAYS: Record<NexoCategory, number> = {
  work:           30, // trabajo decae más lento — sigue siendo relevante
  research:       30,
  brand_identity: 90, // identidad de marca es estable — muy baja tasa de cambio
  travel:         21,
  food:           14, // comida es más volátil
  shopping:       14,
  social:         10,
  media:          10,
  other:          14,
};
