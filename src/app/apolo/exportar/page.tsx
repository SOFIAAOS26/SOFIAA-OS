"use client";

const AMBER   = "#D97706";
const AMBER_L = "#FCD34D";
const CARD    = "#1a1205";
const BORDER  = "#2a1f08";
const TEXT    = "#fef3c7";
const MUTED   = "#78716c";

export default function ApoloExportarPage() {
  return (
    <div style={{ padding: "28px 24px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: TEXT }}>
          📤 Exportar
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: MUTED }}>
          Exporta reportes a PDF o DOCX para entrega al cliente
        </p>
      </div>

      <div style={{
        padding: "48px 24px", borderRadius: 16,
        background: CARD, border: `1px solid ${BORDER}`,
        textAlign: "center" as const,
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📤</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: AMBER_L, marginBottom: 8 }}>
          Disponible en Sprint AP-4
        </div>
        <div style={{ fontSize: 12, color: MUTED, maxWidth: 400, margin: "0 auto" }}>
          El Export Engine genera PDF y DOCX desde los reportes en Firestore.
          Los archivos se entregan como stream (sin almacenamiento en Cloud Storage).
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: MUTED }}>
          Formatos: <strong style={{ color: AMBER_L }}>PDF</strong> · <strong style={{ color: AMBER_L }}>DOCX</strong>
        </div>
        <div style={{
          marginTop: 20, padding: "8px 16px", borderRadius: 8,
          background: `${AMBER}15`, border: `1px solid ${AMBER}30`,
          fontSize: 11, color: AMBER, display: "inline-block",
        }}>
          AP-0 ✓ → AP-1 → AP-2 → AP-3 → AP-4 (Export Engine)
        </div>
      </div>
    </div>
  );
}
