"use client";

/**
 * PROMETEO — Creative Memory (Sprint P-3)
 * /prometeo/creative-memory
 *
 * Base de datos de performance creativo.
 * Aprende qué hooks, formatos y canales convierten mejor por cliente e industria.
 * Creative Genome: deconstrucción del ADN de cada anuncio ganador.
 */

import { useEffect, useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  subscribeCreativeMemory,
  createCreativeMemory,
} from "@/lib/prometeo/firestore";
import type {
  CreativeMemory,
  HookType,
  FormatoCreativo,
  CanalMarketing,
  TipoObjetivo,
} from "@/extensions/prometeo/schema";

// ── Paleta fire ───────────────────────────────────────────────────────────────

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
const PURPLE  = "#a855f7";

// ── Constantes ────────────────────────────────────────────────────────────────

const HOOK_TYPES: HookType[] = [
  "PREGUNTA_PROVOCADORA", "CIFRA_IMPACTANTE", "HISTORIA_CLIENTE",
  "PROBLEMA_SOLUCION", "ANTES_DESPUES", "TESTIMONIO",
  "SECRETO_REVELADO", "CONTRAINTUITIVO", "URGENCIA",
];

const HOOK_META: Record<HookType, { label: string; icon: string; color: string }> = {
  PREGUNTA_PROVOCADORA: { label: "Pregunta Provocadora", icon: "❓", color: PURPLE },
  CIFRA_IMPACTANTE:     { label: "Cifra Impactante",     icon: "📊", color: BLUE   },
  HISTORIA_CLIENTE:     { label: "Historia de Cliente",  icon: "📖", color: GREEN  },
  PROBLEMA_SOLUCION:    { label: "Problema → Solución",  icon: "🔧", color: AMBER  },
  ANTES_DESPUES:        { label: "Antes / Después",       icon: "↔️", color: FIRE   },
  TESTIMONIO:           { label: "Testimonio",            icon: "⭐", color: "#eab308" },
  SECRETO_REVELADO:     { label: "Secreto Revelado",      icon: "🔓", color: CRIMSON },
  CONTRAINTUITIVO:      { label: "Contraintuitivo",       icon: "🔄", color: "#06b6d4" },
  URGENCIA:             { label: "Urgencia",              icon: "⚡", color: FIRE   },
};

const FORMATOS: FormatoCreativo[] = ["VIDEO", "IMAGEN", "CARRUSEL", "STORIES", "REEL"];

const FORMATO_META: Record<FormatoCreativo, { icon: string }> = {
  VIDEO:    { icon: "🎬" },
  IMAGEN:   { icon: "🖼️" },
  CARRUSEL: { icon: "🎠" },
  STORIES:  { icon: "📱" },
  REEL:     { icon: "🎵" },
};

const CANALES: CanalMarketing[] = [
  "Instagram", "Facebook", "TikTok", "YouTube", "LinkedIn", "Google", "WhatsApp", "Email",
];

const TIPOS: TipoObjetivo[] = ["AWARENESS", "CONSIDERACION", "CONVERSION", "RETENCION", "UPSELL"];

// ── Score color ───────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return GREEN;
  if (score >= 60) return FIRE;
  if (score >= 40) return AMBER;
  return CRIMSON;
}

