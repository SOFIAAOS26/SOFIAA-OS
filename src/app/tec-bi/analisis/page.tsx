"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { subscribeEvaluaciones } from "@/lib/firestore/evaluaciones";
import { subscribeProyectos } from "@/lib/firestore/proyectos";
import { subscribeProveedores } from "@/lib/firestore/proveedores";
import PageGuard from "@/components/tec-bi/PageGuard";
import { subscribeEmpleados } from "@/lib/firestore/empleados";
import { exportAnalisisPDF } from "@/lib/exportPDF";
import type { Evaluacion, Proyecto, Proveedor, Empleado } from "@/extensions/tec-bi/schema";

const ACCENT  = "#0EA5E9";
const MXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)",
      border: "1px solid rgba(14,165,233,0.15)", borderRadius: 14,
      padding: "20px 22px", ...style,
    }}>
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 12, fontWeight: 700, color: ACCENT, letterSpacing: "0.5px", margin: "0 0 18px", textTransform: "uppercase" }}>{children}</h3>;
}

interface ProyectoEnriquecido {
  titulo: string;
  costo: number;
  valor: number;
  rentabilidad: number;
  tipo: "Interno" | "Externo";
  asignadoNombre: string;
}

interface AuditoriaProveedor {
  nombre: string;
  proyectos: number;
  costoPromedio: number;
  rentabilidadPromedio: number;
  calidadPromedio: number;
  rentable: boolean;
}

