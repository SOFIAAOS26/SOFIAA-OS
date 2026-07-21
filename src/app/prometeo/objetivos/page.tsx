"use client";

/**
 * PROMETEO — Goal Engine (Sprint P-2)
 * /prometeo/objetivos
 *
 * CMO Cognitivo — Opera por OBJETIVOS, no por campañas.
 * La campaña es consecuencia de una decisión estratégica.
 *
 * Dashboard: lista de BrandGoals con progreso KPI.
 * Wizard: árbol de decisiones presupuesto→inventario→capacidad→canal→estrategia.
 */

import { useEffect, useState, useCallback } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  subscribeGoals,
  createGoal,
  updateGoal,
  createGoalState,
  updateGoalState,
} from "@/lib/prometeo/firestore";
import type {
  BrandGoal,
  TipoObjetivo,
  EstadoObjetivo,
  CanalMarketing,
  GoalDecision,
} from "@/extensions/prometeo/schema";

// ── Paleta fire ───────────────────────────────────────────────────────────────

const FIRE    = "#f97316";
const EMBER   = "#fb923c";
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

// ── Constantes ────────────────────────────────────────────────────────────────

const TIPOS: TipoObjetivo[] = ["AWARENESS", "CONSIDERACION", "CONVERSION", "RETENCION", "UPSELL"];

const TIPO_META: Record<TipoObjetivo, { label: string; icon: string; desc: string }> = {
  AWARENESS:     { label: "Awareness",     icon: "📣", desc: "Conocimiento de marca" },
  CONSIDERACION: { label: "Consideración", icon: "🔍", desc: "Tráfico y engagement" },
  CONVERSION:    { label: "Conversión",    icon: "💰", desc: "Ventas y leads" },
  RETENCION:     { label: "Retención",     icon: "🔄", desc: "Retener clientes actuales" },
  UPSELL:        { label: "Upsell",        icon: "📈", desc: "Vender más a clientes actuales" },
};

const CANALES: CanalMarketing[] = [
  "Instagram", "Facebook", "TikTok", "YouTube", "LinkedIn", "Google", "WhatsApp", "Email",
];

const CANAL_META: Record<CanalMarketing, { icon: string; color: string }> = {
  Instagram:  { icon: "📸", color: "#e1306c" },
  Facebook:   { icon: "👍", color: "#1877f2" },
  TikTok:     { icon: "🎵", color: "#69c9d0" },
  YouTube:    { icon: "▶️", color: "#ff0000" },
  LinkedIn:   { icon: "💼", color: "#0a66c2" },
  Google:     { icon: "🔍", color: "#4285f4" },
  WhatsApp:   { icon: "💬", color: "#25d366" },
  Email:      { icon: "📧", color: "#6366f1" },
};

const ESTADO_META: Record<EstadoObjetivo, { label: string; color: string }> = {
  pendiente:  { label: "Pendiente",  color: MUTED   },
  activo:     { label: "Activo",     color: GREEN   },
  logrado:    { label: "Logrado ✓",  color: FIRE    },
  pausado:    { label: "Pausado",    color: AMBER   },
  cancelado:  { label: "Cancelado",  color: CRIMSON },
};

// ── Decision tree nodes ───────────────────────────────────────────────────────

interface DecisionNode {
  id:       string;
  pregunta: string;
  desc:     string;
  icon:     string;
  siKey:    keyof Pick<BrandGoal, "hayPresupuesto" | "hayInventario" | "hayCapacidad">;
  siguiente_si:  string;
  siguiente_no:  string;
}

const TREE_NODES: DecisionNode[] = [
  {
    id: "presupuesto",
    pregunta: "¿Hay presupuesto disponible?",
    desc: "¿El cliente cuenta con inversión asignada para este objetivo?",
    icon: "💰",
    siKey: "hayPresupuesto",
    siguiente_si: "inventario",
    siguiente_no: "resultado_organico",
  },
  {
    id: "inventario",
    pregunta: "¿Hay inventario o capacidad de entrega?",
    desc: "¿El cliente puede atender la demanda que se generará?",
    icon: "📦",
    siKey: "hayInventario",
    siguiente_si: "capacidad",
    siguiente_no: "resultado_sin_inventario",
  },
  {
    id: "capacidad",
    pregunta: "¿Hay capacidad operativa?",
    desc: "¿El equipo del cliente puede manejar el volumen de leads o clientes?",
    icon: "⚙️",
    siKey: "hayCapacidad",
    siguiente_si: "canal",
    siguiente_no: "resultado_optimizar_ops",
  },
];

