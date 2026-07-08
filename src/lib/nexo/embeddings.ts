/**
 * N.E.X.O. — Semantic Embedding Engine (Sprint M-4)
 *
 * Genera embeddings de texto usando Gemini text-embedding-004.
 * Usado para el Semantic Retrieval Engine: ranking por similitud coseno
 * entre la conversación actual y los nodos del grafo del usuario.
 *
 * Endpoint: POST /v1beta/models/text-embedding-004:embedContent
 * Dimensiones: 768 floats
 * Costo: ~$0.000025 / 1K tokens (mínimo)
 */

// ── Constantes ────────────────────────────────────────────────────────────────

const EMBEDDING_MODEL = "text-embedding-004";
const EMBEDDING_URL   = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${key}`;

/** Dimensiones del embedding de text-embedding-004 */
export const EMBEDDING_DIMS = 768;

// ── Generar embedding ─────────────────────────────────────────────────────────

/**
 * Genera un embedding vectorial para el texto dado.
 * Retorna null si la API falla — el sistema hace fallback a ranking por peso.
 *
 * @param text  Texto a embeber (título + resumen del nodo, o mensaje del usuario)
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  // Normalizar y truncar a ~2000 chars para no desperdiciar tokens
  const input = text.trim().slice(0, 2000);
  if (!input) return null;

  try {
    const res = await fetch(EMBEDDING_URL(apiKey), {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model:   `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text: input }] },
        taskType: "RETRIEVAL_DOCUMENT",
      }),
    });

    if (!res.ok) return null;

    const data = await res.json() as {
      embedding?: { values?: number[] };
    };

    return data.embedding?.values ?? null;
  } catch {
    return null;
  }
}

/**
 * Genera un embedding optimizado para queries de búsqueda.
 * Usa taskType RETRIEVAL_QUERY en lugar de RETRIEVAL_DOCUMENT.
 */
export async function generateQueryEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const input = text.trim().slice(0, 1000);
  if (!input) return null;

  try {
    const res = await fetch(EMBEDDING_URL(apiKey), {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model:   `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text: input }] },
        taskType: "RETRIEVAL_QUERY",
      }),
    });

    if (!res.ok) return null;

    const data = await res.json() as {
      embedding?: { values?: number[] };
    };

    return data.embedding?.values ?? null;
  } catch {
    return null;
  }
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