export default function AnalisisPage() {
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [proyectos, setProyectos]       = useState<Proyecto[]>([]);
  const [proveedores, setProveedores]   = useState<Proveedor[]>([]);
  const [empleados, setEmpleados]       = useState<Empleado[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    const u1 = subscribeEvaluaciones((d) => { setEvaluaciones(d); setLoading(false); });
    const u2 = subscribeProyectos((d) => setProyectos(d));
    const u3 = subscribeProveedores((d) => setProveedores(d));
    const u4 = subscribeEmpleados((d) => setEmpleados(d));
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  // ── Enriquecer evaluaciones con datos de proyecto ─────────────────────────
  const proyectosData: ProyectoEnriquecido[] = evaluaciones.map((ev) => {
    const proy = proyectos.find((p) => p.id === ev.proyectoId);
    const costo = ev.tipo === "Interno"
      ? (ev.datosInternos?.costoTotal ?? 0)
      : (ev.datosExternos?.costoFinal ?? 0);
    const valor = ev.valorProyecto ?? 0;
    const rentabilidad = valor > 0 ? ((valor - costo) / valor) * 100 : 0;
    const asignadoNombre = proy?.tipoAsignacion === "Interno"
      ? (empleados.find((e) => e.id === proy?.asignadoId)?.nombre ?? "—")
      : (proveedores.find((v) => v.id === proy?.asignadoId)?.nombre ?? "—");
    return {
      titulo: proy?.titulo ?? "Sin nombre",
      costo, valor, rentabilidad,
      tipo: ev.tipo,
      asignadoNombre,
    };
  });

  // ── Datos para gráfica barras ─────────────────────────────────────────────
  const barData = proyectosData.map((p) => ({
    name: p.titulo.length > 18 ? p.titulo.slice(0, 16) + "…" : p.titulo,
    Costo: p.costo,
    Valor: p.valor,
  }));

  // ── Datos para gráfica pastel (horas internas) ────────────────────────────
  const horasNorm  = evaluaciones.reduce((s, e) => s + (e.datosInternos?.horasNormales ?? 0), 0);
  const horasExtra = evaluaciones.reduce((s, e) => s + (e.datosInternos?.horasExtra ?? 0), 0);
  const pieData = horasNorm + horasExtra > 0 ? [
    { name: "Horas normales", value: horasNorm,  color: "#0EA5E9" },
    { name: "Horas extra",    value: horasExtra, color: "#FF9F0A" },
  ] : [];

  // ── Auditoría de proveedores ──────────────────────────────────────────────
  const auditoriaMap = new Map<string, { evals: Evaluacion[]; nombre: string }>();
  evaluaciones.filter((e) => e.tipo === "Externo").forEach((ev) => {
    const proy = proyectos.find((p) => p.id === ev.proyectoId);
    const provId = proy?.asignadoId ?? "";
    const nombre = proveedores.find((v) => v.id === provId)?.nombre ?? provId;
    if (!auditoriaMap.has(provId)) auditoriaMap.set(provId, { evals: [], nombre });
    auditoriaMap.get(provId)!.evals.push(ev);
  });

  const auditoria: AuditoriaProveedor[] = Array.from(auditoriaMap.values()).map(({ evals, nombre }) => {
    const costos = evals.map((e) => e.datosExternos?.costoFinal ?? 0);
    const valores = evals.map((e) => e.valorProyecto ?? 0);
    const costoPromedio = costos.reduce((a, b) => a + b, 0) / costos.length;
    const rentabilidadPromedio = valores.map((v, i) => v > 0 ? ((v - costos[i]) / v) * 100 : 0)
      .reduce((a, b) => a + b, 0) / evals.length;
    const calidadPromedio = evals.map((e) => {
      const m = e.metricas;
      return (m.calidadGeneral + m.creatividad + m.ejecucionTecnica + m.alineacionBrief) / 4;
    }).reduce((a, b) => a + b, 0) / evals.length;
    return { nombre, proyectos: evals.length, costoPromedio, rentabilidadPromedio, calidadPromedio: Math.round(calidadPromedio * 10) / 10, rentable: rentabilidadPromedio >= 0 };
  }).sort((a, b) => b.rentabilidadPromedio - a.rentabilidadPromedio);

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const costoTotalInterno = proyectosData.filter((p) => p.tipo === "Interno").reduce((s, p) => s + p.costo, 0);
  const costoTotalExterno = proyectosData.filter((p) => p.tipo === "Externo").reduce((s, p) => s + p.costo, 0);
  const valorTotal = proyectosData.reduce((s, p) => s + p.valor, 0);
  const rentabilidadGlobal = valorTotal > 0 ? (((valorTotal - costoTotalInterno - costoTotalExterno) / valorTotal) * 100).toFixed(1) : null;

  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAnalisisPDF({
        costoInterno: costoTotalInterno,
        costoExterno: costoTotalExterno,
        valorTotal,
        rentabilidadGlobal,
        proyectos: proyectosData,
        auditoria,
      });
    } finally { setExporting(false); }
  };

  if (loading) return <p style={{ color: "#aaa", fontSize: 13 }}>Cargando datos…</p>;

  if (evaluaciones.length === 0) return (
    <div style={{ textAlign: "center", padding: "64px 0" }}>
      <PageGuard section="analisis" />
      <div style={{ fontSize: 40, marginBottom: 12 }}>💰</div>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: "#1D1D1F", margin: "0 0 8px" }}>Sin datos aún</h2>
      <p style={{ fontSize: 13, color: "#888" }}>Registra evaluaciones para ver el análisis de costos.</p>
    </div>
  );

  return (
    <div>
      <PageGuard section="analisis" />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1D1D1F", margin: "0 0 4px" }}>💰 Análisis de Costos</h1>
          <p style={{ fontSize: 12, color: "#888", margin: 0 }}>Rentabilidad, costos y auditoría de recursos</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || evaluaciones.length === 0}
          style={{ background: "#0EA5E9", color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: exporting ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }}
        >
          {exporting ? "⏳ Generando…" : "⬇️ Exportar PDF"}
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Costo Interno Total",  value: MXN.format(costoTotalInterno), icon: "👥", color: "#7B4FE8" },
          { label: "Costo Externo Total",  value: MXN.format(costoTotalExterno), icon: "🏢", color: "#FF9F0A" },
          { label: "Valor Total Generado", value: MXN.format(valorTotal),        icon: "💎", color: "#34C759" },
          { label: "Rentabilidad Global",  value: rentabilidadGlobal ? `${rentabilidadGlobal}%` : "—", icon: "📈", color: rentabilidadGlobal && Number(rentabilidadGlobal) >= 0 ? "#34C759" : "#FF3B30" },
        ].map((k) => (
          <Card key={k.label}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>{k.label}</div>
          </Card>
        ))}
      </div>

      {/* Gráfica barras: Costo vs Valor */}
      {barData.length > 0 && (
        <Card style={{ marginBottom: 20 }}>
          <CardTitle>Costo vs Valor por Proyecto</CardTitle>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.1)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} angle={-35} textAnchor="end" />
              <YAxis tick={{ fontSize: 10, fill: "#888" }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: unknown) => MXN.format(Number(v ?? 0))} contentStyle={{ borderRadius: 8, border: "1px solid rgba(14,165,233,0.2)", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="Costo" fill="#7B4FE8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Valor" fill="#34C759" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Pie: horas normales vs extra */}
        {pieData.length > 0 && (
          <Card>
            <CardTitle>Distribución de Horas (Proyectos Internos)</CardTitle>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ name, percent }: { name?: string; percent?: number }) => `${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip formatter={(v: unknown) => `${v ?? 0}h`} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ textAlign: "center", marginTop: 8 }}>
              {horasExtra > 0 && horasNorm > 0 && (
                <p style={{ fontSize: 11, color: horasExtra / horasNorm > 0.3 ? "#FF9F0A" : "#888", margin: 0 }}>
                  {horasExtra / horasNorm > 0.3 ? "⚠️ Alto porcentaje de horas extra" : "✅ Distribución de horas saludable"}
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Rentabilidad por proyecto */}
        {proyectosData.length > 0 && (
          <Card>
            <CardTitle>Rentabilidad por Proyecto</CardTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto" }}>
              {proyectosData.map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(14,165,233,0.07)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#1D1D1F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.titulo}</div>
                    <div style={{ fontSize: 10, color: "#999" }}>{p.asignadoNombre}</div>
                  </div>
                  <div style={{ textAlign: "right", marginLeft: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: p.rentabilidad >= 0 ? "#34C759" : "#FF3B30" }}>
                      {p.rentabilidad >= 0 ? "+" : ""}{p.rentabilidad.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 10, color: "#aaa" }}>{MXN.format(p.valor - p.costo)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Auditoría de proveedores */}
      {auditoria.length > 0 && (
        <Card>
          <CardTitle>Auditoría de Proveedores</CardTitle>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid rgba(14,165,233,0.15)" }}>
                  {["", "Proveedor", "Proyectos", "Costo Prom.", "Calidad Prom.", "Rentabilidad"].map((h) => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#888" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditoria.map((a, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(14,165,233,0.08)", background: a.rentable ? "transparent" : "rgba(255,59,48,0.02)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(14,165,233,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = a.rentable ? "transparent" : "rgba(255,59,48,0.02)")}>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: a.rentable ? "#34C759" : "#FF3B30" }} />
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1D1D1F" }}>{a.nombre}</td>
                    <td style={{ padding: "10px 12px", color: "#666" }}>{a.proyectos}</td>
                    <td style={{ padding: "10px 12px", color: "#444" }}>{MXN.format(a.costoPromedio)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ color: "#FF9F0A", fontWeight: 600 }}>{a.calidadPromedio} ★</span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ background: a.rentable ? "rgba(52,199,89,0.12)" : "rgba(255,59,48,0.1)", color: a.rentable ? "#34C759" : "#FF3B30", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99 }}>
                        {a.rentable ? "+" : ""}{a.rentabilidadPromedio.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11, color: "#aaa", margin: "12px 0 0" }}>
            🔴 Rojo = el costo supera el valor generado. 🟢 Verde = el proyecto es rentable.
          </p>
        </Card>
      )}
    </div>
  );
}
