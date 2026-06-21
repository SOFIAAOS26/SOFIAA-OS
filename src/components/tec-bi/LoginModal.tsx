"use client";

import { useState, FormEvent, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (nombre: string) => void;
}

export default function LoginModal({ isOpen, onClose, onSuccess }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      onSuccess(email);
      onClose();
    } catch {
      setError("Credenciales incorrectas. Verifica tu email y contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "rgba(255,255,255,0.92)", backdropFilter: "blur(40px)",
          borderRadius: 20, padding: "32px 28px", width: "100%", maxWidth: 360,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          border: "1px solid rgba(255,255,255,0.9)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔐</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", margin: "0 0 4px" }}>
            Acceso TEC BI
          </h2>
          <p style={{ fontSize: 12, color: "#888", margin: 0 }}>
            Ingresa con tus credenciales del área
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#0EA5E9", letterSpacing: "0.5px", display: "block", marginBottom: 5 }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 13,
                border: "1px solid rgba(14,165,233,0.25)", background: "rgba(255,255,255,0.8)",
                outline: "none", boxSizing: "border-box",
              }}
              placeholder="correo@tec.mx"
            />
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#0EA5E9", letterSpacing: "0.5px", display: "block", marginBottom: 5 }}>
              CONTRASEÑA
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 13,
                border: "1px solid rgba(14,165,233,0.25)", background: "rgba(255,255,255,0.8)",
                outline: "none", boxSizing: "border-box",
              }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#c0392b" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: "#0EA5E9", color: "#fff", border: "none", borderRadius: 12,
              padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer",
              opacity: loading ? 0.7 : 1, marginTop: 4,
            }}
          >
            {loading ? "Verificando…" : "Iniciar sesión"}
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 12, color: "#aaa", cursor: "pointer", padding: 4 }}
          >
            Cancelar
          </button>
        </form>
      </div>
    </div>
  );
}
