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
  onSnapshot, query, orderBy, getDoc, getDocs, where,
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

// ── Motor predictivo: recalcular stats desde evaluaciones ────────────────────
//
// Se llama cada vez que se crea una evaluación.
// Flujo:
//   1. Lee el proyecto de la evaluación → obtiene asignadoId + tipoAsignación
//   2. Busca todas las evaluaciones que corresponden a ese asignadoId
//      (via proyectos del mismo asignado)
//   3. Recalcula métricas predictivas y actualiza empleado o proveedor
//   4. Propaga assigneeRisk al proyecto activo si aplica
//
async function updateEntityStatsFromEvaluaciones(
  uid:        string,
  evaluacion: EvaluacionV2 & { id: string },
): Promise<void> {
  try {
    // 1. Obtener el proyecto referenciado
    const proySnap = await getDoc(doc(db, tecBiiPath(uid, "proyecto"), evaluacion.proyectoId));
    if (!proySnap.exists()) return;
    const proyecto = { id: proySnap.id, ...proySnap.data() } as ProyectoV2;
    const { asignadoId, tipoAsignacion } = proyecto;
    if (!asignadoId) return;

    // 2. Buscar todos los proyectos del mismo asignado
    const proySnaps = await getDocs(
      query(collection(db, tecBiiPath(uid, "proyecto")), where("asignadoId", "==", asignadoId))
    );
    const proyectosIds = proySnaps.docs.map((d) => d.id);

    // 3. Buscar todas las evaluaciones de esos proyectos
    const allEvals: EvaluacionV2[] = [];
    for (const pid of proyectosIds) {
      const eSnaps = await getDocs(
        query(collection(db, tecBiiPath(uid, "evaluacion")), where("proyectoId", "==", pid))
      );
      eSnaps.docs.forEach((d) => allEvals.push(d.data() as EvaluacionV2));
    }

    if (allEvals.length === 0) return;

    // 4. Calcular métricas
    const totalEvaluaciones = allEvals.length;

    const calidadPromedio = parseFloat(
      (allEvals.reduce((s, e) => s + (e.metricas?.calidadGeneral ?? 0), 0) / totalEvaluaciones).toFixed(2)
    );

    const aTiempoCount = allEvals.filter(
      (e) => e.cumplimientoTiempo === "A tiempo" || e.cumplimientoTiempo === "Temprano"
    ).length;
    const cumplimientoRate = parseFloat((aTiempoCount / totalEvaluaciones).toFixed(2));

    // Tendencia: comparar promedio última mitad vs primera mitad
    const sorted    = [...allEvals].sort((a, b) => a.createdAt - b.createdAt);
    const half      = Math.floor(sorted.length / 2);
    let tendenciaCalidad: "mejorando" | "estable" | "bajando" = "estable";
    if (sorted.length >= 4) {
      const old = sorted.slice(0, half).reduce((s, e) => s + e.metricas.calidadGeneral, 0) / half;
      const rec = sorted.slice(half).reduce((s, e) => s + e.metricas.calidadGeneral, 0) / (sorted.length - half);
      if (rec - old > 0.3)      tendenciaCalidad = "mejorando";
      else if (old - rec > 0.3) tendenciaCalidad = "bajando";
    }

    const alertaRiesgo = calidadPromedio < 3.0 || cumplimientoRate < 0.6;
    const ultimaEvaluacionAt = Math.max(...allEvals.map((e) => e.createdAt));

    // 5. Actualizar empleado o proveedor
    const entityCol = tipoAsignacion === "Interno" ? "empleado" : "proveedor";
    const entityRef = doc(db, tecBiiPath(uid, entityCol), asignadoId);
    const entitySnap = await getDoc(entityRef);
    if (!entitySnap.exists()) return;

    const statsUpdate: Record<string, unknown> = {
      calidadPromedio,
      cumplimientoRate,
      totalEvaluaciones,
      tendenciaCalidad,
      alertaRiesgo,
      ultimaEvaluacionAt,
      proyectosTotales: proyectosIds.length,
      updatedAt: Date.now(),
    };

    // Para proveedores: calcular variación de costo cotizado vs final
    if (tipoAsignacion === "Externo") {
      const externals = allEvals.filter((e) => e.datosExternos);
      if (externals.length > 0) {
        const varPct = externals.reduce((s, e) => {
          const ext = e.datosExternos!;
          if (!ext.costoCotizado || ext.costoCotizado === 0) return s;
          return s + ((ext.costoFinal - ext.costoCotizado) / ext.costoCotizado) * 100;
        }, 0) / externals.length;
        statsUpdate.variacionCosto = parseFloat(varPct.toFixed(1));
      }
      // reliabilityScore = combinación de calidad y cumplimiento
      statsUpdate.reliabilityScore = parseFloat(
        ((calidadPromedio / 5) * 0.5 + cumplimientoRate * 0.5).toFixed(2)
      );
    }

    await updateDoc(entityRef, statsUpdate);

    // 6. Propagar riesgo al proyecto activo (si no está entregado/cancelado)
    if (proyecto.estado !== "Entregado" && proyecto.estado !== "Cancelado") {
      await updateDoc(doc(db, tecBiiPath(uid, "proyecto"), proyecto.id!), {
        assigneeRisk:         alertaRiesgo,
        assigneeCalidad:      calidadPromedio,
        assigneeCumplimiento: cumplimientoRate,
        updatedAt:            Date.now(),
      });
    }

  } catch {
    // Silenciar — las stats son enriquecimiento opcional, nunca bloquean el CRUD
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
  return onSnapshot(q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProveedorV2)),
    (_err) => cb([])
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
  return onSnapshot(q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClienteInternoV2)),
    (_err) => cb([])
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
  return onSnapshot(q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EvaluacionV2)),
    (_err) => cb([])
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

  // Actualizar stats predictivas del empleado/proveedor (fire-and-forget)
  updateEntityStatsFromEvaluaciones(uid, { ...payload, id: ref.id } as EvaluacionV2 & { id: string })
    .catch(() => {});

  return ref.id;
}

export async function deleteEvaluacionV2(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, tecBiiPath(uid, "evaluacion"), id));
}
