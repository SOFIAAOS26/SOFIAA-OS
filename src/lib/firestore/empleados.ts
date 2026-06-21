import { db } from "@/lib/firebase";
import {
  collection, addDoc, updateDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import type { Empleado } from "@/extensions/tec-bi/schema";

const COL = "empleados";

export function subscribeEmpleados(cb: (data: Empleado[]) => void) {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Empleado));
  });
}

export async function createEmpleado(
  data: Omit<Empleado, "id" | "createdAt" | "updatedAt">
) {
  return addDoc(collection(db, COL), {
    ...data,
    proyectosTotales: 0,
    horasHombreTotal: 0,
    calidadPromedio: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateEmpleado(id: string, data: Partial<Empleado>) {
  return updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function toggleEmpleado(id: string, activo: boolean) {
  return updateDoc(doc(db, COL, id), { activo, updatedAt: serverTimestamp() });
}
