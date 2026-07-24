/**
 * ALEJANDRÍA — Memoria Histórica de Ingeniería de SOFIAA OS
 * Sprint AJ-0 · Schema y tipos base
 *
 * ALEJANDRÍA es la capa de autoconocimiento de SOFIAA:
 * convierte la documentación histórica del proyecto en un Knowledge Graph
 * de decisiones, sprints, módulos e ideas — reutilizando la infraestructura
 * de embeddings de N.E.X.O. pero en su propia colección Firestore.
 *
 * Colección Firestore:
 *   users/{uid}/alejandria_nodos/{nodeId}
 *
 * El corpus fuente vive en:
 *   /alejandria_corpus/fase_1|2/{tipo}/
 */

// ── Tipo de nodo ──────────────────────────────────────────────────────────────

/**
 * Tipo de documento en el corpus.
 * Refleja la carpeta y la naturaleza del contenido.
 */
export type AlejandriaNodeType =
  | "sprint"                // reporte de sprint completado o en curso
  | "decision_arquitectura" // decisión técnica con alternativas y justificación
  | "brainstorming"         // lluvia de ideas, propuestas, exploraciones
  | "especificacion_modulo" // especificación técnica de un módulo SOFIAA
  | "experimento"           // hipótesis, resultado, aprendizaje
  | "hito"                  // milestone relevante del proyecto
  | "idea";                 // concepto suelto aún no implementado

// ── Módulos del sistema ───────────────────────────────────────────────────────

export type AlejandriaModulo =
  | "SOFIAA"
  | "NEXO"
  | "PROMETEO"
  | "NORA"
  | "HERMES"
  | "ATENA"
  | "TEC_BII"
  | "ALEJANDRIA"
  | "LIVE_SDK";

// ── Sub-tipos del schema ──────────────────────────────────────────────────────

export interface AlejandriaDecision {
  /** Qué se decidió */
  decision: string;
  /** Qué problema motivó la decisión */
  contexto: string;
  /** Alternativas que se descartaron y por qué */
  alternativas_descartadas: string[];
  /** Razón principal de la decisión tomada */
  justificacion: string;
  /** Qué cambió en el sistema como resultado */
  consecuencias: string;
}

export interface AlejandriaConcepto {
  /** Nombre del concepto (ej: Event Sourcing, CTQ, Knowledge Graph) */
  concepto: string;
  /** Definición en contexto SOFIAA — no genérica */
  definicion: string;
  /** Módulos relacionados */
  relacion_modulos: AlejandriaModulo[];
}

export interface AlejandriaHito {
  /** Qué se logró o intentó */
  hito: string;
  resultado: "exitoso" | "fallido" | "parcial" | "pendiente";
  /** Qué se aprendió, qué funcionó o qué falló */
  aprendizaje: string;
}

// ── Nodo principal ────────────────────────────────────────────────────────────

/**
 * AlejandriaNode — unidad de conocimiento de ingeniería.
 *
 * Almacenado en: users/{uid}/alejandria_nodos/{nodeId}
 *
 * El campo `texto_embedding` contiene el contenido comprimido
 * del documento original, optimizado para búsqueda semántica.
 * El campo `embedding` guarda el vector generado por el motor
 * de embeddings (se popula en Sprint AJ-1 durante la ingestión).
 */
export interface AlejandriaNode {
  // ── Identificación ──────────────────────────────────────────────────────────
  id:           string;    // formato: {tipo}_{modulo}_{descripcion}_{fecha}
  uid:          string;    // propietario (uid de Firebase Auth)

  // ── Clasificación ───────────────────────────────────────────────────────────
  tipo:         AlejandriaNodeType;
  fecha:        string;    // YYYY-MM-DD del documento original
  fase_corpus:  string;    // "fase_1" | "fase_2"

  // ── Contenido semántico ─────────────────────────────────────────────────────
  titulo:       string;
  resumen:      string;    // 2-4 oraciones densas en info — lo que SOFIAA lee

