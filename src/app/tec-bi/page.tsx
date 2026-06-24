"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { tecBiExtension } from "@/extensions/tec-bi/manifest";
import { subscribeEvaluaciones, promedioMetricas } from "@/lib/firestore/evaluaciones";
import { subscribeProyectos } from "@/lib/firestore/proyectos";
import type { Evaluacion, Proyecto } from "@/extensions/tec-bi/schema";
import PageGuard from "@/components/tec-bi/PageGuard";

const ACCENT = tecBiExtension.theme.badgeColor;
const MXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

const MODULES = [
  { path: "/tec-bi/proyectos",    icon: "🎬", label: "Proyectos",          desc: "Tracking nacional y campus" },
  { path: "/tec-bi/briefs",       icon: "📋", label: "Briefs",             desc: "Solicitudes de clientes internos" },
  { path: "/tec-bi/empleados",    icon: "👥", label: "Empleados",          desc: "Equipo, horas y rendimiento" },
  { path: "/tec-bi/proveedores",  icon: "🏢", label: "Proveedores",        desc: "Agencias y casas productoras" },
  { path: "/tec-bi/clientes",     icon: "🎓", label: "Clientes Internos",  desc: "Departamentos del TEC" },
  { path: "/tec-bi/evaluaciones", icon: "⭐", label: "Evaluaciones",       desc: "Calificación por proyecto" },
  { path: "/tec-bi/analisis",     icon: "💰", label: "Análisis de Costos", desc: "Rentabilidad y auditoría" },
  { path: "/tec-bi/roi",          icon: "📈", label: "Simulador ROI",      desc: "Proyecciones y recomendaciones" },
];

export default function TecBiDashboard() {
  const router = useRouter();
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [proyectos, setProyectos]       = useState<Proyecto[]>([]);

  useEffect(() => {
    const u1 = subscribeEvaluaciones((d) => setEvaluaciones(d));
    const u2 = subscribeProyectos((d) => setProyectos(d));
    return () => { u1(); u2(); };
  }, []);

  // ── KPIs calculados ────────────────────────────────────────────────────────
  const proyectosActivos = proyectos.filter((p) =>
    p.estado !== "Entregado" && p.estado !== "Cancelado"
  ).length;

  const calidadPromedio = evaluaciones.length > 0
    ? (evaluaciones.reduce((s, e) => s + promedioMetricas(e), 0) / evaluaciones.length).toFixed(1)
    : null;

  const pctATiempo = evaluaciones.length > 0
    ? Math.round((evaluaciones.filter((e) => e.cumplimientoTiempo === "A tiempo").length / evaluaciones.length) * 100)
    : null;

  const costoTotal = evaluaciones.reduce((s, e) =>
    s + (e.tipo === "Interno" ? (e.datosInternos?.costoTotal ?? 0) : (e.datosExternos?.costoFinal ?? 0)), 0);
  const valorTotal = evaluaciones.reduce((s, e) => s + (e.valorProyecto ?? 0), 0);
  const rentabilidadGlobal = valorTotal > 0
    ? (((valorTotal - costoTotal) / valorTotal) * 100).toFixed(1)
    : null;

  const kpis = [
    {
      label: "Proyectos activos",
      value: proyectos.length === 0 && evaluaciones.length === 0 ? "—" : String(proyectosActivos),
      icon: "🎬",
      color: ACCENT,
    },
    {
      label: "Calidad promedio",
      value: calidadPromedio ? `${calidadPromedio} ★` : "—",
      icon: "⭐",
      color: "#FF9F0A",
    },
    {
      label: "Entregas a tiempo",
      value: pctATiempo !== null ? `${pctATiempo}%` : "—",
      icon: "✅",
      color: "#34C759",
    },
    {
      label: "Rentabilidad global",
      value: rentabilidadGlobal ? `${rentabilidadGlobal}%` : "—",
      icon: "💰",
      color: rentabilidadGlobal && Number(rentabilidadGlobal) >= 0 ? "#34C759" : "#FF3B30",
    },
  ];

  return (
    <div className="tbi-page-enter">
      <PageGuard section="dashboard" />
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1D1D1F", marginBottom: 4 }}>
          Dashboard TEC BI
        </h1>
        <p style={{ fontSize: 13, color: "#666" }}>
          Sistema de Business Intelligence — Área de Producción Audiovisual
        </p>
      </div>

      {/* KPI cards */}
      <div className="tbi-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: "rgba(255,255,255,0.72)",
              backdropFilter: "blur(20px)",
              border: `1px solid rgba(14,165,233,0.2)`,
              borderRadius: 14,
              padding: "16px 20px",
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 6 }}>{kpi.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Costos resumen rápido */}
      {evaluaciones.length > 0 && (
        <div className="ext-form-2" style={{ gap: 14, marginBottom: 28 }}>
          <div style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(14,165,233,0.15)", borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>COSTO TOTAL ACUMULADO</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#7B4FE8" }}>{MXN.format(costoTotal)}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(14,165,233,0.15)", borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>VALOR TOTAL GENERADO</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#34C759" }}>{MXN.format(valorTotal)}</div>
          </div>
        </div>
      )}

      {/* Module grid */}
      <h2 style={{ fontSize: 14, fontWeight: 600, color: "#888", marginBottom: 14, letterSpacing: "0.5px" }}>
        MÓDULOS
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
        {MODULES.map((mod) => (
          <button
            key={mod.path}
            onClick={() => router.push(mod.path)}
            style={{
              background: "rgba(255,255,255,0.72)",
              backdropFilter: "blur(20px)",
              border: `1px solid rgba(14,165,233,0.18)`,
              borderRadius: 14,
              padding: "18px 20px",
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.18s",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = ACCENT;
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(14,165,233,0.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(14,165,233,0.18)";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.72)";
            }}
          >
            <span style={{ fontSize: 24 }}>{mod.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F" }}>{mod.label}</span>
            <span style={{ fontSize: 11, color: "#888" }}>{mod.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
