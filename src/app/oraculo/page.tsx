"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getApp } from "firebase/app";
import type { OraclePrediction, OracleScanResponse } from "@/types/oraculo";

// ── Paleta ORÁCULO ────────────────────────────────────────────────────────────
const PURPLE = "#6D28D9";
const VIOLET = "#7c3aed";
const LAVEND = "#a78bfa";
const GREEN  = "#22c55e";
const YELLOW = "#f59e0b";
const RED    = "#ef4444";
const TEXT   = "#e2e8f0";
const MUTED  = "#64748b";
const CARD   = "#0f0a1a";
const BORDER = "#1e1030";
const BG     = "#06030f";

// ── Helpers ───────────────────────────────────────────────────────────────────

function severityColor(s: string) {
  if (s === "critical") return RED;
  if (s === "warning")  return YELLOW;
  return LAVEND;
}

function severityLabel(s: string) {
  if (s === "critical") return "CRÍTICA";
  if (s === "warning")  return "ALERTA";
  return "INFO";
}

function relTime(ts: number) {
  const d = Date.now() - ts;
  if (d < 60_000)      return "hace un momento";
  if (d < 3_600_000)   return `hace ${Math.floor(d / 60_000)} min`;
  if (d < 86_400_000)  return `hace ${Math.floor(d / 3_600_000)} h`;
  return new Date(ts).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

function categoryLabel(c: string) {
  const MAP: Record<string, string> = {
    operational_risk:    "Riesgo Operacional",
    delivery_risk:       "Riesgo de Entrega",
    marketing_risk:      "Riesgo Marketing",
    strategic_opportunity: "Oportunidad Estratégica",
    compliance_risk:     "Riesgo Compliance",
    resource_risk:       "Riesgo de Recursos",
  };
  return MAP[c] ?? c;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = PURPLE, icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon: string;
}) {
  return (
    <div style={{
      background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`,
      padding: "18px 20px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{
          width: 30, height: 30, borderRadius: 8, background: `${color}20`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
        }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: "0.5px" }}>
          {label.toUpperCase()}
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: "-1px" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Prediction mini-card ──────────────────────────────────────────────────────

function PredictionCard({ p }: { p: OraclePrediction }) {
  const col = severityColor(p.severity);
  return (
    <div style={{
      background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`,
      borderLeft: `3px solid ${col}`,
      padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{
          fontSize: 9, fontWeight: 800, color: col, letterSpacing: "0.8px",
          background: `${col}18`, padding: "2px 7px", borderRadius: 4,
        }}>
          {severityLabel(p.severity)}
        </span>
        <span style={{ fontSize: 10, color: MUTED }}>{relTime(p.createdAt)}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, lineHeight: 1.4 }}>
        {p.title}
      </div>
      <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>
        {p.summary.slice(0, 120)}{p.summary.length > 120 ? "…" : ""}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 9, color: LAVEND, background: `${LAVEND}18`,
          padding: "2px 6px", borderRadius: 4, fontWeight: 600,
        }}>
          {categoryLabel(p.category)}
        </span>
        <span style={{
          fontSize: 9, color: MUTED, background: `${MUTED}18`,
          padding: "2px 6px", borderRadius: 4,
        }}>
          {p.horizon} · {(p.confidence * 100).toFixed(0)}% confianza
        </span>
        <span style={{
          fontSize: 9, color: MUTED, background: `${MUTED}18`,
          padding: "2px 6px", borderRadius: 4, textTransform: "uppercase",
        }}>
          {p.signals[0]?.sourceEngine ?? "—"}
        </span>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function OraculoPage() {
  const [token,       setToken]       = useState<string | null>(null);
  const [scanning,    setScanning]    = useState(false);
  const [lastScan,    setLastScan]    = useState<OracleScanResponse | null>(null);
  const [predictions, setPredictions] = useState<OraclePrediction[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const auth = getAuth(getApp());
    return onAuthStateChanged(auth, async (user) => {
      if (user) setToken(await user.getIdToken());
      else      setToken(null);
    });
  }, []);

  // ── Cargar predicciones activas ─────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch("/api/oraculo/predictions?status=active&limit=50", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setPredictions(d.predictions ?? []))
      .catch(() => setError("Error cargando predicciones"))
      .finally(() => setLoading(false));
  }, [token]);

  // ── Scan manual ────────────────────────────────────────────────────────────
  const runScan = async () => {
    if (!token || scanning) return;
    setScanning(true);
    setError(null);
    try {
      const r = await fetch("/api/oraculo/scan", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json() as OracleScanResponse;
      setLastScan(d);
      // Recargar predicciones
      const r2 = await fetch("/api/oraculo/predictions?status=active&limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d2 = await r2.json();
      setPredictions(d2.predictions ?? []);
    } catch {
      setError("Error al ejecutar el scan");
    } finally {
      setScanning(false);
    }
  };

  // ── KPIs derivados ─────────────────────────────────────────────────────────
  const critCount = predictions.filter((p) => p.severity === "critical").length;
  const warnCount = predictions.filter((p) => p.severity === "warning").length;
  const recent    = [...predictions].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);

  return (
    <div style={{ padding: "24px 24px 48px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `linear-gradient(135deg, ${PURPLE}, ${VIOLET})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, boxShadow: `0 0 16px ${PURPLE}55`,
          }}>🔮</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: TEXT, letterSpacing: "-0.5px" }}>
              ORÁCULO
            </h1>
            <p style={{ margin: 0, fontSize: 11, color: LAVEND, letterSpacing: "1px", fontWeight: 600 }}>
              PREDICTIVE INTELLIGENCE ENGINE · GENERACIÓN 2
            </p>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
          Motor determinista de anticipación. Sintetiza señales de todos los dioses del Olimpo
          y genera predicciones accionables antes de que ocurra el problema.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: `${RED}15`, border: `1px solid ${RED}40`, borderRadius: 10,
          padding: "10px 14px", color: RED, fontSize: 12, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Último scan */}
      {lastScan && (
        <div style={{
          background: `${GREEN}10`, border: `1px solid ${GREEN}30`, borderRadius: 10,
          padding: "10px 14px", color: GREEN, fontSize: 12, marginBottom: 16,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span>✓</span>
          <span>
            Scan completado — {lastScan.signalsFound} señal(es) detectada(s),{" "}
            {lastScan.predictionsCreated} predicción(es) nueva(s) generada(s).
          </span>
        </div>
      )}

      {/* KPIs */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 14, marginBottom: 28,
      }}>
        <KpiCard
          label="Predicciones Activas"
          value={loading ? "…" : predictions.length}
          sub="requieren atención"
          color={LAVEND}
          icon="🔮"
        />
        <KpiCard
          label="Críticas"
          value={loading ? "…" : critCount}
          sub="acción inmediata"
          color={RED}
          icon="🚨"
        />
        <KpiCard
          label="Alertas"
          value={loading ? "…" : warnCount}
          sub="monitorear"
          color={YELLOW}
          icon="⚠️"
        />
        <KpiCard
          label="Engines Activos"
          value="6"
          sub="ATENA · TEC Bii · PROMETEO · NEXO · HERMES · THEMIS"
          color={GREEN}
          icon="⚙️"
        />
      </div>

      {/* Acciones */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 28 }}>
        <button
          onClick={runScan}
          disabled={scanning || !token}
          style={{
            background: scanning ? `${PURPLE}60` : `linear-gradient(135deg, ${PURPLE}, ${VIOLET})`,
            color: "#fff", border: "none", borderRadius: 10,
            padding: "10px 20px", fontSize: 13, fontWeight: 700,
            cursor: scanning || !token ? "default" : "pointer",
            boxShadow: scanning ? "none" : `0 0 14px ${PURPLE}55`,
            transition: "all 0.2s",
          }}
        >
          {scanning ? "⏳ Escaneando…" : "⚡ Escanear Ahora"}
        </button>
        <Link
          href="/oraculo/predicciones"
          style={{
            background: `${LAVEND}15`, color: LAVEND,
            border: `1px solid ${LAVEND}30`, borderRadius: 10,
            padding: "10px 20px", fontSize: 13, fontWeight: 600,
            textDecoration: "none", display: "inline-block",
          }}
        >
          Ver todas las predicciones →
        </Link>
        <Link
          href="/oraculo/forecasts"
          style={{
            background: `${MUTED}10`, color: MUTED,
            border: `1px solid ${BORDER}`, borderRadius: 10,
            padding: "10px 20px", fontSize: 13, fontWeight: 600,
            textDecoration: "none", display: "inline-block",
          }}
        >
          📈 Pronósticos
        </Link>
      </div>

      {/* Predicciones recientes */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT }}>
            Predicciones Recientes
          </h2>
          <Link href="/oraculo/predicciones" style={{ fontSize: 12, color: LAVEND, textDecoration: "none" }}>
            Ver todas →
          </Link>
        </div>

        {loading ? (
          <div style={{ color: MUTED, fontSize: 13, textAlign: "center", padding: "40px 0" }}>
            Cargando predicciones…
          </div>
        ) : recent.length === 0 ? (
          <div style={{
            background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`,
            padding: "40px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔮</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 6 }}>
              Sin predicciones activas
            </div>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>
              Ejecuta un scan para que ORÁCULO analice todos los engines del Olimpo.
            </div>
            <button
              onClick={runScan}
              disabled={scanning || !token}
              style={{
                background: PURPLE, color: "#fff", border: "none", borderRadius: 8,
                padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}
            >
              {scanning ? "Escaneando…" : "⚡ Escanear Ahora"}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recent.map((p) => <PredictionCard key={p.id} p={p} />)}
            {predictions.length > 3 && (
              <Link
                href="/oraculo/predicciones"
                style={{
                  display: "block", textAlign: "center", padding: "12px",
                  background: `${PURPLE}10`, border: `1px solid ${PURPLE}30`,
                  borderRadius: 10, color: LAVEND, fontSize: 12, fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Ver {predictions.length - 3} predicción(es) más →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Engines */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: TEXT }}>
          Engines Monitorizados
        </h2>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10,
        }}>
          {[
            { name: "ATENA",    icon: "🧬", desc: "SPC + AMEF",             color: "#3b82f6" },
            { name: "TEC Bii",  icon: "🏗",  desc: "Urgencia + Proveedores", color: "#10b981" },
            { name: "PROMETEO", icon: "🔥", desc: "Goals + Fatiga creativa", color: "#f97316" },
            { name: "NEXO",     icon: "🕸",  desc: "Hipótesis cognitivas",   color: "#8b5cf6" },
            { name: "HERMES",   icon: "⚡", desc: "Veto ratio acciones",     color: "#6366f1" },
            { name: "THEMIS",   icon: "⚖️", desc: "Violaciones de política", color: "#14b8a6" },
          ].map((e) => (
            <div
              key={e.name}
              style={{
                background: CARD, borderRadius: 10, border: `1px solid ${BORDER}`,
                padding: "12px 14px", borderTop: `2px solid ${e.color}`,
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 6 }}>{e.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: e.color }}>{e.name}</div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{e.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
