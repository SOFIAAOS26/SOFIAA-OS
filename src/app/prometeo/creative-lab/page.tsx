"use client";

/**
 * PROMETEO — Creative Lab (Sprint P-4)
 * /prometeo/creative-lab
 *
 * Generador de variantes creativas con IA.
 * Groq genera hooks + CTAs + ofertas.
 * Scoring predictivo basado en la Creative Memory del workspace.
 * Sesiones guardadas como CreativeLab en Firestore.
 */

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  subscribeCreativeLabs,
  createCreativeLab,
  updateCreativeLab,
} from "@/lib/prometeo/firestore";
import type {
  CreativeLab,
  CreativeVariant,
  TipoObjetivo,
  CanalMarketing,
  HookType,
} from "@/extensions/prometeo/schema";

// ── Paleta ────────────────────────────────────────────────────────────────────

const FIRE    = "#f97316";
const CRIMSON = "#ef4444";
const BG      = "#09090f";
const CARD    = "#14141f";
const CARD2   = "#1a1a2e";
const BORDER  = "#1e1e2e";
const TEXT    = "#e2e8f0";
const MUTED   = "#64748b";
const GREEN   = "#22c55e";
const AMBER   = "#f59e0b";
const BLUE    = "#3b82f6";
const TEAL    = "#14b8a6";

// ── Constantes ────────────────────────────────────────────────────────────────

const TIPOS: TipoObjetivo[] = ["AWARENESS", "CONSIDERACION", "CONVERSION", "RETENCION", "UPSELL"];
const CANALES: CanalMarketing[] = [
  "Instagram", "Facebook", "TikTok", "YouTube", "LinkedIn", "Google", "WhatsApp", "Email",
];

const TIPO_META: Record<TipoObjetivo, { icon: string; color: string }> = {
  AWARENESS:     { icon: "📣", color: BLUE   },
  CONSIDERACION: { icon: "🔍", color: AMBER  },
  CONVERSION:    { icon: "💰", color: GREEN  },
  RETENCION:     { icon: "🔄", color: TEAL   },
  UPSELL:        { icon: "📈", color: FIRE   },
};

const HOOK_META: Record<HookType, { label: string; icon: string; color: string }> = {
  PREGUNTA_PROVOCADORA: { label: "Pregunta Provocadora", icon: "❓", color: "#a855f7" },
  CIFRA_IMPACTANTE:     { label: "Cifra Impactante",     icon: "📊", color: BLUE      },
  HISTORIA_CLIENTE:     { label: "Historia de Cliente",  icon: "📖", color: GREEN     },
  PROBLEMA_SOLUCION:    { label: "Problema → Solución",  icon: "🔧", color: AMBER     },
  ANTES_DESPUES:        { label: "Antes / Después",       icon: "↔️", color: FIRE      },
  TESTIMONIO:           { label: "Testimonio",            icon: "⭐", color: "#eab308" },
  SECRETO_REVELADO:     { label: "Secreto Revelado",      icon: "🔓", color: CRIMSON  },
  CONTRAINTUITIVO:      { label: "Contraintuitivo",       icon: "🔄", color: "#06b6d4" },
  URGENCIA:             { label: "Urgencia",              icon: "⚡", color: FIRE      },
};

