/**
 * TEC Bii — GET /api/tec-bii/risk
 * Sprint P-1: Predictive Cycle
 *
 * Devuelve entidades en riesgo calculadas automáticamente
 * desde el historial de evaluaciones:
 * - Empleados con alertaRiesgo = true
 * - Proveedores con alertaRiesgo = true
 * - Proyectos activos con assigneeRisk = true
 */

import { NextRequest, NextResponse }   from "next/server";
import { getAuth }                      from "firebase-admin/auth";
import { getAdminDb, getAdminApp }      from "@/lib/firebase-admin";
import { tecBiiPath }                   from "@/lib/tec-bii/collections";
import type { EmpleadoV2, ProveedorV2, ProyectoV2 } from "@/extensions/tec-bii/schema";

// ── Auth ──────────────────────────────────────────────────────────────────────

async function getUid(req: NextRequest): Promise<string | null> {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    return decoded.uid;
  } catch { return null; }
}

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface RiskEmpleado {
  id:                string;
  nombre:            string;
  puesto:            string;
  calidadPromedio:   number;
  cumplimientoRate:  number;
  totalEvaluaciones: number;
  tendenciaCalidad:  "mejorando" | "estable" | "bajando";
  ultimaEvaluacionAt?: number;
}

export interface RiskProveedor {
  id:                string;
  nombre:            string;
  tipoServicio:      string;
  calidadPromedio:   number;
  cumplimientoRate:  number;
  totalEvaluaciones: number;
  tendenciaCalidad:  "mejorando" | "estable" | "bajando";
  variacionCosto?:   number;
  ultimaEvaluacionAt?: number;
}

export interface RiskProyecto {
  id:                   string;
  titulo:               string;
  estado:               string;
  asignadoId:           string;
  asignadoNombre?:      string;
  assigneeCalidad?:     number;
  assigneeCumplimiento?: number;
}

export interface RiskResponse {
  success:     boolean;
  empleados:   RiskEmpleado[];
  proveedores: RiskProveedor[];
  proyectos:   RiskProyecto[];
  totalRiesgo: number;
  generadoEn:  number;
  error?:      string;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const uid = await getUid(req);
  if (!uid) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }

  try {
    const db = getAdminDb();

    // Leer todo en paralelo — Firestore Admin SDK no filtra booleanos directamente
    // así que leemos todos y filtramos en memoria (colecciones pequeñas)
    const [snapEmp, snapProv, snapProy] = await Promise.all([
      db.collection(tecBiiPath(uid, "empleado")).get(),
      db.collection(tecBiiPath(uid, "proveedor")).get(),
      db.collection(tecBiiPath(uid, "proyecto")).get(),
    ]);

    // Empleados en riesgo
    const empleados: RiskEmpleado[] = snapEmp.docs
      .map((d) => ({ id: d.id, ...d.data() }) as EmpleadoV2)
      .filter((e) => e.alertaRiesgo === true && (e.totalEvaluaciones ?? 0) > 0)
      .map((e) => ({
        id:                e.id!,
        nombre:            e.nombre,
        puesto:            e.puesto,
        calidadPromedio:   e.calidadPromedio ?? 0,
        cumplimientoRate:  e.cumplimientoRate ?? 0,
        totalEvaluaciones: e.totalEvaluaciones ?? 0,
        tendenciaCalidad:  e.tendenciaCalidad ?? "estable",
        ultimaEvaluacionAt: e.ultimaEvaluacionAt,
      }));

    // Proveedores en riesgo
    const proveedores: RiskProveedor[] = snapProv.docs
      .map((d) => ({ id: d.id, ...d.data() }) as ProveedorV2)
      .filter((p) => p.alertaRiesgo === true && (p.totalEvaluaciones ?? 0) > 0)
      .map((p) => ({
        id:                p.id!,
        nombre:            p.nombre,
        tipoServicio:      p.tipoServicio,
        calidadPromedio:   p.calidadPromedio ?? 0,
        cumplimientoRate:  p.cumplimientoRate ?? 0,
        totalEvaluaciones: p.totalEvaluaciones ?? 0,
        tendenciaCalidad:  p.tendenciaCalidad ?? "estable",
        variacionCosto:    p.variacionCosto,
        ultimaEvaluacionAt: p.ultimaEvaluacionAt,
      }));

    // Proyectos activos con asignado en riesgo
    const ESTADOS_ACTIVOS = ["Pendiente", "En producción", "En revisión"];
    const proyectos: RiskProyecto[] = snapProy.docs
      .map((d) => ({ id: d.id, ...d.data() }) as ProyectoV2)
      .filter((p) => p.assigneeRisk === true && ESTADOS_ACTIVOS.includes(p.estado))
      .map((p) => ({
        id:                   p.id!,
        titulo:               p.titulo,
        estado:               p.estado,
        asignadoId:           p.asignadoId,
        assigneeCalidad:      p.assigneeCalidad,
        assigneeCumplimiento: p.assigneeCumplimiento,
      }));

    // Enriquecer proyectos con nombre del asignado
    const allEmpleados = snapEmp.docs.map((d) => ({ id: d.id, ...d.data() }) as EmpleadoV2);
    const allProveedores = snapProv.docs.map((d) => ({ id: d.id, ...d.data() }) as ProveedorV2);

    const proyectosEnriquecidos = proyectos.map((p) => {
      const emp  = allEmpleados.find((e) => e.id === p.asignadoId);
      const prov = allProveedores.find((v) => v.id === p.asignadoId);
      return { ...p, asignadoNombre: emp?.nombre ?? prov?.nombre ?? p.asignadoId };
    });

    const response: RiskResponse = {
      success:     true,
      empleados,
      proveedores,
      proyectos:   proyectosEnriquecidos,
      totalRiesgo: empleados.length + proveedores.length,
      generadoEn:  Date.now(),
    };

    return NextResponse.json(response);
  } catch (e) {
    console.error("[tec-bii/risk]", e);
    return NextResponse.json(
      { success: false, error: "Error leyendo datos de riesgo" },
      { status: 500 }
    );
  }
}
