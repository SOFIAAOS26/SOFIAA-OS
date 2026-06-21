import { db } from "@/lib/firebase";
import {
  collection, addDoc, updateDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import type { Brief, EstadoBrief } from "@/extensions/tec-bi/schema";

const COL = "briefs";

export function subscribeBriefs(cb: (data: Brief[]) => void) {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Brief));
  });
}

export async function createBrief(
  data: Omit<Brief, "id" | "createdAt" | "updatedAt" | "margenDias">
) {
  return addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateBrief(id: string, data: Partial<Brief>) {
  return updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function updateEstadoBrief(id: string, estado: EstadoBrief) {
  return updateDoc(doc(db, COL, id), { estado, updatedAt: serverTimestamp() });
}

/** Días hábiles entre dos fechas (lunes-viernes) */
export function calcularMargenDias(inicio: Date, fin: Date): number {
  let count = 0;
  const cur = new Date(inicio);
  while (cur < fin) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}
