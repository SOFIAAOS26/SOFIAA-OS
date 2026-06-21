"use client";

import { useEffect } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
}

export default function TecBiModal({ isOpen, onClose, title, children, width = 520 }: Props) {
  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.28)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(40px)",
          borderRadius: 18,
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 64px rgba(14,165,233,0.18), 0 2px 0 rgba(255,255,255,0.9) inset",
          border: "1px solid rgba(14,165,233,0.2)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 22px 14px",
          borderBottom: "1px solid rgba(14,165,233,0.12)",
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 99,
              border: "none", background: "rgba(0,0,0,0.07)",
              cursor: "pointer", fontSize: 14, color: "#666",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "18px 22px 22px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Shared form field styles ──────────────────────────────────────────────────

export const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid rgba(14,165,233,0.25)",
  background: "rgba(255,255,255,0.9)",
  fontSize: 13,
  color: "#1D1D1F",
  outline: "none",
  transition: "border-color 0.2s",
};

export const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#666",
  letterSpacing: "0.3px",
  display: "block",
  marginBottom: 5,
};

export const formGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
};

export const formRow: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 0,
};

export function SubmitBtn({ loading, label = "Guardar" }: { loading?: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        width: "100%",
        padding: "10px",
        borderRadius: 10,
        border: "none",
        background: loading ? "#ccc" : "#0EA5E9",
        color: "#fff",
        fontSize: 13,
        fontWeight: 600,
        cursor: loading ? "not-allowed" : "pointer",
        marginTop: 18,
        transition: "background 0.2s",
      }}
    >
      {loading ? "Guardando…" : label}
    </button>
  );
}
