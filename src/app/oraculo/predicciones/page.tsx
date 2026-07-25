"use client";

import { useState, useEffect, useMemo } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getApp } from "firebase/app";
import type { OraclePrediction, OracleCategory, OracleSeverity } from "@/types/oraculo";

// ── Paleta ORÁCULO ────────────────────────────────────────────────────────────
const PURPLE = "#6D28D9";
const VIOLET = "#7c3aed";
const LAVEND = "#a78bfa";
const GREEN  = "#22c55e";
const YELLOW = "#f59e0b";
const RED    = "#ef4444";
const BLUE   = "#3b82f6";
const TEXT   = "#e2e8f0";
const MUTED  = "#64748b";
const CARD   = "#0f0a1a";
const CARD2  = "#130e20";
const BORDER = "#1e1030";
const BG     = "#06030f";

// ── Helpers ───────────────────────────────────────────────────────────────────

function sevColor(s: OracleSeverity | string) {
  if (s === "critical") return RED;
  if (s === "warning")  return YELLOW;
  return LAVEND;
}
function sevLabel(s: OracleSeverity | string) {
  if (s === "critical") return "CRÍTICA";
  if (s === "warning")  return "ALERTA";
  return "INFO";
}
function catLabel(c: OracleCategory | string) {
  const MAP: Record<string, string> = {
    operational_risk:      "Operacional",
    delivery_risk:         "Entrega",
    marketing_risk:        "Marketing",
    strategic_opportunity: "Estrategia",
    compliance_risk:       "Compliance",
    resource_risk:         "Recursos",
  };
  return MAP[c] ?? c;
}
function engineColor(e: string) {
  const MAP: Record<string, string> = {
    atena: BLUE, tec_bii: GREEN, prometeo: "#f97316",
    nexo: "#8b5cf6", hermes: "#6366f1", themis: "#14b8a6",
  };
  return MAP[e] ?? MUTED;
}
function relTime(ts: number) {
  const d = Date.now() - ts;
  if (d < 60_000)     return "hace un momento";
  if (d < 3_600_000)  return `hace ${Math.floor(d / 60_000)} min`;
  if (d < 86_400_000) return `hace ${Math.floor(d / 3_600_000)} h`;
  return new Date(ts).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { key: "active",       label: "Activas",     color: RED    },
  { key: "acknowledged", label: "Reconocidas", color: YELLOW },
  { key: "resolved",     label: "Resueltas",   color: GREEN  },
  { key: "dismissed",    label: "Descartadas", color: MUTED  },
] as const;
type StatusKey = typeof STATUS_TABS[number]["key"];

// ── Prediction Card ───────────────────────────────────────────────────────────

