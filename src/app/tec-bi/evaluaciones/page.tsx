"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { subscribeEvaluaciones, promedioMetricas } from "@/lib/firestore/evaluaciones";
import { subscribeProyectos } from "@/lib/firestore/proyectos";
import StarRating from "@/components/tec-bi/StarRating";
import { subscribeEmpleados } from "@/lib/firestore/empleados";
import { subscribeProveedores } from "@/lib/firestore/proveedores";
import type { Evaluacion, Proyecto, Empleado, Proveedor } from "@/extensions/tec-bi/schema";

const ACCENT = "#0EA5E9";
const MXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

export default function EvaluacionesPage() {
  const router = useRouter();
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [proyectos, setProyectos]       = useState<Proyecto[]>([]);
  const [empleados, setEmpleados]       = useState<Empleado[]>([]);
  const [proveedores, setProveedores]   = useState<Proveedor[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filterTipo, setFilterTipo]     = useState<string>("Todos");

  useEffect(() => {
    const u1 = subscribeEvaluaciones((d) => { setEvaluaciones(d); setLoading(false); });
    const u2 = subscribeProyectos((d) => setProyectos(d));
    const u3 = subscribeEmpleados((d) => setEmpleados(d));
    const u4 = subscribeProveedores((d) => setProveedores(d));
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const getProy = (id: string) => proyectos.find((p) => p.id === id);
  const getAsignado = (ev: Evaluacion) => {
    const proy = getProy(ev.proyectoId);
    if (!proy) return "—";
    return proy.tipoAsignacion === "Interno"
      ? (empleados.find((e) => e.id === proy.asignadoId)?.nombre ?? "—")
      : (proveedores.find((v) => v.id === proy.asignadoId)?.nombre ?? "—");
  };

  const filtered = evaluaciones.filter((e) =>
    filterTipo === "Todos" || e.tipo === filterTipo
  );

  const avgCalidad = evaluaciones.length > 0
    ? (evaluaciones.reduce((s, e) => s + promedioMetricas(e), 0) / evaluaciones.length).toFixed(1)
    : "—";

  const pctATiempo = evaluaciones.length > 0
    ? Math.round((evaluaciones.filter((e) => e.cumplimientoTiempo === "A tiempo").length / evaluaciones.length) * 100)
    : null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>⭐ Evaluaciones</h1>
          <p style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{evaluaciones.length} evaluaciones registradas</p>
        </div>
        <button
          onClick={() => router.push("/tec-bi/evaluaciones/nueva")}
          style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + Nueva evaluación
        </button>
      </div>

      {/* KPI mini-row */}
      {evaluaciones.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Evaluaciones", value: evaluaciones.length, icon: "📊" },
            { label: "Calidad promedio", value: `${avgCalidad} ★`, icon: "⭐" },
            { label: "A tiempo", value: pctATiempo !== null ? `${pctATiempo}%` : "—", icon: "✅" },
            { label: "Internas", value: evaluaciones.filter((e) => e.tipo === "Interno").length, icon: "👥" },
            { label: "Externas", value: evaluaciones.filter((e) => e.tipo === "Externo").length, icon: "🏢" },
          ].map((k) => (
            <div key={k.label} style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px)", border: "1px solid rgba(14,165,233,0.15)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{k.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1D1D1F" }}>{k.value}</div>
              <div style={{ fontSize: 10, color: "#999" }}>{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["Todos", "Interno", "Externo"].map((t) => (
          <button key={t} onClick={() => setFilterTipo(t)}
            style={{ padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, border: `1px solid ${filterTipo === t ? ACCENT : "#e0e0e0"}`, background: filterTipo === t ? "rgba(14,165,233,0.1)" : "white", color: filterTipo === t ? ACCENT : "#888", cursor: "pointer" }}>
            {t}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p style={{ color: "#aaa", fontSize: 13 }}>Cargando…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", background: "rgba(255,255,255,0.6)", borderRadius: 14, border: "1px dashed rgba(14,165,233,0.2)" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⭐</div>
          <p style={{ color: "#888", fontSize: 13 }}>Aún no hay evaluaciones registradas</p>
          <button onClick={() => router.push("/tec-bi/evaluaciones/nueva")}
            style={{ marginTop: 12, color: ACCENT, background: "none", border: "none", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
            + Crear la primera
          </button>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid rgba(14,165,233,0.15)" }}>
                {["Proyecto", "Tipo", "Evaluado", "Calidad", "Costo", "Tiempo", "Unidades", "Versiones"].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#888", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ev) => {
                const proy = getProy(ev.proyectoId);
                const prom = promedioMetricas(ev);
                const costo = ev.tipo === "Interno"
                  ? ev.datosInternos?.costoTotal
                  : ev.datosExternos?.costoFinal;
                return (
                  <tr key={ev.id}
                    style={{ borderBottom: "1px solid rgba(14,165,233,0.08)", transition: "background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(14,165,233,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1D1D1F", maxWidth: 200 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {proy?.titulo ?? ev.proyectoId}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ background: ev.tipo === "Interno" ? "rgba(123,79,232,0.1)" : "rgba(255,159,10,0.1)", color: ev.tipo === "Interno" ? "#7B4FE8" : "#FF9F0A", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
                        {ev.tipo}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#444" }}>{getAsignado(ev)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <StarRating value={Math.round(prom)} readonly size={14} />
                        <span style={{ fontSize: 11, color: "#666", fontWeight: 600 }}>{prom}</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#444", whiteSpace: "nowrap" }}>
                      {costo ? MXN.format(costo) : <span style={{ color: "#ccc" }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: ev.cumplimientoTiempo === "A tiempo" ? "#34C759" : ev.cumplimientoTiempo === "Temprano" ? "#0EA5E9" : "#FF3B30" }}>
                        {ev.cumplimientoTiempo}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#888" }}>{ev.unidadesProducidas}</td>
                    <td style={{ padding: "10px 12px", color: "#888" }}>{ev.numeroDVersiones}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
