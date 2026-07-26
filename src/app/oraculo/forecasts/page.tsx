"use client";

import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getApp } from "firebase/app";
import type { OracleForecast } from "@/types/oraculo";

// ── Paleta ORÁCULO ────────────────────────────────────────────────────────────
const PURPLE = "#6D28D9";
const VIOLET = "#7c3aed";
const LAVEND = "#a78bfa";
const GREEN  = "#22c55e";
const YELLOW = "#f59e0b";
const RED    = "#ef4444";
const BLUE   = "#3b82f6";
const ORANGE = "#f97316";
const TEAL   = "#14b8a6";
const TEXT   = "#e2e8f0";
const MUTED  = "#64748b";
const CARD   = "#0f0a1a";
const BORDER = "#1e1030";

// ── Helpers ───────────────────────────────────────────────────────────────────

function engineColor(e: string) {
  const MAP: Record<string, string> = {
    atena: BLUE, tec_bii: GREEN, prometeo: ORANGE,
    nexo: "#8b5cf6", hermes: "#6366f1", themis: TEAL,
  };
  return MAP[e] ?? MUTED;
}

function engineIcon(e: string) {
  const MAP: Record<string, string> = {
    atena: "🧬", tec_bii: "🏗", prometeo: "🔥", nexo: "🕸", hermes: "⚡", themis: "⚖️",
  };
  return MAP[e] ?? "🔮";
}

function metricLabel(m: string) {
  const MAP: Record<string, string> = {
    spc_violations:      "Violaciones SPC",
    urgency_score_avg:   "Urgencia Promedio (TEC Bii)",
    goal_deviation_avg:  "Desviación de Objetivos (PROMETEO)",
  };
  return MAP[m] ?? m;
}

function metricUnit(m: string) {
  const MAP: Record<string, string> = {
    spc_violations:      "violaciones",
    urgency_score_avg:   "score 0-1",
    goal_deviation_avg:  "% desviación",
  };
  return MAP[m] ?? "";
}

function formatValue(m: string, v: number) {
  if (m === "urgency_score_avg" || m === "goal_deviation_avg") {
    return `${(v * 100).toFixed(1)}%`;
  }
  return v.toFixed(1);
}

function horizonLabel(projectionDate: number) {
  const days = Math.round((projectionDate - Date.now()) / (24 * 60 * 60 * 1000));
  if (days <= 7)  return "7 días";
  if (days <= 30) return "30 días";
  return `${days} días`;
}

function trendIcon(current: number, projected: number) {
  if (projected > current * 1.05) return { icon: "↑", color: RED };    // subiendo = peor para riesgo
  if (projected < current * 0.95) return { icon: "↓", color: GREEN };  // bajando = mejor
  return { icon: "→", color: YELLOW };
}

// ── Forecast Card ─────────────────────────────────────────────────────────────

