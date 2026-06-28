/**
 * SOFIAA Sprint D-E — Graph Store
 *
 * Capa de persistencia del ExperienceGraph.
 * - localStorage: disponible siempre (sesión anónima o autenticada)
 * - Firestore: sincronización opcional para usuarios autenticados
 *
 * El grafo se carga una vez al inicio de la sesión y se escribe
 * de forma debounced después de cada actualización.
 */

"use client";

import {
  type ExperienceGraph,
  createGraph,
  applyDecay,
} from "@/core/experience.graph";

const STORAGE_KEY = "sofiaa_experience_graph";
const SCHEMA_VERSION = 1;

// ── localStorage ──────────────────────────────────────────────────────────

/**
 * Carga el grafo desde localStorage.
 * Si no existe o el schema cambió, devuelve un grafo vacío.
 */
export function loadGraphFromStorage(userId: string | null = null): ExperienceGraph {
  if (typeof window === "undefined") return createGraph(userId);

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createGraph(userId);

    const parsed: ExperienceGraph = JSON.parse(raw);

    // Migración de schema
    if (!parsed.version || parsed.version < SCHEMA_VERSION) {
      console.info("[SOFIAA][Graph] Schema migration — resetting graph");
      return createGraph(userId);
    }

    // Aplicar decaimiento temporal al cargar
    const decayed = applyDecay(parsed);

    // Actualizar userId si el usuario se autenticó
    return { ...decayed, userId: userId ?? parsed.userId };
  } catch {
    return createGraph(userId);
  }
}

/**
 * Guarda el grafo en localStorage.
 */
export function saveGraphToStorage(graph: ExperienceGraph): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(graph));
  } catch {
    // Cuota excedida — comprimir eliminando nodos de bajo peso
    const pruned = pruneGraph(graph, 0.15);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
    } catch { /* ignorar */ }
  }
}

/**
 * Elimina el grafo del localStorage (útil en logout o reset).
 */
export function clearGraphStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

// ── Firestore sync (opcional) ─────────────────────────────────────────────

/**
 * Sincroniza el grafo con Firestore para usuarios autenticados.
 * Fire-and-forget — no bloquea la UI.
 */
export async function syncGraphToFirestore(
  graph:  ExperienceGraph,
  userId: string
): Promise<void> {
  try {
    const { db } = await import("@/lib/firebase");
    const { doc, setDoc } = await import("firebase/firestore");

    const ref = doc(db, "experience_graphs", userId);
    await setDoc(ref, {
      ...graph,
      // Firestore no acepta nesting profundo ilimitado — serializar edges/nodes
      syncedAt: Date.now(),
    }, { merge: false });
  } catch {
    // Sync no es crítico — silenciar
  }
}

/**
 * Carga el grafo desde Firestore para un usuario autenticado.
 * Fallback a localStorage si falla.
 */
export async function loadGraphFromFirestore(
  userId: string
): Promise<ExperienceGraph | null> {
  try {
    const { db } = await import("@/lib/firebase");
    const { doc, getDoc } = await import("firebase/firestore");

    const ref  = doc(db, "experience_graphs", userId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    const data = snap.data() as ExperienceGraph;
    return applyDecay(data);
  } catch {
    return null;
  }
}

// ── Utilidades de mantenimiento ───────────────────────────────────────────

/**
 * Poda el grafo eliminando nodos de bajo peso para reducir tamaño.
 */
export function pruneGraph(
  graph:          ExperienceGraph,
  minWeight = 0.10
): ExperienceGraph {
  const survivingNodeIds = new Set(
    Object.keys(graph.nodes).filter(id => graph.nodes[id].weight >= minWeight)
  );

  const prunedNodes = Object.fromEntries(
    Object.entries(graph.nodes).filter(([id]) => survivingNodeIds.has(id))
  );

  // Eliminar aristas huérfanas
  const prunedEdges = Object.fromEntries(
    Object.entries(graph.edges).filter(([, e]) =>
      survivingNodeIds.has(e.from) && survivingNodeIds.has(e.to)
    )
  );

  return { ...graph, nodes: prunedNodes, edges: prunedEdges, updatedAt: Date.now() };
}

// ── Debounce helper ───────────────────────────────────────────────────────

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Guarda el grafo con debounce (1.5s) para evitar writes frecuentes.
 */
export function debouncedSave(graph: ExperienceGraph): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveGraphToStorage(graph);
    saveTimer = null;
  }, 1500);
}
