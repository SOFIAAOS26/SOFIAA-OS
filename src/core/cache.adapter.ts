// SOFIAA — Cache Adapter
// Interfaz unificada sobre localStorage (IndexedDB en Fase 3)

import { CACHE_KEY, CACHE_VERSION, MAX_CACHE_ENTRIES } from "./cache.policy";

export interface CacheEntry {
  key: string;        // clave normalizada
  response: string;   // respuesta completa de SOFIAA
  createdAt: number;  // timestamp de creación
  expiresAt: number;  // timestamp de expiración (0 = nunca cachear / ya expirado)
  hits: number;       // veces que se sirvió desde cache
}

export interface CacheStore {
  version: typeof CACHE_VERSION;
  entries: CacheEntry[];
}

function empty(): CacheStore {
  return { version: CACHE_VERSION, entries: [] };
}

export function readStore(): CacheStore {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as CacheStore;
    if (parsed.version !== CACHE_VERSION) return empty();
    return parsed;
  } catch {
    return empty();
  }
}

export function writeStore(store: CacheStore): void {
  if (typeof window === "undefined") return;
  // Eliminar entradas expiradas antes de guardar
  const now = Date.now();
  const valid = store.entries
    .filter((e) => e.expiresAt === 0 || e.expiresAt > now)
    .slice(-MAX_CACHE_ENTRIES);
  localStorage.setItem(CACHE_KEY, JSON.stringify({ ...store, entries: valid }));
}

export function getEntry(key: string): CacheEntry | null {
  const store = readStore();
  const entry = store.entries.find((e) => e.key === key);
  if (!entry) return null;
  if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
    // Entrada expirada — limpiar
    const updated = { ...store, entries: store.entries.filter((e) => e.key !== key) };
    writeStore(updated);
    return null;
  }
  // Incrementar hits
  entry.hits++;
  writeStore(store);
  return entry;
}

export function setEntry(key: string, response: string, ttlMs: number): void {
  if (ttlMs === 0) return; // TTL 0 = no cachear
  const store = readStore();
  const now   = Date.now();
  // Reemplazar si ya existe
  const idx = store.entries.findIndex((e) => e.key === key);
  const entry: CacheEntry = {
    key,
    response,
    createdAt: now,
    expiresAt: now + ttlMs,
    hits: 0,
  };
  if (idx >= 0) {
    store.entries[idx] = entry;
  } else {
    store.entries.push(entry);
  }
  writeStore(store);
}

export function clearCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CACHE_KEY);
}

export function getCacheStats(): { total: number; hits: number; expired: number } {
  const store = readStore();
  const now   = Date.now();
  const expired = store.entries.filter((e) => e.expiresAt > 0 && e.expiresAt < now).length;
  const hits    = store.entries.reduce((a, e) => a + e.hits, 0);
  return { total: store.entries.length, hits, expired };
}
