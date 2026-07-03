"use client";

/**
 * SOFIAA Sprint F-3 — Pipeline Observer
 * Panel de telemetría en tiempo real del pipeline cognitivo.
 * Muestra TaskType, provider, capa de cache y latencia por request.
 */

import { getPipelineLog, getPipelineStats, clearPipelineLog, type PipelineEvent } from "@/core/pipeline-observer";
import { getSemanticCacheStats } from "@/core/semantic-cache";
import { getCacheStats } from "@/core/cache.adapter";
import { useState } from "react";

// ── Colores / tokens ──────────────────────────────────────────────────────

const TASK_COLORS: Record<string, string> = {
  query:      "#4F7CFF",
  extraction: "#9B4FD9",
  analysis:   "#FF6B35",
  generation: "#E91E8C",
  automation: "#00C09A",
  unknown:    "rgba(0,0,0,0.25)",
};

const TASK_LABELS: Record<string, string> = {
  query:      "Query",
  extraction: "Extract",
  analysis:   "Analysis",
  generation: "Generate",
  automation: "Automate",
  unknown:    "—",
};

const PROVIDER_COLORS: Record<string, string> = {
  groq:    "#00C09A",
  gemini:  "#4F7CFF",
  cache:   "#9B4FD9",
  none:    "rgba(0,0,0,0.25)",
  unknown: "rgba(0,0,0,0.25)",
};

const CACHE_COLORS: Record<string, string> = {
  exact:    "#00C09A",
  semantic: "#4F7CFF",
  miss:     "rgba(0,0,0,0.18)",
};

const CACHE_LABELS: Record<string, string> = {
  exact:    "Exact",
  semantic: "Semantic",
  miss:     "LLM",
};

// ── Sub-componentes ───────────────────────────────────────────────────────

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "999px",
      fontSize: "10px",
      fontWeight: 600,
      background: `${color}18`,
      color,
      border: `1px solid ${color}30`,
      letterSpacing: "0.02em",
    }}>
      {label}
    </span>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.7)",
      border: "1px solid rgba(255,255,255,0.9)",
      borderRadius: "14px",
      padding: "10px 10px 8px",
      textAlign: "center",
    }}>
      <p style={{ fontSize: "1.2rem", fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </p>
      <p style={{ fontSize: "9px", color: "rgba(0,0,0,0.38)", fontWeight: 500, marginTop: "2px", lineHeight: 1.3 }}>
        {label}
      </p>
    </div>
  );
}

