import { db } from "@/lib/firebase";
import {
  collection, addDoc, updateDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import type { Proveedor } from "@/extensions/tec-bi/schema";

const COL = "proveedores";

export function subscribeProveedores(cb: (data: Proveedor[]) => void) {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Proveedor));
  });
}

export async function createProveedor(
  data: Omit<Proveedor, "id" | "createdAt" | "updatedAt">
) {
  return addDoc(collection(db, COL), {
    ...data,
    proyectosTotales: 0,
    costoPromedio: null,
    rentabilidadPromedio: null,
    calidadPromedio: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateProveedor(id: string, data: Partial<Proveedor>) {
  return updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function toggleProveedor(id: string, activo: boolean) {
  return updateDoc(doc(db, COL, id), { activo, updatedAt: serverTimestamp() });
}
