/**
 * SOFIAA Sprint F-2 — Semantic Cache
 *
 * Capa de cache por similitud vectorial sobre el exact-match cache existente.
 * Usa embeddings de Gemini text-embedding-004 (768 dims) + cosine similarity.
 *
 * Flujo:
 *   1. getCachedResponse() → exact match O(1)        ← ya existía
 *   2. getSemanticCache()  → vector search O(n)      ← NUEVO (esta capa)
 *   3. fetch /api/chat     → LLM call                ← fallback final
 *
 * Storage: localStorage bajo "sofiaa_semantic_cache"
 * Threshold de similitud: 0.92 (muy conservador — solo hits realmente similares)
 * Máx entradas: 60 (cada embedding = ~6KB JSON)
 */

import { TTL, detectCategory, MAX_KEY_LENGTH } from "./cache.policy";

// ── Tipos ─────────────────────────────────────────────────────────────────

export interface SemanticEntry {
  /** Mensaje original (sin normalizar) — para debug/telemetría */
  message:    string;
  /** Vector de 768 dimensiones de text-embedding-004 */
  embedding:  number[];
  /** Respuesta completa de SOFIAA */
  response:   string;
  createdAt:  number;
  expiresAt:  number;
  hits:       number;
}

interface SemanticStore {
  version:  string;
  entries:  SemanticEntry[];
}

// ── Constantes ────────────────────────────────────────────────────────────

const STORE_KEY       = "sofiaa_semantic_cache";
const STORE_VERSION   = "f2.1";
const MAX_ENTRIES     = 60;
const SIMILARITY_THRESHOLD = 0.92;   // similitud mínima para considerar hit
const MAX_MESSAGE_LEN = 500;         // no embedear mensajes muy largos en cache

// ── Math ──────────────────────────────────────────────────────────────────

/**
 * Cosine similarity entre dos vectores de igual longitud.
 * Retorna 0–1 (1 = idénticos).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ── Store I/O ─────────────────────────────────────────────────────────────

function readStore(): SemanticStore {
  if (typeof window === "undefined") return { version: STORE_VERSION, entries: [] };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { version: STORE_VERSION, entries: [] };
    const parsed = JSON.parse(raw) as SemanticStore;
    if (parsed.version !== STORE_VERSION) return { version: STORE_VERSION, entries: [] };
    return parsed;
  } catch {
    return { version: STORE_VERSION, entries: [] };
  }
}

function writeStore(store: SemanticStore): void {
  if (typeof window === "undefined") return;
  const now   = Date.now();
  const valid = store.entries
    .filter(e => e.expiresAt === 0 || e.expiresAt > now)
    .slice(-MAX_ENTRIES);
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ ...store, entries: valid }));
  } catch {
    // localStorage lleno — limpiar y reintentar
    localStorage.removeItem(STORE_KEY);
  }
}

// ── Embedding via API ─────────────────────────────────────────────────────

/**
 * Llama a /api/embed para obtener el vector del texto.
 * Retorna null si el endpoint no está disponible o hay error.
 */
async function fetchEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch("/api/embed", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { embedding?: number[] };
    return data.embedding ?? null;
  } catch {
    return null;
  }
}

// ── API pública ───────────────────────────────────────────────────────────

/**
 * Busca una respuesta semánticamente similar en el store.
 * Devuelve la respuesta si hay un hit por encima del threshold, o null.
 *
 * @param message - Mensaje original del usuario
 */
export async function getSemanticCache(message: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (message.trim().length === 0) return null;

  // No buscar en cache semántico para mensajes muy largos (poco reutilizables)
  if (message.length > MAX_MESSAGE_LEN) return null;

  const store = readStore();
  if (store.entries.length === 0) return null;

  // Obtener embedding del mensaje actual
  const queryEmbedding = await fetchEmbedding(message);
  if (!queryEmbedding) return null;

  const now = Date.now();

  // Buscar la entrada más similar
  let bestScore  = 0;
  let bestEntry: SemanticEntry | null = null;

  for (const entry of store.entries) {
    // Ignorar entradas expiradas
    if (entry.expiresAt > 0 && entry.expiresAt < now) continue;
    if (!entry.embedding || entry.embedding.length === 0) continue;

    const score = cosineSimilarity(queryEmbedding, entry.embedding);
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  if (!bestEntry || bestScore < SIMILARITY_THRESHOLD) return null;

  // Incrementar hits y persistir
  bestEntry.hits++;
  writeStore(store);

  console.info(
    `[SOFIAA][F-2] semantic cache hit — similarity=${bestScore.toFixed(4)} ` +
    `msg="${message.slice(0, 50)}..."`
  );

  return bestEntry.response;
}

/**
 * Guarda una respuesta en el store semántico con su embedding.
 * No guarda si la respuesta es muy corta, tiene tokens de nav, o si no se puede embeder.
 *
 * @param message  - Mensaje original del usuario
 * @param response - Respuesta completa de SOFIAA
 */
export async function setSemanticCache(message: string, response: string): Promise<void> {
  if (typeof window === "undefined") return;

  // Mismas exclusiones que el exact-match cache
  if (response.trim().length < 40) return;
  if (/\[NAVIGATE:[^\]]+\]/.test(response)) return;
  if (/no (lo )?puedo|no tengo permiso/.test(response.toLowerCase())) return;

  // No cachear mensajes demasiado largos (baja reutilización)
  if (message.length > MAX_MESSAGE_LEN) return;

  // Determinar TTL por categoría de pregunta (igual que el exact-match cache)
  const normalized = message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1)
    .sort()
    .join(" ")
    .slice(0, MAX_KEY_LENGTH);

  const category = detectCategory(normalized);
  const ttlMs    = TTL[category] ?? TTL.default;
  if (ttlMs === 0) return; // categorías que no se cachean (saludos, nav)

  // Generar embedding
  const embedding = await fetchEmbedding(message);
  if (!embedding) return; // si no hay embedding disponible, salir silenciosamente

  const now   = Date.now();
  const store = readStore();

  // Evitar duplicados exactos por mensaje
  const existingIdx = store.entries.findIndex(e => e.message === message);
  const entry: SemanticEntry = {
    message,
    embedding,
    response,
    createdAt: now,
    expiresAt: now + ttlMs,
    hits:      0,
  };

  if (existingIdx >= 0) {
    store.entries[existingIdx] = entry;
  } else {
    store.entries.push(entry);
  }

  writeStore(store);
  console.info(`[SOFIAA][F-2] semantic cache set — "${message.slice(0, 50)}"`);
}

/**
 * Estadísticas del semantic cache (para admin panel / F-3).
 */
export function getSemanticCacheStats(): {
  total:   number;
  hits:    number;
  expired: number;
  sizeKB:  number;
} {
  if (typeof window === "undefined") return { total: 0, hits: 0, expired: 0, sizeKB: 0 };
  const store   = readStore();
  const now     = Date.now();
  const expired = store.entries.filter(e => e.expiresAt > 0 && e.expiresAt < now).length;
  const hits    = store.entries.reduce((a, e) => a + e.hits, 0);
  const raw     = localStorage.getItem(STORE_KEY) ?? "";
  const sizeKB  = Math.round(raw.length / 1024);
  return { total: store.entries.length, hits, expired, sizeKB };
}

/**
 * Limpia todo el store semántico (admin).
 */
export function clearSemanticCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORE_KEY);
}
