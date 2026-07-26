"use client";

import { useState, useEffect, useCallback } from "react";
import { auth } from "@/lib/firebase";

// ── Paleta ────────────────────────────────────────────────────────────────────
const AMBER   = "#D97706";
const AMBER2  = "#B45309";
const AMBER_L = "#FCD34D";
const CARD    = "#1a1205";
const CARD2   = "#120e03";
const BORDER  = "#2a1f08";
const TEXT    = "#fef3c7";
const MUTED   = "#78716c";
const GREEN   = "#4ade80";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ReportMeta {
  id:             string;
  title:          string;
  type:           string;
  status:         string;
  generatedAt:    number;
  clientName?:    string;
  sectionCount:   number;
  themisApproved: boolean;
}

const TYPE_ICONS: Record<string, string> = {
  weekly_summary:       "📅",
  campaign_performance: "🔥",
  project_status:       "🧠",
  quality_report:       "⚡",
  executive_brief:      "🎯",
  strategic_outlook:    "🔮",
};

const FORMAT_OPTIONS = [
  {
    id:    "pdf",
    label: "PDF",
    icon:  "📄",
    desc:  "Documento PDF listo para compartir",
    ext:   ".pdf",
    mime:  "application/pdf",
  },
  {
    id:    "docx",
    label: "Word (DOCX)",
    icon:  "📝",
    desc:  "Microsoft Word, editable",
    ext:   ".docx",
    mime:  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
];

export default function ApoloExportarPage() {
  const [reports, setReports]     = useState<ReportMeta[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<string>("");
  const [format, setFormat]       = useState<"pdf" | "docx">("pdf");
  const [exporting, setExporting] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<{ title: string; format: string; ts: number } | null>(null);

  async function getToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
  }

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) { setLoading(false); return; }
      // Cargar reportes listos y entregados para exportar
      const res = await fetch("/api/apolo/reports?limit=30", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error");
      const json = await res.json();
      const all: ReportMeta[] = json.reports ?? [];
      // Mostrar todos (draft también se puede exportar)
      setReports(all);
      if (all.length > 0) setSelected(all[0].id);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  const selectedReport = reports.find(r => r.id === selected);

  async function handleExport() {
    if (!selected || !format || !selectedReport) return;
    setExporting(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Sesión expirada");

      const res = await fetch("/api/apolo/export", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ reportId: selected, format }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error al exportar");
      }

      // Descargar el archivo
      const blob     = await res.blob();
      const fmtOpt   = FORMAT_OPTIONS.find(f => f.id === format)!;
      const filename  = selectedReport.title
        .replace(/[^a-zA-Z0-9\s\-_áéíóúñ·]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 80) + fmtOpt.ext;

      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setLastExport({ title: selectedReport.title, format: fmtOpt.label, ts: Date.now() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div style={{ padding: "28px 24px", maxWidth: 760, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <a href="/apolo" style={{ fontSize: 12, color: AMBER, textDecoration: "none" }}>
          ← Centro Solar
        </a>
        <h1 style={{ margin: "8px 0 4px", fontSize: 20, fontWeight: 800, color: TEXT }}>
          Exportar Reporte
        </h1>
        <p style={{ margin: 0, fontSize: 12, color: MUTED }}>
          Descarga reportes como PDF o DOCX para entrega al cliente
        </p>
      </div>

      {/* Selector de reporte */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 13, padding: "20px", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: "0.8px", marginBottom: 12 }}>
          1. SELECCIONA EL REPORTE
        </div>

        {loading ? (
          <div style={{ textAlign: "center" as const, padding: "20px", color: MUTED, fontSize: 12 }}>
            ⏳ Cargando reportes…
          </div>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: "center" as const, padding: "20px", color: MUTED, fontSize: 12 }}>
            Sin reportes disponibles. <a href="/apolo" style={{ color: AMBER }}>Genera uno primero →</a>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
            {reports.map(r => (
              <button
                key={r.id}
                onClick={() => setSelected(r.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", borderRadius: 10, cursor: "pointer", textAlign: "left" as const,
                  background: selected === r.id ? `${AMBER}15` : CARD2,
                  border: `1px solid ${selected === r.id ? AMBER + "60" : BORDER}`,
                  transition: "all 0.12s",
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0 }}>
                  {TYPE_ICONS[r.type] ?? "📋"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: selected === r.id ? AMBER_L : TEXT,
                    whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {r.title}
                  </div>
                  <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>
                    {new Date(r.generatedAt).toLocaleDateString("es-MX", { month: "short", day: "numeric", year: "numeric" })}
                    {r.clientName ? ` · ${r.clientName}` : ""}
                    {` · ${r.sectionCount} sección${r.sectionCount !== 1 ? "es" : ""}`}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  {r.themisApproved && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 99, background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", color: GREEN }}>
                      THEMIS
                    </span>
                  )}
                  {selected === r.id && (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: AMBER }} />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selector de formato */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 13, padding: "20px", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: "0.8px", marginBottom: 12 }}>
          2. SELECCIONA EL FORMATO
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {FORMAT_OPTIONS.map(f => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id as "pdf" | "docx")}
              style={{
                padding: "16px", borderRadius: 10, cursor: "pointer", textAlign: "left" as const,
                background: format === f.id ? `${AMBER}15` : CARD2,
                border: `1px solid ${format === f.id ? AMBER + "60" : BORDER}`,
                transition: "all 0.12s",
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 6 }}>{f.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: format === f.id ? AMBER_L : TEXT, marginBottom: 3 }}>
                {f.label}
              </div>
              <div style={{ fontSize: 11, color: MUTED }}>{f.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Preview del archivo */}
      {selectedReport && (
        <div style={{
          background: CARD2, border: `1px dashed ${BORDER}`, borderRadius: 10,
          padding: "14px 16px", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ fontSize: 24 }}>
            {FORMAT_OPTIONS.find(f => f.id === format)?.icon ?? "📄"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, marginBottom: 2 }}>
              {selectedReport.title.replace(/[^a-zA-Z0-9\s\-_áéíóúñ·]/g, "").replace(/\s+/g, "_").slice(0, 60)}
              {FORMAT_OPTIONS.find(f => f.id === format)?.ext}
            </div>
            <div style={{ fontSize: 11, color: MUTED }}>
              {selectedReport.sectionCount} sección{selectedReport.sectionCount !== 1 ? "es" : ""} · Formato {format.toUpperCase()}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          marginBottom: 14, padding: "9px 14px", borderRadius: 8,
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          fontSize: 12, color: "#fca5a5",
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Botón exportar */}
      <button
        onClick={handleExport}
        disabled={exporting || !selected || loading}
        style={{
          width: "100%", padding: "14px", borderRadius: 11, cursor: exporting || !selected ? "not-allowed" : "pointer",
          background: exporting || !selected
            ? `${AMBER}30`
            : `linear-gradient(135deg, ${AMBER}, ${AMBER2})`,
          border: "none",
          color: exporting || !selected ? AMBER_L : "#0c0802",
          fontWeight: 800, fontSize: 14,
          opacity: !selected || loading ? 0.6 : 1,
          transition: "all 0.15s",
        }}
      >
        {exporting
          ? `⏳ Generando ${format.toUpperCase()}…`
          : `📥 Descargar ${format.toUpperCase()}`}
      </button>

      {/* Último export */}
      {lastExport && (
        <div style={{
          marginTop: 16, padding: "12px 16px", borderRadius: 10,
          background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: GREEN }}>
              Descarga iniciada — {lastExport.format}
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
              {lastExport.title.slice(0, 60)} · {new Date(lastExport.ts).toLocaleTimeString("es-MX")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
