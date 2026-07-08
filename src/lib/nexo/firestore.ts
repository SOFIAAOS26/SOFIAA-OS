/**
 * N.E.X.O. — Helpers Firestore
 * Sprint N-0 · Capa de persistencia
 *
 * Schema:
 *   users/{uid}/nexo_nodes/{nodeId}   → NexoNode
 *   users/{uid}/nexo_events/{eventId} → NexoEvent (para N.O.R.A)
 *
 * Este módulo usa el Firebase Admin SDK (server-side).
 * Para el cliente (React), usar nexo.client.ts.
 */

import { getAdminDb } from "@/lib/firebase-admin";
import type {
  NexoNode, NexoEvent, NexoContext, NexoContextNode,
  NEXO_COLLECTION,
} from "@/types/nexo";
import {
  NEXO_MAX_CONTEXT_NODES, NEXO_PRUNE_THRESHOLD,
  NEXO_DECAY_RATE, NEXO_DECAY_DAYS,
} from "@/types/nexo";

// ── Rutas de colección ────────────────────────────────────────────────────────

export const nexoNodesCol  = (uid: string) => `users/${uid}/nexo_nodes`;
export const nexoEventsCol = (uid: string) => `users/${uid}/nexo_events`;

// ── Leer nodos ────────────────────────────────────────────────────────────────

/**
 * Obtiene todos los nodos activos de un usuario, ordenados por peso.
 */
export async function getNexoNodes(uid: string): Promise<NexoNode[]> {
  const db = getAdminDb();
  const snap = await db.collection(nexoNodesCol(uid)).orderBy("weight", "desc").get();
  return snap.docs.map(d => d.data() as NexoNode);
}

/**
 * Obtiene el contexto comprimido para inyectar al system prompt de SOFIAA.
 * Devuelve los top-N nodos por peso, listos para el LLM.
 */
export async function getNexoContext(
  uid: string,
  limit = NEXO_MAX_CONTEXT_NODES
): Promise<NexoContext> {
  const db  = getAdminDb();
  const now = Date.now();

  const snap = await db
    .collection(nexoNodesCol(uid))
    .where("weight", ">", NEXO_PRUNE_THRESHOLD)
    .orderBy("weight", "desc")
    .limit(limit)
    .get();

  const nodes = snap.docs.map(d => d.data() as NexoNode);

  // IDs para el Attention Engine (Sprint M-2)
  const nodeIds = snap.docs.map(d => d.id);

  const topNodes: NexoContextNode[] = nodes.map(n => ({
    title:    n.title,
    category: n.category,
    summary:  n.summary,
    weight:   n.weight,
    daysAgo:  Math.floor((now - n.capturedAt) / 86_400_000),
  }));

  // Contar total de nodos activos
  const countSnap = await db.collection(nexoNodesCol(uid)).count().get();
  const totalNodes = countSnap.data().count;

  // Detectar clusters de interés
  const categoryCounts = nodes.reduce<Record<string, number>>((acc, n) => {
    acc[n.category] = (acc[n.category] ?? 0) + 1;
    return acc;
  }, {});
  const clusters = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);

  return { topNodes, totalNodes, clusters, nodeIds };
}

// ── Escribir nodo ─────────────────────────────────────────────────────────────

/**
 * Guarda un nuevo nodo N.E.X.O. en Firestore.
 * Si ya existe un nodo con el mismo URL, lo refuerza en lugar de duplicarlo.
 */
export async function upsertNexoNode(
  uid:  string,
  node: NexoNode
): Promise<void> {
  const db  = getAdminDb();
  const col = db.collection(nexoNodesCol(uid));

  // Buscar duplicado por URL
  if (node.url) {
    const existing = await col.where("url", "==", node.url).limit(1).get();
    if (!existing.empty) {
      const docRef = existing.docs[0].ref;
      const prev   = existing.docs[0].data() as NexoNode;
      await docRef.update({
        weight:         Math.min(1, prev.weight + 0.15),
        lastReinforced: Date.now(),
        hits:           ((prev as NexoNode & { hits?: number }).hits ?? 1) + 1,
      });
      return;
    }
  }

  await col.doc(node.id).set(node);
}

// ── Reforzar nodo ─────────────────────────────────────────────────────────────

/**
 * Resetea el peso y timestamp de un nodo cuando SOFIAA lo referencia.
 * Llamado desde route.ts cuando el LLM menciona algo del grafo N.E.X.O.
 */
export async function reinforceNexoNode(uid: string, nodeId: string): Promise<void> {
  const db  = getAdminDb();
  const ref = db.collection(nexoNodesCol(uid)).doc(nodeId);
  const snap = await ref.get();
  if (!snap.exists) return;

  const node = snap.data() as NexoNode;
  await ref.update({
    weight:         Math.min(1, node.weight + 0.20),
    lastReinforced: Date.now(),
  });
}

// ── Decay Engine ──────────────────────────────────────────────────────────────

/**
 * Aplica decaimiento exponencial a todos los nodos del usuario.
 * Elimina los nodos con peso < NEXO_PRUNE_THRESHOLD.
 *
 * Fórmula: peso_nuevo = peso × e^(−λ × días_sin_referencia)
 * donde λ varía por categoría (NEXO_DECAY_DAYS).
 *
 * Llamado desde /api/nexo/decay (Vercel Cron Job, 3 AM diario).
 */
export async function applyNexoDecay(uid: string): Promise<{
  decayed: number;
  pruned:  number;
}> {
  const db  = getAdminDb();
  const now = Date.now();
  const col = db.collection(nexoNodesCol(uid));

  const snap = await col.get();
  if (snap.empty) return { decayed: 0, pruned: 0 };

  const batch  = db.batch();
  let decayed  = 0;
  let pruned   = 0;

  snap.docs.forEach(docSnap => {
    const node = docSnap.data() as NexoNode;
    const daysSince = (now - node.lastReinforced) / 86_400_000;

    // λ adaptativo por categoría
    const halfLifeDays = NEXO_DECAY_DAYS[node.category] ?? 21;
    const lambda = Math.log(2) / halfLifeDays; // λ = ln(2)/t½

    const newWeight = node.weight * Math.exp(-lambda * daysSince);

    if (newWeight < NEXO_PRUNE_THRESHOLD) {
      batch.delete(docSnap.ref);
      pruned++;
    } else {
      batch.update(docSnap.ref, { weight: parseFloat(newWeight.toFixed(4)) });
      decayed++;
    }
  });

  await batch.commit();
  return { decayed, pruned };
}

// ── Borrar nodo (privacidad) ──────────────────────────────────────────────────

export async function deleteNexoNode(uid: string, nodeId: string): Promise<void> {
  const db = getAdminDb();
  await db.collection(nexoNodesCol(uid)).doc(nodeId).delete();
}

export async function clearAllNexoNodes(uid: string): Promise<void> {
  const db   = getAdminDb();
  const col  = db.collection(nexoNodesCol(uid));
  const snap = await col.get();
  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

// ── Eventos N.O.R.A ───────────────────────────────────────────────────────────

export async function logNexoEvent(uid: string, event: NexoEvent): Promise<void> {
  const db = getAdminDb();
  await db.collection(nexoEventsCol(uid)).add(event);
}