function ForecastCard({ f }: { f: OracleForecast }) {
  const eColor  = engineColor(f.engine);
  const eIcon   = engineIcon(f.engine);
  const trend   = trendIcon(f.currentValue, f.projectedValue);
  const horizon = horizonLabel(f.projectionDate);

  return (
    <div style={{
      background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`,
      borderTop: `2px solid ${eColor}`, padding: "18px 20px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{
          width: 32, height: 32, borderRadius: 8, background: `${eColor}20`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
        }}>{eIcon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>
            {metricLabel(f.metric)}
          </div>
          <div style={{ fontSize: 10, color: eColor, fontWeight: 600, textTransform: "uppercase" }}>
            {f.engine} · {metricUnit(f.metric)}
          </div>
        </div>
        {/* Trend badge */}
        <div style={{
          fontSize: 20, fontWeight: 800, color: trend.color,
          background: `${trend.color}15`, borderRadius: 8,
          width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {trend.icon}
        </div>
      </div>

      {/* Values */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14,
      }}>
        <div style={{
          background: `${MUTED}08`, borderRadius: 8, padding: "10px 12px",
          border: `1px solid ${BORDER}`,
        }}>
          <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>VALOR ACTUAL</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: TEXT }}>
            {formatValue(f.metric, f.currentValue)}
          </div>
        </div>
        <div style={{
          background: `${trend.color}08`, borderRadius: 8, padding: "10px 12px",
          border: `1px solid ${trend.color}30`,
        }}>
          <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>PROYECTADO ({horizon})</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: trend.color }}>
            {formatValue(f.metric, f.projectedValue)}
          </div>
        </div>
      </div>

      {/* Confidence bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: MUTED }}>Confianza del pronóstico</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: LAVEND }}>
            {(f.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <div style={{ height: 4, background: `${LAVEND}20`, borderRadius: 4 }}>
          <div style={{
            height: "100%", width: `${f.confidence * 100}%`,
            background: LAVEND, borderRadius: 4,
            transition: "width 0.5s ease",
          }} />
        </div>
      </div>

      {/* Meta */}
      <div style={{
        display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap",
      }}>
        <span style={{
          fontSize: 9, background: `${MUTED}14`, color: MUTED,
          padding: "2px 7px", borderRadius: 4,
        }}>
          📐 {f.methodology.replace("_", " ")}
        </span>
        <span style={{
          fontSize: 9, background: `${MUTED}14`, color: MUTED,
          padding: "2px 7px", borderRadius: 4,
        }}>
          📊 {f.dataPoints.length} punto(s) de datos
        </span>
        <span style={{
          fontSize: 9, background: `${MUTED}14`, color: MUTED,
          padding: "2px 7px", borderRadius: 4,
        }}>
          📅 {new Date(f.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function ForecastsPage() {
  const [token,     setToken]     = useState<string | null>(null);
  const [forecasts, setForecasts] = useState<OracleForecast[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [gen,       setGen]       = useState(false);
  const [lastGen,   setLastGen]   = useState<{ created: number } | null>(null);

  // Auth
  useEffect(() => {
    const auth = getAuth(getApp());
    return onAuthStateChanged(auth, async (user) => {
      if (user) setToken(await user.getIdToken());
      else      setToken(null);
    });
  }, []);

  // Fetch
  const loadForecasts = async (t: string) => {
    setLoading(true);
    try {
      const r = await fetch("/api/oraculo/forecasts?limit=50", {
        headers: { Authorization: `Bearer ${t}` },
      });
      const d = await r.json();
      setForecasts(d.forecasts ?? []);
    } catch {
      setForecasts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadForecasts(token);
  }, [token]);

  // Generate
  const generate = async () => {
    if (!token || gen) return;
    setGen(true);
    try {
      const r = await fetch("/api/oraculo/forecasts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      setLastGen({ created: d.forecastsCreated ?? 0 });
      await loadForecasts(token);
    } finally {
      setGen(false);
    }
  };

  // Group by engine
  const grouped = forecasts.reduce<Record<string, OracleForecast[]>>((acc, f) => {
    (acc[f.engine] ??= []).push(f);
    return acc;
  }, {});

  return (
    <div className="pt-14 md:pt-0" style={{ padding: "0 24px 48px", maxWidth: 900, margin: "0 auto" }}><div style={{ paddingTop: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: TEXT }}>
            Pronósticos
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: MUTED }}>
            Proyecciones deterministas mediante regresión lineal sobre métricas históricas.
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
          {gen ? "⏳ Generando…" : "📈 Generar Pronósticos"}
        </button>
      </div>

      {/* Last gen banner */}
      {lastGen && (
        <div style={{
          background: `${GREEN}10`, border: `1px solid ${GREEN}30`, borderRadius: 10,
          padding: "10px 14px", color: GREEN, fontSize: 12, marginBottom: 16,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span>✓</span>
          <span>{lastGen.created} pronóstico(s) generado(s) y persistidos.</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ color: MUTED, textAlign: "center", padding: "60px 0", fontSize: 13 }}>
          Cargando pronósticos…
        </div>
      ) : forecasts.length === 0 ? (
        <div style={{
          background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`,
          padding: "48px 24px", textAlign: "center",
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📈</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 6 }}>
            Sin pronósticos generados
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>
            ORÁCULO necesita datos históricos en Firestore para calcular proyecciones.
            Primero ejecuta un scan, luego genera pronósticos.
          </div>
          <button
            onClick={generate}
            disabled={gen || !token}
            style={{
              background: PURPLE, color: "#fff", border: "none", borderRadius: 8,
              padding: "9px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            {gen ? "Generando…" : "📈 Generar ahora"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {Object.entries(grouped).map(([engine, list]) => (
            <div key={engine}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 16 }}>{engineIcon(engine)}</span>
                <h2 style={{
                  margin: 0, fontSize: 14, fontWeight: 700,
                  color: engineColor(engine), textTransform: "uppercase", letterSpacing: "0.5px",
                }}>
                  {engine.replace("_", " ")}
                </h2>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 12,
              }}>
                {list.sort((a, b) => b.createdAt - a.createdAt).map((f) => (
                  <ForecastCard key={f.id} f={f} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Methodology note */}
      <div style={{
        marginTop: 32, padding: "14px 16px",
        background: `${LAVEND}08`, border: `1px solid ${LAVEND}20`,
        borderRadius: 10,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: LAVEND, marginBottom: 6 }}>
          METODOLOGÍA
        </div>
        <p style={{ margin: 0, fontSize: 11, color: MUTED, lineHeight: 1.7 }}>
          ORÁCULO utiliza <strong style={{ color: TEXT }}>regresión lineal</strong> sobre puntos históricos de cada métrica.
          La confianza aumenta con más puntos de datos (mín. 2 → 50%, máx. ~90%).
          Los pronósticos son indicativos — no reemplazaban el juicio operativo.
          Sprints futuros incorporarán regresión ponderada y detección de tendencias no lineales.
        </p>
      </div>
      </div>
    </div>
  );
}
