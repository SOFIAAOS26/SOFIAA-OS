/**
 * TEC Bii — Firestore CRUD V2 (Sprint T2-1)
 * RUMBO A TIER 4
 *
 * CRUD cliente-side para todas las entidades TEC Bii.
 * Cada create/update dispara un publish cognitivo al Experience Graph
 * de forma no bloqueante (fire-and-forget via POST /api/tec-bii/publish).
 *
 * Colecciones: users/{uid}/tec_bii/{type}s/{docId}
 */

import { db, auth }  from "@/lib/firebase";
import {
  collection, addDoc, updateDoc, doc, deleteDoc,
  onSnapshot, query, orderBy, getDoc,
} from "firebase/firestore";
import { tecBiiPath } from "@/lib/tec-bii/collections";
import {
  EMPTY_FOOTPRINT,
  type ProyectoV2,
  type BriefV2,
  type EmpleadoV2,
  type ProveedorV2,
  type ClienteInternoV2,
  type EvaluacionV2,
  type TecBiiEntityType,
} from "@/extensions/tec-bii/schema";

// ── Cognitive publish (fire-and-forget) ───────────────────────────────────────

async function triggerCognitivePublish(
  entityType: TecBiiEntityType,
  entityId:   string,
  entity:     Record<string, unknown>,
): Promise<void> {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    // No awaited — no bloquea el CRUD
    fetch("/api/tec-bii/publish", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ entityType, entityId, entity }),
    }).catch(() => {}); // Silenciar errores de red — publish es opcional
  } catch {
    // Silenciar — publish nunca bloquea ni propaga errores al usuario
  }
}

// ── Proyectos ─────────────────────────────────────────────────────────────────

export function subscribeProyectosV2(uid: string, cb: (data: ProyectoV2[]) => void) {
  const q = query(
    collection(db, tecBiiPath(uid, "proyecto")),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProyectoV2)),
    (_err) => cb([]) // permission denied u otro error → vacío, no crash
  );
}

export async function createProyectoV2(
  uid:  string,
  data: Omit<ProyectoV2, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const now = Date.now();
  const payload: Omit<ProyectoV2, "id"> = {
    ...EMPTY_FOOTPRINT,
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await addDoc(collection(db, tecBiiPath(uid, "proyecto")), payload);
  triggerCognitivePublish("proyecto", ref.id, { ...payload, id: ref.id });
  return ref.id;
}

export async function updateProyectoV2(
  uid:  string,
  id:   string,
  data: Partial<ProyectoV2>,
): Promise<void> {
  const updated = { ...data, updatedAt: Date.now() };
  await updateDoc(doc(db, tecBiiPath(uid, "proyecto"), id), updated);
  const snap = await getDoc(doc(db, tecBiiPath(uid, "proyecto"), id));
  if (snap.exists()) triggerCognitivePublish("proyecto", id, { id, ...snap.data() });
}

export async function deleteProyectoV2(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, tecBiiPath(uid, "proyecto"), id));
}

// ── Briefs ────────────────────────────────────────────────────────────────────

export function subscribeBriefsV2(uid: string, cb: (data: BriefV2[]) => void) {
  const q = query(
    collection(db, tecBiiPath(uid, "brief")),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BriefV2)),
    (_err) => cb([])
  );
}

export async function createBriefV2(
  uid:  string,
  data: Omit<BriefV2, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const now = Date.now();
  const payload: Omit<BriefV2, "id"> = {
    ...EMPTY_FOOTPRINT,
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await addDoc(collection(db, tecBiiPath(uid, "brief")), payload);
  triggerCognitivePublish("brief", ref.id, { ...payload, id: ref.id });
  return ref.id;
}

export async function updateBriefV2(
  uid:  string,
  id:   string,
  data: Partial<BriefV2>,
): Promise<void> {
  const updated = { ...data, updatedAt: Date.now() };
  await updateDoc(doc(db, tecBiiPath(uid, "brief"), id), updated);
  const snap = await getDoc(doc(db, tecBiiPath(uid, "brief"), id));
  if (snap.exists()) triggerCognitivePublish("brief", id, { id, ...snap.data() });
}

export async function deleteBriefV2(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, tecBiiPath(uid, "brief"), id));
}

// ── Empleados ─────────────────────────────────────────────────────────────────

export function subscribeEmpleadosV2(uid: string, cb: (data: EmpleadoV2[]) => void) {
  const q = query(
    collection(db, tecBiiPath(uid, "empleado")),
    orderBy("nombre", "asc"),
  );
  return onSnapshot(q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EmpleadoV2)),
    (_err) => cb([])
  );
}

