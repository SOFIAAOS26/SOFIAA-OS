/**
 * ALEJANDRÍA — Helpers Firestore (server-side)
 * Sprint AJ-0 · Capa de persistencia
 *
 * Usa Firebase Admin SDK — server only.
 * Para el cliente React, usa el SDK de cliente directamente.
 *
 * Colección: users/{uid}/alejandria_nodos/{nodeId}
 */

import { getAdminDb }           from "@/lib/firebase-admin";
import { FieldValue }           from "firebase-admin/firestore";
import type {
  AlejandriaNode,
  AlejandriaNodeType,
  AlejandriaModulo,
  AlejandriaStats,
} from "@/extensions/alejandria/schema";
import { alejandriaNodesCol }   from "@/extensions/alejandria/schema";

// ── Constantes ────────────────────────────────────────────────────────────────

const MAX_CONTEXT_NODES = 8;   // máx nodos a inyectar en el prompt
const REINFORCE_BATCH   = 20;  // cada cuántos refuerzos hacer batch write

// ── Helpers de colección ──────────────────────────────────────────────────────

function col(uid: string) {
  return getAdminDb().collection(alejandriaNodesCol(uid));
}

// ── CRUD básico ───────────────────────────────────────────────────────────────

/** Lee un nodo por ID */
export async function getAlejandriaNode(
  uid:    string,
  nodeId: string,
): Promise<AlejandriaNode | null> {
  const snap = await col(uid).doc(nodeId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as AlejandriaNode;
}

/** Escribe o sobreescribe un nodo (usado en la ingestión AJ-1) */
export async function upsertAlejandriaNode(
  uid:  string,
  node: AlejandriaNode,
): Promise<void> {
  const { id, ...data } = node;
  await col(uid).doc(id).set({
    ...data,
    updatedAt: Date.now(),
  }, { merge: true });
}

/** Escribe un batch de nodos en Firestore (max 500 por llamada) */
export async function batchUpsertAlejandriaNodes(
  uid:   string,
  nodes: AlejandriaNode[],
): Promise<number> {
  const db = getAdminDb();
  let count = 0;

  // Firestore batch max = 500 operaciones
  for (let i = 0; i < nodes.length; i += 499) {
    const batch = db.batch();
    const chunk = nodes.slice(i, i + 499);

    for (const node of chunk) {
      const { id, ...data } = node;
      const ref = col(uid).doc(id);
      batch.set(ref, { ...data, updatedAt: Date.now() }, { merge: true });
    }

    await batch.commit();
    count += chunk.length;
  }

  return count;
}

// ── Lectura por tipo / módulo ─────────────────────────────────────────────────

/** Todos los nodos de un tipo */
export async function getNodesByTipo(
  uid:  string,
  tipo: AlejandriaNodeType,
): Promise<AlejandriaNode[]> {
  const snap = await col(uid)
    .where("tipo", "==", tipo)
    .orderBy("fecha", "desc")
    .limit(50)
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as AlejandriaNode);
}

/** Nodos que afectan a un módulo específico */
export async function getNodesByModulo(
  uid:    string,
  modulo: AlejandriaModulo,
): Promise<AlejandriaNode[]> {
  const snap = await col(uid)
    .where("modulos_afectados", "array-contains", modulo)
    .orderBy("fecha", "desc")
    .limit(30)
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as AlejandriaNode);
}

/** Nodos relacionados a un sprint */
export async function getNodesBySprint(
  uid:    string,
  sprint: string,
): Promise<AlejandriaNode[]> {
  const snap = await col(uid)
    .where("sprint_referencia", "==", sprint)
    .limit(20)
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as AlejandriaNode);
}

// ── Búsqueda semántica (usada en AJ-2) ───────────────────────────────────────

/**
 * Búsqueda por keyword en tags y modulos_afectados.
 * Complementa la búsqueda por embedding de AJ-2.
 */
export async function keywordSearchAlejandria(
  uid:     string,
  keyword: string,
  limit    = MAX_CONTEXT_NODES,
): Promise<AlejandriaNode[]> {
  const lower = keyword.toLowerCase();

  // Busca en tags (array-contains no soporta substring, pero tags son exactos)
  const snap = await col(uid)
    .orderBy("reinforceCount", "desc")
    .limit(100)  // traer más y filtrar en memoria
    .get();

  const nodes = snap.docs.map(d => ({ id: d.id, ...d.data() }) as AlejandriaNode);

  // Filtro en memoria por keyword en titulo, resumen, tags
  return nodes
    .filter(n =>
      n.titulo?.toLowerCase().includes(lower) ||
      n.resumen?.toLowerCase().includes(lower) ||
      n.tags?.some(t => t.toLowerCase().includes(lower)) ||
      n.modulos_afectados?.some(m => m.toLowerCase().includes(lower))
    )
    .slice(0, limit);
}

/**
 * Contexto de ALEJANDRÍA para inyectar en el prompt.
 * En AJ-2 se reemplaza por búsqueda semántica real.
 * Por ahora: keyword + más reforzados.
 */
export async function getAlejandriaContext(
  uid:   string,
  query: string,
): Promise<AlejandriaNode[]> {
  const results = await keywordSearchAlejandria(uid, query, MAX_CONTEXT_NODES);

  // Si hay pocos resultados, complementar con los más reforzados
  if (results.length < 3) {
    const topSnap = await col(uid)
      .orderBy("reinforceCount", "desc")
      .limit(MAX_CONTEXT_NODES - results.length)
      .get();

    const top = topSnap.docs
      .map(d => ({ id: d.id, ...d.data() }) as AlejandriaNode)
      .filter(n => !results.find(r => r.id === n.id));

    results.push(...top);
  }

  return results.slice(0, MAX_CONTEXT_NODES);
}

// ── Refuerzo de nodos usados ──────────────────────────────────────────────────

/** Incrementa reinforceCount de los nodos que se inyectaron en el prompt */
export async function reinforceAlejandriaNodes(
  uid:     string,
  nodeIds: string[],
): Promise<void> {
  const db    = getAdminDb();
  const batch = db.batch();

  for (const nodeId of nodeIds.slice(0, REINFORCE_BATCH)) {
    const ref = col(uid).doc(nodeId);
    batch.update(ref, {
      reinforceCount: FieldValue.increment(1),
      updatedAt:      Date.now(),
    });
  }

  await batch.commit();
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getAlejandriaStats(uid: string): Promise<AlejandriaStats> {
  const snap = await col(uid).get();
  const nodes = snap.docs.map(d => d.data() as AlejandriaNode);

  const porTipo: Record<string, number> = {};
  const moduloSet = new Set<AlejandriaModulo>();
  let decisionesTotal = 0;
  let ultimaActualizacion = 0;

  for (const n of nodes) {
    porTipo[n.tipo] = (porTipo[n.tipo] ?? 0) + 1;
    n.modulos_afectados?.forEach(m => moduloSet.add(m));
    decisionesTotal += n.decisiones?.length ?? 0;
    if (n.updatedAt > ultimaActualizacion) ultimaActualizacion = n.updatedAt;
  }

  return {
    totalNodos:          nodes.length,
    porTipo:             porTipo as AlejandriaStats["porTipo"],
    modulosCubiertos:    [...moduloSet],
    decisionesTotal,
    ultimaActualizacion,
  };
}

// ── Eliminar nodo ─────────────────────────────────────────────────────────────

export async function deleteAlejandriaNode(uid: string, nodeId: string): Promise<void> {
  await col(uid).doc(nodeId).delete();
}
