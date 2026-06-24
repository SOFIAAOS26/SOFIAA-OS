// ── Marketing Pro — Helpers Firestore (multi-tenant) ─────────────
import {
  collection, doc, onSnapshot, addDoc, updateDoc,
  deleteDoc, query, serverTimestamp, where,
  QueryConstraint, getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  SmmWorkspace, SmmCliente, SmmMetrica, SmmCalendario, SmmFinanza,
} from "./types";

// ── Colección raíz ────────────────────────────────────────────────
const ROOT = "smm_workspaces";

const col = (workspaceId: string, sub: string) =>
  collection(db, ROOT, workspaceId, sub);

const d = (workspaceId: string, sub: string, id: string) =>
  doc(db, ROOT, workspaceId, sub, id);

// ── Workspaces ────────────────────────────────────────────────────
export const workspacesCol = () => collection(db, ROOT);

export async function createWorkspace(
  data: Omit<SmmWorkspace, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(workspacesCol(), {
    ...data,
    plan: "free",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeWorkspaces(
  cb: (list: SmmWorkspace[]) => void
) {
  return onSnapshot(workspacesCol(), (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SmmWorkspace)))
  );
}

// ── Clientes ──────────────────────────────────────────────────────
export function subscribeClientes(
  workspaceId: string,
  cb: (list: SmmCliente[]) => void
) {
  return onSnapshot(col(workspaceId, "clientes"), (snap) => {
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as SmmCliente))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    cb(list);
  });
}

export async function createCliente(
  workspaceId: string,
  data: Omit<SmmCliente, "id" | "createdAt" | "updatedAt">
) {
  return addDoc(col(workspaceId, "clientes"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCliente(
  workspaceId: string,
  id: string,
  data: Partial<SmmCliente>
) {
  return updateDoc(d(workspaceId, "clientes", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCliente(workspaceId: string, id: string) {
  return deleteDoc(d(workspaceId, "clientes", id));
}

// ── Métricas ──────────────────────────────────────────────────────
export function subscribeMetricas(
  workspaceId: string,
  mes: string,
  cb: (list: SmmMetrica[]) => void
) {
  const constraints: QueryConstraint[] = mes ? [where("mes", "==", mes)] : [];
  const q = query(col(workspaceId, "metricas"), ...constraints);
  return onSnapshot(q, (snap) => {
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as SmmMetrica))
      .sort((a, b) => a.clienteNombre.localeCompare(b.clienteNombre));
    cb(list);
  });
}

export async function upsertMetrica(
  workspaceId: string,
  data: Omit<SmmMetrica, "id" | "createdAt" | "updatedAt">
) {
  // Check if exists for same cliente+plataforma+mes
  const q = query(
    col(workspaceId, "metricas"),
    where("clienteId", "==", data.clienteId),
    where("plataforma", "==", data.plataforma),
    where("mes", "==", data.mes)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    return updateDoc(snap.docs[0].ref, { ...data, updatedAt: serverTimestamp() });
  }
  return addDoc(col(workspaceId, "metricas"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMetrica(workspaceId: string, id: string) {
  return deleteDoc(d(workspaceId, "metricas", id));
}

// ── Calendario ────────────────────────────────────────────────────
export function subscribeCalendario(
  workspaceId: string,
  cb: (list: SmmCalendario[]) => void,
  clienteId?: string
) {
  const constraints: QueryConstraint[] = clienteId ? [where("clienteId", "==", clienteId)] : [];
  const q = query(col(workspaceId, "calendario"), ...constraints);
  return onSnapshot(q, (snap) => {
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as SmmCalendario))
      .sort((a, b) => String(a.fecha ?? "").localeCompare(String(b.fecha ?? "")));
    cb(list);
  });
}

export async function createEntrada(
  workspaceId: string,
  data: Omit<SmmCalendario, "id" | "createdAt" | "updatedAt">
) {
  return addDoc(col(workspaceId, "calendario"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateEntrada(
  workspaceId: string,
  id: string,
  data: Partial<SmmCalendario>
) {
  return updateDoc(d(workspaceId, "calendario", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteEntrada(workspaceId: string, id: string) {
  return deleteDoc(d(workspaceId, "calendario", id));
}

// ── Finanzas ──────────────────────────────────────────────────────
export function subscribeFinanzas(
  workspaceId: string,
  mes: string,
  cb: (list: SmmFinanza[]) => void
) {
  const constraints: QueryConstraint[] = mes ? [where("mes", "==", mes)] : [];
  const q = query(col(workspaceId, "finanzas"), ...constraints);
  return onSnapshot(q, (snap) => {
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as SmmFinanza))
      .sort((a, b) => a.clienteNombre.localeCompare(b.clienteNombre));
    cb(list);
  });
}

export async function upsertFinanza(
  workspaceId: string,
  data: Omit<SmmFinanza, "id" | "createdAt" | "updatedAt">
) {
  const q = query(
    col(workspaceId, "finanzas"),
    where("clienteId", "==", data.clienteId),
    where("mes", "==", data.mes)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    return updateDoc(snap.docs[0].ref, { ...data, updatedAt: serverTimestamp() });
  }
  return addDoc(col(workspaceId, "finanzas"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteFinanza(workspaceId: string, id: string) {
  return deleteDoc(d(workspaceId, "finanzas", id));
}

// ── Helpers de agregación (client-side) ───────────────────────────
export function calcKPIs(metricas: SmmMetrica[], finanzas: SmmFinanza[]) {
  const totalIngresos    = finanzas.reduce((s, f) => s + f.honorarios, 0);
  const totalGastos      = finanzas.reduce((s, f) => s + f.gastos, 0);
  const totalInvPubli    = finanzas.reduce((s, f) => s + f.invPubli, 0);
  const totalRetorno     = finanzas.reduce((s, f) => s + f.retorno, 0);
  const totalLeads       = finanzas.reduce((s, f) => s + f.leads, 0);
  const totalAlcance     = metricas.reduce((s, m) => s + m.alcance, 0);
  const totalEngagement  = metricas.reduce((s, m) => s + m.alcance * m.engagementPct, 0);

  return {
    ingresos:    totalIngresos,
    gastos:      totalGastos,
    margen:      totalIngresos - totalGastos,
    margenPct:   totalIngresos > 0 ? (totalIngresos - totalGastos) / totalIngresos : 0,
    invPubli:    totalInvPubli,
    retorno:     totalRetorno,
    roas:        totalInvPubli > 0 ? totalRetorno / totalInvPubli : 0,
    cpl:         totalLeads > 0 ? totalInvPubli / totalLeads : 0,
    leads:       totalLeads,
    alcance:     totalAlcance,
    engRate:     totalAlcance > 0 ? totalEngagement / totalAlcance : 0,
  };
}
