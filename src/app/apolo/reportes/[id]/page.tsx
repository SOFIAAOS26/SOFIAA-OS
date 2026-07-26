"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
const GRAY    = "#a8a29e";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ApoloDataPoint {
  label: string;
  value: string;
  trend?: "up" | "down" | "stable";
  engine: string;
  entityId?: string;
}

interface ApoloReportSection {
  id:         string;
  title:      string;
  body:       string;
  dataPoints: ApoloDataPoint[];
  engine:     string;
  order:      number;
}

interface ApoloReport {
  id:              string;
  userId:          string;
  type:            string;
  title:           string;
  clientName?:     string;
  period:          { from: number; to: number };
  sections:        ApoloReportSection[];
  summary:         string;
  status:          string;
  themisApproved:  boolean;
  themisVerdictId?: string;
  generatedAt:     number;
  deliveredAt?:    number;
}

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  draft:     { label: "Borrador",  color: MUTED   },
  ready:     { label: "Listo",     color: GREEN   },
  delivered: { label: "Entregado", color: AMBER_L },
};

const ENGINE_COLORS: Record<string, string> = {
  oraculo: "#7c3aed",
  prometeo: "#f97316",
  tec_bii: "#06b6d4",
  atena:   "#a855f7",
  nexo:    "#10b981",
};

const TREND_ICONS: Record<string, string> = {
  up:     "↑",
  down:   "↓",
  stable: "→",
};

const TREND_COLORS: Record<string, string> = {
  up:     "#4ade80",
  down:   "#f87171",
  stable: "#94a3b8",
};

