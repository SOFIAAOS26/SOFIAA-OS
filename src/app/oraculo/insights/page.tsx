"use client";

import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getApp } from "firebase/app";
import type { OracleInsight } from "@/types/oraculo";

// ── Paleta ORÁCULO ────────────────────────────────────────────────────────────
const PURPLE = "#6D28D9";
const VIOLET = "#7c3aed";
const LAVEND = "#a78bfa";
const GREEN  = "#22c55e";
const TEXT   = "#e2e8f0";
const MUTED  = "#64748b";
const CARD   = "#0f0a1a";
const BORDER = "#1e1030";

// ── Helpers ───────────────────────────────────────────────────────────────────

function confidenceColor(c: number) {
  if (c >= 0.75) return GREEN;
  if (c >= 0.5)  return "#f59e0b";
  return "#ef4444";
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 2)  return "hace un momento";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)} día(s)`;
}

// ── InsightCard ───────────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: OracleInsight }) {
  const [expanded, setExpanded] = useState(false);
  const confColor = confidenceColor(insight.confidence);

  return (
    <div
      style={{
        background: CARD, borderRadius: 14,
        border: `1px solid ${BORDER}`,
        borderLeft: `3px solid ${LAVEND}`,
        padding: "20px 22px",
        cursor: "pointer",
        transition: "border-color 0.2s",
      }}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${PURPLE}25`, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}>
          🔮
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 4, lineHeight: 1.4 }}>
            {insight.title}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {/* Confidence */}
            <span style={{
              fontSize: 10, fontWeight: 700, color: confColor,
              background: `${confColor}15`, borderRadius: 4,
              padding: "2px 7px",
            }}>
              {(insight.confidence * 100).toFixed(0)}% confianza
            </span>
            {/* Related predictions */}
            {insight.relatedPredictionIds.length > 0 && (
              <span style={{
                fontSize: 10, color: MUTED,
                background: `${MUTED}12`, borderRadius: 4,
                padding: "2px 7px",
              }}>
                {insight.relatedPredictionIds.length} pred. relacionada(s)
              </span>
            )}
            {/* Time */}
            <span style={{ fontSize: 10, color: MUTED }}>
              {timeAgo(insight.generatedAt)}
            </span>
          </div>
        </div>

        {/* Expand toggle */}
        <span style={{ color: MUTED, fontSize: 12, flexShrink: 0, marginTop: 2 }}>
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {/* Body (expanded) */}
      {expanded && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            background: `${PURPLE}08`, borderRadius: 10,
            border: `1px solid ${PURPLE}25`,
            padding: "14px 16px",
          }}>
            <p style={{
              margin: 0, fontSize: 13, color: TEXT,
              lineHeight: 1.75, whiteSpace: "pre-wrap",
            }}>
              {insight.body}
            </p>
          </div>

          {/* Confidence bar */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: MUTED }}>Confianza del insight</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: confColor }}>
                {(insight.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ height: 4, background: `${confColor}20`, borderRadius: 4 }}>
              <div style={{
                height: "100%", width: `${insight.confidence * 100}%`,
                background: confColor, borderRadius: 4,
                transition: "width 0.5s ease",
              }} />
            </div>
          </div>

          {/* Related IDs (for reference) */}
          {insight.relatedPredictionIds.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>Predicciones relacionadas</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {insight.relatedPredictionIds.map(id => (
                  <span key={id} style={{
                    fontSize: 9, color: LAVEND,
                    background: `${LAVEND}14`, borderRadius: 4,
                    padding: "2px 7px", fontFamily: "monospace",
                  }}>
                    {id.slice(0, 8)}…
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [token,    setToken]    = useState<string | null>(null);
  const [insights, setInsights] = useState<OracleInsight[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [gen,      setGen]      = useState(false);
  const [banner,   setBanner]   = useState<{ count: number } | null>(null);

  // Auth
  useEffect(() => {
    const auth = getAuth(getApp());
    return onAuthStateChanged(auth, async (user) => {
      if (user) setToken(await user.getIdToken());
      else      setToken(null);
    });
  }, []);

  // Fetch
  const load = async (t: string) => {
    setLoading(true);
    try {
      const r = await fetch("/api/oraculo/insights?limit=30", {
        headers: { Authorization: `Bearer ${t}` },
      });
      const d = await r.json();
      setInsights(d.insights ?? []);
    } catch {
      setInsights([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load(token);
  }, [token]);

  // Generate
  const generate = async () => {
    if (!token || gen) return;
    setGen(true);
    setBanner(null);
    try {
      const r = await fetch("/api/oraculo/insights", {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      setBanner({ count: d.insightsCreated ?? 0 });
      await load(token);
    } finally {
      setGen(false);
    }
  };

  return (
    <div style={{ padding: "24px 24px 48px", maxWidth: 860, margin: "0 auto" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", gap: 12,
        marginBottom: 24, flexWrap: "wrap",
      }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: TEXT }}>
            Insights Cruzados
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: MUTED }}>
            Narrativas estratégicas sintetizadas por Groq a partir de predicciones activas de todos los engines.
          </p>
        </div>
        <button
          onClick={generate}
          disabled={gen || !token}
          style={{
            background: gen ? `${PURPLE}60` : `linear-gradient(135deg, ${PURPLE}, ${VIOLET})`,
            color: "#fff", border: "none", borderRadius: 10,
            padding: "10px 18px", fontSize: 12, fontWeight: 700,
            cursor: gen || !token ? "default" : "pointer",
            boxShadow: gen ? "none" : `0 0 12px ${PURPLE}55`,
            flexShrink: 0,
          }}
        >
          {gen ? "⏳ Generando…" : "✨ Generar Insights"}
        </button>
      </div>

      {/* Banner */}
      {banner && (
        <div style={{
          background: banner.count > 0 ? `${GREEN}10` : `${MUTED}10`,
          border: `1px solid ${banner.count > 0 ? GREEN : MUTED}30`,
          borderRadius: 10, padding: "10px 14px",
          color: banner.count > 0 ? GREEN : MUTED,
          fontSize: 12, marginBottom: 16,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span>{banner.count > 0 ? "✓" : "ℹ"}</span>
          <span>
            {banner.count > 0
              ? `${banner.count} insight(s) generado(s) y persistidos.`
              : "No se generaron insights — necesitas al menos 2 predicciones activas."}
          </span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ color: MUTED, textAlign: "center", padding: "60px 0", fontSize: 13 }}>
          Cargando insights…
        </div>
      ) : insights.length === 0 ? (
        <div style={{
          background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`,
          padding: "48px 24px", textAlign: "center",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 6 }}>
            Sin insights generados
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 18 }}>
            Primero ejecuta un scan en el Centro de Mando para acumular predicciones activas,
            luego genera insights aquí.
          </div>
          <button
            onClick={generate}
            disabled={gen || !token}
            style={{
              background: PURPLE, color: "#fff", border: "none",
              borderRadius: 8, padding: "9px 20px",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            {gen ? "Generando…" : "✨ Generar ahora"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {insights.map(ins => (
            <InsightCard key={ins.id} insight={ins} />
          ))}
        </div>
      )}

      {/* Footer note */}
      <div style={{
        marginTop: 32, padding: "14px 16px",
        background: `${LAVEND}08`, border: `1px solid ${LAVEND}20`,
        borderRadius: 10,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: LAVEND, marginBottom: 6 }}>
          METODOLOGÍA
        </div>
        <p style={{ margin: 0, fontSize: 11, color: MUTED, lineHeight: 1.7 }}>
          ORÁCULO solicita a <strong style={{ color: TEXT }}>Groq (llama-3.3-70b-versatile)</strong> que
          sintetice los patrones sistémicos entre predicciones de engines distintos.
          El motor identifica conexiones causales o de riesgo acumulado que las predicciones individuales
          no revelan. La confianza refleja la solidez de las señales subyacentes.
        </p>
      </div>
    </div>
  );
}
