"use client";

/**
 * TEC Bii — Briefs V2 (Sprint T2-3)
 * RUMBO A TIER 4
 *
 * Diferenciador clave: SOFIAA puede generar un brief completo
 * desde una descripción en lenguaje natural.
 *
 * Modos:
 * - "Nuevo brief manual" → form estructurado
 * - "Generar con IA" → texto libre → Gemini Flash → form pre-llenado → editar → guardar
 *
 * Cards con: briefScore, urgencyScore, estado, badge NEXO, aiSummary
 */

import { useState, useEffect } from "react";
import { useAuth }             from "@/contexts/AuthContext";
import PageGuard               from "@/components/tec-bi/PageGuard";
import {
  subscribeBriefsV2,
  createBriefV2,
  updateBriefV2,
  deleteBriefV2,
} from "@/lib/tec-bii/firestore";
import {
  EMPTY_FOOTPRINT,
  type BriefV2,
  type EstadoBrief,
  type TipoProyecto,
} from "@/extensions/tec-bii/schema";

// ── Constantes ────────────────────────────────────────────────────────────────

const ACCENT  = "#6366F1";
const ACCENT2 = "#8B5CF6";

const TIPOS: TipoProyecto[] = [
  "Spot Publicitario", "Cápsula Educativa", "Diseño Gráfico",
  "Evento en Vivo", "Fotografía", "Motion Graphics",
  "Podcast / Audio", "Reel / Short", "Otro",
];

const ESTADOS: EstadoBrief[] = [
  "Recibido", "En revisión", "Aprobado", "En producción", "Entregado", "Cancelado",
];

const ESTADO_STYLE: Record<EstadoBrief, { bg: string; color: string }> = {
  "Recibido":       { bg: "rgba(99,102,241,0.10)",  color: "#6366F1" },
  "En revisión":    { bg: "rgba(245,158,11,0.10)",  color: "#F59E0B" },
  "Aprobado":       { bg: "rgba(16,185,129,0.10)",  color: "#10B981" },
  "En producción":  { bg: "rgba(139,92,246,0.10)",  color: "#8B5CF6" },
  "Entregado":      { bg: "rgba(52,211,153,0.08)",  color: "#34D399" },
  "Cancelado":      { bg: "rgba(239,68,68,0.08)",   color: "#EF4444" },
};

// ── Form vacío ────────────────────────────────────────────────────────────────

const EMPTY_FORM: Omit<BriefV2, "id" | "createdAt" | "updatedAt" | keyof typeof EMPTY_FOOTPRINT> = {
  clienteId:           "",
  tipoProyecto:        "Otro",
  titulo:              "",
  descripcion:         "",
  entregables:         [],
  requisitosTecnicos:  "",
  referencias:         "",
  fechaSolicitud:      Date.now(),
  fechaLimite:         Date.now() + 30 * 86_400_000,
  estado:              "Recibido",
  objetivo:            "",
  audiencia:           "",
  plataforma:          "",
  duracionSeg:         undefined,
  contactoSolicitante: "",
  emailSolicitante:    "",
  briefScore:          undefined,
  aiGeneratedFrom:     undefined,
  urgencyScore:        0.3,
  suggestedTags:       [],
};

type FormState = typeof EMPTY_FORM;

// ── Helpers ───────────────────────────────────────────────────────────────────

function entregablesFromText(text: string): string[] {
  return text.split("\n").map((s) => s.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
}

function entregablesToText(arr: string[]): string {
  return arr.join("\n");
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function ScorePill({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "#10B981" : score >= 50 ? "#F59E0B" : "#EF4444";
  return (
    <span title={label} style={{
      fontSize: 10, fontWeight: 800, color,
      background: color + "15",
      border: `1px solid ${color}30`,
      borderRadius: 99, padding: "2px 7px",
    }}>
      {label} {score}
    </span>
  );
}

function UrgBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.8 ? "#EF4444" : score >= 0.5 ? "#F59E0B" : "#6366F1";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 9, fontWeight: 700, color, minWidth: 26 }}>{pct}%</span>
    </div>
  );
}