export default function ReporteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [report, setReport]       = useState<ApoloReport | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [marking, setMarking]     = useState(false);
  const [markDone, setMarkDone]   = useState(false);

  async function getToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
  }

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const token = await getToken();
        if (!token) { setLoading(false); return; }
        const res = await fetch(`/api/apolo/reports/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(res.status === 404 ? "Reporte no encontrado" : "Error al cargar");
        const json = await res.json();
        setReport(json.report);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function markDelivered() {
    if (!report) return;
    setMarking(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/apolo/reports/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ status: "delivered" }),
      });
      if (res.ok) {
        setReport(r => r ? { ...r, status: "delivered", deliveredAt: Date.now() } : r);
        setMarkDone(true);
      }
    } finally {
      setMarking(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center" as const, color: MUTED, fontSize: 13 }}>
        ⏳ Cargando reporte…
      </div>
    );
  }

  if (error || !report) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center" as const }}>
        <div style={{ fontSize: 13, color: "#fca5a5", marginBottom: 16 }}>
          ⚠ {error ?? "Reporte no encontrado"}
        </div>
        <button
          onClick={() => router.push("/apolo/reportes")}
          style={{ padding: "8px 20px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: AMBER, fontSize: 12, cursor: "pointer" }}
        >
          ← Volver a reportes
        </button>
      </div>
    );
  }

  const st = STATUS_INFO[report.status] ?? { label: report.status, color: MUTED };
  const periodLabel =
    new Date(report.period.from).toLocaleDateString("es-MX", { month: "short", day: "numeric" }) +
    " – " +
    new Date(report.period.to).toLocaleDateString("es-MX", { month: "short", day: "numeric", year: "numeric" });

  const sortedSections = [...(report.sections ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div style={{ padding: "28px 24px", maxWidth: 860, margin: "0 auto" }}>

      {/* Breadcrumb */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
        <a href="/apolo/reportes" style={{ fontSize: 12, color: AMBER, textDecoration: "none" }}>
          ← Biblioteca
        </a>
      </div>

      {/* Header del reporte */}
      <div style={{
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14,
        padding: "20px 22px", marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" as const }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" as const }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: `linear-gradient(135deg, ${AMBER}, ${AMBER2})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, flexShrink: 0, boxShadow: `0 0 10px ${AMBER}40`,
              }}>☀️</div>
              <div>
                <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: TEXT, lineHeight: 1.3 }}>
                  {report.title}
                </h1>
                {report.clientName && (
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                    Cliente: {report.clientName}
                  </div>
                )}
              </div>
            </div>

            {/* Badges */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
              <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 99, background: CARD2, border: `1px solid ${BORDER}`, color: GRAY }}>
                📅 {periodLabel}
              </span>
              <span style={{
                fontSize: 11, padding: "3px 8px", borderRadius: 99,
                background: `${st.color}18`, border: `1px solid ${st.color}40`,
                color: st.color, fontWeight: 600,
              }}>
                {st.label}
              </span>
              {report.themisApproved && (
                <span style={{
                  fontSize: 11, padding: "3px 8px", borderRadius: 99,
                  background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)",
                  color: GREEN, fontWeight: 600,
                }}>
                  ✓ THEMIS aprobado
                </span>
              )}
              <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 99, background: CARD2, border: `1px solid ${BORDER}`, color: GRAY }}>
                {sortedSections.length} sección{sortedSections.length !== 1 ? "es" : ""}
              </span>
            </div>
          </div>

          {/* Acción */}
          {report.status !== "delivered" && (
            <button
              onClick={markDelivered}
              disabled={marking || markDone}
              style={{
                padding: "9px 18px", borderRadius: 9, cursor: marking ? "not-allowed" : "pointer",
                background: markDone ? "transparent" : `linear-gradient(135deg, ${AMBER}, ${AMBER2})`,
                border: markDone ? `1px solid ${BORDER}` : "none",
                color: markDone ? MUTED : "#0c0802", fontWeight: 700, fontSize: 12,
                flexShrink: 0,
              }}
            >
              {marking ? "Guardando…" : markDone ? "✓ Entregado" : "Marcar como entregado"}
            </button>
          )}
        </div>

        {/* Resumen ejecutivo */}
        {report.summary && (
          <div style={{
            marginTop: 16, padding: "14px 16px", borderRadius: 10,
            background: `${AMBER}0c`, border: `1px solid ${AMBER}25`,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: AMBER, letterSpacing: "0.8px", marginBottom: 6 }}>
              RESUMEN EJECUTIVO
            </div>
            <p style={{ margin: 0, fontSize: 13, color: TEXT, lineHeight: 1.65 }}>
              {report.summary}
            </p>
          </div>
        )}
      </div>

      {/* Secciones */}
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
        {sortedSections.length === 0 ? (
          <div style={{ textAlign: "center" as const, padding: 40, color: MUTED, fontSize: 13 }}>
            Este reporte no tiene secciones con datos disponibles.
          </div>
        ) : (
          sortedSections.map((sec, idx) => (
            <SectionCard key={sec.id} section={sec} index={idx} />
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 24, padding: "12px 16px", borderRadius: 10, background: CARD, border: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 8 }}>
          <span style={{ fontSize: 11, color: MUTED }}>
            Generado el {new Date(report.generatedAt).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
          {report.deliveredAt && (
            <span style={{ fontSize: 11, color: AMBER_L }}>
              Entregado el {new Date(report.deliveredAt).toLocaleDateString("es-MX", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
          {report.themisVerdictId && (
            <span style={{ fontSize: 11, color: MUTED }}>
              THEMIS: {report.themisVerdictId.slice(0, 8)}…
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SectionCard ────────────────────────────────────────────────────────────────
function SectionCard({ section, index }: { section: ApoloReportSection; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  const engineColor = ENGINE_COLORS[section.engine] ?? AMBER;

  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`,
      borderRadius: 12, overflow: "hidden",
    }}>
      {/* Header sección */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: "100%", padding: "14px 18px",
          display: "flex", alignItems: "center", gap: 12,
          background: "transparent", border: "none", cursor: "pointer",
          textAlign: "left" as const,
          borderBottom: expanded ? `1px solid ${BORDER}` : "none",
        }}
      >
        <div style={{
          width: 4, height: 32, borderRadius: 99, flexShrink: 0,
          background: engineColor,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{section.title}</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
            {section.dataPoints.length} punto{section.dataPoints.length !== 1 ? "s" : ""} de datos
            {" · "}
            <span style={{ color: engineColor, fontWeight: 600, textTransform: "uppercase" as const, fontSize: 10, letterSpacing: "0.4px" }}>
              {section.engine}
            </span>
          </div>
        </div>
        <span style={{ fontSize: 16, color: MUTED, flexShrink: 0 }}>
          {expanded ? "▾" : "▸"}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: "16px 18px" }}>
          {/* Narrativa */}
          {section.body && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: "0.8px", marginBottom: 8 }}>
                ANÁLISIS
              </div>
              <p style={{ margin: 0, fontSize: 13, color: TEXT, lineHeight: 1.7, whiteSpace: "pre-wrap" as const }}>
                {section.body}
              </p>
            </div>
          )}

          {/* DataPoints grid */}
          {section.dataPoints.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: "0.8px", marginBottom: 10 }}>
                MÉTRICAS
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                {section.dataPoints.map((dp, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px 12px", borderRadius: 9,
                      background: "#120e03", border: `1px solid ${BORDER}`,
                    }}
                  >
                    <div style={{ fontSize: 11, color: MUTED, marginBottom: 4, lineHeight: 1.3 }}>
                      {dp.label}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>
                        {dp.value}
                      </span>
                      {dp.trend && (
                        <span style={{ fontSize: 12, color: TREND_COLORS[dp.trend] ?? MUTED }}>
                          {TREND_ICONS[dp.trend] ?? ""}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
