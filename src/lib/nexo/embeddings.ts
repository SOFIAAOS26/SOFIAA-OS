/**
 * N.E.X.O. — Semantic Embedding Engine (Sprint M-4)
 *
 * NOTA: Groq no ofrece endpoint de embeddings.
 * Estas funciones retornan null → el sistema hace fallback a ranking por peso (hybridScore).
 * Si en el futuro se añade un proveedor de embeddings, aquí se integra.
 *
 * El fallback de peso puro está implementado en hybridScore() y getSemanticNexoContext().
 */

/** Dimensiones del embedding (referencia, actualmente no se generan) */
export const EMBEDDING_DIMS = 3072;

/**
 * Genera un embedding vectorial.
 * Actualmente retorna null — el sistema usa ranking por peso como fallback.
 */
export async function generateEmbedding(_text: string): Promise<number[] | null> {
  return null;
}

/**
 * Genera un embedding para queries de búsqueda.
 * Actualmente retorna null — el sistema usa ranking por peso como fallback.
 */
export async function generateQueryEmbedding(_text: string): Promise<number[] | null> {
  return null;
}

// ── Similitud coseno ──────────────────────────────────────────────────────────

/**
 * Calcula la similitud coseno entre dos vectores.
 * Retorna un valor entre -1 y 1 (en la práctica, 0–1 para embeddings de texto).
 * Retorna 0 si alguno de los vectores es nulo o de distinta dimensión.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot  = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ── Score híbrido ─────────────────────────────────────────────────────────────

/**
 * Combina similitud semántica y peso del nodo en un score final.
 *
 * score = semantic * SEMANTIC_WEIGHT + weight * WEIGHT_FACTOR
 *
 * Si no hay embedding disponible (nodo pre-M-4), usa solo el peso.
 */
const SEMANTIC_WEIGHT = 0.65;
const WEIGHT_FACTOR   = 0.35;

export function hybridScore(
  queryEmbedding: number[] | null,
  nodeEmbedding:  number[] | undefined,
  nodeWeight:     number,
): number {
  // Sin embeddings → fallback a peso puro
  if (!queryEmbedding || !nodeEmbedding) return nodeWeight;

  const semantic = cosineSimilarity(queryEmbedding, nodeEmbedding);
  return semantic * SEMANTIC_WEIGHT + nodeWeight * WEIGHT_FACTOR;
}