function PredCard({
  p, token, onStatusChange,
}: {
  p: OraclePrediction;
  token: string;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [expanded,  setExpanded]  = useState(false);
  const [actioning, setActioning] = useState(false);
  const [noteOpen,  setNoteOpen]  = useState<string | null>(null);
  const [note,      setNote]      = useState("");

  const col = sevColor(p.severity);
  const uniqueEngines = [...new Set(p.signals.map((s) => s.sourceEngine))];

  const doAction = async (status: "acknowledged" | "dismissed" | "resolved") => {
    setActioning(true);
    try {
      const r = await fetch(`/api/oraculo/predictions/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, note: note.trim() || undefined }),
      });
      if (r.ok) {
        onStatusChange(p.id, status);
        setNoteOpen(null);
        setNote("");
      }
    } finally {
      setActioning(false);
    }
  };

  return (
    <div style={{
      background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`,
      borderLeft: `3px solid ${col}`, overflow: "hidden",
    }}>
      {/* Header */}
      <div
        style={{ padding: "14px 16px", cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 9, fontWeight: 800, color: col, letterSpacing: "0.8px",
                background: `${col}18`, padding: "2px 7px", borderRadius: 4,
              }}>
                {sevLabel(p.severity)}
              </span>
              <span style={{
                fontSize: 9, color: LAVEND, background: `${LAVEND}18`,
                padding: "2px 6px", borderRadius: 4, fontWeight: 600,
              }}>
                {catLabel(p.category)}
              </span>
              {uniqueEngines.map((e) => (
                <span key={e} style={{
                  fontSize: 9, fontWeight: 700, color: engineColor(e),
                  background: `${engineColor(e)}18`, padding: "2px 6px", borderRadius: 4,
                  textTransform: "uppercase",
                }}>
                  {e}
                </span>
              ))}
              <span style={{ fontSize: 9, color: MUTED }}>{relTime(p.createdAt)}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, lineHeight: 1.4 }}>
              {p.title}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {/* Confidence */}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: LAVEND }}>
                {(p.confidence * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize: 9, color: MUTED }}>confianza</div>
            </div>
            <span style={{ fontSize: 12, color: MUTED }}>{expanded ? "▲" : "▼"}</span>
          </div>
        </div>

        {/* Summary */}
        <p style={{
          margin: "8px 0 0", fontSize: 12, color: MUTED, lineHeight: 1.6,
          overflow: "hidden", maxHeight: expanded ? "none" : "2.8em",
          display: "-webkit-box", WebkitLineClamp: expanded ? undefined : 2,
          WebkitBoxOrient: "vertical" as const,
        }}>
          {p.summary}
        </p>

        {/* Meta pills */}
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 9, background: `${MUTED}14`, color: MUTED,
            padding: "2px 7px", borderRadius: 4,
          }}>
            ⏱ {p.horizon}
          </span>
          <span style={{
            fontSize: 9, background: `${MUTED}14`, color: MUTED,
            padding: "2px 7px", borderRadius: 4,
          }}>
            🔗 {p.signals.length} señal(es)
          </span>
          {p.themisApproved && (
            <span style={{
              fontSize: 9, background: "#14b8a618", color: "#14b8a6",
              padding: "2px 7px", borderRadius: 4, fontWeight: 600,
            }}>
              ⚖️ THEMIS ✓
            </span>
          )}
        </div>
      </div>

      {/* Expanded: Recommendations + Signals */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: "14px 16px", background: CARD2 }}>
          {/* Recomendaciones */}
          {p.recommendations.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: "0.5px", marginBottom: 8 }}>
                RECOMENDACIONES
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {p.recommendations.map((r) => {
                  const pColor = r.priority === "high" ? RED : r.priority === "medium" ? YELLOW : MUTED;
                  return (
                    <div
                      key={r.id}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 8,
                        padding: "8px 10px", background: `${pColor}08`,
                        border: `1px solid ${pColor}20`, borderRadius: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>
                        {r.actionType === "hermes_action" ? "⚡" :
                         r.actionType === "user_decision" ? "👤" : "🔍"}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: TEXT, lineHeight: 1.5 }}>{r.text}</div>
                        <div style={{ fontSize: 9, color: pColor, fontWeight: 700, marginTop: 2 }}>
                          {r.priority.toUpperCase()} · {r.actionType.replace("_", " ")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nota del usuario */}
          {p.userNote && (
            <div style={{
              padding: "8px 10px", background: `${LAVEND}08`,
              border: `1px solid ${LAVEND}20`, borderRadius: 8, marginBottom: 14,
            }}>
              <div style={{ fontSize: 9, color: LAVEND, fontWeight: 700, marginBottom: 2 }}>NOTA</div>
              <div style={{ fontSize: 12, color: TEXT }}>{p.userNote}</div>
            </div>
          )}

          {/* Acciones — sólo si está activa */}
          {p.status === "active" && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: "0.5px", marginBottom: 8 }}>
                ACCIONES
              </div>
              {noteOpen ? (
                <div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Nota opcional (motivo, acción tomada…)"
                    rows={2}
                    style={{
                      width: "100%", background: BG, border: `1px solid ${BORDER}`,
                      borderRadius: 8, padding: "8px 10px", color: TEXT, fontSize: 12,
                      outline: "none", resize: "vertical", boxSizing: "border-box",
                      marginBottom: 8, fontFamily: "inherit",
                    }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => doAction(noteOpen as "acknowledged" | "dismissed" | "resolved")}
                      disabled={actioning}
                      style={{
                        flex: 1, background: PURPLE, color: "#fff", border: "none",
                        borderRadius: 8, padding: "7px 12px", fontSize: 12,
                        fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      {actioning ? "Guardando…" : "Confirmar"}
                    </button>
                    <button
                      onClick={() => { setNoteOpen(null); setNote(""); }}
                      style={{
                        background: "transparent", color: MUTED, border: `1px solid ${BORDER}`,
                        borderRadius: 8, padding: "7px 12px", fontSize: 12, cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => setNoteOpen("acknowledged")}
                    style={{
                      background: `${YELLOW}20`, color: YELLOW, border: `1px solid ${YELLOW}40`,
                      borderRadius: 8, padding: "6px 12px", fontSize: 11,
                      fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    👁 Reconocer
                  </button>
                  <button
                    onClick={() => setNoteOpen("resolved")}
                    style={{
                      background: `${GREEN}20`, color: GREEN, border: `1px solid ${GREEN}40`,
                      borderRadius: 8, padding: "6px 12px", fontSize: 11,
                      fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    ✓ Resolver
                  </button>
                  <button
                    onClick={() => setNoteOpen("dismissed")}
                    style={{
                      background: `${MUTED}20`, color: MUTED, border: `1px solid ${BORDER}`,
                      borderRadius: 8, padding: "6px 12px", fontSize: 11,
                      fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    ✕ Descartar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function PrediccionesPage() {
  const [token,       setToken]       = useState<string | null>(null);
  const [status,      setStatus]      = useState<StatusKey>("active");
  const [severityF,   setSeverityF]   = useState("all");
  const [categoryF,   setCategoryF]   = useState("all");
  const [predictions, setPredictions] = useState<OraclePrediction[]>([]);
  const [loading,     setLoading]     = useState(true);

  // Auth
  useEffect(() => {
    const auth = getAuth(getApp());
    return onAuthStateChanged(auth, async (user) => {
      if (user) setToken(await user.getIdToken());
      else      setToken(null);
    });
  }, []);

  // Fetch on tab change
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/oraculo/predictions?status=${status}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setPredictions(d.predictions ?? []))
      .catch(() => setPredictions([]))
      .finally(() => setLoading(false));
  }, [token, status]);

  // Filters
  const filtered = useMemo(() => {
    let list = predictions;
    if (severityF !== "all") list = list.filter((p) => p.severity === severityF);
    if (categoryF !== "all") list = list.filter((p) => p.category === categoryF);
    return list.sort((a, b) => {
      const sevOrder = { critical: 0, warning: 1, info: 2 };
      const diff = (sevOrder[a.severity] ?? 2) - (sevOrder[b.severity] ?? 2);
      return diff !== 0 ? diff : b.createdAt - a.createdAt;
    });
  }, [predictions, severityF, categoryF]);

  const handleStatusChange = (id: string, newStatus: string) => {
    setPredictions((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div style={{ padding: "24px 24px 48px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: TEXT }}>
          Predicciones
        </h1>
        <p style={{ margin: 0, fontSize: 12, color: MUTED }}>
          Señales procesadas por ORÁCULO — ordenadas por severidad y confianza.
        </p>
      </div>

      {/* Status tabs */}
      <div style={{
        display: "flex", gap: 4, background: CARD, borderRadius: 10,
        border: `1px solid ${BORDER}`, padding: 4, marginBottom: 16,
        flexWrap: "wrap",
      }}>
        {STATUS_TABS.map((tab) => {
          const count = tab.key === status ? filtered.length : undefined;
          const isActive = tab.key === status;
          return (
            <button
              key={tab.key}
              onClick={() => { setStatus(tab.key); setSeverityF("all"); setCategoryF("all"); }}
              style={{
                flex: 1, minWidth: 80, padding: "7px 10px",
                background: isActive ? `${tab.color}20` : "transparent",
                color: isActive ? tab.color : MUTED,
                border: "none", borderRadius: 8, cursor: "pointer",
                fontSize: 12, fontWeight: isActive ? 700 : 400,
              }}
            >
              {tab.label}{count !== undefined ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <select
          value={severityF}
          onChange={(e) => setSeverityF(e.target.value)}
          style={{
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8,
            color: TEXT, fontSize: 12, padding: "6px 10px", outline: "none",
          }}
        >
          <option value="all">Toda severidad</option>
          <option value="critical">Crítica</option>
          <option value="warning">Alerta</option>
          <option value="info">Info</option>
        </select>
        <select
          value={categoryF}
          onChange={(e) => setCategoryF(e.target.value)}
          style={{
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8,
            color: TEXT, fontSize: 12, padding: "6px 10px", outline: "none",
          }}
        >
          <option value="all">Toda categoría</option>
          <option value="operational_risk">Operacional</option>
          <option value="delivery_risk">Entrega</option>
          <option value="marketing_risk">Marketing</option>
          <option value="strategic_opportunity">Estrategia</option>
          <option value="compliance_risk">Compliance</option>
          <option value="resource_risk">Recursos</option>
        </select>
        <div style={{ marginLeft: "auto", fontSize: 11, color: MUTED, alignSelf: "center" }}>
          {loading ? "Cargando…" : `${filtered.length} predicción(es)`}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ color: MUTED, textAlign: "center", padding: "60px 0", fontSize: 13 }}>
          Cargando predicciones…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`,
          padding: "48px 24px", textAlign: "center",
        }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔮</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 6 }}>
            Sin predicciones en este estado
          </div>
          <div style={{ fontSize: 12, color: MUTED }}>
            {status === "active"
              ? "Ejecuta un scan desde el Centro de Mando para generar predicciones."
              : "No hay predicciones en este estado."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((p) => token ? (
            <PredCard key={p.id} p={p} token={token} onStatusChange={handleStatusChange} />
          ) : null)}
        </div>
      )}
    </div>
  );
}
