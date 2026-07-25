"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ── Paleta ────────────────────────────────────────────────────────────────────
const AMBER   = "#D97706";
const AMBER2  = "#B45309";
const AMBER_L = "#FCD34D";
const BG      = "#0c0802";
const CARD    = "#1a1205";
const BORDER  = "#2a1f08";
const TEXT    = "#fef3c7";
const MUTED   = "#78716c";
const GREEN   = "#4ade80";
const GRAY    = "#a8a29e";

// ── Tipos de reporte disponibles ──────────────────────────────────────────────
const REPORT_TYPES = [
  {
    id:    "weekly_summary",
    label: "Resumen Semanal",
    icon:  "📅",
    desc:  "Cross-engine: ORÁCULO + PROMETEO + TEC Bii + ATENA",
    color: AMBER,
  },
  {
    id:    "executive_brief",
    label: "Brief Ejecutivo",
    icon:  "🎯",
    desc:  "ORÁCULO + NEXO + HERMES + THEMIS",
    color: "#7c3aed",
  },
  {
    id:    "campaign_performance",
    label: "Reporte de Campaña",
    icon:  "🔥",
    desc:  "PROMETEO: metas, creativos, fatiga",
    color: "#f97316",
  },
  {
    id:    "quality_report",
    label: "Reporte de Calidad",
    icon:  "⚡",
    desc:  "ATENA: SPC, AMEF, proyectos DMAIC",
    color: "#a855f7",
  },
  {
    id:    "project_status",
    label: "Estado de Proyectos",
    icon:  "🧠",
    desc:  "TEC Bii: proyectos, equipo, urgencia",
    color: "#06b6d4",
  },
  {
    id:    "strategic_outlook",
    label: "Outlook Estratégico",
    icon:  "🔮",
    desc:  "ORÁCULO + NEXO: predicciones e insights",
    color: "#6d28d9",
  },
];

// ── KPIs estáticos (AP-1 los hará dinámicos) ──────────────────────────────────
const KPI_PLACEHOLDER = [
  { label: "Reportes generados",  value: "—",  sub: "este mes",    icon: "📋" },
  { label: "Último reporte",      value: "—",  sub: "sin reportes", icon: "⏱" },
  { label: "Reportes entregados", value: "—",  sub: "este mes",    icon: "✅" },
  { label: "Engines conectados",  value: "7",  sub: "de 7",        icon: "🔗" },
];

export default function ApoloCentroSolar() {
  const router = useRouter();
  const [generating, setGenerating] = useState<string | null>(null);

  async function handleGenerate(typeId: string) {
    setGenerating(typeId);
    // AP-2 conectará a POST /api/apolo/reports
    // Por ahora navega a la biblioteca (placeholder)
    await new Promise((r) => setTimeout(r, 800));
    setGenerating(null);
    router.push("/apolo/reportes");
  }

  return (
    <div style={{ padding: "28px 24px", maxWidth: 900, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `linear-gradient(135deg, ${AMBER}, ${AMBER2})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, boxShadow: `0 0 16px ${AMBER}55`,
          }}>☀️</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: TEXT, letterSpacing: "-0.4px" }}>
              Centro Solar
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: MUTED }}>
              APOLO · Client Intelligence & Reporting Engine
            </p>
          </div>
        </div>

        {/* Status chip */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginTop: 12 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.8px",
            background: `${AMBER}20`, border: `1px solid ${AMBER}40`,
            color: AMBER_L, padding: "3px 8px", borderRadius: 99,
          }}>
            ☀️ GEN 2
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.8px",
            background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)",
            color: GREEN, padding: "3px 8px", borderRadius: 99,
          }}>
            ✓ ACTIVO
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.8px",
            background: "rgba(120,113,108,0.12)", border: `1px solid ${BORDER}`,
            color: MUTED, padding: "3px 8px", borderRadius: 99,
          }}>
            AP-0 completado
          </span>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 12, marginBottom: 32,
      }}>
        {KPI_PLACEHOLDER.map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: CARD, border: `1px solid ${BORDER}`,
              borderRadius: 12, padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 6 }}>{kpi.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: AMBER_L, lineHeight: 1 }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{kpi.sub}</div>
            <div style={{ fontSize: 10, color: GRAY, marginTop: 2, fontWeight: 600 }}>
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {/* Generación rápida */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: MUTED, letterSpacing: "1px" }}>
          GENERAR REPORTE
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12,
        }}>
          {REPORT_TYPES.map((rt) => (
            <button
              key={rt.id}
              onClick={() => handleGenerate(rt.id)}
              disabled={generating !== null}
              style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                background: generating === rt.id ? `${rt.color}20` : CARD,
                border: `1px solid ${generating === rt.id ? rt.color + "60" : BORDER}`,
                textAlign: "left" as const,
                transition: "all 0.15s",
                opacity: generating !== null && generating !== rt.id ? 0.5 : 1,
              }}
            >
              <span style={{
                fontSize: 22, flexShrink: 0,
                filter: generating === rt.id ? "brightness(1.3)" : "none",
              }}>
                {generating === rt.id ? "⏳" : rt.icon}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 3 }}>
                  {rt.label}
                </div>
                <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.4 }}>
                  {rt.desc}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Nota AP-1 */}
        <div style={{
          marginTop: 12, padding: "10px 14px", borderRadius: 8,
          background: `${AMBER}10`, border: `1px solid ${AMBER}25`,
          fontSize: 11, color: MUTED,
        }}>
          💡 <strong style={{ color: AMBER_L }}>AP-1:</strong> La generación real se activa en Sprint AP-1 — el agregador de datos conectará con Firestore.
          Los botones navegan a la biblioteca en modo preview.
        </div>
      </div>

      {/* Links rápidos */}
      <div>
        <h2 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: MUTED, letterSpacing: "1px" }}>
          ACCESOS RÁPIDOS
        </h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
          {[
            { href: "/apolo/reportes",   label: "Ver todos los reportes", icon: "📋" },
            { href: "/apolo/plantillas", label: "Gestionar plantillas",   icon: "🎨" },
            { href: "/apolo/exportar",   label: "Exportar a PDF / DOCX",  icon: "📤" },
            { href: "/oraculo",          label: "Ver ORÁCULO",            icon: "🔮" },
          ].map(({ href, label, icon }) => (
            <a
              key={href}
              href={href}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 8, textDecoration: "none",
                background: CARD, border: `1px solid ${BORDER}`,
                fontSize: 12, color: TEXT, fontWeight: 500,
                transition: "border-color 0.15s",
              }}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
