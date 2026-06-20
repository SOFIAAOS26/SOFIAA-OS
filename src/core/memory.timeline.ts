// SOFIAA — Memory Timeline
// Motor de línea temporal de sesiones
// Tres capas de memoria:
//   1. Operativa   → sesión actual (messages state en page.tsx)
//   2. Contextual  → últimas 5 sesiones (sofiaa_timeline en localStorage)
//   3. Histórica   → hechos permanentes del usuario (sofiaa_long_memory)

export const TIMELINE_KEY     = "sofiaa_timeline";
export const TIMELINE_VERSION = "1.0" as const;
export const MAX_TIMELINE_ENTRIES = 20;

export interface TimelineEntry {
  sessionId: string;
  timestamp: number;           // cuando terminó la sesión
  title: string;               // tema principal detectado
  summary: string;             // resumen extraído por /api/memory
  messageCount: number;        // mensajes en la sesión
  topGoal?: string;            // objetivo más frecuente detectado
  tags: string[];              // keywords del tema
}

export interface TimelineStore {
  version: typeof TIMELINE_VERSION;
  entries: TimelineEntry[];
}

// ── Persistencia ──────────────────────────────────────────────────────────────

function emptyStore(): TimelineStore {
  return { version: TIMELINE_VERSION, entries: [] };
}

export function readTimeline(): TimelineStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(TIMELINE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as TimelineStore;
    if (parsed.version !== TIMELINE_VERSION) return emptyStore();
    return parsed;
  } catch {
    return emptyStore();
  }
}

export function writeTimeline(store: TimelineStore): void {
  if (typeof window === "undefined") return;
  const trimmed = {
    ...store,
    entries: store.entries.slice(-MAX_TIMELINE_ENTRIES),
  };
  localStorage.setItem(TIMELINE_KEY, JSON.stringify(trimmed));
}

export function addTimelineEntry(entry: TimelineEntry): void {
  const store = readTimeline();
  // Reemplazar si ya existe el sessionId
  const idx = store.entries.findIndex((e) => e.sessionId === entry.sessionId);
  if (idx >= 0) {
    store.entries[idx] = entry;
  } else {
    store.entries.push(entry);
  }
  writeTimeline(store);
}

// ── Contexto para el modelo ───────────────────────────────────────────────────

/**
 * Retorna un bloque de contexto con las últimas N sesiones
 * para inyectar en el system prompt como "memoria contextual".
 */
export function buildContextualMemoryBlock(limit = 5): string {
  const store = readTimeline();
  const recent = store.entries.slice(-limit).reverse(); // más reciente primero
  if (recent.length === 0) return "";

  const lines = recent.map((e, i) => {
    const date = new Date(e.timestamp).toLocaleDateString("es-MX", {
      day: "numeric", month: "short",
    });
    return `- [${date}] ${e.title}: ${e.summary}`;
  });

  return `\n\n# MEMORIA CONTEXTUAL (últimas sesiones)\n${lines.join("\n")}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Formatea timestamp en fecha legible */
export function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}
