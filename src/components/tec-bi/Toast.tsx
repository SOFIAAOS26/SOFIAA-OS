"use client";

import { useState, useCallback, useEffect } from "react";

type ToastType = "success" | "error" | "info";

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

const ICONS: Record<ToastType, string> = {
  success: "✅",
  error:   "❌",
  info:    "ℹ️",
};

const COLORS: Record<ToastType, { bg: string; border: string; text: string }> = {
  success: { bg: "rgba(52,199,89,0.12)",  border: "rgba(52,199,89,0.3)",  text: "#1a7a3a" },
  error:   { bg: "rgba(255,59,48,0.10)",  border: "rgba(255,59,48,0.3)",  text: "#c0392b" },
  info:    { bg: "rgba(14,165,233,0.10)", border: "rgba(14,165,233,0.3)", text: "#0369a1" },
};

export function useToast() {
  const [toast, setToast] = useState<ToastState>({ message: "", type: "success", visible: false });

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    setToast({ message, type, visible: true });
  }, []);

  useEffect(() => {
    if (!toast.visible) return;
    const t = setTimeout(() => setToast((s) => ({ ...s, visible: false })), 2800);
    return () => clearTimeout(t);
  }, [toast.visible, toast.message]);

  return { toast, showToast };
}

export default function Toast({ toast }: { toast: ToastState }) {
  if (!toast.visible) return null;
  const c = COLORS[toast.type];
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      background: c.bg, border: `1px solid ${c.border}`,
      backdropFilter: "blur(20px)", borderRadius: 12,
      padding: "12px 20px", display: "flex", alignItems: "center", gap: 10,
      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
      zIndex: 9999, minWidth: 220, maxWidth: 360,
      animation: "toastIn 0.25s ease",
    }}>
      <span style={{ fontSize: 16 }}>{ICONS[toast.type]}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{toast.message}</span>
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
