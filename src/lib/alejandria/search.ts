/**
 * ALEJANDRÍA — Motor de Búsqueda Semántica
 * Sprint AJ-2 · Cosine similarity + keyword boost + reinforceCount
 *
 * Flujo:
 *   1. Genera embedding del query con Gemini (gemini-embedding-001)
 *   2. Carga todos los nodos de Firestore (59 docs — caben en memoria)
 *   3. Rankea: cosine * 0.7 + keywordBoost * 0.2 + reinforceNorm * 0.1
 *   4. Devuelve top-K con score
 */

import { getAdminDb }         from "@/lib/firebase-admin";
import { alejandriaNodesCol } from "@/extensions/alejandria/schema";
import type {
  AlejandriaNode,
  AlejandriaSearchResult,
} from "@/extensions/alejandria/schema";

// ── Config ────────────────────────────────────────────────────────────────────

const GEMINI_EMBED_MODEL = "gemini-embedding-001";
const GEMINI_EMBED_URL   =
  `https://generativelanguage.googleapis.com/v1/models/${GEMINI_EMBED_MODEL}:embedContent`;

const SEMANTIC_W  = 0.70;
const KEYWORD_W   = 0.20;
const REINFORCE_W = 0.10;

const MAX_RESULTS = 8;

// ── Embedding del query ───────────────────────────────────────────────────────

export async function generateQueryEmbedding(
  query: string,
): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${GEMINI_EMBED_URL}?key=${apiKey}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model:   `models/${GEMINI_EMBED_MODEL}`,
        content: { parts: [{ text: query.slice(0, 9000) }] },
      }),
      // Timeout implícito de Next.js (30s en Edge, ilimitado en Node)
    });

    if (!res.ok) return null;

    const data = await res.json();
    const values = data?.embedding?.values;
    return Array.isArray(values) && values.length > 0 ? values : null;
  } catch {
    return null;
  }
}

// ── Cosine similarity ─────────────────────────────────────────────────────────

function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

// ── Keyword boost ─────────────────────────────────────────────────────────────

function keywordScore(node: AlejandriaNode, query: string): number {
  const q = query.toLowerCase();
  const terms = q.split(/\s+/).filter(t => t.length > 2);
  if (terms.length === 0) return 0;

  const searchText = [
    node.titulo,
    node.resumen,
    ...(node.tags ?? []),
    ...(node.modulos_afectados ?? []),
    ...(node.preguntas_que_responde ?? []),
  ].join(" ").toLowerCase();

  const hits = terms.filter(t => searchText.includes(t)).length;
  return hits / terms.length; // 0–1
}

// ── Búsqueda principal ────────────────────────────────────────────────────────

/**
 * Búsqueda semántica híbrida sobre la colección Alejandría.
 *
 * @param uid    Firebase UID del usuario
 * @param query  Texto libre del query
 * @param limit  Máximo de resultados (default: MAX_RESULTS)
 */
export async function semanticSearchAlejandria(
  uid:    string,
  query:  string,
  limit   = MAX_RESULTS,
): Promise<AlejandriaSearchResult[]> {
  // 1. Embedding del query (puede ser null si la API falla)
  const queryEmbedding = await generateQueryEmbedding(query);

  // 2. Traer todos los nodos (59 docs — viable en memoria)
  const snap = await getAdminDb()
    .collection(alejandriaNodesCol(uid))
    .get();

  if (snap.empty) return [];

  const nodes = snap.docs.map(d => ({ id: d.id, ...d.data() }) as AlejandriaNode);

  // 3. Normalizar reinforceCount para el score
  const maxReinforce = Math.max(...nodes.map(n => n.reinforceCount ?? 0), 1);

  // 4. Calcular score por nodo
  const scored: AlejandriaSearchResult[] = nodes.map(node => {
    const semantic   = queryEmbedding && node.embedding
      ? cosine(queryEmbedding, node.embedding)
      : 0;

    const keyword    = keywordScore(node, query);
    const reinforced = (node.reinforceCount ?? 0) / maxReinforce;

    // Cuando no hay embedding disponible, dar más peso al keyword
    const score = queryEmbedding
      ? semantic * SEMANTIC_W + keyword * KEYWORD_W + reinforced * REINFORCE_W
      : keyword * 0.80 + reinforced * 0.20;

    return { node, score };
  });

  // 5. Ordenar y devolver top-K
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter(r => r.score > 0); // excluir score cero (sin ninguna relación)
}

// ── Context para inyección en el prompt ───────────────────────────────────────

/**
 * Devuelve los nodos más relevantes para inyectar en el system prompt.
 * Reemplaza la implementación de keyword-only de AJ-0.
 */
export async function getSemanticAlejandriaContext(
  uid:   string,
  query: string,
  limit  = MAX_RESULTS,
): Promise<AlejandriaNode[]> {
  const results = await semanticSearchAlejandria(uid, query, limit);
  return results.map(r => r.node);
}