// ── Score bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 70 ? GREEN : pct >= 50 ? AMBER : CRIMSON;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: MUTED, marginBottom: 2 }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{value.toFixed(1)}</span>
      </div>
      <div style={{ height: 4, background: BORDER, borderRadius: 99 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

// ── Sesión histórica mini-card ────────────────────────────────────────────────

function LabCard({ lab, onClick }: { lab: CreativeLab; onClick: () => void }) {
  const tipo = TIPO_META[lab.objetivo];
  return (
    <div
      onClick={onClick}
      style={{
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
        padding: "12px 14px", cursor: "pointer", transition: "all 0.15s",
        display: "flex", alignItems: "center", gap: 12,
      }}
    >
      <span style={{ fontSize: 20 }}>{tipo.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {lab.objetivo} · {lab.canal}
        </div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
          {lab.variantes.length} variantes · {lab.variantesSeleccionadas.length} seleccionadas
        </div>
      </div>
      <span style={{
        fontSize: 10, padding: "2px 7px", borderRadius: 5, fontWeight: 700,
        background: lab.estado === "exportado" ? `${GREEN}22` : lab.estado === "listo" ? `${FIRE}18` : `${AMBER}18`,
        color: lab.estado === "exportado" ? GREEN : lab.estado === "listo" ? FIRE : AMBER,
      }}>
        {lab.estado.toUpperCase()}
      </span>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Config {
  objetivo:       TipoObjetivo;
  canal:          CanalMarketing;
  industria:      string;
  presupuestoMXN: number;
  clienteId:      string;
}

const CONFIG_DEFAULTS: Config = {
  objetivo: "CONVERSION", canal: "Instagram",
  industria: "", presupuestoMXN: 0, clienteId: "",
};

export default function CreativeLabPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [labs, setLabs] = useState<CreativeLab[]>([]);

  // ── Estado de la sesión activa ────────────────────────────────────────────
  const [config,    setConfig]    = useState<Config>(CONFIG_DEFAULTS);
  const [variantes, setVariantes] = useState<CreativeVariant[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [basadasEn, setBasadasEn] = useState(0);

  // ── Sesión seleccionada del historial ─────────────────────────────────────
  const [selectedLab, setSelectedLab] = useState<CreativeLab | null>(null);

  // ── Subscribe historial ───────────────────────────────────────────────────
  useEffect(() => {
    if (!activeWorkspaceId) return;
    return subscribeCreativeLabs(activeWorkspaceId, setLabs);
  }, [activeWorkspaceId]);

  const setC = <K extends keyof Config>(k: K, v: Config[K]) =>
    setConfig((prev) => ({ ...prev, [k]: v }));

  // ── Generar variantes ─────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!activeWorkspaceId || !config.industria.trim()) return;
    setLoading(true);
    setError(null);
    setVariantes([]);
    setSelectedLab(null);

    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) throw new Error("Sin autenticación");

      const res = await fetch("/api/prometeo/creative-lab/generate", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          workspaceId:    activeWorkspaceId,
          objetivo:       config.objetivo,
          canal:          config.canal,
          industria:      config.industria,
          presupuestoMXN: config.presupuestoMXN,
          clienteId:      config.clienteId || undefined,
        }),
      });

      const data = await res.json() as {
        ok?: boolean; variantes?: CreativeVariant[];
        generadas?: number; basadasEn?: number; error?: string;
      };

      if (!data.ok || !data.variantes) throw new Error(data.error ?? "Error generando");

      setVariantes(data.variantes);
      setBasadasEn(data.basadasEn ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  // ── Toggle selección de variante ──────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setVariantes((prev) =>
      prev.map((v) => v.id === id ? { ...v, selected: !v.selected } : v)
    );
  };

  // ── Guardar sesión ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!activeWorkspaceId || variantes.length === 0) return;
    setSaving(true);
    try {
      const selected = variantes.filter((v) => v.selected);
      const labId = await createCreativeLab(activeWorkspaceId, {
        clienteId:             config.clienteId || "sin-cliente",
        workspaceId:           activeWorkspaceId,
        objetivo:              config.objetivo,
        canal:                 config.canal,
        industria:             config.industria,
        presupuestoMXN:        config.presupuestoMXN,
        hooksGenerados:        variantes.length,
        ctasGenerados:         variantes.length,
        ofertasGeneradas:      variantes.length,
        variantes,
        variantesSeleccionadas: selected,
        estado:                selected.length > 0 ? "listo" : "generando",
      });
      setVariantes([]);
      setConfig(CONFIG_DEFAULTS);
      // Recargar selección del lab recién creado
      console.log("[PROMETEO][CREATIVE-LAB] Sesión guardada:", labId);
    } catch (err) {
      console.error("[PROMETEO][CREATIVE-LAB] Error guardando:", err);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const selectedCount = variantes.filter((v) => v.selected).length;
  const hasResults    = variantes.length > 0;

  return (
    <div style={{ padding: "28px 24px", color: TEXT, minHeight: "100vh", background: BG }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🧪</span>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>
              Creative Lab
            </h1>
            <span style={{
              fontSize: 10, fontWeight: 700, color: TEAL, letterSpacing: "1px",
              background: `${TEAL}18`, padding: "2px 7px", borderRadius: 4,
            }}>P-4</span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: MUTED }}>
            Genera variantes con IA — scoring predictivo basado en tu Creative Memory
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, alignItems: "start" }}>

        {/* ── Panel de configuración ── */}
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, letterSpacing: "1px", marginBottom: 14 }}>
              ⚙️ CONFIGURAR SESIÓN
            </div>

            {/* Objetivo */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>OBJETIVO</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {TIPOS.map((t) => {
                  const meta = TIPO_META[t];
                  return (
                    <button
                      key={t}
                      onClick={() => setC("objetivo", t)}
                      style={{
                        background: config.objetivo === t ? `${meta.color}22` : BG,
                        border: `1px solid ${config.objetivo === t ? meta.color : BORDER}`,
                        borderRadius: 8, padding: "7px 6px",
                        cursor: "pointer", color: config.objetivo === t ? meta.color : MUTED,
                        fontSize: 11, fontWeight: 600,
                      }}
                    >
                      {meta.icon} {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Canal */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>CANAL</label>
              <select
                value={config.canal}
                onChange={(e) => setC("canal", e.target.value as CanalMarketing)}
                style={selectStyle}
              >
                {CANALES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Industria */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>INDUSTRIA *</label>
              <input
                value={config.industria}
                onChange={(e) => setC("industria", e.target.value)}
                placeholder="Manufactura, Retail, Educación…"
                style={inputStyle}
              />
            </div>

            {/* Presupuesto */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>PRESUPUESTO (MXN)</label>
              <input
                type="number"
                value={config.presupuestoMXN}
                onChange={(e) => setC("presupuestoMXN", Number(e.target.value))}
                style={inputStyle}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !config.industria.trim()}
              style={{
                width: "100%",
                background: loading
                  ? BORDER
                  : `linear-gradient(135deg, ${TEAL}, ${BLUE})`,
                border: "none", borderRadius: 10, padding: "12px",
                color: loading ? MUTED : "#fff", fontWeight: 700,
                fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : `0 0 20px ${TEAL}44`,
                transition: "all 0.2s",
              }}
            >
              {loading ? "⏳ Generando variantes…" : "✨ Generar con IA"}
            </button>

            {error && (
              <div style={{
                marginTop: 10, fontSize: 12, color: CRIMSON,
                background: `${CRIMSON}12`, borderRadius: 8, padding: "8px 10px",
              }}>
                ⚠ {error}
              </div>
            )}

            {basadasEn > 0 && !loading && (
              <div style={{ marginTop: 8, fontSize: 11, color: MUTED, textAlign: "center" }}>
                Scores basados en {basadasEn} creativos de tu historial
              </div>
            )}
          </div>

          {/* Historial de sesiones */}
          {labs.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: "1px", marginBottom: 8 }}>
                SESIONES ANTERIORES
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {labs.slice(0, 5).map((lab) => (
                  <LabCard
                    key={lab.id}
                    lab={lab}
                    onClick={() => setSelectedLab(selectedLab?.id === lab.id ? null : lab)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Panel de variantes ── */}
        <div>
          {/* Sesión histórica seleccionada */}
          {selectedLab && !hasResults && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, letterSpacing: "1px", marginBottom: 10 }}>
                📂 SESIÓN: {selectedLab.objetivo} · {selectedLab.canal} · {selectedLab.industria}
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {selectedLab.variantes.map((v) => (
                  <VariantCard
                    key={v.id}
                    variant={v}
                    readonly
                    onToggle={() => {}}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Variantes generadas */}
          {loading && (
            <div style={{
              background: CARD, border: `1px solid ${BORDER}`,
              borderRadius: 16, padding: "60px 24px", textAlign: "center",
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✨</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: TEAL }}>Generando variantes…</div>
              <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>
                SOFIAA está analizando tu Creative Memory para generar los mejores creativos
              </div>
            </div>
          )}

          {!loading && !hasResults && !selectedLab && (
            <div style={{
              background: CARD, border: `1px dashed ${BORDER}`,
              borderRadius: 16, padding: "60px 24px", textAlign: "center",
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🧪</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                Configura y genera
              </div>
              <div style={{ fontSize: 13, color: MUTED }}>
                Define el objetivo, canal e industria, luego haz clic en "Generar con IA"
              </div>
            </div>
          )}

          {hasResults && !loading && (
            <>
              {/* Bar de acción */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 14, padding: "12px 16px",
                background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
              }}>
                <div style={{ fontSize: 13 }}>
                  <strong style={{ color: TEAL }}>{variantes.length}</strong> variantes generadas
                  {selectedCount > 0 && (
                    <span style={{ color: GREEN, marginLeft: 10 }}>
                      · <strong>{selectedCount}</strong> seleccionadas
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setVariantes(variantes.map((v) => ({ ...v, selected: true })))}
                    style={{ ...btnSmall, color: GREEN, borderColor: `${GREEN}55` }}
                  >
                    Seleccionar todas
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || selectedCount === 0}
                    style={{
                      ...btnSmall,
                      background: saving || selectedCount === 0 ? "transparent" : `${TEAL}22`,
                      color: saving || selectedCount === 0 ? MUTED : TEAL,
                      borderColor: saving || selectedCount === 0 ? BORDER : `${TEAL}55`,
                      fontWeight: 700,
                    }}
                  >
                    {saving ? "Guardando…" : `💾 Guardar sesión`}
                  </button>
                </div>
              </div>

              {/* Grid de variantes */}
              <div style={{ display: "grid", gap: 10 }}>
                {variantes.map((v) => (
                  <VariantCard
                    key={v.id}
                    variant={v}
                    readonly={false}
                    onToggle={() => toggleSelect(v.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Variant Card ──────────────────────────────────────────────────────────────

function VariantCard({
  variant, readonly, onToggle,
}: {
  variant: CreativeVariant;
  readonly: boolean;
  onToggle: () => void;
}) {
  const hook = HOOK_META[variant.hookType];
  const avgScore = (variant.scorePredictivoRoas + variant.scorePredictivoEngagement) / 2;

  return (
    <div
      onClick={readonly ? undefined : onToggle}
      style={{
        background: variant.selected ? CARD2 : CARD,
        border: `1px solid ${variant.selected ? hook.color + "66" : BORDER}`,
        borderRadius: 14, padding: "14px 16px",
        cursor: readonly ? "default" : "pointer",
        transition: "all 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Select indicator */}
        {!readonly && (
          <div style={{
            width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 2,
            border: `2px solid ${variant.selected ? hook.color : BORDER}`,
            background: variant.selected ? `${hook.color}33` : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {variant.selected && <span style={{ fontSize: 10, color: hook.color }}>✓</span>}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Hook badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 5, fontWeight: 700,
              background: `${hook.color}22`, color: hook.color,
            }}>
              {hook.icon} {hook.label}
            </span>
          </div>

          {/* Hook texto */}
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4, marginBottom: 8 }}>
            "{variant.hookTexto}"
          </div>

          {/* CTA + Oferta */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <span style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 20,
              background: `${FIRE}18`, color: FIRE, fontWeight: 700,
              border: `1px solid ${FIRE}44`,
            }}>
              CTA: {variant.ctaTexto}
            </span>
            <span style={{ fontSize: 12, color: MUTED }}>
              📦 {variant.oferta}
            </span>
          </div>

          {/* Predictive scores */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <ScoreBar label="ROAS predictivo" value={variant.scorePredictivoRoas} />
            <ScoreBar label="Engagement predictivo" value={variant.scorePredictivoEngagement} />
          </div>
        </div>

        {/* Score general */}
        <div style={{
          width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
          background: avgScore >= 7 ? `${GREEN}22` : avgScore >= 5 ? `${AMBER}22` : `${CRIMSON}22`,
          border: `2px solid ${avgScore >= 7 ? GREEN : avgScore >= 5 ? AMBER : CRIMSON}`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontSize: 13, fontWeight: 800,
            color: avgScore >= 7 ? GREEN : avgScore >= 5 ? AMBER : CRIMSON,
          }}>
            {avgScore.toFixed(1)}
          </span>
          <span style={{ fontSize: 8, color: MUTED }}>score</span>
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: 9, color: MUTED, fontWeight: 700, letterSpacing: "0.8px",
  display: "block", marginBottom: 5,
};

const inputStyle: React.CSSProperties = {
  width: "100%", background: BG, border: `1px solid ${BORDER}`,
  borderRadius: 8, padding: "8px 11px", color: TEXT, fontSize: 13,
  outline: "none", boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  width: "100%", background: BG, border: `1px solid ${BORDER}`,
  borderRadius: 8, padding: "8px 11px", color: TEXT, fontSize: 13,
  outline: "none", cursor: "pointer",
};

const btnSmall: React.CSSProperties = {
  background: "transparent", border: `1px solid ${BORDER}`,
  borderRadius: 7, padding: "5px 12px", color: MUTED,
  fontSize: 12, cursor: "pointer",
};