function LatencyBadge({ ms }: { ms: number }) {
  const color = ms < 1000 ? "#00C09A" : ms < 3000 ? "#FF6B35" : "#E91E8C";
  return (
    <span style={{ fontSize: "10px", fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>
      {ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`}
    </span>
  );
}

function EventRow({ event }: { event: PipelineEvent }) {
  const taskColor    = TASK_COLORS[event.taskType]    ?? TASK_COLORS.unknown;
  const provColor    = PROVIDER_COLORS[event.provider] ?? PROVIDER_COLORS.unknown;
  const cacheColor   = CACHE_COLORS[event.cacheLayer];
  const taskLabel    = TASK_LABELS[event.taskType]    ?? event.taskType;
  const cacheLabel   = CACHE_LABELS[event.cacheLayer] ?? event.cacheLayer;
  const provLabel    = event.provider === "cache" ? "Cache" : event.provider.charAt(0).toUpperCase() + event.provider.slice(1);
  const timeLabel    = new Date(event.timestamp).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr auto auto auto",
      alignItems: "center",
      gap: "8px",
      padding: "8px 10px",
      borderRadius: "12px",
      background: "rgba(255,255,255,0.6)",
      border: "1px solid rgba(255,255,255,0.85)",
    }}>
      {/* Mensaje + timestamp */}
      <div style={{ minWidth: 0 }}>
        <p style={{
          fontSize: "11px", color: "#1D1D1F", fontWeight: 500,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {event.messageSnippet || "—"}
        </p>
        <p style={{ fontSize: "9px", color: "rgba(0,0,0,0.3)", marginTop: "1px" }}>{timeLabel}</p>
      </div>
      {/* Chips */}
      <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
        <Chip label={taskLabel}  color={taskColor} />
        <Chip label={cacheLabel} color={cacheColor} />
        <Chip label={provLabel}  color={provColor} />
      </div>
      {/* Latencia */}
      <div style={{ flexShrink: 0 }}>
        <LatencyBadge ms={event.latencyMs} />
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────

export default function PipelineObserver() {
  const [cleared, setCleared] = useState(false);

  const events    = getPipelineLog(15);
  const stats     = getPipelineStats();
  const semStats  = getSemanticCacheStats();
  const exactStats = getCacheStats();

  const handleClear = () => {
    clearPipelineLog();
    setCleared(c => !c); // forzar re-render
  };

  if (stats.total === 0) {
    return (
      <p style={{ fontSize: "12px", color: "rgba(0,0,0,0.3)", textAlign: "center", padding: "16px 0" }}>
        Sin datos aún. Inicia una conversación para ver el pipeline.
      </p>
    );
  }

  const hitRate = Math.round(stats.cacheHitRate * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

      {/* Estadísticas rápidas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
        <StatBox label="Total requests"  value={stats.total}                      color="#4F7CFF" />
        <StatBox label="Cache hit rate"  value={`${hitRate}%`}                    color={hitRate > 60 ? "#00C09A" : hitRate > 30 ? "#FF6B35" : "#E91E8C"} />
        <StatBox label="Avg latencia"    value={stats.avgLatencyMs < 1000 ? `${stats.avgLatencyMs}ms` : `${(stats.avgLatencyMs/1000).toFixed(1)}s`} color="#9B4FD9" />
        <StatBox label="LLM calls"       value={stats.llmCalls}                   color="#FF6B35" />
      </div>

      {/* Desglose de cache */}
      <div style={{
        background: "rgba(255,255,255,0.6)",
        border: "1px solid rgba(255,255,255,0.85)",
        borderRadius: "14px",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}>
        <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(0,0,0,0.3)" }}>
          Capas de cache
        </p>

        {[
          { label: "Exact match",  value: stats.exactHits,    total: exactStats.total,  hits: exactStats.hits,  color: "#00C09A",  detail: `${exactStats.total} entradas` },
          { label: "Semantic",     value: stats.semanticHits,  total: semStats.total,    hits: semStats.hits,    color: "#4F7CFF",  detail: `${semStats.total} vec · ${semStats.sizeKB}KB` },
          { label: "LLM (miss)",   value: stats.llmCalls,      total: stats.total,       hits: 0,               color: "rgba(0,0,0,0.18)", detail: "Groq / Gemini" },
        ].map(({ label, value, total, color, detail }) => (
          <div key={label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontSize: "11px", color: "rgba(0,0,0,0.5)" }}>{label}</span>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "9px", color: "rgba(0,0,0,0.3)" }}>{detail}</span>
                <span style={{ fontSize: "11px", fontWeight: 700, color }}>{value}</span>
              </div>
            </div>
            <div style={{ height: "5px", background: "rgba(0,0,0,0.05)", borderRadius: "999px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${stats.total > 0 ? Math.min((value / stats.total) * 100, 100) : 0}%`,
                background: color,
                borderRadius: "999px",
                transition: "width 0.4s ease",
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* TaskType distribution */}
      {Object.keys(stats.taskDistribution).length > 0 && (
        <div style={{
          background: "rgba(255,255,255,0.6)",
          border: "1px solid rgba(255,255,255,0.85)",
          borderRadius: "14px",
          padding: "12px 14px",
        }}>
          <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(0,0,0,0.3)", marginBottom: "10px" }}>
            Tipos de tarea (F-1)
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {Object.entries(stats.taskDistribution)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <Chip label={`${TASK_LABELS[type] ?? type} · ${count}`} color={TASK_COLORS[type] ?? TASK_COLORS.unknown} />
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Últimos requests */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(0,0,0,0.3)" }}>
            Últimos requests
          </p>
          <button
            onClick={handleClear}
            style={{
              fontSize: "9px", padding: "3px 8px", borderRadius: "999px",
              background: "rgba(233,30,140,0.07)", color: "#E91E8C",
              border: "1px solid rgba(233,30,140,0.18)", cursor: "pointer",
            }}
          >
            Limpiar log
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {events.map(event => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      </div>

    </div>
  );
}