function BriefCard({ b, onEdit, onDelete }: { b: BriefV2; onEdit: () => void; onDelete: () => void }) {
  const [hover, setHover] = useState(false);
  const estadoS = ESTADO_STYLE[b.estado] ?? ESTADO_STYLE["Recibido"];
  const urgency = b.urgencyScore ?? 0.3;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background:   hover ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
        border:       `1px solid ${hover ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.07)"}`,
        borderLeft:   `3px solid ${estadoS.color}`,
        borderRadius: 14, padding: "15px 18px", transition: "all 0.2s",
      }}
    >
      {/* Row 1 — título + badges */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 5 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0" }}>{b.titulo}</span>
            {b.aiGeneratedFrom === "conversación" && (
              <span style={{
                fontSize: 9, fontWeight: 700, color: ACCENT2,
                background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)",
                borderRadius: 99, padding: "1px 6px",
              }}>✦ IA</span>
            )}
            {b.nexoNodeId && (
              <span style={{
                fontSize: 9, fontWeight: 700, color: ACCENT,
                background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)",
                borderRadius: 99, padding: "1px 6px",
              }}>✦ NEXO</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: estadoS.color,
              background: estadoS.bg, border: `1px solid ${estadoS.color}33`,
              borderRadius: 99, padding: "2px 7px",
            }}>{b.estado}</span>
            <span style={{
              fontSize: 10, color: "rgba(226,232,240,0.4)",
              background: "rgba(255,255,255,0.05)", borderRadius: 99, padding: "2px 7px",
            }}>{b.tipoProyecto}</span>
            {b.briefScore != null && <ScorePill score={b.briefScore} label="Score" />}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 10, color: "rgba(226,232,240,0.3)" }}>
            {new Date(b.fechaLimite).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
          </p>
          <p style={{ margin: 0, fontSize: 9, color: "rgba(226,232,240,0.2)" }}>deadline</p>
        </div>
      </div>

      {/* Urgencia */}
      <div style={{ marginBottom: 8 }}>
        <p style={{ margin: "0 0 3px", fontSize: 9, fontWeight: 600, color: "rgba(226,232,240,0.3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Urgencia</p>
        <UrgBar score={urgency} />
      </div>

      {/* AI Summary */}
      {b.aiSummary && (
        <p style={{
          margin: "8px 0 0", fontSize: 11, color: "rgba(226,232,240,0.45)", lineHeight: 1.55,
          background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.12)",
          borderRadius: 8, padding: "6px 10px",
        }}>
          ✦ {b.aiSummary}
        </p>
      )}

      {/* Objetivo */}
      {!b.aiSummary && b.objetivo && (
        <p style={{ margin: "6px 0 0", fontSize: 11, color: "rgba(226,232,240,0.35)", lineHeight: 1.5 }}>
          {b.objetivo.slice(0, 100)}{b.objetivo.length > 100 ? "…" : ""}
        </p>
      )}

      {/* Tags */}
      {(b.suggestedTags ?? b.tags ?? []).length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
          {(b.suggestedTags ?? b.tags ?? []).slice(0, 4).map((tag) => (
            <span key={tag} style={{
              fontSize: 9, color: "rgba(226,232,240,0.3)",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 99, padding: "1px 7px",
            }}>#{tag}</span>
          ))}
        </div>
      )}

      {/* Acciones */}
      <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
        <button onClick={onEdit} style={{
          background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 8, padding: "4px 12px", fontSize: 11, color: ACCENT, cursor: "pointer",
        }}>Editar</button>
        <button onClick={onDelete} style={{
          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
          borderRadius: 8, padding: "4px 12px", fontSize: 11, color: "#EF4444", cursor: "pointer",
        }}>Eliminar</button>
      </div>
    </div>
  );
}

// ── Modal IA ──────────────────────────────────────────────────────────────────

