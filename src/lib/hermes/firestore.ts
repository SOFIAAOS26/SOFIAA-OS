/**
 * HERMES — Firestore helpers
 *
 * CRUD para la cola de acciones y configuración de conectores.
 * Colecciones:
 *   smm_workspaces/{workspaceId}/hermes_queue/{actionId}
 *   smm_workspaces/{workspaceId}/hermes_connectors/{connectorId}
 */

import {
  collection, doc, onSnapshot,
  addDoc, updateDoc, query, orderBy,
  serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { HermesAction, HermesConnectorConfig } from "@/extensions/hermes/schema";

// ── Paths ─────────────────────────────────────────────────────────────────────

function queueCol(workspaceId: string) {
  return collection(db, "smm_workspaces", workspaceId, "hermes_queue");
}

function connectorsCol(workspaceId: string) {
  return collection(db, "smm_workspaces", workspaceId, "hermes_connectors");
}

// ── Cola de acciones ──────────────────────────────────────────────────────────

/**
 * Suscripción en tiempo real a TODA la cola (todos los estados).
 * La UI filtra por estado según necesite.
 */
export function subscribeHermesQueue(
  workspaceId: string,
  cb: (acciones: HermesAction[]) => void
): () => void {
  const q = query(queueCol(workspaceId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as HermesAction)));
  });
}

/**
 * Encola una nueva acción en estado 'pendiente_aprobacion'.
 * Llamado por PROMETEO, ATENA, TEC Bii o el CRON.
 */
export async function enqueueAction(
  workspaceId: string,
  accion: Omit<HermesAction, "id" | "createdAt" | "reintentos">
): Promise<string> {
  const ref = await addDoc(queueCol(workspaceId), {
    ...accion,
    estado:     "pendiente_aprobacion",
    reintentos: 0,
    createdAt:  Date.now(),
    _serverTs:  serverTimestamp(),
  });
  return ref.id;
}

/**
 * Aprueba una acción — cambia estado a 'aprobada'.
 * El executor la tomará y la ejecutará.
 */
export async function approveAction(
  workspaceId: string,
  actionId:    string,
  aprobadoPor?: string
): Promise<void> {
  await updateDoc(doc(queueCol(workspaceId), actionId), {
    estado:      "aprobada",
    aprobadoPor: aprobadoPor ?? "usuario",
    aprobadoAt:  Date.now(),
  });
}

/**
 * Rechaza una acción — estado 'rechazada' con motivo opcional.
 */
export async function rejectAction(
  workspaceId:   string,
  actionId:      string,
  motivoRechazo?: string
): Promise<void> {
  await updateDoc(doc(queueCol(workspaceId), actionId), {
    estado:        "rechazada",
    motivoRechazo: motivoRechazo ?? "",
    completadoAt:  Date.now(),
  });
}

/**
 * Marca una acción como completada con su resultado.
 * Llamado por el executor después de ejecutar.
 */
export async function completeAction(
  workspaceId: string,
  actionId:    string,
  resultado:   HermesAction["resultado"]
): Promise<void> {
  await updateDoc(doc(queueCol(workspaceId), actionId), {
    estado:       "completada",
    resultado,
    completadoAt: Date.now(),
  });
}

/**
 * Marca una acción como fallida.
 */
export async function failAction(
  workspaceId: string,
  actionId:    string,
  errorMsg:    string
): Promise<void> {
  const ref = doc(queueCol(workspaceId), actionId);
  await updateDoc(ref, {
    estado:    "fallida",
    resultado: {
      exito:     false,
      mensaje:   errorMsg,
      errorCode: "EXECUTION_ERROR",
    },
    executedAt: Date.now(),
  });
}

// ── Conectores ────────────────────────────────────────────────────────────────

/**
 * Suscripción en tiempo real a la configuración de conectores.
 */
export function subscribeHermesConnectors(
  workspaceId: string,
  cb: (conectores: HermesConnectorConfig[]) => void
): () => void {
  return onSnapshot(connectorsCol(workspaceId), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as HermesConnectorConfig)));
  });
}

/**
 * Crea o actualiza la configuración de un conector.
 * Las credenciales sensibles NO se guardan aquí.
 */
export async function upsertConnector(
  workspaceId: string,
  config: Omit<HermesConnectorConfig, "id" | "createdAt" | "updatedAt">
): Promise<void> {
  const ref = doc(connectorsCol(workspaceId), config.tipo);
  const existing = (await import("firebase/firestore")).getDoc(ref);
  const exists = (await existing).exists();

  if (exists) {
    await updateDoc(ref, { ...config, updatedAt: Date.now() });
  } else {
    await (await import("firebase/firestore")).setDoc(ref, {
      ...config,
      id:        config.tipo,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
}
