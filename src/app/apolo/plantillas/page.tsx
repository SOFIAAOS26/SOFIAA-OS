"use client";

const AMBER   = "#D97706";
const AMBER_L = "#FCD34D";
const CARD    = "#1a1205";
const BORDER  = "#2a1f08";
const TEXT    = "#fef3c7";
const MUTED   = "#78716c";

export default function ApoloPlantillasPage() {
  return (
    <div style={{ padding: "28px 24px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: TEXT }}>
          🎨 Plantillas
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: MUTED }}>
          Plantillas personalizadas de reportes APOLO
        </p>
      </div>

      <div style={{
        padding: "48px 24px", borderRadius: 16,
        background: CARD, border: `1px solid ${BORDER}`,
        textAlign: "center" as const,
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🎨</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: AMBER_L, marginBottom: 8 }}>
          Disponible en Sprint AP-3
        </div>
        <div style={{ fontSize: 12, color: MUTED, maxWidth: 400, margin: "0 auto" }}>
          El CRUD de plantillas personalizadas (nombre, tipo, engines incluidos, branding básico)
          llega en Sprint AP-3 junto con la Report Library UI completa.
        </div>
        <div style={{
          marginTop: 20, padding: "8px 16px", borderRadius: 8,
          background: `${AMBER}15`, border: `1px solid ${AMBER}30`,
          fontSize: 11, color: AMBER, display: "inline-block",
        }}>
          AP-0 ✓ → AP-1 → AP-2 → AP-3 (UI completa)
        </div>
      </div>
    </div>
  );
}
