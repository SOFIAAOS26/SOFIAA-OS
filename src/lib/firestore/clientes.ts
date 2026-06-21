import { db } from "@/lib/firebase";
import {
  collection, addDoc, updateDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import type { ClienteInterno } from "@/extensions/tec-bi/schema";

const COL = "clientes_internos";

export function subscribeClientes(cb: (data: ClienteInterno[]) => void) {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClienteInterno));
  });
}

export async function createCliente(
  data: Omit<ClienteInterno, "id" | "createdAt" | "updatedAt">
) {
  return addDoc(collection(db, COL), {
    ...data,
    briefsTotales: 0,
    proyectosCompletados: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCliente(id: string, data: Partial<ClienteInterno>) {
  return updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function toggleCliente(id: string, activo: boolean) {
  return updateDoc(doc(db, COL, id), { activo, updatedAt: serverTimestamp() });
}
