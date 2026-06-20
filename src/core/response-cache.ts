// SOFIAA — Response Cache
// Motor de cache con normalización de intención por keywords
// ⚠ Este es un cache por normalización de texto — NO por similitud vectorial.
// La versión semántica real (embeddings) queda para Fase 3.

import { getEntry, setEntry } from "./cache.adapter";
import { TTL, detectCategory, MAX_KEY_LENGTH } from "./cache.policy";

// ── Normalización ─────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas",
  "y", "o", "de", "del", "en", "con", "por", "para", "a",
  "que", "qué", "cómo", "cuál", "cuáles", "me", "te", "se",
  "es", "son", "está", "están", "hay", "ser", "estar",
  "puedes", "puede", "puedo", "podría", "podrías",
  "dime", "cuéntame", "explícame", "háblame",
  "the", "a", "an", "is", "are", "what", "who", "how",
]);

/**
 * Normaliza un mensaje de usuario en una clave de cache:
 * - Minúsculas
 * - Sin acentos
 * - Sin puntuación
 * - Sin stopwords
 * - Tokens ordenados alfabéticamente (para que "quién es Abrahan" y "Abrahan quién es" den la misma clave)
 */
export function normalizeKey(input: string): string {
  const normalized = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // quitar acentos
    .replace(/[^a-z0-9\s]/g, " ")      // quitar puntuación
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .sort()
    .join(" ")
    .slice(0, MAX_KEY_LENGTH);
  return normalized;
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Busca una respuesta en cache para el input dado.
 * Retorna la respuesta si existe y no ha expirado, o null si hay que llamar al modelo.
 */
export function getCachedResponse(input: string): string | null {
  const key = normalizeKey(input);
  if (!key) return null;

  // No cachear si la intención es dinámica/navegación/saludo
  const category = detectCategory(key);
  if (TTL[category] === 0) return null;

  const entry = getEntry(key);
  return entry ? entry.response : null;
}

/**
 * Guarda una respuesta en cache.
 * Solo guarda si la respuesta no contiene tokens de navegación ni es demasiado corta.
 */
export function setCachedResponse(input: string, response: string): void {
  // No cachear respuestas con tokens de navegación (son acciones, no datos)
  if (/\[NAVIGATE:[^\]]+\]/.test(response)) return;
  // No cachear respuestas muy cortas (probablemente errores o seguridad)
  if (response.trim().length < 40) return;
  // No cachear respuestas de guardrails
  if (/no (lo )?puedo|no tengo permiso|eso no (lo )?puedo/.test(response.toLowerCase())) return;

  const key      = normalizeKey(input);
  if (!key) return;

  const category = detectCategory(key);
  const ttlMs    = TTL[category] ?? TTL.default;
  if (ttlMs === 0) return;

  setEntry(key, response, ttlMs);
}

/**
 * Indica si una respuesta fue servida desde cache (para telemetría).
 */
export function isCacheHit(input: string): boolean {
  const key = normalizeKey(input);
  if (!key) return false;
  const category = detectCategory(key);
  if (TTL[category] === 0) return false;
  return getEntry(key) !== null;
}
