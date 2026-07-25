"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

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

// ── Tipos de reporte ──────────────────────────────────────────────────────────
const REPORT_TYPES = [
  { id: "weekly_summary",       label: "Resumen Semanal",       icon: "📅", desc: "ORÁCULO + PROMETEO + TEC Bii + ATENA", color: AMBER   },
  { id: "executive_brief",      label: "Brief Ejecutivo",       icon: "🎯", desc: "ORÁCULO + NEXO + TEC Bii + PROMETEO", color: "#7c3aed" },
  { id: "campaign_performance", label: "Reporte de Campaña",   icon: "🔥", desc: "PROMETEO: metas, creativos, fatiga",   color: "#f97316" },
  { id: "quality_report",       label: "Reporte de Calidad",   icon: "⚡", desc: "ATENA: SPC, AMEF, proyectos DMAIC",   color: "#a855f7" },
  { id: "project_status",       label: "Estado de Proyectos",  icon: "🧠", desc: "TEC Bii: proyectos, equipo, urgencia", color: "#06b6d4" },
  { id: "strategic_outlook",    label: "Outlook Estratégico",  icon: "🔮", desc: "ORÁCULO + NEXO: predicciones e insights", color: "#6d28d9" },
];

interface ReportMeta {
  id:           string;
  type:         string;
  title:        string;
  status:       string;
  generatedAt:  number;
  sectionCount: number;
  clientName?:  string;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:     { label: "Borrador", color: MUTED   },
  ready:     { label: "Listo",    color: GREEN    },
  delivered: { label: "Entregado", color: AMBER_L },
};

export default function ApoloCentroSolar() {
  const router = useRouter();
  const [generating, setGenerating]   = useState<string | null>(null);
  const [reports, setReports]         = useState<ReportMeta[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [genError, setGenError]       = useState<string | null>(null);

  // ── Obtener token ──────────────────────────────────────────────────────────
  async function getToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
  }

  // ── Cargar últimos reportes ────────────────────────────────────────────────
  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) { setLoading(false); return; }
      const res  = await fetch("/api/apolo/reports?limit=5", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al cargar reportes");
      const json = await res.json();
      setReports(json.reports ?? []);
    } catch (e) {
      setError("No se pudieron cargar los reportes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  // ── Generar reporte ────────────────────────────────────────────────────────
  async function handleGenerate(typeId: string) {
    setGenerating(typeId);
    setGenError(null);
    try {
      const token = await getToken();
      if (!token) { setGenError("Sesión expirada"); setGenerating(null); return; }

      const res = await fetch("/api/apolo/reports", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ type: typeId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error al generar");
      }

      const { report } = await res.json();
      await loadReports();
      router.push(`/apolo/reportes/${report.id}`);
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGenerating(null);
    }
  }

  // ── KPIs derivados ─────────────────────────────────────────────────────────
  const totalReports  = reports.length;
  const delivered     = reports.filter(r => r.status === "delivered").length;
  const lastReport    = reports[0];

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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginTop: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", background: `${AMBER}20`, border: `1px solid ${AMBER}40`, color: AMBER_L, padding: "3px 8px", borderRadius: 99 }}>
            ☀️ GEN 2
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", color: GREEN, padding: "3px 8px", borderRadius: 99 }}>
            ✓ ACTIVO · AP-1
          </span>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
        {[
          { icon: "📋", value: loading ? "…" : String(totalReports), sub: "últimos reportes",  label: "Reportes generados"   },
          { icon: "⏱",  value: loading ? "…" : lastReport ? new Date(lastReport.generatedAt).toLocaleDateString("es-MX", { month: "short", day: "numeric" }) : "—", sub: "último reporte", label: "Fecha de generación" },
          { icon: "✅", value: loading ? "…" : String(delivered),     sub: "reportes listos",   label: "Reportes entregados"  },
          { icon: "🔗", value: "7",                                    sub: "de 7 disponibles", label: "Engines conectados"   },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>{kpi.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: AMBER_L, lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{kpi.sub}</div>
            <div style={{ fontSize: 10, color: GRAY, marginTop: 2, fontWeight: 600 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Generar reporte */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: MUTED, letterSpacing: "1px" }}>
          GENERAR REPORTE
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {REPORT_TYPES.map((rt) => (
            <button
              key={rt.id}
              onClick={() => handleGenerate(rt.id)}
              disabled={generating !== null}
              style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "14px 16px", borderRadius: 12, cursor: generating ? "not-allowed" : "pointer",
                background: generating === rt.id ? `${rt.color}20` : CARD,
                border: `1px solid ${generating === rt.id ? rt.color + "60" : BORDER}`,
                textAlign: "left" as const,
                transition: "all 0.15s",
                opacity: generating !== null && generating !== rt.id ? 0.5 : 1,
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>
                {generating === rt.id ? "⏳" : rt.icon}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 3 }}>{rt.label}</div>
                <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.4 }}>{rt.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {genError && (
          <div style={{ marginTop: 10, padding: "8px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", fontSize: 12, color: "#fca5a5" }}>
            ⚠ {genError}
          </div>
        )}
      </div>

      {/* Últimos reportes */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: MUTED, letterSpacing: "1px" }}>
            ÚLTIMOS REPORTES
          </h2>
          <a href="/apolo/reportes" style={{ fontSize: 11, color: AMBER, textDecoration: "none" }}>
            Ver todos →
          </a>
        </div>

        {loading ? (
          <div style={{ padding: "24px", textAlign: "center" as const, color: MUTED, fontSize: 12 }}>Cargando…</div>
        ) : error ? (
          <div style={{ padding: "24px", textAlign: "center" as const, color: "#fca5a5", fontSize: 12 }}>{error}</div>
        ) : reports.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center" as const, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>☀️</div>
            <div style={{ fontSize: 13, color: MUTED }}>Aún no hay reportes. Genera el primero con los botones de arriba.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
            {reports.map((r) => {
              const st = STATUS_LABEL[r.status] ?? { label: r.status, color: MUTED };
              return (
                <a
                  key={r.id}
                  href={`/apolo/reportes/${r.id}`}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px", borderRadius: 10,
                    background: CARD, border: `1px solid ${BORDER}`,
                    textDecoration: "none", gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.title}
                    </div>
                    <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>
                      {new Date(r.generatedAt).toLocaleDateString("es-MX", { weekday: "short", month: "short", day: "numeric" })}
                      {" · "}{r.sectionCount} sección{r.sectionCount !== 1 ? "es" : ""}
                      {r.clientName ? ` · ${r.clientName}` : ""}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: st.color, whiteSpace: "nowrap" as const, flexShrink: 0 }}>
                    {st.label}
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Accesos rápidos */}
      <div>
        <h2 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: MUTED, letterSpacing: "1px" }}>
          ACCESOS RÁPIDOS
        </h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
          {[
            { href: "/apolo/reportes",   label: "Todos los reportes", icon: "📋" },
            { href: "/apolo/plantillas", label: "Plantillas",          icon: "🎨" },
            { href: "/apolo/exportar",   label: "Exportar PDF/DOCX",  icon: "📤" },
            { href: "/oraculo",          label: "Ver ORÁCULO",         icon: "🔮" },
          ].map(({ href, label, icon }) => (
            <a key={href} href={href} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, textDecoration: "none", background: CARD, border: `1px solid ${BORDER}`, fontSize: 12, color: TEXT, fontWeight: 500 }}>
              <span>{icon}</span><span>{label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
