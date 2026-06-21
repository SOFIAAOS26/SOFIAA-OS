import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, query, where, orderBy, limit,
} from "firebase/firestore";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [empSnap, provSnap, cliSnap, briefSnap, proySnap, evalSnap] = await Promise.all([
      getDocs(query(collection(db, "empleados"),       where("activo", "==", true))),
      getDocs(query(collection(db, "proveedores"),     where("activo", "==", true))),
      getDocs(query(collection(db, "clientes_internos"), where("activo", "==", true))),
      getDocs(query(collection(db, "briefs"),          where("activo", "==", true))),
      getDocs(query(collection(db, "proyectos"),       where("activo", "==", true))),
      getDocs(query(collection(db, "evaluaciones"),    orderBy("createdAt", "desc"), limit(100))),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const evals     = evalSnap.docs.map((d) => d.data()) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proyectos = proySnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const empleados = empSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proveedores = provSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

    // ── KPIs financieros ────────────────────────────────────────────────────
    const costoTotal = evals.reduce((s: number, e: any) =>
      s + (e.tipo === "Interno" ? (e.datosInternos?.costoTotal ?? 0) : (e.datosExternos?.costoFinal ?? 0)), 0);
    const valorTotal = evals.reduce((s: number, e: any) => s + (e.valorProyecto ?? 0), 0);
    const rentabilidadGlobal = valorTotal > 0
      ? (((valorTotal - costoTotal) / valorTotal) * 100).toFixed(1)
      : null;

    const calidadPromedio = evals.length > 0
      ? (evals.reduce((s: number, e: any) => {
          const m = e.metricas ?? {};
          return s + ((m.calidadGeneral ?? 0) + (m.creatividad ?? 0) + (m.ejecucionTecnica ?? 0) + (m.alineacionBrief ?? 0)) / 4;
        }, 0) / evals.length).toFixed(1)
      : null;

    const pctATiempo = evals.length > 0
      ? Math.round((evals.filter((e: any) => e.cumplimientoTiempo === "A tiempo").length / evals.length) * 100)
      : null;

    // ── Proyectos por estado ─────────────────────────────────────────────────
    const estadosProyecto = proyectos.reduce((acc: Record<string, number>, p: any) => {
      acc[p.estado] = (acc[p.estado] ?? 0) + 1;
      return acc;
    }, {});

    // ── Top empleados ────────────────────────────────────────────────────────
    const topEmpleados = empleados
      .filter((e: any) => (e.calidadPromedio ?? 0) > 0)
      .sort((a: any, b: any) => (b.calidadPromedio ?? 0) - (a.calidadPromedio ?? 0))
      .slice(0, 3)
      .map((e: any) => `${e.nombre} (★${e.calidadPromedio}, ${e.proyectosTotales ?? 0} proyectos)`);

    // ── Proveedores ───────────────────────────────────────────────────────────
    const provConRent = proveedores.filter((p: any) => p.rentabilidadPromedio !== undefined);
    const provRentables = provConRent.filter((p: any) => p.rentabilidadPromedio >= 0).length;

    const MXN = new Intl.NumberFormat("es-MX", {
      style: "currency", currency: "MXN", maximumFractionDigits: 0,
    });

    const estadoLines = Object.entries(estadosProyecto)
      .map(([estado, count]) => `- ${estado}: ${count}`)
      .join("\n");

    const topEmpleadosBlock = topEmpleados.length > 0
      ? `### Top empleados por calidad\n${topEmpleados.map((e: string) => `- ${e}`).join("\n")}\n`
      : "";

    const provBlock = provConRent.length > 0
      ? `### Proveedores: ${provRentables}/${provConRent.length} rentables\n`
      : "";

    const summary = [
      `## DATOS EN TIEMPO REAL — TEC BI`,
      `Actualizado: ${new Date().toLocaleString("es-MX", { dateStyle: "full", timeStyle: "short" })}`,
      ``,
      `### Catálogos activos`,
      `- Empleados: ${empSnap.size}`,
      `- Proveedores: ${provSnap.size}`,
      `- Clientes internos: ${cliSnap.size}`,
      `- Briefs: ${briefSnap.size}`,
      `- Proyectos: ${proySnap.size}`,
      `- Evaluaciones: ${evalSnap.size}`,
      ``,
      `### KPIs financieros`,
      `- Costo total acumulado: ${MXN.format(costoTotal)}`,
      `- Valor total generado: ${MXN.format(valorTotal)}`,
      rentabilidadGlobal ? `- Rentabilidad global: ${rentabilidadGlobal}%` : "",
      calidadPromedio    ? `- Calidad promedio (0–5): ${calidadPromedio}` : "",
      pctATiempo !== null ? `- Entregas a tiempo: ${pctATiempo}%` : "",
      ``,
      estadoLines ? `### Proyectos por estado\n${estadoLines}` : "",
      ``,
      topEmpleadosBlock,
      provBlock,
    ].filter(Boolean).join("\n");

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("[TEC BI summary]", error);
    return NextResponse.json({ summary: "", error: String(error) });
  }
}
