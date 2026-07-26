"use client";

import { useState, useEffect, useCallback } from "react";
import { auth } from "@/lib/firebase";

// ── Paleta ────────────────────────────────────────────────────────────────────
const AMBER   = "#D97706";
const AMBER_L = "#FCD34D";
const CARD    = "#1a1205";
const BORDER  = "#2a1f08";
const TEXT    = "#fef3c7";
const MUTED   = "#78716c";
const GREEN   = "#4ade80";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ReportMeta {
  id:             string;
  type:           string;
  title:          string;
  status:         string;
  generatedAt:    number;
  deliveredAt?:   number;
  sectionCount:   number;
  clientName?:    string;
  themisApproved: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  weekly_summary:       "Resumen Semanal",
  campaign_performance: "Campaña",
  project_status:       "Proyectos",
  quality_report:       "Calidad",
  executive_brief:      "Brief Ejecutivo",
  strategic_outlook:    "Outlook",
};

const TYPE_ICONS: Record<string, string> = {
  weekly_summary:       "📅",
  campaign_performance: "🔥",
  project_status:       "🧠",
  quality_report:       "⚡",
  executive_brief:      "🎯",
  strategic_outlook:    "🔮",
};

const STATUS_INFO: Record<string, { label: string; color: string; dot: string }> = {
  draft:     { label: "Borrador",  color: MUTED,   dot: "#78716c" },
  ready:     { label: "Listo",     color: GREEN,   dot: "#4ade80" },
  delivered: { label: "Entregado", color: AMBER_L, dot: "#FCD34D" },
};

const ALL_TYPES   = ["", ...Object.keys(TYPE_LABELS)];
const ALL_STATUSES = ["", "draft", "ready", "delivered"];

export default function ApoloReportesPage() {
  const [reports, setReports]           = useState<ReportMeta[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [typeFilter, setTypeFilter]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [limit, setLimit]               = useState(20);

  async function getToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
  }

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) { setLoading(false); return; }

      const params = new URLSearchParams({ limit: String(limit) });
      if (typeFilter)   params.set("type",   typeFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/apolo/reports?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al cargar reportes");
      const json = await res.json();
      setReports(json.reports ?? []);
    } catch {
      setError("No se pudieron cargar los reportes");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, limit]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const filterBtn = (active: boolean) => ({
    padding: "6px 12px", borderRadius: 8, cursor: "pointer",
    border:     `1px solid ${active ? AMBER + "80" : BORDER}`,
    background: active ? AMBER + "18" : CARD,
    color:      active ? AMBER_L : MUTED,
    fontSize: 11, fontWeight: active ? 700 : 400,
    transition: "all 0.15s",
  });

  return (
    <div style={{ padding: "28px 24px", maxWidth: 860, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <a href="/apolo" style={{ fontSize: 12, color: AMBER, textDecoration: "none" }}>
          ← Centro Solar
        </a>
        <h1 style={{ margin: "8px 0 4px", fontSize: 20, fontWeight: 800, color: TEXT }}>
          Biblioteca de Reportes
        </h1>
        <p style={{ margin: 0, fontSize: 12, color: MUTED }}>
          {loading ? "Cargando…" : `${reports.length} reporte${reports.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Filtro tipo */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", color: MUTED, marginBottom: 8 }}>
          TIPO
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
          {ALL_TYPES.map(t => (
            <button key={t || "all"} onClick={() => setTypeFilter(t)} style={filterBtn(typeFilter === t)}>
              {t ? `${TYPE_ICONS[t] ?? ""} ${TYPE_LABELS[t]}` : "Todos"}
            </button>
          ))}
        </div>
      </div>

      {/* Filtro estado */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", color: MUTED, marginBottom: 8 }}>
          ESTADO
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
          {ALL_STATUSES.map(s => (
            <button key={s || "all"} onClick={() => setStatusFilter(s)} style={filterBtn(statusFilter === s)}>
              {s ? (STATUS_INFO[s]?.label ?? s) : "Todos"}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div style={{ textAlign: "center" as const, padding: 48, color: MUTED, fontSize: 13 }}>
          ⏳ Cargando reportes…
        </div>
      ) : error ? (
        <div style={{ textAlign: "center" as const, padding: 48, color: "#fca5a5", fontSize: 13 }}>
          ⚠ {error}
        </div>
      ) : reports.length === 0 ? (
        <div style={{
          textAlign: "center" as const, padding: "48px 24px",
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14,
        }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>☀️</div>
          <div style={{ fontSize: 13, color: MUTED }}>
            {typeFilter || statusFilter
              ? "Sin resultados para este filtro."
              : "Aún no hay reportes. Genera el primero desde el Centro Solar."}
          </div>
          {(typeFilter || statusFilter) && (
            <button
              onClick={() => { setTypeFilter(""); setStatusFilter(""); }}
              style={{ marginTop: 12, padding: "6px 16px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: AMBER, fontSize: 12, cursor: "pointer" }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
          {reports.map(r => <ReportCard key={r.id} report={r} />)}

          {reports.length === limit && (
            <button
              onClick={() => setLimit(l => l + 20)}
              style={{
                marginTop: 4, padding: 12, width: "100%",
                borderRadius: 10, border: `1px dashed ${BORDER}`,
                background: "transparent", color: MUTED,
                fontSize: 12, cursor: "pointer",
              }}
            >
              Cargar más →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── ReportCard ─────────────────────────────────────────────────────────────────
function ReportCard({ report }: { report: ReportMeta }) {
  const st   = STATUS_INFO[report.status] ?? { label: report.status, color: MUTED, dot: MUTED };
  const icon = TYPE_ICONS[report.type] ?? "📋";
  const date = new Date(report.generatedAt).toLocaleDateString("es-MX", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

  return (
    <a
      href={`/apolo/reportes/${report.id}`}
      style={{
        display: "block", padding: "16px 18px",
        background: CARD, border: `1px solid ${BORDER}`,
        borderRadius: 12, textDecoration: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        {/* Icono tipo */}
        <div style={{
          width: 38, height: 38, flexShrink: 0, borderRadius: 9,
          background: `${AMBER}18`, border: `1px solid ${AMBER}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}>
          {icon}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" as const }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: TEXT, lineHeight: 1.3 }}>
              {report.title}
            </span>
            {report.themisApproved && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 99,
                background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)",
                color: "#4ade80", letterSpacing: "0.4px",
              }}>
                ✓ THEMIS
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: MUTED }}>
            {date}
            {report.clientName ? ` · ${report.clientName}` : ""}
            {` · ${report.sectionCount} sección${report.sectionCount !== 1 ? "es" : ""}`}
          </div>
        </div>

        {/* Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: st.color }}>{st.label}</span>
        </div>
      </div>
    </a>
  );
}
