"use client";

// SOFIAA — Timeline UI
// Componente visual de línea temporal de sesiones

import { useState } from "react";
import { readTimeline, formatDate, type TimelineEntry } from "@/core/memory.timeline";

const COLORS: Record<string, string> = {
  "Contratar":  "#E91E8C",
  "Contactar":  "#4F7CFF",
  "Decidir":    "#FF6B35",
  "Comparar":   "#FFD60A",
  "Aprender":   "#9B4FD9",
  "Informarse": "#34C759",
  "General":    "rgba(0,0,0,0.2)",
};

function Tag({ label }: { label: string }) {
  const color = COLORS[label] ?? COLORS.General;
  return (
    <span style={{
      fontSize: "9px", fontWeight: 600, letterSpacing: "0.08em",
      padding: "2px 8px", borderRadius: "999px",
      background: `${color}18`, color,
      border: `1px solid ${color}30`,
    }}>
      {label}
    </span>
  );
}

function SessionCard({ entry, onResume }: { entry: TimelineEntry; onResume: (e: TimelineEntry) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: "rgba(255,255,255,0.6)",
      border: "1px solid rgba(255,255,255,0.9)",
      borderRadius: "14px",
      padding: "14px 16px",
      transition: "box-shadow 0.2s",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: "13px", fontWeight: 600, color: "#1D1D1F",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {entry.title}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "10px", color: "rgba(0,0,0,0.35)" }}>
              {formatDate(entry.timestamp)} · {entry.messageCount} msgs
            </span>
            {entry.topGoal && <Tag label={entry.topGoal} />}
            {entry.tags.slice(0, 2).map((t) => <Tag key={t} label={t} />)}
          </div>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(0,0,0,0.25)", fontSize: "16px", lineHeight: 1, padding: "2px",
            flexShrink: 0,
          }}
        >
          {expanded ? "▲" : "▼"}
        </button>
      </div>

      {/* Resumen expandible */}
      {expanded && (
        <div style={{ marginTop: "12px" }}>
          <p style={{
            fontSize: "12px", color: "rgba(0,0,0,0.55)", lineHeight: 1.6,
            borderLeft: "2px solid rgba(79,124,255,0.3)", paddingLeft: "10px",
          }}>
            {entry.summary || "Sin resumen disponible."}
          </p>
          <button
            onClick={() => onResume(entry)}
            style={{
              marginTop: "10px",
              fontSize: "11px", fontWeight: 600,
              padding: "6px 14px", borderRadius: "999px",
              background: "rgba(79,124,255,0.08)",
              color: "#4F7CFF",
              border: "1px solid rgba(79,124,255,0.2)",
              cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(79,124,255,0.15)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(79,124,255,0.08)")}
          >
            ↩ Reanudar contexto
          </button>
        </div>
      )}
    </div>
  );
}

interface TimelineUIProps {
  onResumeSession: (summary: string) => void;
}

export default function TimelineUI({ onResumeSession }: TimelineUIProps) {
  const store = readTimeline();
  const entries = [...store.entries].reverse(); // más reciente primero

  if (entries.length === 0) {
    return (
      <p style={{ fontSize: "12px", color: "rgba(0,0,0,0.3)", textAlign: "center", padding: "12px 0" }}>
        Sin sesiones anteriores. El historial aparece al resetear una conversación.
      </p>
    );
  }

  const handleResume = (entry: TimelineEntry) => {
    if (entry.summary) {
      onResumeSession(entry.summary);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Línea visual */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
        <div style={{ height: "1px", flex: 1, background: "rgba(79,124,255,0.15)" }} />
        <span style={{ fontSize: "9px", color: "rgba(0,0,0,0.25)", letterSpacing: "0.15em" }}>
          {entries.length} SESIÓN{entries.length !== 1 ? "ES" : ""}
        </span>
        <div style={{ height: "1px", flex: 1, background: "rgba(79,124,255,0.15)" }} />
      </div>

      {entries.map((entry) => (
        <SessionCard key={entry.sessionId} entry={entry} onResume={handleResume} />
      ))}

      {/* Memoria histórica */}
      {typeof window !== "undefined" && localStorage.getItem("sofiaa_long_memory") && (
        <div style={{
          marginTop: "4px", padding: "10px 14px",
          background: "rgba(155,79,217,0.05)",
          border: "1px solid rgba(155,79,217,0.15)",
          borderRadius: "12px",
        }}>
          <p style={{ fontSize: "10px", fontWeight: 600, color: "#9B4FD9", marginBottom: "4px", letterSpacing: "0.1em" }}>
            MEMORIA HISTÓRICA ACTIVA
          </p>
          <p style={{ fontSize: "11px", color: "rgba(0,0,0,0.4)", lineHeight: 1.5 }}>
            SOFIAA tiene contexto permanente sobre este usuario cargado en cada sesión.
          </p>
        </div>
      )}
    </div>
  );
}
