"use client";

// SOFIAA — Cognitive Dashboard
// Métricas de sesión en tiempo real integradas al Panel Admin

import { readTelemetryStore, avg, type TelemetrySession } from "@/config/metrics.schema";

const accent = "#4F7CFF";
const purple  = "#9B4FD9";
const pink    = "#E91E8C";
const green   = "#34C759";
const orange  = "#FF6B35";

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  color: string;
}

function MetricCard({ label, value, sub, color }: MetricCardProps) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.7)",
      border: "1px solid rgba(255,255,255,0.9)",
      borderRadius: "16px",
      padding: "14px 12px",
      textAlign: "center",
    }}>
      <p style={{ fontSize: "1.5rem", fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </p>
      <p style={{ fontSize: "10px", color: "rgba(0,0,0,0.4)", fontWeight: 500, marginTop: "2px", lineHeight: 1.3 }}>
        {label}
      </p>
      {sub && (
        <p style={{ fontSize: "9px", color: "rgba(0,0,0,0.25)", marginTop: "2px" }}>{sub}</p>
      )}
    </div>
  );
}

/** Mini barra horizontal proporcional */
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ height: "6px", background: "rgba(0,0,0,0.06)", borderRadius: "999px", overflow: "hidden" }}>
      <div style={{
        height: "100%",
        width: `${pct}%`,
        background: color,
        borderRadius: "999px",
        transition: "width 0.4s ease",
      }} />
    </div>
  );
}

/** Muestra los TTI de las últimas N sesiones como sparkline de barras */
function TtiSparkline({ sessions }: { sessions: TelemetrySession[] }) {
  const values = sessions.map((s) => avg(s.metrics.tti)).filter((v) => v > 0).slice(-8);
  if (values.length === 0) return (
    <p style={{ fontSize: "12px", color: "rgba(0,0,0,0.3)" }}>Sin datos aún</p>
  );
  const maxVal = Math.max(...values);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "36px" }}>
      {values.map((v, i) => (
        <div
          key={i}
          title={`${v}ms`}
          style={{
            flex: 1,
            height: `${Math.max((v / maxVal) * 100, 8)}%`,
            background: v < 2000 ? green : v < 4000 ? accent : pink,
            borderRadius: "3px 3px 0 0",
            transition: "height 0.3s",
          }}
        />
      ))}
    </div>
  );
}

export default function CognitiveDashboard() {
  const store = readTelemetryStore();
  const sessions = store.sessions;
  const current  = sessions[sessions.length - 1];
  const allTTIs  = sessions.flatMap((s) => s.metrics.tti);
  const allIFCs  = sessions.flatMap((s) => s.metrics.ifc);

  // Métricas globales
  const globalAvgTTI = avg(allTTIs);
  const globalAvgIFC = avg(allIFCs);
  const totalMessages = sessions.reduce((a, s) => a + s.metrics.totalMessages, 0);
  const totalGuardrails = sessions.reduce((a, s) => a + s.metrics.guardrailsTriggered, 0);
  const sessionsWithVoice = sessions.filter((s) => s.metrics.voiceUsed).length;
  const sessionsWithMemory = sessions.filter((s) => s.metrics.cks).length;
  const avgIAI = sessions.length > 0
    ? Math.round((sessions.reduce((a, s) => a + s.metrics.iai, 0) / sessions.length) * 100)
    : 0;

  // Sesión actual
  const curMetrics = current?.metrics;
  const curTTI  = curMetrics ? avg(curMetrics.tti) : 0;
  const curIFC  = curMetrics ? avg(curMetrics.ifc) : 0;

  if (sessions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <p style={{ fontSize: "13px", color: "rgba(0,0,0,0.3)" }}>
          Sin datos aún. Inicia una conversación para ver métricas.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Sección: sesión actual */}
      <div>
        <p style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", fontWeight: 600, marginBottom: "10px" }}>
          Sesión actual
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          <MetricCard
            label="TTI"
            value={curTTI > 0 ? `${(curTTI / 1000).toFixed(1)}s` : "—"}
            sub="tiempo respuesta"
            color={curTTI < 2000 ? green : curTTI < 4000 ? accent : pink}
          />
          <MetricCard
            label="IFC"
            value={curIFC > 0 ? `${curIFC}c` : "—"}
            sub="fricción msg"
            color={purple}
          />
          <MetricCard
            label="Msgs"
            value={curMetrics ? String(curMetrics.totalMessages) : "0"}
            sub="esta sesión"
            color={accent}
          />
        </div>
      </div>

      {/* TTI histórico */}
      <div style={{
        background: "rgba(255,255,255,0.7)",
        border: "1px solid rgba(255,255,255,0.9)",
        borderRadius: "16px",
        padding: "14px 16px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <p style={{ fontSize: "11px", color: "rgba(0,0,0,0.4)", fontWeight: 600 }}>TTI — últimas sesiones</p>
          <p style={{ fontSize: "11px", fontWeight: 700, color: globalAvgTTI < 2000 ? green : globalAvgTTI < 4000 ? accent : pink }}>
            {globalAvgTTI > 0 ? `${(globalAvgTTI / 1000).toFixed(1)}s avg` : "—"}
          </p>
        </div>
        <TtiSparkline sessions={sessions} />
        <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
          {[{ label: "Rápido < 2s", color: green }, { label: "Normal < 4s", color: accent }, { label: "Lento > 4s", color: pink }].map(({ label, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color }} />
              <span style={{ fontSize: "9px", color: "rgba(0,0,0,0.35)" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Métricas globales */}
      <div>
        <p style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", fontWeight: 600, marginBottom: "10px" }}>
          Global — {sessions.length} sesión{sessions.length !== 1 ? "es" : ""}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            { label: "Mensajes totales", value: totalMessages, max: Math.max(totalMessages, 50), display: String(totalMessages), color: accent },
            { label: "IFC promedio (fricción)", value: globalAvgIFC, max: 200, display: `${globalAvgIFC}c`, color: purple },
            { label: "IAI — anticipación", value: avgIAI, max: 100, display: `${avgIAI}%`, color: orange },
            { label: "CKS — sesiones con memoria", value: sessionsWithMemory, max: sessions.length, display: `${sessionsWithMemory}/${sessions.length}`, color: green },
            { label: "Voz usada", value: sessionsWithVoice, max: sessions.length, display: `${sessionsWithVoice}/${sessions.length}`, color: pink },
          ].map(({ label, value, max, display, color }) => (
            <div key={label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "11px", color: "rgba(0,0,0,0.5)" }}>{label}</span>
                <span style={{ fontSize: "11px", fontWeight: 700, color }}>{display}</span>
              </div>
              <MiniBar value={value} max={max} color={color} />
            </div>
          ))}
        </div>
      </div>

      {/* Guardrails */}
      {totalGuardrails > 0 && (
        <div style={{
          background: "rgba(233,30,140,0.05)",
          border: "1px solid rgba(233,30,140,0.15)",
          borderRadius: "12px",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <span style={{ fontSize: "12px", color: "rgba(0,0,0,0.5)" }}>Guardrails disparados</span>
          <span style={{ fontSize: "13px", fontWeight: 700, color: pink }}>{totalGuardrails}</span>
        </div>
      )}
    </div>
  );
}
