/**
 * PROMETEO — Helpers Firestore (P-1)
 * Growth Intelligence Engine v2.0
 *
 * Colecciones: smm_workspaces/{workspaceId}/prometeo_{col}
 * Mismo workspace multi-tenant que Marketing Sofia.
 */

import {
  collection, doc, onSnapshot, addDoc, updateDoc,
  setDoc, getDocs, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BrandDNA, BrandGoal, GoalState, CreativeMemory } from "@/extensions/prometeo/schema";

// ── Path helpers ──────────────────────────────────────────────────────────────

const ROOT = "smm_workspaces";

const col = (workspaceId: string, sub: string) =>
  collection(db, ROOT, workspaceId, sub);

const d = (workspaceId: string, sub: string, id: string) =>
  doc(db, ROOT, workspaceId, sub, id);

// ── Brand DNA ─────────────────────────────────────────────────────────────────

/**
 * Suscripción en tiempo real a todos los Brand DNA del workspace.
 * Ordenados por clienteNombre.
 */
export function subscribeBrandDNA(
  workspaceId: string,
  cb: (list: BrandDNA[]) => void,
) {
  return onSnapshot(
    query(col(workspaceId, "prometeo_brand_dna"), orderBy("clienteNombre")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BrandDNA))),
  );
}

/**
 * Obtiene el Brand DNA de un cliente específico (lectura única).
 * Retorna null si no existe.
 */
export async function getBrandDNAByCliente(
  workspaceId: string,
  clienteId:   string,
): Promise<BrandDNA | null> {
  const snap = await getDocs(col(workspaceId, "prometeo_brand_dna"));
  const match = snap.docs.find((d) => d.data().clienteId === clienteId);
  if (!match) return null;
  return { id: match.id, ...match.data() } as BrandDNA;
}

/**
 * Guarda o actualiza el Brand DNA de un cliente.
 * Si existe un documento con ese clienteId, lo actualiza.
 * Si no, crea uno nuevo.
 */
export async function saveBrandDNA(
  workspaceId: string,
  data: Omit<BrandDNA, "id" | "createdAt" | "updatedAt">,
  existingId?: string,
): Promise<string> {
  if (existingId) {
    const ref = d(workspaceId, "prometeo_brand_dna", existingId);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    return existingId;
  }
  const ref = await addDoc(col(workspaceId, "prometeo_brand_dna"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Actualiza campos parciales de un Brand DNA existente.
 */
export async function updateBrandDNA(
  workspaceId: string,
  id:          string,
  patch:       Partial<Omit<BrandDNA, "id" | "createdAt">>,
): Promise<void> {
  await updateDoc(d(workspaceId, "prometeo_brand_dna", id), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

// ── BrandGoals ────────────────────────────────────────────────────────────────

/**
 * Suscripción en tiempo real a todos los objetivos del workspace.
 * Ordenados por fechaLimite ascendente (primero los más urgentes).
 */
export function subscribeGoals(
  workspaceId: string,
  cb: (list: BrandGoal[]) => void,
) {
  return onSnapshot(
    query(col(workspaceId, "prometeo_goals"), orderBy("fechaLimite")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BrandGoal))),
  );
}

/**
 * Crea un nuevo objetivo estratégico.
 */
export async function createGoal(
  workspaceId: string,
  data: Omit<BrandGoal, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const ref = await addDoc(col(workspaceId, "prometeo_goals"), {
    ...data,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

/**
 * Actualiza campos parciales de un BrandGoal existente.
 */
export async function updateGoal(
  workspaceId: string,
  id:          string,
  patch:       Partial<Omit<BrandGoal, "id" | "createdAt">>,
): Promise<void> {
  await updateDoc(d(workspaceId, "prometeo_goals", id), {
    ...patch,
    updatedAt: Date.now(),
  });
}

// ── GoalStates ────────────────────────────────────────────────────────────────

/**
 * Crea un nuevo GoalState (árbol de decisiones para un objetivo).
 */
export async function createGoalState(
  workspaceId: string,
  data: Omit<GoalState, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const ref = await addDoc(col(workspaceId, "prometeo_goal_states"), {
    ...data,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

/**
 * Actualiza el estado del árbol de decisiones de un objetivo.
 */
export async function updateGoalState(
  workspaceId: string,
  id:          string,
  patch:       Partial<Omit<GoalState, "id" | "createdAt">>,
): Promise<void> {
  await updateDoc(d(workspaceId, "prometeo_goal_states", id), {
    ...patch,
    updatedAt: Date.now(),
  });
}

// ── Creative Memory ───────────────────────────────────────────────────────────

/**
 * Suscripción en tiempo real a todos los creativos del workspace.
 * Ordenados por performanceScore descendente (los mejores primero).
 */
export function subscribeCreativeMemory(
  workspaceId: string,
  cb: (list: CreativeMemory[]) => void,
) {
  return onSnapshot(
    query(col(workspaceId, "prometeo_creative_memory"), orderBy("performanceScore", "desc")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CreativeMemory))),
  );
}

/**
 * Registra un nuevo creativo en la Creative Memory.
 */
export async function createCreativeMemory(
  workspaceId: string,
  data: Omit<CreativeMemory, "id" | "createdAt">,
): Promise<string> {
  const ref = await addDoc(col(workspaceId, "prometeo_creative_memory"), {
    ...data,
    createdAt: Date.now(),
  });
  return ref.id;
}

/**
 * Actualiza campos de un CreativeMemory existente.
 */
export async function updateCreativeMemory(
  workspaceId: string,
  id:          string,
  patch:       Partial<Omit<CreativeMemory, "id" | "createdAt">>,
): Promise<void> {
  await updateDoc(d(workspaceId, "prometeo_creative_memory", id), patch);
}