// ── Canal recommendation logic ────────────────────────────────────────────────

function recomendarCanal(tipo: TipoObjetivo): CanalMarketing {
  const map: Record<TipoObjetivo, CanalMarketing> = {
    AWARENESS:     "Instagram",
    CONSIDERACION: "YouTube",
    CONVERSION:    "Google",
    RETENCION:     "Email",
    UPSELL:        "WhatsApp",
  };
  return map[tipo];
}

function generarEstrategia(
  goal: { tipo?: TipoObjetivo; valorObjetivo?: number; unidad?: string; presupuestoMXN?: number },
  canal: CanalMarketing,
  resultado: string,
): string {
  if (resultado === "resultado_organico") {
    return `Sin presupuesto, la estrategia recomendada es orgánica: contenido de valor en ${canal} 3-5 veces por semana, engagement activo en comentarios, y optimización de perfil. Objetivo: construir audiencia sin inversión publicitaria.`;
  }
  if (resultado === "resultado_sin_inventario") {
    return `Antes de invertir en pauta, priorizar reposición de inventario. Mientras tanto, campaña de lista de espera en ${canal} para capturar demanda y medir interés real sin generar órdenes no cumplibles.`;
  }
  if (resultado === "resultado_optimizar_ops") {
    return `Capacidad operativa limitada. Recomendación: pausa en adquisición agresiva. Enfocarse en retención con ${canal} y preparar sistema de CRM/seguimiento antes de escalar. Prioridad: optimizar el proceso actual.`;
  }
  // Canal elegido con presupuesto + inventario + capacidad
  const budgetMsg = goal.presupuestoMXN
    ? ` con un presupuesto de $${goal.presupuestoMXN.toLocaleString()} MXN`
    : "";
  return `Estrategia completa activada: campaña en ${canal}${budgetMsg}. Objetivo ${TIPO_META[goal.tipo!]?.label ?? goal.tipo}: alcanzar ${goal.valorObjetivo} ${goal.unidad} en el período establecido. Iniciar con fase de prueba A/B de creativos (7 días), luego escalar los ganadores al 80% del presupuesto.`;
}

