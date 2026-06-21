"use client";

import { useRouter } from "next/navigation";
import { tecBiExtension } from "@/extensions/tec-bi/manifest";

const ACCENT = tecBiExtension.theme.badgeColor;

const MODULES = [
  { path: "/tec-bi/proyectos",    icon: "🎬", label: "Proyectos",         desc: "Tracking nacional y campus" },
  { path: "/tec-bi/briefs",       icon: "📋", label: "Briefs",            desc: "Solicitudes de clientes internos" },
  { path: "/tec-bi/empleados",    icon: "👥", label: "Empleados",         desc: "Equipo, horas y rendimiento" },
  { path: "/tec-bi/proveedores",  icon: "🏢", label: "Proveedores",       desc: "Agencias y casas productoras" },
  { path: "/tec-bi/clientes",     icon: "🎓", label: "Clientes Internos", desc: "Departamentos del TEC" },
  { path: "/tec-bi/evaluaciones", icon: "⭐", label: "Evaluaciones",      desc: "Calificación por proyecto" },
  { path: "/tec-bi/analisis",     icon: "💰", label: "Análisis de Costos",desc: "Rentabilidad y auditoría" },
  { path: "/tec-bi/roi",          icon: "📈", label: "Simulador ROI",     desc: "Proyecciones y recomendaciones" },
];

export default function TecBiDashboard() {
  const router = useRouter();

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1D1D1F", marginBottom: 4 }}>
          Dashboard TEC BI
        </h1>
        <p style={{ fontSize: 13, color: "#666" }}>
          Sistema de Business Intelligence — Área de Producción Audiovisual
        </p>
      </div>

      {/* KPI cards — placeholders hasta Sprint 5 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {[
          { label: "Proyectos activos",    value: "—", icon: "🎬" },
          { label: "Calidad promedio",     value: "—", icon: "⭐" },
          { label: "Entregas a tiempo",    value: "—", icon: "✅" },
          { label: "Costo promedio",       value: "—", icon: "💰" },
        ].map((kpi) => (
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
            <div style={{ fontSize: 24, fontWeight: 700, color: "#1D1D1F" }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Module grid */}
      <h2 style={{ fontSize: 14, fontWeight: 600, color: "#888", marginBottom: 14, letterSpacing: "0.5px" }}>
        MÓDULOS
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 14,
        }}
      >
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

      {/* Coming soon notice */}
      <div
        style={{
          marginTop: 32,
          background: `rgba(14,165,233,0.07)`,
          border: `1px solid rgba(14,165,233,0.2)`,
          borderRadius: 12,
          padding: "14px 18px",
          fontSize: 12,
          color: "#0EA5E9",
          fontWeight: 500,
        }}
      >
        🚧 Sistema en construcción — Sprint 0 completado. Los módulos se habilitarán en los próximos sprints.
      </div>
    </div>
  );
}