function IAGeneratorModal({
  onGenerated,
  onClose,
  token,
}: {
  onGenerated: (brief: Partial<BriefV2>) => void;
  onClose:     () => void;
  token:       string;
}) {
  const [text, setText]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const generate = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/tec-bii/brief-gen", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ descripcion: text.trim() }),
      });
      const json = await res.json() as { success: boolean; brief?: Partial<BriefV2>; error?: string };
      if (!json.success || !json.brief) throw new Error(json.error ?? "Error desconocido");
      onGenerated(json.brief);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al generar el brief");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#0F0B1E", border: "1px solid rgba(139,92,246,0.4)",
        borderRadius: 20, padding: "28px 30px", width: "100%", maxWidth: 540,
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800, color: "#E2E8F0" }}>
              ✦ Generar brief con SOFIAA
            </h2>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(139,92,246,0.7)" }}>
              Describe el proyecto en tus propias palabras
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "rgba(226,232,240,0.4)", cursor: "pointer" }}>×</button>
        </div>

        {/* Textarea */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Ej: "Necesito un video corto para Instagram sobre el programa de becas del TEC, dirigido a estudiantes de preparatoria, con animaciones y música. Lo necesito para la próxima semana."`}
          style={{
            width: "100%", minHeight: 130,
            padding: "12px 14px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(139,92,246,0.25)",
            borderRadius: 12, fontSize: 13, color: "#E2E8F0",
            resize: "vertical", outline: "none", boxSizing: "border-box",
            lineHeight: 1.6,
          }}
          autoFocus
        />

        <p style={{ margin: "6px 0 16px", fontSize: 10, color: "rgba(226,232,240,0.25)" }}>
          {text.length}/2000 chars · Gemini Flash estructurará el brief completo
        </p>

        {error && (
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "#EF4444", background: "rgba(239,68,68,0.06)", borderRadius: 8, padding: "8px 12px" }}>
            ⚠ {error}
          </p>
        )}

        <button
          onClick={generate}
          disabled={loading || !text.trim()}
          style={{
            width: "100%", padding: "12px",
            background: loading || !text.trim()
              ? "rgba(139,92,246,0.2)"
              : "linear-gradient(135deg, #6366F1, #8B5CF6)",
            border: "none", borderRadius: 11,
            fontSize: 13, fontWeight: 700,
            color: loading || !text.trim() ? "rgba(226,232,240,0.3)" : "#fff",
            cursor: loading || !text.trim() ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all 0.2s",
          }}
        >
          {loading ? (
            <>
              <span style={{ display: "inline-block", animation: "ia-spin 1s linear infinite" }}>◌</span>
              Generando brief…
            </>
          ) : "✦ Generar brief completo"}
        </button>
        <style>{`@keyframes ia-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

// ── Modal de formulario ───────────────────────────────────────────────────────

function BriefFormModal({
  editing, form, saving, iaGenerated,
  onChange, onEntregablesChange, onSubmit, onClose,
}: {
  editing:           BriefV2 | null;
  form:              FormState;
  saving:            boolean;
  iaGenerated:       boolean;
  onChange:          (k: keyof FormState, v: unknown) => void;
  onEntregablesChange: (text: string) => void;
  onSubmit:          (e: React.FormEvent) => void;
  onClose:           () => void;
}) {
  const inputS: React.CSSProperties = {
    width: "100%", padding: "8px 12px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, fontSize: 13, color: "#E2E8F0",
    outline: "none", boxSizing: "border-box",
  };
  const labelS: React.CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 600,
    color: "rgba(226,232,240,0.45)", marginBottom: 4,
    textTransform: "uppercase", letterSpacing: "0.05em",
  };
  const f = (label: string, node: React.ReactNode) => (
    <div style={{ marginBottom: 12 }}><label style={labelS}>{label}</label>{node}</div>
  );

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#0F0B1E",
        border: `1px solid ${iaGenerated ? "rgba(139,92,246,0.4)" : "rgba(99,102,241,0.3)"}`,
        borderRadius: 18, padding: "22px 26px",
        width: "100%", maxWidth: 600, maxHeight: "92vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: "0 0 3px", fontSize: 16, fontWeight: 800, color: "#E2E8F0" }}>
              {editing ? "Editar brief" : iaGenerated ? "✦ Brief generado por IA" : "Nuevo brief"}
            </h2>
            {iaGenerated && (
              <p style={{ margin: 0, fontSize: 11, color: "rgba(139,92,246,0.7)" }}>
                Revisa y ajusta los campos antes de guardar
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "rgba(226,232,240,0.4)", cursor: "pointer" }}>×</button>
        </div>

        <form onSubmit={onSubmit}>
          {f("Título *",
            <input style={inputS} required value={form.titulo}
              onChange={(e) => onChange("titulo", e.target.value)} placeholder="Nombre del proyecto" />
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {f("Tipo de proyecto",
              <select style={{ ...inputS, cursor: "pointer" }} value={form.tipoProyecto}
                onChange={(e) => onChange("tipoProyecto", e.target.value)}>
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            {f("Estado",
              <select style={{ ...inputS, cursor: "pointer" }} value={form.estado}
                onChange={(e) => onChange("estado", e.target.value as EstadoBrief)}>
                {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            )}
          </div>

          {f("Descripción",
            <textarea style={{ ...inputS, minHeight: 70, resize: "vertical" }} value={form.descripcion}
              onChange={(e) => onChange("descripcion", e.target.value)}
              placeholder="Descripción del proyecto..." />
          )}

          {f("Objetivo",
            <input style={inputS} value={form.objetivo ?? ""}
              onChange={(e) => onChange("objetivo", e.target.value)} placeholder="¿Qué debe lograr este proyecto?" />
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {f("Audiencia",
              <input style={inputS} value={form.audiencia ?? ""}
                onChange={(e) => onChange("audiencia", e.target.value)} placeholder="Público objetivo" />
            )}
            {f("Plataforma",
              <input style={inputS} value={form.plataforma ?? ""}
                onChange={(e) => onChange("plataforma", e.target.value)} placeholder="Instagram, YouTube, etc." />
            )}
          </div>

          {f("Entregables (uno por línea)",
            <textarea style={{ ...inputS, minHeight: 80, resize: "vertical" }}
              value={entregablesToText(form.entregables)}
              onChange={(e) => onEntregablesChange(e.target.value)}
              placeholder={"Video final .mp4\nStills para redes\nArchivos fuente"} />
          )}

          {f("Requisitos técnicos",
            <textarea style={{ ...inputS, minHeight: 56, resize: "vertical" }} value={form.requisitosTecnicos}
              onChange={(e) => onChange("requisitosTecnicos", e.target.value)}
              placeholder="Resolución, formato, equipamiento necesario..." />
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {f("Contacto solicitante",
              <input style={inputS} value={form.contactoSolicitante ?? ""}
                onChange={(e) => onChange("contactoSolicitante", e.target.value)} placeholder="Nombre" />
            )}
            {f("Email",
              <input style={inputS} type="email" value={form.emailSolicitante ?? ""}
                onChange={(e) => onChange("emailSolicitante", e.target.value)} placeholder="correo@tec.mx" />
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {f("Fecha límite",
              <input style={inputS} type="date"
                value={new Date(form.fechaLimite).toISOString().split("T")[0]}
                onChange={(e) => onChange("fechaLimite", new Date(e.target.value).getTime())} />
            )}
            {f("Duración (segundos)",
              <input style={inputS} type="number" min={0}
                value={form.duracionSeg ?? ""}
                onChange={(e) => onChange("duracionSeg", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Ej: 60" />
            )}
          </div>

          {/* Brief Score (si viene de IA) */}
          {form.briefScore != null && (
            <div style={{
              background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)",
              borderRadius: 10, padding: "10px 14px", marginBottom: 12,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>✓</span>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: "#10B981" }}>
                  Brief Score: {form.briefScore}/100
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "rgba(226,232,240,0.4)" }}>
                  Completitud estimada por SOFIAA basada en la información disponible
                </p>
              </div>
            </div>
          )}

          {/* Nota cognitiva */}
          <div style={{
            background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)",
            borderRadius: 10, padding: "9px 13px", marginBottom: 16,
          }}>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(99,102,241,0.65)", lineHeight: 1.5 }}>
              ✦ Al guardar, SOFIAA generará el resumen cognitivo y publicará este brief al Experience Graph de NEXO.
            </p>
          </div>

          <button type="submit" disabled={saving} style={{
            width: "100%", padding: "11px",
            background: saving ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg, #6366F1, #8B5CF6)",
            border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700,
            color: "#fff", cursor: saving ? "not-allowed" : "pointer",
          }}>
            {saving ? "Guardando…" : editing ? "Actualizar brief" : "Crear brief"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function BriefsPage() {
  const { user }                        = useAuth();
  const [briefs, setBriefs]             = useState<BriefV2[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [modalOpen, setModalOpen]       = useState(false);
  const [iaOpen, setIaOpen]             = useState(false);
  const [editing, setEditing]           = useState<BriefV2 | null>(null);
  const [form, setForm]                 = useState<FormState>({ ...EMPTY_FORM });
  const [iaGenerated, setIaGenerated]   = useState(false);
  const [saving, setSaving]             = useState(false);
  const [toast, setToast]               = useState<string | null>(null);
  const [token, setToken]               = useState("");

  const uid = user?.uid ?? "";

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeBriefsV2(uid, (data) => { setBriefs(data); setLoading(false); });
    return unsub;
  }, [uid]);

  useEffect(() => {
    user?.getIdToken().then(setToken).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = briefs
    .filter((b) => filterEstado === "Todos" || b.estado === filterEstado)
    .filter((b) =>
      !search ||
      b.titulo.toLowerCase().includes(search.toLowerCase()) ||
      (b.descripcion ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (b.objetivo ?? "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0));

  const openNew = () => {
    setEditing(null);
    setIaGenerated(false);
    setForm({ ...EMPTY_FORM, fechaSolicitud: Date.now(), fechaLimite: Date.now() + 30 * 86_400_000 });
    setModalOpen(true);
  };

  const openEdit = (b: BriefV2) => {
    setEditing(b);
    setIaGenerated(false);
    setForm({
      clienteId:           b.clienteId ?? "",
      tipoProyecto:        b.tipoProyecto ?? "Otro",
      titulo:              b.titulo,
      descripcion:         b.descripcion ?? "",
      entregables:         b.entregables ?? [],
      requisitosTecnicos:  b.requisitosTecnicos ?? "",
      referencias:         b.referencias ?? "",
      fechaSolicitud:      b.fechaSolicitud ?? Date.now(),
      fechaLimite:         b.fechaLimite ?? Date.now() + 30 * 86_400_000,
      estado:              b.estado,
      objetivo:            b.objetivo ?? "",
      audiencia:           b.audiencia ?? "",
      plataforma:          b.plataforma ?? "",
      duracionSeg:         b.duracionSeg,
      contactoSolicitante: b.contactoSolicitante ?? "",
      emailSolicitante:    b.emailSolicitante ?? "",
      briefScore:          b.briefScore,
      aiGeneratedFrom:     b.aiGeneratedFrom,
      urgencyScore:        b.urgencyScore ?? 0.3,
      suggestedTags:       b.suggestedTags ?? [],
    });
    setModalOpen(true);
  };

  const handleIaGenerated = (brief: Partial<BriefV2>) => {
    setIaOpen(false);
    setEditing(null);
    setIaGenerated(true);
    setForm((prev) => ({
      ...prev,
      ...brief,
      entregables:    brief.entregables ?? [],
      suggestedTags:  brief.suggestedTags ?? [],
      fechaSolicitud: brief.fechaSolicitud ?? Date.now(),
      fechaLimite:    brief.fechaLimite ?? Date.now() + 30 * 86_400_000,
    }));
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || saving) return;
    setSaving(true);
    try {
      const payload = { ...EMPTY_FOOTPRINT, ...form };
      if (editing?.id) {
        await updateBriefV2(uid, editing.id, payload);
        setToast("Brief actualizado · publicando al grafo…");
      } else {
        await createBriefV2(uid, payload);
        setToast(iaGenerated
          ? "Brief IA creado · SOFIAA generando resumen cognitivo…"
          : "Brief creado · publicando al Experience Graph…"
        );
      }
      setModalOpen(false);
      setEditing(null);
      setIaGenerated(false);
    } catch {
      setToast("Error al guardar el brief");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!uid || !confirm("¿Eliminar este brief?")) return;
    await deleteBriefV2(uid, id);
    setToast("Brief eliminado");
  };

  // Stats
  const enGrafo  = briefs.filter((b) => !!b.nexoNodeId).length;
  const iaCount  = briefs.filter((b) => b.aiGeneratedFrom === "conversación").length;
  const urgentes = briefs.filter((b) => (b.urgencyScore ?? 0) >= 0.6).length;

  return (
    <>
      <PageGuard section="briefs" />
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
          <div>
            <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#E2E8F0" }}>📋 Briefs</h1>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(99,102,241,0.7)", fontWeight: 600 }}>
              TEC Bii · Brief Intelligence · RUMBO A TIER 4
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setIaOpen(true)} style={{
              background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)",
              borderRadius: 10, padding: "9px 16px", fontSize: 12, fontWeight: 700,
              color: ACCENT2, cursor: "pointer",
            }}>✦ Generar con IA</button>
            <button onClick={openNew} style={{
              background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
              border: "none", borderRadius: 10, padding: "9px 16px",
              fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer",
              boxShadow: "0 0 16px rgba(99,102,241,0.3)",
            }}>+ Nuevo brief</button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          {[
            { label: "Total",         value: briefs.length,  color: "#E2E8F0" },
            { label: "Urgentes",      value: urgentes,       color: "#EF4444" },
            { label: "Generados IA",  value: iaCount,        color: ACCENT2   },
            { label: "En NEXO",       value: enGrafo,        color: ACCENT    },
          ].map((k) => (
            <div key={k.label} style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12, padding: "12px 18px", flex: "1 1 110px",
            }}>
              <p style={{ margin: "0 0 2px", fontSize: 10, color: "rgba(226,232,240,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{k.label}</p>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar briefs…"
            style={{
              flex: 1, minWidth: 160, padding: "8px 12px",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, fontSize: 13, color: "#E2E8F0", outline: "none",
            }} />
          <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}
            style={{
              padding: "8px 12px",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, fontSize: 13, color: "#E2E8F0", outline: "none", cursor: "pointer",
            }}>
            <option value="Todos">Todos</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        {/* Lista */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "rgba(226,232,240,0.3)", fontSize: 13 }}>Cargando briefs…</div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "48px 24px",
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16,
          }}>
            <p style={{ margin: "0 0 8px", fontSize: 28 }}>📋</p>
            <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#E2E8F0" }}>
              {briefs.length === 0 ? "Sin briefs aún" : "Sin resultados"}
            </p>
            <p style={{ margin: "0 0 18px", fontSize: 12, color: "rgba(226,232,240,0.35)" }}>
              {briefs.length === 0
                ? "Puedes crear un brief manualmente o dejar que SOFIAA lo genere desde tu descripción."
                : "Prueba con otro término."}
            </p>
            {briefs.length === 0 && (
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={() => setIaOpen(true)} style={{
                  background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)",
                  borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: ACCENT2, cursor: "pointer",
                }}>✦ Generar con IA</button>
                <button onClick={openNew} style={{
                  background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)",
                  borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: ACCENT, cursor: "pointer",
                }}>+ Brief manual</button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((b) => (
              <BriefCard key={b.id} b={b}
                onEdit={() => openEdit(b)}
                onDelete={() => b.id && handleDelete(b.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Modal IA */}
      {iaOpen && (
        <IAGeneratorModal
          token={token}
          onGenerated={handleIaGenerated}
          onClose={() => setIaOpen(false)}
        />
      )}

      {/* Modal formulario */}
      {modalOpen && (
        <BriefFormModal
          editing={editing}
          form={form}
          saving={saving}
          iaGenerated={iaGenerated}
          onChange={(k, v) => setForm((prev) => ({ ...prev, [k]: v }))}
          onEntregablesChange={(text) => setForm((prev) => ({ ...prev, entregables: entregablesFromText(text) }))}
          onSubmit={handleSubmit}
          onClose={() => { setModalOpen(false); setEditing(null); setIaGenerated(false); }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#1E1B2E", border: "1px solid rgba(99,102,241,0.3)",
          borderRadius: 12, padding: "10px 20px", fontSize: 12, fontWeight: 600,
          color: "#E2E8F0", zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}
    </>
  );
}