// ── Progreso visual ───────────────────────────────────────────────────────────

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const color = pct >= 100 ? GREEN : pct >= 60 ? FIRE : pct >= 30 ? AMBER : CRIMSON;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: MUTED, marginBottom: 3 }}>
        <span>{current.toLocaleString()} / {target.toLocaleString()}</span>
        <span style={{ color, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 5, background: BORDER, borderRadius: 99 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

// ── Días restantes ────────────────────────────────────────────────────────────

function diasRestantes(fechaLimite: number): number {
  return Math.ceil((fechaLimite - Date.now()) / 86_400_000);
}

// ── Componente principal ──────────────────────────────────────────────────────

type WizardStep =
  | "tipo"
  | "datos"
  | "presupuesto"
  | "inventario"
  | "capacidad"
  | "canal"
  | "resultado";

interface WizardState {
  // Step 1: tipo
  tipo?: TipoObjetivo;
  // Step 2: datos
  clienteId:       string;
  clienteNombre:   string;
  titulo:          string;
  metaKPI:         string;
  valorObjetivo:   number;
  valorActual:     number;
  unidad:          string;
  presupuestoMXN:  number;
  fechaLimite:     string;
  // Decision tree
  hayPresupuesto?: boolean;
  hayInventario?:  boolean;
  hayCapacidad?:   boolean;
  // Resultado
  canal?:          CanalMarketing;
  estrategia?:     string;
  resultado?:      string;   // nodo resultado
}

const WIZARD_DEFAULTS: WizardState = {
  clienteId: "", clienteNombre: "", titulo: "", metaKPI: "",
  valorObjetivo: 0, valorActual: 0, unidad: "leads",
  presupuestoMXN: 0, fechaLimite: "",
};

export default function ObjetivosPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [goals, setGoals]   = useState<BrandGoal[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Wizard ────────────────────────────────────────────────────────────────
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep]   = useState<WizardStep>("tipo");
  const [wiz, setWiz]     = useState<WizardState>(WIZARD_DEFAULTS);
  const [saving, setSaving] = useState(false);

  // ── Detail panel ──────────────────────────────────────────────────────────
  const [selectedGoal, setSelectedGoal] = useState<BrandGoal | null>(null);

  // ── Subscribe goals ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeWorkspaceId) return;
    const unsub = subscribeGoals(activeWorkspaceId, (list) => {
      setGoals(list);
      setLoading(false);
    });
    return unsub;
  }, [activeWorkspaceId]);

  // ── Wizard helpers ────────────────────────────────────────────────────────

  const setW = <K extends keyof WizardState>(k: K, v: WizardState[K]) =>
    setWiz((prev) => ({ ...prev, [k]: v }));

  const resetWizard = () => {
    setWiz(WIZARD_DEFAULTS);
    setStep("tipo");
    setShowWizard(false);
  };

  // Avanzar en el árbol de decisiones
  const advanceTree = (node: DecisionNode, answer: boolean) => {
    setW(node.siKey, answer);
    const next = answer ? node.siguiente_si : node.siguiente_no;

    if (next === "canal") {
      setStep("canal");
    } else if (next.startsWith("resultado_")) {
      // Resultado sin canal óptimo
      const canal = recomendarCanal(wiz.tipo!);
      const estrategia = generarEstrategia(wiz, canal, next);
      setWiz((prev) => ({ ...prev, canal, estrategia, resultado: next }));
      setStep("resultado");
    } else {
      setStep(next as WizardStep);
    }
  };

  const handleCanalSelect = (canal: CanalMarketing) => {
    const estrategia = generarEstrategia(wiz, canal, "resultado_completo");
    setWiz((prev) => ({ ...prev, canal, estrategia, resultado: "resultado_completo" }));
    setStep("resultado");
  };

  // ── Save goal ─────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!activeWorkspaceId || !wiz.tipo || !wiz.canal) return;
    setSaving(true);
    try {
      const fechaLimiteTs = wiz.fechaLimite
        ? new Date(wiz.fechaLimite).getTime()
        : Date.now() + 30 * 86_400_000;

      const goalId = await createGoal(activeWorkspaceId, {
        clienteId:     wiz.clienteId || "sin-cliente",
        clienteNombre: wiz.clienteNombre || "Sin cliente",
        titulo:        wiz.titulo || `Objetivo ${TIPO_META[wiz.tipo].label}`,
        tipo:          wiz.tipo,
        estado:        "activo",
        metaKPI:       wiz.metaKPI,
        valorObjetivo: wiz.valorObjetivo,
        valorActual:   wiz.valorActual,
        unidad:        wiz.unidad,
        canal:         wiz.canal,
        presupuestoMXN: wiz.presupuestoMXN,
        fechaInicio:   Date.now(),
        fechaLimite:   fechaLimiteTs,
        hayPresupuesto: wiz.hayPresupuesto ?? false,
        hayInventario:  wiz.hayInventario ?? false,
        hayCapacidad:   wiz.hayCapacidad ?? false,
        canalOptimo:   wiz.canal,
      });

      // Save GoalState (árbol de decisiones)
      const decisiones: GoalDecision[] = [];
      if (wiz.hayPresupuesto !== undefined)
        decisiones.push({ pregunta: "¿Hay presupuesto?", respuesta: wiz.hayPresupuesto, siguiente: wiz.hayPresupuesto ? "inventario" : "resultado_organico" });
      if (wiz.hayInventario !== undefined)
        decisiones.push({ pregunta: "¿Hay inventario?", respuesta: wiz.hayInventario, siguiente: wiz.hayInventario ? "capacidad" : "resultado_sin_inventario" });
      if (wiz.hayCapacidad !== undefined)
        decisiones.push({ pregunta: "¿Hay capacidad?", respuesta: wiz.hayCapacidad, siguiente: wiz.hayCapacidad ? "canal" : "resultado_optimizar_ops" });

      await createGoalState(activeWorkspaceId, {
        clienteId:          wiz.clienteId || "sin-cliente",
        goalId,
        nodoActual:         "resultado",
        decisiones,
        canalRecomendado:   wiz.canal,
        estrategia:         wiz.estrategia,
        presupuestoSugerido: wiz.presupuestoMXN || undefined,
        creativasGeneradas: 0,
        completado:         true,
      });

      resetWizard();
    } catch (err) {
      console.error("[PROMETEO][OBJETIVOS] Error guardando objetivo:", err);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // Estadísticas rápidas
  const activos   = goals.filter((g) => g.estado === "activo").length;
  const logrados  = goals.filter((g) => g.estado === "logrado").length;
  const totalPres = goals.reduce((s, g) => s + (g.presupuestoMXN || 0), 0);

  return (
    <div style={{ padding: "28px 24px", color: TEXT, minHeight: "100vh", background: BG }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🎯</span>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>
              Goal Engine
            </h1>
            <span style={{
              fontSize: 10, fontWeight: 700, color: FIRE, letterSpacing: "1px",
              background: `${FIRE}18`, padding: "2px 7px", borderRadius: 4,
            }}>P-2</span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: MUTED }}>
            SOFIAA opera por OBJETIVOS — la campaña es consecuencia de una decisión estratégica
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          style={{
            background: `linear-gradient(135deg, ${FIRE}, ${CRIMSON})`,
            border: "none", borderRadius: 10, padding: "10px 18px",
            color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
            boxShadow: `0 0 20px ${FIRE}44`,
          }}
        >
          + Nuevo Objetivo
        </button>
      </div>

      {/* KPI Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total objetivos", value: goals.length, color: TEXT },
          { label: "Activos",         value: activos,       color: GREEN },
          { label: "Logrados",        value: logrados,      color: FIRE },
          { label: "Inversión total", value: `$${(totalPres / 1000).toFixed(0)}K`, color: BLUE },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Goals list */}
      {loading ? (
        <div style={{ textAlign: "center", color: MUTED, padding: 60 }}>Cargando objetivos…</div>
      ) : goals.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 24px",
          background: CARD, borderRadius: 16, border: `1px dashed ${BORDER}`,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Sin objetivos aún</div>
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 20 }}>
            Crea tu primer objetivo estratégico con el Goal Engine
          </div>
          <button
            onClick={() => setShowWizard(true)}
            style={{
              background: FIRE, border: "none", borderRadius: 8,
              padding: "10px 20px", color: "#fff", fontWeight: 700, cursor: "pointer",
            }}
          >
            Iniciar Goal Engine
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {goals.map((goal) => {
            const dias = diasRestantes(goal.fechaLimite);
            const estado = ESTADO_META[goal.estado];
            const canal  = CANAL_META[goal.canal];
            const isSelected = selectedGoal?.id === goal.id;
            return (
              <div
                key={goal.id}
                onClick={() => setSelectedGoal(isSelected ? null : goal)}
                style={{
                  background: isSelected ? CARD2 : CARD,
                  border: `1px solid ${isSelected ? FIRE + "55" : BORDER}`,
                  borderRadius: 14, padding: "16px 18px", cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, background: `${FIRE}18`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
                    }}>
                      {TIPO_META[goal.tipo]?.icon ?? "🎯"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{goal.titulo}</div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                        {goal.clienteNombre} · {TIPO_META[goal.tipo]?.label}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {/* Canal */}
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 6,
                      background: `${canal?.color ?? FIRE}22`,
                      color: canal?.color ?? FIRE, fontWeight: 600,
                    }}>
                      {canal?.icon} {goal.canal}
                    </span>
                    {/* Estado */}
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 6,
                      background: `${estado.color}22`, color: estado.color, fontWeight: 600,
                    }}>
                      {estado.label}
                    </span>
                    {/* Días */}
                    <span style={{
                      fontSize: 11, color: dias < 7 ? CRIMSON : dias < 14 ? AMBER : MUTED,
                      fontWeight: dias < 7 ? 700 : 400,
                    }}>
                      {dias > 0 ? `${dias}d` : "Vencido"}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <ProgressBar current={goal.valorActual} target={goal.valorObjetivo} />

                {/* Meta KPI */}
                {goal.metaKPI && (
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 8, fontStyle: "italic" }}>
                    "{goal.metaKPI}"
                  </div>
                )}

                {/* Detail panel */}
                {isSelected && (
                  <div style={{
                    marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}`,
                    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
                  }}>
                    <div style={{ background: BG, borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.5px" }}>PRESUPUESTO</div>
                      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
                        ${goal.presupuestoMXN.toLocaleString()} MXN
                      </div>
                    </div>
                    <div style={{ background: BG, borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.5px" }}>FECHA LÍMITE</div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
                        {new Date(goal.fechaLimite).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                      </div>
                    </div>
                    <div style={{ background: BG, borderRadius: 8, padding: "10px 12px", gridColumn: "1 / -1" }}>
                      <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.5px", marginBottom: 6 }}>SEÑALES DE DECISIÓN</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {[
                          { label: "Presupuesto", ok: goal.hayPresupuesto },
                          { label: "Inventario",  ok: goal.hayInventario },
                          { label: "Capacidad",   ok: goal.hayCapacidad },
                        ].map((s) => (
                          <span key={s.label} style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: 600,
                            background: s.ok ? `${GREEN}22` : `${CRIMSON}22`,
                            color: s.ok ? GREEN : CRIMSON,
                          }}>
                            {s.ok ? "✓" : "✗"} {s.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* Actions */}
                    <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, marginTop: 4 }}>
                      {(["activo", "pausado", "logrado"] as EstadoObjetivo[]).map((estado) => (
                        goal.estado !== estado && (
                          <button
                            key={estado}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateGoal(activeWorkspaceId!, goal.id, { estado });
                            }}
                            style={{
                              background: "transparent",
                              border: `1px solid ${ESTADO_META[estado].color}55`,
                              color: ESTADO_META[estado].color,
                              borderRadius: 6, padding: "4px 10px",
                              fontSize: 11, fontWeight: 600, cursor: "pointer",
                            }}
                          >
                            → {ESTADO_META[estado].label}
                          </button>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── WIZARD MODAL ──────────────────────────────────────────────────────── */}
      {showWizard && (
        <>
          {/* Backdrop */}
          <div
            onClick={resetWizard}
            style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
            }}
          />
          {/* Modal */}
          <div style={{
            position: "fixed", inset: 0, zIndex: 101,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px",
          }}>
            <div style={{
              background: CARD, border: `1px solid ${BORDER}`,
              borderRadius: 20, padding: "28px 28px",
              width: "100%", maxWidth: 560,
              maxHeight: "90vh", overflowY: "auto",
              boxShadow: `0 0 60px ${FIRE}22`,
            }}>
              {/* Modal header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>🎯 Goal Engine</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                    Árbol de decisiones estratégico
                  </div>
                </div>
                <button
                  onClick={resetWizard}
                  style={{ background: "none", border: "none", color: MUTED, fontSize: 20, cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>

              {/* ── Step: Tipo de objetivo ── */}
              {step === "tipo" && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
                    ¿Cuál es el objetivo estratégico?
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {TIPOS.map((tipo) => {
                      const meta = TIPO_META[tipo];
                      return (
                        <button
                          key={tipo}
                          onClick={() => { setW("tipo", tipo); setStep("datos"); }}
                          style={{
                            background: wiz.tipo === tipo ? `${FIRE}22` : BG,
                            border: `1px solid ${wiz.tipo === tipo ? FIRE : BORDER}`,
                            borderRadius: 12, padding: "14px 16px",
                            display: "flex", alignItems: "center", gap: 12,
                            cursor: "pointer", textAlign: "left", width: "100%",
                            color: TEXT, transition: "all 0.15s",
                          }}
                        >
                          <span style={{ fontSize: 22 }}>{meta.icon}</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{meta.label}</div>
                            <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{meta.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Step: Datos del objetivo ── */}
              {step === "datos" && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                    {TIPO_META[wiz.tipo!]?.icon} {TIPO_META[wiz.tipo!]?.label}
                  </div>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>Detalles del objetivo</div>
                  <div style={{ display: "grid", gap: 12 }}>
                    {[
                      { label: "Cliente", key: "clienteNombre" as const, placeholder: "Nombre del cliente" },
                      { label: "Título del objetivo", key: "titulo" as const, placeholder: "ej. Aumentar ROAS a 4.5x en 60 días" },
                      { label: "Meta KPI", key: "metaKPI" as const, placeholder: "ej. 50 leads mensuales" },
                    ].map((f) => (
                      <div key={f.key}>
                        <label style={{ fontSize: 11, color: MUTED, fontWeight: 700, letterSpacing: "0.5px", display: "block", marginBottom: 4 }}>
                          {f.label.toUpperCase()}
                        </label>
                        <input
                          value={wiz[f.key] as string}
                          onChange={(e) => setW(f.key, e.target.value)}
                          placeholder={f.placeholder}
                          style={{
                            width: "100%", background: BG, border: `1px solid ${BORDER}`,
                            borderRadius: 8, padding: "9px 12px", color: TEXT, fontSize: 13,
                            outline: "none", boxSizing: "border-box",
                          }}
                        />
                      </div>
                    ))}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, color: MUTED, fontWeight: 700, display: "block", marginBottom: 4 }}>VALOR META</label>
                        <input
                          type="number"
                          value={wiz.valorObjetivo}
                          onChange={(e) => setW("valorObjetivo", Number(e.target.value))}
                          style={{
                            width: "100%", background: BG, border: `1px solid ${BORDER}`,
                            borderRadius: 8, padding: "9px 12px", color: TEXT, fontSize: 13,
                            outline: "none", boxSizing: "border-box",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: MUTED, fontWeight: 700, display: "block", marginBottom: 4 }}>ACTUAL</label>
                        <input
                          type="number"
                          value={wiz.valorActual}
                          onChange={(e) => setW("valorActual", Number(e.target.value))}
                          style={{
                            width: "100%", background: BG, border: `1px solid ${BORDER}`,
                            borderRadius: 8, padding: "9px 12px", color: TEXT, fontSize: 13,
                            outline: "none", boxSizing: "border-box",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: MUTED, fontWeight: 700, display: "block", marginBottom: 4 }}>UNIDAD</label>
                        <input
                          value={wiz.unidad}
                          onChange={(e) => setW("unidad", e.target.value)}
                          placeholder="leads, MXN, ROAS…"
                          style={{
                            width: "100%", background: BG, border: `1px solid ${BORDER}`,
                            borderRadius: 8, padding: "9px 12px", color: TEXT, fontSize: 13,
                            outline: "none", boxSizing: "border-box",
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, color: MUTED, fontWeight: 700, display: "block", marginBottom: 4 }}>PRESUPUESTO (MXN)</label>
                        <input
                          type="number"
                          value={wiz.presupuestoMXN}
                          onChange={(e) => setW("presupuestoMXN", Number(e.target.value))}
                          style={{
                            width: "100%", background: BG, border: `1px solid ${BORDER}`,
                            borderRadius: 8, padding: "9px 12px", color: TEXT, fontSize: 13,
                            outline: "none", boxSizing: "border-box",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: MUTED, fontWeight: 700, display: "block", marginBottom: 4 }}>FECHA LÍMITE</label>
                        <input
                          type="date"
                          value={wiz.fechaLimite}
                          onChange={(e) => setW("fechaLimite", e.target.value)}
                          style={{
                            width: "100%", background: BG, border: `1px solid ${BORDER}`,
                            borderRadius: 8, padding: "9px 12px", color: TEXT, fontSize: 13,
                            outline: "none", boxSizing: "border-box",
                            colorScheme: "dark",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                    <button onClick={() => setStep("tipo")} style={btnSecondary}>← Atrás</button>
                    <button onClick={() => setStep("presupuesto")} style={btnPrimary}>
                      Continuar →
                    </button>
                  </div>
                </div>
              )}

              {/* ── Decision tree steps ── */}
              {["presupuesto", "inventario", "capacidad"].map((nodeId) => {
                const node = TREE_NODES.find((n) => n.id === nodeId)!;
                if (step !== nodeId) return null;
                return (
                  <div key={nodeId}>
                    <div style={{
                      background: BG, borderRadius: 14, padding: "20px",
                      border: `1px solid ${BORDER}`, marginBottom: 20,
                    }}>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>{node.icon}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{node.pregunta}</div>
                      <div style={{ fontSize: 13, color: MUTED }}>{node.desc}</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <button
                        onClick={() => advanceTree(node, true)}
                        style={{
                          background: `${GREEN}18`, border: `1px solid ${GREEN}55`,
                          borderRadius: 12, padding: "16px", cursor: "pointer",
                          color: GREEN, fontSize: 15, fontWeight: 700,
                        }}
                      >
                        ✓ Sí
                      </button>
                      <button
                        onClick={() => advanceTree(node, false)}
                        style={{
                          background: `${CRIMSON}18`, border: `1px solid ${CRIMSON}55`,
                          borderRadius: 12, padding: "16px", cursor: "pointer",
                          color: CRIMSON, fontSize: 15, fontWeight: 700,
                        }}
                      >
                        ✗ No
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                      <button onClick={() => setStep("datos")} style={btnSecondary}>← Atrás</button>
                    </div>
                  </div>
                );
              })}

              {/* ── Step: Canal ── */}
              {step === "canal" && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                    ✅ Condiciones favorables
                  </div>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>
                    Presupuesto + inventario + capacidad confirmados. ¿En qué canal activamos?
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {CANALES.map((canal) => {
                      const meta = CANAL_META[canal];
                      const isRec = recomendarCanal(wiz.tipo!) === canal;
                      return (
                        <button
                          key={canal}
                          onClick={() => handleCanalSelect(canal)}
                          style={{
                            background: isRec ? `${meta.color}22` : BG,
                            border: `1px solid ${isRec ? meta.color : BORDER}`,
                            borderRadius: 10, padding: "12px 14px",
                            cursor: "pointer", color: TEXT,
                            display: "flex", alignItems: "center", gap: 8,
                            fontSize: 13, fontWeight: isRec ? 700 : 400,
                            position: "relative",
                          }}
                        >
                          <span style={{ fontSize: 16 }}>{meta.icon}</span>
                          <span>{canal}</span>
                          {isRec && (
                            <span style={{
                              position: "absolute", top: 4, right: 6,
                              fontSize: 8, color: meta.color, fontWeight: 700, letterSpacing: "0.5px",
                            }}>⭐ REC</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Step: Resultado ── */}
              {step === "resultado" && (
                <div>
                  <div style={{
                    background: wiz.resultado === "resultado_completo"
                      ? `${FIRE}18` : `${AMBER}18`,
                    border: `1px solid ${wiz.resultado === "resultado_completo" ? FIRE : AMBER}44`,
                    borderRadius: 14, padding: "20px", marginBottom: 20,
                  }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>
                      {wiz.resultado === "resultado_completo" ? "🚀" :
                       wiz.resultado === "resultado_organico" ? "🌱" :
                       wiz.resultado === "resultado_sin_inventario" ? "📦" : "⚙️"}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>
                      {wiz.resultado === "resultado_completo" ? "¡Estrategia Completa Activada!" :
                       wiz.resultado === "resultado_organico" ? "Estrategia Orgánica" :
                       wiz.resultado === "resultado_sin_inventario" ? "Prioritario: Resolver Inventario" :
                       "Prioritario: Optimizar Operaciones"}
                    </div>
                    <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
                      {wiz.estrategia}
                    </div>
                  </div>

                  {/* Canal recomendado */}
                  {wiz.canal && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10,
                      background: BG, borderRadius: 10, padding: "10px 14px",
                      border: `1px solid ${BORDER}`, marginBottom: 16,
                    }}>
                      <span style={{ fontSize: 20 }}>{CANAL_META[wiz.canal]?.icon}</span>
                      <div>
                        <div style={{ fontSize: 10, color: MUTED, fontWeight: 700 }}>CANAL RECOMENDADO</div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{wiz.canal}</div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={resetWizard} style={btnSecondary}>Cancelar</button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}
                    >
                      {saving ? "Guardando…" : "💾 Guardar Objetivo"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Button styles ─────────────────────────────────────────────────────────────

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
