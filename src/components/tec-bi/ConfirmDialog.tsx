"use client";

import { useState, useCallback } from "react";

const ACCENT = "#0EA5E9";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface DialogState extends ConfirmOptions {
  open: boolean;
  resolve: ((confirmed: boolean) => void) | null;
}

/**
 * Hook que devuelve un método `confirm()` y el componente `<ConfirmDialog />`.
 *
 * Uso:
 *   const { confirm, ConfirmDialog } = useConfirmDialog();
 *   ...
 *   const ok = await confirm({ message: "¿Archivar este empleado?" });
 *   if (ok) await toggleEmpleado(id, false);
 *   ...
 *   return <div>... <ConfirmDialog /></div>
 */
export function useConfirmDialog() {
  const [state, setState] = useState<DialogState>({
    open: false,
    resolve: null,
    message: "",
  });

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...opts, open: true, resolve });
    });
  }, []);

  const respond = (confirmed: boolean) => {
    state.resolve?.(confirmed);
    setState((s) => ({ ...s, open: false, resolve: null }));
  };

  function ConfirmDialog() {
    if (!state.open) return null;
    const isDanger = state.danger ?? true;

    return (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
          animation: "tbi-fade-in 0.15s ease",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) respond(false); }}
      >
        <style>{`
          @keyframes tbi-fade-in  { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        `}</style>
        <div
          style={{
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(14,165,233,0.2)",
            borderRadius: 18,
            padding: "28px 28px 24px",
            maxWidth: 380,
            width: "100%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          }}
        >
          {/* Icon */}
          <div style={{ fontSize: 32, marginBottom: 12, textAlign: "center" }}>
            {isDanger ? "⚠️" : "❓"}
          </div>

          {/* Title */}
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", margin: "0 0 8px", textAlign: "center" }}>
            {state.title ?? (isDanger ? "¿Confirmar acción?" : "¿Estás seguro?")}
          </h3>

          {/* Message */}
          <p style={{ fontSize: 13, color: "#666", margin: "0 0 24px", textAlign: "center", lineHeight: 1.5 }}>
            {state.message}
          </p>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => respond(false)}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "rgba(0,0,0,0.04)",
                fontSize: 13, fontWeight: 600, color: "#555",
                cursor: "pointer",
              }}
            >
              {state.cancelLabel ?? "Cancelar"}
            </button>
            <button
              onClick={() => respond(true)}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 10,
                border: "none",
                background: isDanger
                  ? "linear-gradient(135deg, #FF3B30, #FF6B35)"
                  : ACCENT,
                fontSize: 13, fontWeight: 600, color: "#fff",
                cursor: "pointer",
                boxShadow: isDanger
                  ? "0 4px 14px rgba(255,59,48,0.35)"
                  : "0 4px 14px rgba(14,165,233,0.35)",
              }}
            >
              {state.confirmLabel ?? "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return { confirm, ConfirmDialog };
}
