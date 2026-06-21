import { db } from "@/lib/firebase";
import {
  collection, addDoc, updateDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import type { Proyecto, EstadoProyecto } from "@/extensions/tec-bi/schema";

const COL = "proyectos";

export function subscribeProyectos(cb: (data: Proyecto[]) => void) {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Proyecto));
  });
}

export async function createProyecto(
  data: Omit<Proyecto, "id" | "createdAt" | "updatedAt">
) {
  return addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateProyecto(id: string, data: Partial<Proyecto>) {
  return updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function updateEstadoProyecto(id: string, estado: EstadoProyecto) {
  return updateDoc(doc(db, COL, id), { estado, updatedAt: serverTimestamp() });
}
