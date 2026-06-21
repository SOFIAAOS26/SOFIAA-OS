import { db } from "@/lib/firebase";
import {
  collection, addDoc, updateDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp,
  getDocs, where,
} from "firebase/firestore";
import type { Evaluacion } from "@/extensions/tec-bi/schema";

const COL = "evaluaciones";

export function subscribeEvaluaciones(cb: (data: Evaluacion[]) => void) {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Evaluacion));
  });
}

export async function createEvaluacion(
  data: Omit<Evaluacion, "id" | "createdAt">
) {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    fecha: data.fecha ?? new Date(),
    createdAt: serverTimestamp(),
  });

  // Actualizar acumulados del empleado o proveedor
  await recalcularAcumulados(data.proyectoId, data.tipo, ref.id);
  return ref;
}

export async function updateEvaluacion(id: string, data: Partial<Evaluacion>) {
  await updateDoc(doc(db, COL, id), { ...data });
}

/** Recalcula calidadPromedio y proyectosTotales en empleado o proveedor */
async function recalcularAcumulados(
  proyectoId: string,
  tipo: "Interno" | "Externo",
  _newId: string
) {
  try {
    // Obtener el proyecto para saber a quién actualizar
    const { getDoc } = await import("firebase/firestore");
    const proySnap = await getDoc(doc(db, "proyectos", proyectoId));
    if (!proySnap.exists()) return;
    const proy = proySnap.data();
    const asignadoId = proy.asignadoId as string;
    const colTarget = tipo === "Interno" ? "empleados" : "proveedores";

    // Obtener todas las evaluaciones de proyectos de este asignado
    const provSnap = await getDocs(
      query(collection(db, COL), where("tipo", "==", tipo))
    );

    const evals = provSnap.docs.map((d) => d.data() as Evaluacion);

    // Filtrar solo las del asignado (via proyectos)
    // Simplificado: calculamos promedio de todas las evaluaciones del mismo tipo por ahora
    // En Sprint 5 se mejora con un index más eficiente
    const promedioCalidad =
      evals.length > 0
        ? evals.reduce((s, e) => {
            const { calidadGeneral, creatividad, ejecucionTecnica, alineacionBrief } = e.metricas;
            return s + (calidadGeneral + creatividad + ejecucionTecnica + alineacionBrief) / 4;
          }, 0) / evals.length
        : null;

    await updateDoc(doc(db, colTarget, asignadoId), {
      proyectosTotales: evals.length,
      calidadPromedio: promedioCalidad ? Math.round(promedioCalidad * 10) / 10 : null,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("No se pudo actualizar acumulados:", e);
  }
}

/** Promedio de las 4 métricas cualitativas */
export function promedioMetricas(e: Evaluacion): number {
  const { calidadGeneral, creatividad, ejecucionTecnica, alineacionBrief } = e.metricas;
  return Math.round(((calidadGeneral + creatividad + ejecucionTecnica + alineacionBrief) / 4) * 10) / 10;
}
