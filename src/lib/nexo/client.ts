/**
 * N.E.X.O. — Client-side Firestore helpers
 * Sprint N-7 · Mi Grafo
 *
 * Usa el Firebase CLIENT SDK (no Admin).
 * Solo importar desde componentes "use client".
 */

import {
  collection, query, orderBy, onSnapshot,
  deleteDoc, doc, writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { NexoNode } from "@/types/nexo";

// ── Colecciones ───────────────────────────────────────────────────────────────
const nodesCol = (uid: string) =>
  collection(db, "users", uid, "nexo_nodes");

// ── Suscripción en tiempo real ────────────────────────────────────────────────
export function subscribeNexoNodes(
  uid: string,
  onData: (nodes: NexoNode[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(nodesCol(uid), orderBy("weight", "desc"));
  return onSnapshot(
    q,
    snap => onData(snap.docs.map(d => d.data() as NexoNode)),
    err  => onError?.(err),
  );
}

// ── Borrar nodo individual ────────────────────────────────────────────────────
export async function deleteNexoNodeClient(uid: string, nodeId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "nexo_nodes", nodeId));
}

// ── Limpiar todos los nodos ───────────────────────────────────────────────────
export async function clearAllNexoNodesClient(
  uid: string,
  nodes: NexoNode[],
): Promise<void> {
  const batch = writeBatch(db);
  nodes.forEach(n => {
    batch.delete(doc(db, "users", uid, "nexo_nodes", n.id));
  });
  await batch.commit();
}
