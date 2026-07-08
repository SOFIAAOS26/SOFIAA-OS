/**
 * N.E.X.O. — Attention Engine (Sprint M-2)
 *
 * Cuando SOFIAA selecciona nodos del grafo para inyectar en el contexto
 * de una conversación, esos nodos reciben un refuerzo suave.
 *
 * Lógica:
 *   weight_nuevo = min(1.0, weight + ATTEND_DELTA)
 *   lastReinforced = ahora   ← resetea el reloj de decay
 *   reinforceCount++         ← contador de atenciones
 *
 * Se dispara vía waitUntil (async, sin latencia para el usuario).
 */

import { getAdminDb } from "@/lib/firebase-admin";
import type { NexoNode } from "@/types/nexo";

// ── Constantes ────────────────────────────────────────────────────────────────

/** Boost de peso por cada vez que el nodo entra en contexto */
const ATTEND_DELTA = 0.03;

/** Peso máximo que puede alcanzar un nodo vía atención (el decay lo regula) */
const MAX_WEIGHT = 1.0;

/** Límite de reinforceCount para evitar overflow de enteros */
const MAX_REINFORCE_COUNT = 9999;

// ── Motor principal ───────────────────────────────────────────────────────────

/**
 * Refuerza en batch todos los nodos que SOFIAA inyectó en el contexto.
 * Silencia cualquier error — nunca debe romper el chat.
 *
 * @param uid      UID del usuario dueño del grafo
 * @param nodeIds  IDs de los nodos seleccionados por getNexoContext()
 */
export async function attendNexoNodes(
  uid:     string,
  nodeIds: string[],
): Promise<void> {
  if (!uid || nodeIds.length === 0) return;

  try {
    const db  = getAdminDb();
    const col = db.collection(`users/${uid}/nexo_nodes`);
    const now = Date.now();

    // Leer todos los nodos en paralelo
    const snaps = await Promise.all(nodeIds.map(id => col.doc(id).get()));

    // Batch write
    const batch = db.batch();
    let changed = 0;

    for (const snap of snaps) {
      if (!snap.exists) continue;

      const node  = snap.data() as NexoNode;
      // No reforzar insights generados por el Reflection Engine
      if (node.type === "insight") continue;

      const newWeight = Math.min(MAX_WEIGHT, node.weight + ATTEND_DELTA);
      const newCount  = Math.min(
        MAX_REINFORCE_COUNT,
        (node.reinforceCount ?? 0) + 1,
      );

      batch.update(snap.ref, {
        weight:         parseFloat(newWeight.toFixed(4)),
        lastReinforced: now,
        reinforceCount: newCount,
      });
      changed++;
    }

    if (changed > 0) await batch.commit();

  } catch {
    // El Attention Engine nunca debe romper el chat
  }
}
