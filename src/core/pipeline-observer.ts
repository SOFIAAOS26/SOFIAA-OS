/**
 * SOFIAA Sprint F-3 — Pipeline Observer
 *
 * Log client-side de cada request procesado por el pipeline.
 * Almacena en localStorage los últimos N eventos con:
 *   - taskType (F-1)   — clasificación semántica de la tarea
 *   - provider         — groq | gemini | none
 *   - confidence       — confianza del clasificador (0–1)
 *   - cacheLayer       — exact | semantic | miss
 *   - latencyMs        — tiempo total desde envío hasta último chunk
 *   - messageSnippet   — primeros 60 chars del mensaje (para contexto)
 *   - timestamp
 *
 * No hay PII, no hay contenido completo — solo señales de pipeline.
 */

import type { TaskType } from "./llm.orchestrator";

// ── Tipos ─────────────────────────────────────────────────────────────────

export type CacheLayer = "exact" | "semantic" | "miss";

export interface PipelineEvent {
  id:              string;
  timestamp:       number;
  messageSnippet:  string;
  taskType:        TaskType | "unknown";
  provider:        string;
  confidence:      number;
  cacheLayer:      CacheLayer;
  latencyMs:       number;
}

interface PipelineStore {
  version: string;
  events:  PipelineEvent[];
}

// ── Constantes ────────────────────────────────────────────────────────────

const STORE_KEY    = "sofiaa_pipeline_log";
const STORE_VER    = "f3.1";
const MAX_EVENTS   = 50;   // los últimos 50 requests en localStorage

// ── userId de módulo (se setea al autenticar) ─────────────────────────────
let _currentUserId: string | null = null;

/**
 * Registra el userId activo — llamar tras login.
 * Permite que recordPipelineEvent persista a Firestore sin cambiar su firma.
 */
export function setPipelineUserId(uid: string | null): void {
  _currentUserId = uid;
}

// ── I/O ───────────────────────────────────────────────────────────────────

function readStore(): PipelineStore {
  if (typeof window === "undefined") return { version: STORE_VER, events: [] };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { version: STORE_VER, events: [] };
    const parsed = JSON.parse(raw) as PipelineStore;
    if (parsed.version !== STORE_VER) return { version: STORE_VER, events: [] };
    return parsed;
  } catch {
    return { version: STORE_VER, events: [] };
  }
}

function writeStore(store: PipelineStore): void {
  if (typeof window === "undefined") return;
  const trimmed = { ...store, events: store.events.slice(-MAX_EVENTS) };
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(trimmed));
  } catch {
    localStorage.removeItem(STORE_KEY);
  }
}

// ── API pública ───────────────────────────────────────────────────────────

/**
 * Registra un evento de pipeline tras completar un request.
 * Persiste en localStorage Y en Firestore (best-effort, async).
 */
export function recordPipelineEvent(event: Omit<PipelineEvent, "id" | "timestamp">): void {
  const store = readStore();
  const entry: PipelineEvent = {
    id:        `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    ...event,
  };
  store.events.push(entry);
  writeStore(store);

  // H-3: persistir a Firestore si hay userId activo
  if (_currentUserId) {
    pushEventToFirestore(_currentUserId, entry).catch(() => {});
  }
}

/** Persiste un evento a Firestore para acumular datos de N.O.R.A */
async function pushEventToFirestore(userId: string, event: PipelineEvent): Promise<void> {
  const { db }      = await import("@/lib/firebase");
  const { doc, setDoc } = await import("firebase/firestore");
  const ref = doc(db, "users", userId, "pipeline_events", event.id);
  await setDoc(ref, {
    ...event,
    // Añadimos fecha como campo separado para queries de N.O.R.A
    date: new Date(event.timestamp).toISOString().split("T")[0],
  });
}

/**
 * Devuelve los últimos N eventos ordenados de más reciente a más antiguo.
 */
export function getPipelineLog(limit = 20): PipelineEvent[] {
  const store = readStore();
  return store.events.slice().reverse().slice(0, limit);
}

/**
 * Estadísticas agregadas para el panel.
 */
export interface PipelineStats {
  total:           number;
  cacheHitRate:    number;   // 0–1
  exactHits:       number;
  semanticHits:    number;
  llmCalls:        number;
  avgLatencyMs:    number;
  taskDistribution: Record<string, number>;
  providerDistribution: Record<string, number>;
}

export function getPipelineStats(): PipelineStats {
  const store  = readStore();
  const events = store.events;

  if (events.length === 0) {
    return {
      total: 0, cacheHitRate: 0, exactHits: 0, semanticHits: 0,
      llmCalls: 0, avgLatencyMs: 0, taskDistribution: {}, providerDistribution: {},
    };
  }

  const exactHits    = events.filter(e => e.cacheLayer === "exact").length;
  const semanticHits = events.filter(e => e.cacheLayer === "semantic").length;
  const llmCalls     = events.filter(e => e.cacheLayer === "miss").length;
  const cacheHitRate = (exactHits + semanticHits) / events.length;
  const avgLatencyMs = Math.round(
    events.reduce((sum, e) => sum + e.latencyMs, 0) / events.length
  );

  const taskDistribution: Record<string, number> = {};
  const providerDistribution: Record<string, number> = {};
  for (const e of events) {
    taskDistribution[e.taskType]    = (taskDistribution[e.taskType]    ?? 0) + 1;
    providerDistribution[e.provider] = (providerDistribution[e.provider] ?? 0) + 1;
  }

  return {
    total: events.length,
    cacheHitRate,
    exactHits,
    semanticHits,
    llmCalls,
    avgLatencyMs,
    taskDistribution,
    providerDistribution,
  };
}

/**
 * Limpia el log (admin).
 */
export function clearPipelineLog(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORE_KEY);
}
