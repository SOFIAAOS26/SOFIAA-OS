"use client";

/**
 * SOFIAA THEMIS — Sprint T-3
 * /hermes/themis — Policy Override Dashboard
 *
 * Panel de administración para activar / desactivar políticas cognitivas
 * individualmente sin tocar código. Solo accesible para admins.
 *
 * Cada tarjeta muestra:
 *   - Nombre, ID, scope, prioridad
 *   - Toggle on/off con nota
 *   - Última modificación
 *   - Lista de constraints
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

// ── Helper: obtener ID token del usuario actual ──────────────────────────
async function getToken(user: import("firebase/auth").User | null): Promise<string | null> {
  if (!user) return null;
  try { return await user.getIdToken(); } catch { return null; }
}

// ── Paleta THEMIS ─────────────────────────────────────────────────────────────

const THEMIS  = "#059669";
const INDIGO  = "#6366f1";
const TEXT    = "#e2e8f0";
const MUTED   = "#64748b";
const CARD    = "#0f0f1e";
const BORDER  = "#1a1a30";
const BG      = "#06060f";
const RED     = "#ef4444";
const YELLOW  = "#f59e0b";
const GREEN   = "#22c55e";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface PolicyConstraintMeta {
  id:          string;
  severity:    "warn" | "error";
  instruction: string;
}

interface PolicyWithOverride {
  id:          string;
  name:        string;
  scope:       string;
  priority:    number;
  appliesTo:   string[];
  constraints: PolicyConstraintMeta[];
  enabled:     boolean;
  note:        string;
  updatedAt:   string | null;
  updatedBy:   string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SCOPE_LABEL: Record<string, string> = {
  global:          "🌐 Global",
  extension:       "🔌 Extensión",
  goal_active:     "🎯 Goal activo",
  unauthenticated: "🔓 Sin sesión",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function ThemisPoliciesPage() {
  const { user } = useAuth();

  const [policies,  setPolicies]  = useState<PolicyWithOverride[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [saving,    setSaving]    = useState<string | null>(null); // policyId en curso
  const [editNote,  setEditNote]  = useState<Record<string, string>>({});
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchPolicies = useCallback(async () => {
    const token = await getToken(user);
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/themis/policy-override", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as { policies: PolicyWithOverride[] };
      setPolicies(data.policies);
      // Init notes
      const notes: Record<string, string> = {};
      data.policies.forEach((p) => { notes[p.id] = p.note; });
      setEditNote(notes);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

  // ── Toggle ───────────────────────────────────────────────────────────────

  async function togglePolicy(policyId: string, currentEnabled: boolean) {
    const token = await getToken(user);
    if (!token || saving) return;
    const newEnabled = !currentEnabled;
    setSaving(policyId);

    try {
      const res = await fetch("/api/themis/policy-override", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          policyId,
          enabled: newEnabled,
          note:    editNote[policyId] ?? "",
        }),
      });

      const j = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);

      // Actualizar local
      setPolicies((prev) => prev.map((p) =>
        p.id === policyId
          ? { ...p, enabled: newEnabled, updatedAt: new Date().toISOString(), updatedBy: user?.email ?? "—" }
          : p
      ));
      showToast(`Política ${newEnabled ? "activada" : "desactivada"}: ${policyId}`, true);
    } catch (e) {
      showToast(String(e), false);
    } finally {
      setSaving(null);
    }
  }

  async function saveNote(policyId: string, currentEnabled: boolean) {
    const token = await getToken(user);
    if (!token || saving) return;
    setSaving(policyId);
    try {
      const res = await fetch("/api/themis/policy-override", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ policyId, enabled: currentEnabled, note: editNote[policyId] ?? "" }),
      });
      const j = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      setPolicies((prev) => prev.map((p) =>
        p.id === policyId
          ? { ...p, note: editNote[policyId] ?? "", updatedAt: new Date().toISOString() }
          : p
      ));
      showToast("Nota guardada", true);
    } catch (e) {
      showToast(String(e), false);
    } finally {
      setSaving(null);
    }
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  const total    = policies.length;
  const active   = policies.filter((p) => p.enabled).length;
  const inactive = total - active;
  const overridden = policies.filter((p) => p.updatedAt).length;

  // ── Render ────────────────────────────────────────────────────────────────

  if (!user) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: MUTED, fontSize: 14 }}>Inicia sesión para acceder al Panel de Políticas.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 24px", maxWidth: 960, margin: "0 auto", position: "relative" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 999,
          background: toast.ok ? `${GREEN}20` : `${RED}20`,
          border: `1px solid ${toast.ok ? GREEN : RED}60`,
          color: toast.ok ? GREEN : RED,
          borderRadius: 10, padding: "10px 18px", fontSize: 12, fontWeight: 600,
          backdropFilter: "blur(8px)", boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      {/* Encabezado */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${THEMIS}, #047857)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, boxShadow: `0 0 16px ${THEMIS}55`,
          }}>🛡</div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: TEXT, margin: 0 }}>
              THEMIS — Políticas Cognitivas
            </h1>
            <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>
              Activa o desactiva políticas sin modificar código. Los cambios aplican en ≤ 60s.
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Políticas",   val: total,     color: INDIGO },
          { label: "Activas",     val: active,    color: GREEN  },
          { label: "Inactivas",   val: inactive,  color: RED    },
          { label: "Modificadas", val: overridden, color: YELLOW },
        ].map((k) => (
          <div key={k.label} style={{
            background: CARD, border: `1px solid ${BORDER}`,
            borderRadius: 12, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Aviso importante */}
      <div style={{
        background: `${THEMIS}08`, border: `1px solid ${THEMIS}30`,
        borderRadius: 10, padding: "10px 16px", marginBottom: 24,
        display: "flex", gap: 10, alignItems: "flex-start",
      }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>⚖️</span>
        <p style={{ fontSize: 11, color: MUTED, margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: TEXT }}>privacy_guard</strong> no puede deshabilitarse — protege contra exposición de credenciales. Los demás overrides aplican a evaluaciones de respuesta (<code style={{ color: THEMIS }}>evaluateResponse</code>) y de acción (<code style={{ color: THEMIS }}>evaluateAction</code>). Los cambios se reflejan en el siguiente ciclo de evaluación (TTL cache: 60s).
        </p>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: MUTED, fontSize: 13 }}>Cargando políticas…</p>
        </div>
      )}
      {error && (
        <div style={{
          background: `${RED}10`, border: `1px solid ${RED}30`,
          borderRadius: 10, padding: "14px 18px", marginBottom: 20,
        }}>
          <p style={{ color: RED, fontSize: 13, margin: 0 }}>Error: {error}</p>
          <button onClick={fetchPolicies} style={{
            marginTop: 8, background: RED, color: "#fff", border: "none",
            borderRadius: 6, padding: "4px 12px", fontSize: 11, cursor: "pointer",
          }}>
            Reintentar
          </button>
        </div>
      )}

      {/* Lista de políticas */}
      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {policies.map((p) => {
            const isExp      = expanded === p.id;
            const isDisabled = p.id === "privacy_guard";
            const borderColor = p.enabled ? `${THEMIS}40` : `${RED}30`;

            return (
              <div key={p.id} style={{
                background: CARD,
                border: `1px solid ${isExp ? (p.enabled ? THEMIS : RED) : borderColor}`,
                borderLeft: `4px solid ${p.enabled ? THEMIS : RED}`,
                borderRadius: 12, overflow: "hidden",
                opacity: p.enabled ? 1 : 0.75,
                transition: "all 0.2s",
              }}>

                {/* Fila principal */}
                <div style={{
                  padding: "14px 18px",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  {/* Toggle */}
                  <button
                    onClick={() => !isDisabled && togglePolicy(p.id, p.enabled)}
                    disabled={!!saving || isDisabled}
                    title={isDisabled ? "Esta política no puede deshabilitarse" : undefined}
                    style={{
                      width: 44, height: 24, borderRadius: 12, border: "none",
                      background: p.enabled ? THEMIS : `${RED}60`,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      position: "relative", flexShrink: 0,
                      transition: "background 0.2s",
                      opacity: saving === p.id ? 0.5 : 1,
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%", background: "#fff",
                      position: "absolute", top: 3,
                      left: p.enabled ? 22 : 4,
                      transition: "left 0.2s",
                    }} />
                  </button>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{p.name}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, color: INDIGO,
                        background: `${INDIGO}18`, padding: "1px 6px", borderRadius: 4,
                      }}>{SCOPE_LABEL[p.scope] ?? p.scope}</span>
                      <span style={{
                        fontSize: 9, color: MUTED,
                        background: `#ffffff10`, padding: "1px 6px", borderRadius: 4,
                      }}>P{p.priority}</span>
                      {!p.enabled && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: RED,
                          background: `${RED}18`, padding: "1px 6px", borderRadius: 4,
                        }}>INACTIVA</span>
                      )}
                      {isDisabled && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: YELLOW,
                          background: `${YELLOW}18`, padding: "1px 6px", borderRadius: 4,
                        }}>🔒 PROTEGIDA</span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: MUTED, marginTop: 2, fontFamily: "monospace" }}>
                      {p.id}
                      {p.updatedAt && (
                        <span style={{ marginLeft: 10, fontFamily: "inherit" }}>
                          · mod. {fmtDate(p.updatedAt)} por {p.updatedBy?.split("@")[0]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Constraints count + chevron */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 10, color: MUTED }}>
                      {p.constraints.length} {p.constraints.length === 1 ? "regla" : "reglas"}
                    </span>
                    <button
                      onClick={() => setExpanded(isExp ? null : p.id)}
                      style={{
                        background: "transparent", border: "none",
                        color: MUTED, fontSize: 11, cursor: "pointer",
                      }}
                    >
                      {isExp ? "▲" : "▼"}
                    </button>
                  </div>
                </div>

                {/* Panel expandido */}
                {isExp && (
                  <div style={{ borderTop: `1px solid ${BORDER}`, padding: "16px 20px", background: BG }}>

                    {/* Nota */}
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ fontSize: 11, color: MUTED, margin: "0 0 6px", fontWeight: 700 }}>
                        Nota de administración
                      </p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          value={editNote[p.id] ?? ""}
                          onChange={(e) => setEditNote((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          placeholder="Razón del override, observaciones…"
                          maxLength={300}
                          style={{
                            flex: 1, background: CARD, border: `1px solid ${BORDER}`,
                            borderRadius: 8, padding: "7px 12px",
                            color: TEXT, fontSize: 12, outline: "none",
                          }}
                        />
                        <button
                          onClick={() => saveNote(p.id, p.enabled)}
                          disabled={!!saving}
                          style={{
                            background: THEMIS, color: "#fff", border: "none",
                            borderRadius: 8, padding: "7px 14px", fontSize: 11,
                            fontWeight: 700, cursor: "pointer", flexShrink: 0,
                            opacity: saving === p.id ? 0.6 : 1,
                          }}
                        >
                          Guardar
                        </button>
                      </div>
                    </div>

                    {/* Constraints */}
                    <p style={{ fontSize: 11, color: MUTED, margin: "0 0 8px", fontWeight: 700 }}>
                      Reglas ({p.constraints.length})
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {p.constraints.map((c) => (
                        <div key={c.id} style={{
                          background: CARD,
                          border: `1px solid ${c.severity === "error" ? `${RED}30` : `${YELLOW}30`}`,
                          borderRadius: 8, padding: "10px 14px",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 10, fontFamily: "monospace", color: MUTED }}>{c.id}</span>
                            <span style={{
                              fontSize: 9, fontWeight: 700,
                              color: c.severity === "error" ? RED : YELLOW,
                              background: `${c.severity === "error" ? RED : YELLOW}18`,
                              padding: "0 5px", borderRadius: 4,
                            }}>{c.severity.toUpperCase()}</span>
                          </div>
                          <p style={{ fontSize: 11, color: TEXT, margin: 0, lineHeight: 1.5 }}>
                            {c.instruction}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* appliesTo */}
                    {p.appliesTo.length > 0 && (
                      <p style={{ fontSize: 10, color: MUTED, margin: "12px 0 0" }}>
                        Aplica en: {p.appliesTo.map((r) => (
                          <code key={r} style={{ color: INDIGO, marginLeft: 6 }}>{r}</code>
                        ))}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