// ── Score badge ───────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color = scoreColor(score);
  return (
    <div style={{
      width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
      background: `${color}22`, border: `2px solid ${color}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column",
    }}>
      <span style={{ fontSize: 13, fontWeight: 800, color }}>{score}</span>
    </div>
  );
}

// ── Form defaults ─────────────────────────────────────────────────────────────

interface FormState {
  clienteId:    string;
  hookType:     HookType;
  hookTexto:    string;
  scriptTexto:  string;
  formato:      FormatoCreativo;
  canal:        CanalMarketing;
  objetivoTipo: TipoObjetivo;
  industria:    string;
  roasLogrado:  number;
  ctr:          number;
  cpa:          number;
  alcance:      number;
  inversion:    number;
  conversiones: number;
  duracionDias: number;
  temporada:    string;
  aprendizaje:  string;
  usarDeNuevo:  boolean;
}

const FORM_DEFAULTS: FormState = {
  clienteId: "", hookType: "PREGUNTA_PROVOCADORA", hookTexto: "",
  scriptTexto: "", formato: "VIDEO", canal: "Instagram",
  objetivoTipo: "CONVERSION", industria: "",
  roasLogrado: 0, ctr: 0, cpa: 0, alcance: 0, inversion: 0,
  conversiones: 0, duracionDias: 7, temporada: "", aprendizaje: "",
  usarDeNuevo: true,
};

// ── Performance score calculator ──────────────────────────────────────────────

function calcPerformanceScore(f: FormState): number {
  let score = 0;
  // ROAS: 4x+ = 40pts, 3x = 30, 2x = 20, <2 = 10
  if (f.roasLogrado >= 4) score += 40;
  else if (f.roasLogrado >= 3) score += 30;
  else if (f.roasLogrado >= 2) score += 20;
  else score += 10;
  // CTR: 3%+ = 30pts, 2% = 20, 1% = 10
  if (f.ctr >= 3) score += 30;
  else if (f.ctr >= 2) score += 20;
  else score += 10;
  // Conversiones: 100+ = 20, 50+ = 15, 20+ = 10, <20 = 5
  if (f.conversiones >= 100) score += 20;
  else if (f.conversiones >= 50) score += 15;
  else if (f.conversiones >= 20) score += 10;
  else score += 5;
  // usarDeNuevo bonus
  if (f.usarDeNuevo) score += 10;
  return Math.min(100, score);
}

// ── Filter types ──────────────────────────────────────────────────────────────

type FilterCanal = CanalMarketing | "TODOS";
type FilterHook  = HookType | "TODOS";

// ── Componente principal ──────────────────────────────────────────────────────

export default function CreativeMemoryPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [memories, setMemories] = useState<CreativeMemory[]>([]);
  const [loading,  setLoading]  = useState(true);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [filterCanal, setFilterCanal] = useState<FilterCanal>("TODOS");
  const [filterHook,  setFilterHook]  = useState<FilterHook>("TODOS");
  const [soloGanadores, setSoloGanadores] = useState(false);

  // ── Form ──────────────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState<FormState>(FORM_DEFAULTS);
  const [saving,   setSaving]   = useState(false);

  // ── Detail ────────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<CreativeMemory | null>(null);

  // ── Subscribe ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeWorkspaceId) return;
    const unsub = subscribeCreativeMemory(activeWorkspaceId, (list) => {
      setMemories(list);
      setLoading(false);
    });
    return unsub;
  }, [activeWorkspaceId]);

  // ── Filtered ──────────────────────────────────────────────────────────────
  const filtered = memories.filter((m) => {
    if (filterCanal !== "TODOS" && m.canal !== filterCanal) return false;
    if (filterHook  !== "TODOS" && m.hookType !== filterHook) return false;
    if (soloGanadores && !m.usarDeNuevo) return false;
    return true;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const avgRoas  = memories.length ? memories.reduce((s, m) => s + m.roasLogrado, 0) / memories.length : 0;
  const avgScore = memories.length ? memories.reduce((s, m) => s + m.performanceScore, 0) / memories.length : 0;
  const topHook  = (() => {
    const counts: Partial<Record<HookType, number>> = {};
    memories.forEach((m) => { counts[m.hookType] = (counts[m.hookType] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as HookType | undefined;
  })();

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!activeWorkspaceId || !form.hookTexto.trim()) return;
    setSaving(true);
    try {
      const score = calcPerformanceScore(form);
      await createCreativeMemory(activeWorkspaceId, {
        clienteId:    form.clienteId || "sin-cliente",
        workspaceId:  activeWorkspaceId,
        hookType:     form.hookType,
        hookTexto:    form.hookTexto,
        scriptTexto:  form.scriptTexto,
        formato:      form.formato,
        canal:        form.canal,
        roasLogrado:  form.roasLogrado,
        ctr:          form.ctr,
        cpa:          form.cpa,
        alcance:      form.alcance,
        inversion:    form.inversion,
        conversiones: form.conversiones,
        industria:    form.industria,
        objetivoTipo: form.objetivoTipo,
        temporada:    form.temporada || undefined,
        duracionDias: form.duracionDias,
        performanceScore: score,
        aprendizaje:  form.aprendizaje || `ROAS ${form.roasLogrado}x con hook ${HOOK_META[form.hookType].label} en ${form.canal}.`,
        usarDeNuevo:  form.usarDeNuevo,
      });
      setForm(FORM_DEFAULTS);
      setShowForm(false);
    } catch (err) {
      console.error("[PROMETEO][CREATIVE-MEMORY] Error guardando:", err);
    } finally {
      setSaving(false);
    }
  };

  const setF = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "28px 24px", color: TEXT, minHeight: "100vh", background: BG }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🧠</span>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>
              Creative Memory
            </h1>
            <span style={{
              fontSize: 10, fontWeight: 700, color: PURPLE, letterSpacing: "1px",
              background: `${PURPLE}18`, padding: "2px 7px", borderRadius: 4,
            }}>P-3</span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: MUTED }}>
            Base de datos de performance — SOFIAA aprende qué creativos convierten
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            background: `linear-gradient(135deg, ${PURPLE}, ${FIRE})`,
            border: "none", borderRadius: 10, padding: "10px 18px",
            color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
            boxShadow: `0 0 20px ${PURPLE}44`,
          }}
        >
          + Registrar Creativo
        </button>
      </div>

      {/* KPI Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Creativos registrados", value: memories.length,           color: TEXT  },
          { label: "ROAS promedio",          value: `${avgRoas.toFixed(1)}x`, color: GREEN },
          { label: "Score promedio",         value: Math.round(avgScore),     color: scoreColor(Math.round(avgScore)) },
          { label: "Hook top",               value: topHook ? HOOK_META[topHook].icon + " " + HOOK_META[topHook].label.split(" ")[0] : "—", color: PURPLE },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: kpi.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Top Performers */}
      {memories.filter((m) => m.performanceScore >= 80).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: "1px", marginBottom: 10 }}>
            🏆 TOP PERFORMERS (Score ≥ 80)
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {memories.filter((m) => m.performanceScore >= 80).slice(0, 5).map((m) => (
              <div
                key={m.id}
                onClick={() => setSelected(selected?.id === m.id ? null : m)}
                style={{
                  background: `${GREEN}12`, border: `1px solid ${GREEN}44`,
                  borderRadius: 12, padding: "12px 14px", minWidth: 200, flexShrink: 0,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{HOOK_META[m.hookType].icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: GREEN }}>{m.performanceScore}/100</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>
                  {m.hookTexto.slice(0, 60)}{m.hookTexto.length > 60 ? "…" : ""}
                </div>
                <div style={{ fontSize: 11, color: MUTED }}>
                  {m.canal} · ROAS {m.roasLogrado}x · CTR {m.ctr}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <select
          value={filterCanal}
          onChange={(e) => setFilterCanal(e.target.value as FilterCanal)}
          style={selectStyle}
        >
          <option value="TODOS">Canal: Todos</option>
          {CANALES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterHook}
          onChange={(e) => setFilterHook(e.target.value as FilterHook)}
          style={selectStyle}
        >
          <option value="TODOS">Hook: Todos</option>
          {HOOK_TYPES.map((h) => <option key={h} value={h}>{HOOK_META[h].label}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: MUTED }}>
          <input
            type="checkbox"
            checked={soloGanadores}
            onChange={(e) => setSoloGanadores(e.target.checked)}
          />
          Solo ganadores
        </label>
        <span style={{ marginLeft: "auto", fontSize: 12, color: MUTED }}>
          {filtered.length} de {memories.length}
        </span>
      </div>

      {/* Memory list */}
      {loading ? (
        <div style={{ textAlign: "center", color: MUTED, padding: 60 }}>Cargando Creative Memory…</div>
      ) : memories.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 24px",
          background: CARD, borderRadius: 16, border: `1px dashed ${BORDER}`,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧠</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Creative Memory vacía</div>
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 20 }}>
            Registra tu primer creativo para que SOFIAA aprenda qué convierte
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={{
              background: PURPLE, border: "none", borderRadius: 8,
              padding: "10px 20px", color: "#fff", fontWeight: 700, cursor: "pointer",
            }}
          >
            Registrar primer creativo
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: MUTED, padding: 40 }}>
          Sin creativos con esos filtros
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((m) => {
            const hook   = HOOK_META[m.hookType];
            const isOpen = selected?.id === m.id;
            return (
              <div
                key={m.id}
                onClick={() => setSelected(isOpen ? null : m)}
                style={{
                  background: isOpen ? CARD2 : CARD,
                  border: `1px solid ${isOpen ? hook.color + "55" : BORDER}`,
                  borderRadius: 14, padding: "14px 16px", cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <ScoreBadge score={m.performanceScore} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: 11, padding: "1px 7px", borderRadius: 5, fontWeight: 700,
                        background: `${hook.color}22`, color: hook.color,
                      }}>
                        {hook.icon} {hook.label}
                      </span>
                      <span style={{ fontSize: 11, color: MUTED }}>
                        {FORMATO_META[m.formato].icon} {m.formato}
                      </span>
                      <span style={{ fontSize: 11, color: MUTED }}>{m.canal}</span>
                      {m.usarDeNuevo && (
                        <span style={{
                          fontSize: 10, padding: "1px 6px", borderRadius: 4,
                          background: `${GREEN}22`, color: GREEN, fontWeight: 700,
                        }}>✓ Usar de nuevo</span>
                      )}
                    </div>
                    <div style={{ marginTop: 5, fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>
                      {m.hookTexto.slice(0, 100)}{m.hookTexto.length > 100 ? "…" : ""}
                    </div>
                  </div>
                  {/* Métricas rápidas */}
                  <div style={{ display: "flex", gap: 14, flexShrink: 0 }}>
                    {[
                      { label: "ROAS",   value: `${m.roasLogrado}x`, color: m.roasLogrado >= 3 ? GREEN : AMBER },
                      { label: "CTR",    value: `${m.ctr}%`,         color: m.ctr >= 2 ? GREEN : MUTED },
                      { label: "CONV",   value: m.conversiones,       color: TEXT },
                    ].map((stat) => (
                      <div key={stat.label} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                        <div style={{ fontSize: 9, color: MUTED, letterSpacing: "0.5px" }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Aprendizaje */}
                {m.aprendizaje && (
                  <div style={{
                    marginTop: 8, fontSize: 12, color: MUTED,
                    fontStyle: "italic", borderLeft: `2px solid ${hook.color}44`,
                    paddingLeft: 10,
                  }}>
                    💡 {m.aprendizaje}
                  </div>
                )}

                {/* Detail panel — Creative Genome */}
                {isOpen && (
                  <div style={{
                    marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}`,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: "1px", marginBottom: 10 }}>
                      🧬 CREATIVE GENOME
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
                      {[
                        { label: "INVERSIÓN",    value: `$${m.inversion.toLocaleString()} MXN` },
                        { label: "CPA",          value: `$${m.cpa.toLocaleString()} MXN`       },
                        { label: "ALCANCE",      value: m.alcance.toLocaleString()              },
                        { label: "DURACIÓN",     value: `${m.duracionDias} días`                },
                        { label: "INDUSTRIA",    value: m.industria || "—"                      },
                        { label: "TEMPORADA",    value: m.temporada || "—"                      },
                      ].map((stat) => (
                        <div key={stat.label} style={{
                          background: BG, borderRadius: 8, padding: "8px 10px",
                        }}>
                          <div style={{ fontSize: 9, color: MUTED, fontWeight: 700, letterSpacing: "0.5px" }}>{stat.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{stat.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Script */}
                    {m.scriptTexto && (
                      <div style={{
                        background: BG, borderRadius: 8, padding: "12px",
                        border: `1px solid ${BORDER}`, fontSize: 12, color: MUTED,
                        lineHeight: 1.6, maxHeight: 120, overflowY: "auto",
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: "0.5px", marginBottom: 6 }}>SCRIPT</div>
                        {m.scriptTexto}
                      </div>
                    )}

                    {/* Objetivo */}
                    <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 6,
                        background: `${FIRE}18`, color: FIRE, fontWeight: 600,
                      }}>
                        {m.objetivoTipo}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── FORM MODAL ────────────────────────────────────────────────────────── */}
      {showForm && (
        <>
          <div
            onClick={() => setShowForm(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
            }}
          />
          <div style={{
            position: "fixed", inset: 0, zIndex: 101,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px",
          }}>
            <div style={{
              background: CARD, border: `1px solid ${BORDER}`,
              borderRadius: 20, padding: "28px",
              width: "100%", maxWidth: 620,
              maxHeight: "90vh", overflowY: "auto",
              boxShadow: `0 0 60px ${PURPLE}22`,
            }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>🧬 Registrar Creativo</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                    Performance score: <strong style={{ color: scoreColor(calcPerformanceScore(form)) }}>
                      {calcPerformanceScore(form)}/100
                    </strong>
                  </div>
                </div>
                <button onClick={() => setShowForm(false)}
                  style={{ background: "none", border: "none", color: MUTED, fontSize: 20, cursor: "pointer" }}>
                  ✕
                </button>
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                {/* Hook type */}
                <div>
                  <label style={labelStyle}>TIPO DE HOOK</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                    {HOOK_TYPES.map((h) => {
                      const meta = HOOK_META[h];
                      return (
                        <button
                          key={h}
                          onClick={() => setF("hookType", h)}
                          style={{
                            background: form.hookType === h ? `${meta.color}22` : BG,
                            border: `1px solid ${form.hookType === h ? meta.color : BORDER}`,
                            borderRadius: 8, padding: "7px 8px",
                            cursor: "pointer", color: form.hookType === h ? meta.color : MUTED,
                            fontSize: 11, fontWeight: 600, textAlign: "left",
                          }}
                        >
                          {meta.icon} {meta.label.split(" ")[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Hook texto */}
                <div>
                  <label style={labelStyle}>HOOK TEXTO</label>
                  <input
                    value={form.hookTexto}
                    onChange={(e) => setF("hookTexto", e.target.value)}
                    placeholder="¿Sabías que el 80% de los negocios fallan por falta de…?"
                    style={inputStyle}
                  />
                </div>

                {/* Script */}
                <div>
                  <label style={labelStyle}>SCRIPT (opcional)</label>
                  <textarea
                    value={form.scriptTexto}
                    onChange={(e) => setF("scriptTexto", e.target.value)}
                    placeholder="Script completo del anuncio…"
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" as const }}
                  />
                </div>

                {/* Formato + Canal + Objetivo */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>FORMATO</label>
                    <select value={form.formato} onChange={(e) => setF("formato", e.target.value as FormatoCreativo)} style={selectStyle}>
                      {FORMATOS.map((f) => <option key={f} value={f}>{FORMATO_META[f].icon} {f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>CANAL</label>
                    <select value={form.canal} onChange={(e) => setF("canal", e.target.value as CanalMarketing)} style={selectStyle}>
                      {CANALES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>OBJETIVO</label>
                    <select value={form.objetivoTipo} onChange={(e) => setF("objetivoTipo", e.target.value as TipoObjetivo)} style={selectStyle}>
                      {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {/* Industria + Temporada */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>INDUSTRIA</label>
                    <input
                      value={form.industria}
                      onChange={(e) => setF("industria", e.target.value)}
                      placeholder="Manufactura, Retail…"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>TEMPORADA (opcional)</label>
                    <input
                      value={form.temporada}
                      onChange={(e) => setF("temporada", e.target.value)}
                      placeholder="Navidad, Verano…"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Métricas de performance */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: "1px", marginBottom: 8 }}>
                    📊 MÉTRICAS DE PERFORMANCE
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {[
                      { label: "ROAS",        key: "roasLogrado" as const,  step: 0.1 },
                      { label: "CTR (%)",     key: "ctr" as const,          step: 0.1 },
                      { label: "CPA (MXN)",   key: "cpa" as const,          step: 1   },
                      { label: "ALCANCE",     key: "alcance" as const,       step: 100 },
                      { label: "INVERSIÓN",   key: "inversion" as const,     step: 100 },
                      { label: "CONVERSIONES",key: "conversiones" as const,  step: 1   },
                    ].map((field) => (
                      <div key={field.key}>
                        <label style={labelStyle}>{field.label}</label>
                        <input
                          type="number"
                          step={field.step}
                          value={form[field.key]}
                          onChange={(e) => setF(field.key, Number(e.target.value))}
                          style={inputStyle}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Duración + Aprendizaje */}
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, alignItems: "start" }}>
                  <div>
                    <label style={labelStyle}>DURACIÓN (días)</label>
                    <input
                      type="number"
                      value={form.duracionDias}
                      onChange={(e) => setF("duracionDias", Number(e.target.value))}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>APRENDIZAJE / INSIGHT</label>
                    <input
                      value={form.aprendizaje}
                      onChange={(e) => setF("aprendizaje", e.target.value)}
                      placeholder="¿Qué aprendiste de este creativo?"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Usar de nuevo */}
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={form.usarDeNuevo}
                    onChange={(e) => setF("usarDeNuevo", e.target.checked)}
                  />
                  Marcar como ganador — usar de nuevo en futuros briefs
                </label>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
                <button onClick={() => setShowForm(false)} style={btnSecondary}>Cancelar</button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.hookTexto.trim()}
                  style={{
                    ...btnPrimary,
                    background: `linear-gradient(135deg, ${PURPLE}, ${FIRE})`,
                    opacity: saving || !form.hookTexto.trim() ? 0.6 : 1,
                  }}
                >
                  {saving ? "Guardando…" : `💾 Guardar (Score: ${calcPerformanceScore(form)})`}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: 9, color: MUTED, fontWeight: 700, letterSpacing: "0.8px",
  display: "block", marginBottom: 4,
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

const btnPrimary: React.CSSProperties = {
  flex: 1,
  background: `linear-gradient(135deg, ${FIRE}, ${CRIMSON})`,
  border: "none", borderRadius: 8, padding: "10px 16px",
  color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  background: "transparent",
  border: `1px solid ${BORDER}`,
  borderRadius: 8, padding: "10px 16px",
  color: MUTED, fontWeight: 600, fontSize: 13, cursor: "pointer",
};