export async function createEmpleadoV2(
  uid:  string,
  data: Omit<EmpleadoV2, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const now = Date.now();
  const payload: Omit<EmpleadoV2, "id"> = {
    ...EMPTY_FOOTPRINT,
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await addDoc(collection(db, tecBiiPath(uid, "empleado")), payload);
  triggerCognitivePublish("empleado", ref.id, { ...payload, id: ref.id });
  return ref.id;
}

export async function updateEmpleadoV2(
  uid:  string,
  id:   string,
  data: Partial<EmpleadoV2>,
): Promise<void> {
  await updateDoc(doc(db, tecBiiPath(uid, "empleado"), id), { ...data, updatedAt: Date.now() });
  const snap = await getDoc(doc(db, tecBiiPath(uid, "empleado"), id));
  if (snap.exists()) triggerCognitivePublish("empleado", id, { id, ...snap.data() });
}

export async function deleteEmpleadoV2(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, tecBiiPath(uid, "empleado"), id));
}

// ── Proveedores ───────────────────────────────────────────────────────────────

export function subscribeProveedoresV2(uid: string, cb: (data: ProveedorV2[]) => void) {
  const q = query(
    collection(db, tecBiiPath(uid, "proveedor")),
    orderBy("nombre", "asc"),
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProveedorV2))
  );
}

export async function createProveedorV2(
  uid:  string,
  data: Omit<ProveedorV2, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const now = Date.now();
  const payload: Omit<ProveedorV2, "id"> = {
    ...EMPTY_FOOTPRINT,
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await addDoc(collection(db, tecBiiPath(uid, "proveedor")), payload);
  triggerCognitivePublish("proveedor", ref.id, { ...payload, id: ref.id });
  return ref.id;
}

export async function updateProveedorV2(
  uid:  string,
  id:   string,
  data: Partial<ProveedorV2>,
): Promise<void> {
  await updateDoc(doc(db, tecBiiPath(uid, "proveedor"), id), { ...data, updatedAt: Date.now() });
  const snap = await getDoc(doc(db, tecBiiPath(uid, "proveedor"), id));
  if (snap.exists()) triggerCognitivePublish("proveedor", id, { id, ...snap.data() });
}

export async function deleteProveedorV2(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, tecBiiPath(uid, "proveedor"), id));
}

// ── Clientes internos ─────────────────────────────────────────────────────────

export function subscribeClientesV2(uid: string, cb: (data: ClienteInternoV2[]) => void) {
  const q = query(
    collection(db, tecBiiPath(uid, "cliente")),
    orderBy("departamento", "asc"),
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClienteInternoV2))
  );
}

export async function createClienteV2(
  uid:  string,
  data: Omit<ClienteInternoV2, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const now = Date.now();
  const payload: Omit<ClienteInternoV2, "id"> = {
    ...EMPTY_FOOTPRINT,
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await addDoc(collection(db, tecBiiPath(uid, "cliente")), payload);
  triggerCognitivePublish("cliente", ref.id, { ...payload, id: ref.id });
  return ref.id;
}

export async function updateClienteV2(
  uid:  string,
  id:   string,
  data: Partial<ClienteInternoV2>,
): Promise<void> {
  await updateDoc(doc(db, tecBiiPath(uid, "cliente"), id), { ...data, updatedAt: Date.now() });
  const snap = await getDoc(doc(db, tecBiiPath(uid, "cliente"), id));
  if (snap.exists()) triggerCognitivePublish("cliente", id, { id, ...snap.data() });
}

export async function deleteClienteV2(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, tecBiiPath(uid, "cliente"), id));
}

// ── Evaluaciones ──────────────────────────────────────────────────────────────

export function subscribeEvaluacionesV2(uid: string, cb: (data: EvaluacionV2[]) => void) {
  const q = query(
    collection(db, tecBiiPath(uid, "evaluacion")),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EvaluacionV2))
  );
}

export async function createEvaluacionV2(
  uid:  string,
  data: Omit<EvaluacionV2, "id" | "createdAt">,
): Promise<string> {
  const now = Date.now();
  const payload: Omit<EvaluacionV2, "id"> = {
    ...EMPTY_FOOTPRINT,
    ...data,
    createdAt: now,
  };
  const ref = await addDoc(collection(db, tecBiiPath(uid, "evaluacion")), payload);
  triggerCognitivePublish("evaluacion", ref.id, { ...payload, id: ref.id });
  return ref.id;
}

export async function deleteEvaluacionV2(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, tecBiiPath(uid, "evaluacion"), id));
}