  // ── Clasificación cruzada ───────────────────────────────────────────────────
  modulos_afectados:     AlejandriaModulo[];
  sprint_referencia:     string | null;   // "A-9", "H-4", null
  version_sofiaa:        string | null;   // "1.0", "1.1.4", null

  // ── Conocimiento estructurado ───────────────────────────────────────────────
  decisiones:            AlejandriaDecision[];
  conceptos_clave:       AlejandriaConcepto[];
  hitos:                 AlejandriaHito[];
  preguntas_que_responde: string[];
  tags:                  string[];

  // ── Para búsqueda semántica ─────────────────────────────────────────────────
  texto_embedding:       string;      // texto comprimido, max ~1500 palabras
  embedding?:            number[];    // vector generado en AJ-1 (Gemini embeddings)

  // ── Proveniencia ────────────────────────────────────────────────────────────
  documento_original:    string;      // nombre del archivo fuente
  procesado_por:         string;      // "claude" | "gemini" | "extractor-deterministico"

  // ── Telemetría de uso ───────────────────────────────────────────────────────
  reinforceCount:        number;      // veces que este nodo fue recuperado en contexto

  // ── Timestamps ──────────────────────────────────────────────────────────────
  createdAt:             number;      // epoch ms — cuando se ingestó
  updatedAt:             number;      // epoch ms — última actualización
}

// ── Colección Firestore ───────────────────────────────────────────────────────

/** Tipo de colección de ALEJANDRÍA */
export type AlejandriaCollection = "alejandria_nodos";

/** Path de la colección principal */
export const alejandriaNodesCol = (uid: string): string =>
  `users/${uid}/alejandria_nodos`;

// ── Contexto para inyección en el chat ───────────────────────────────────────

/**
 * Nodo de contexto simplificado — se inyecta en el prompt de SOFIAA.
 * Solo los campos que aportan valor semántico directo.
 */
export interface AlejandriaContextNode {
  id:       string;
  tipo:     AlejandriaNodeType;
  titulo:   string;
  resumen:  string;
  fecha:    string;
  modulos:  AlejandriaModulo[];
  score:    number;    // relevancia calculada (0-1)
}

export interface AlejandriaContext {
  nodes:      AlejandriaContextNode[];
  totalFound: number;
  query:      string;
}

// ── Resultado de búsqueda ─────────────────────────────────────────────────────

export interface AlejandriaSearchResult {
  node:  AlejandriaNode;
  score: number;
}

// ── Stats para el Centro de Mando ─────────────────────────────────────────────

export interface AlejandriaStats {
  totalNodos:        number;
  porTipo:           Record<AlejandriaNodeType, number>;
  modulosCubiertos:  AlejandriaModulo[];
  decisionesTotal:   number;
  ultimaActualizacion: number;
}

// ── Helpers de display ────────────────────────────────────────────────────────

export const TIPO_LABELS: Record<AlejandriaNodeType, { label: string; icon: string }> = {
  sprint:                { label: "Sprint",              icon: "🚀" },
  decision_arquitectura: { label: "Decisión",            icon: "⚖️" },
  brainstorming:         { label: "Brainstorming",       icon: "💡" },
  especificacion_modulo: { label: "Especificación",      icon: "📐" },
  experimento:           { label: "Experimento",         icon: "🧪" },
  hito:                  { label: "Hito",                icon: "🏁" },
  idea:                  { label: "Idea",                icon: "✨" },
};

export const MODULO_LABELS: Record<AlejandriaModulo, { color: string; bg: string }> = {
  SOFIAA:     { color: "#7c3aed", bg: "#4c1d9520" },
  NEXO:       { color: "#0891b2", bg: "#083344" },
  PROMETEO:   { color: "#f97316", bg: "#431407" },
  NORA:       { color: "#ec4899", bg: "#4a044e" },
  HERMES:     { color: "#a78bfa", bg: "#2e1065" },
  ATENA:      { color: "#60a5fa", bg: "#0d0d18" },
  TEC_BII:    { color: "#34d399", bg: "#022c22" },
  ALEJANDRIA: { color: "#fbbf24", bg: "#451a03" },
  LIVE_SDK:   { color: "#94a3b8", bg: "#0f172a" },
};
