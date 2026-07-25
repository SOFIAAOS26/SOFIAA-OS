"use client";

// ── Paleta ────────────────────────────────────────────────────────────────────
const AMBER   = "#D97706";
const AMBER_L = "#FCD34D";
const CARD    = "#1a1205";
const BORDER  = "#2a1f08";
const TEXT    = "#fef3c7";
const MUTED   = "#78716c";

export default function ApoloReportesPage() {
  return (
    <div style={{ padding: "28px 24px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: TEXT }}>
          📋 Biblioteca de Reportes
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: MUTED }}>
          Historial completo de reportes generados por APOLO
        </p>
      </div>

      {/* Placeholder AP-2 */}
      <div style={{
        padding: "48px 24px", borderRadius: 16,
        background: CARD, border: `1px solid ${BORDER}`,
        textAlign: "center" as const,
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>☀️</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: AMBER_L, marginBottom: 8 }}>
          Disponible en Sprint AP-2
        </div>
        <div style={{ fontSize: 12, color: MUTED, maxWidth: 400, margin: "0 auto" }}>
          La biblioteca de reportes se activa cuando el Report Generator (AP-2) esté listo.
          Los reportes generados aparecerán aquí con filtros por tipo, estado y fecha.
        </div>
        <div style={{
          marginTop: 20, padding: "8px 16px", borderRadius: 8,
          background: `${AMBER}15`, border: `1px solid ${AMBER}30`,
          fontSize: 11, color: AMBER, display: "inline-block",
        }}>
          AP-0 ✓ → AP-1 (Data Aggregator) → AP-2 (Report Generator)
        </div>
      </div>
    </div>
  );
}
