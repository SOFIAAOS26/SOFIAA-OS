"use client";

/**
 * TEC Bii — Proyectos V2 (Sprint T2-1)
 * RUMBO A TIER 4
 *
 * Lista cognitiva de proyectos con:
 * - urgencyScore (barra de urgencia dinámica)
 * - riskLevel badge
 * - importancia calculada
 * - aiSummary si ya fue publicado al grafo
 * - badge ✦ NEXO si tiene nexoNodeId
 * - Modal de creación con footprint cognitivo inicial
 */

import { useState, useEffect } from "react";
import { useAuth }             from "@/contexts/AuthContext";
import PageGuard               from "@/components/tec-bi/PageGuard";
import {
  subscribeProyectosV2,
  createProyectoV2,
  updateProyectoV2,
  deleteProyectoV2,
} from "@/lib/tec-bii/firestore";
import {
  calcularUrgencia,
  calcularImportancia,
  EMPTY_FOOTPRINT,
  type ProyectoV2,
  type EstadoProyecto,
  type TipoAlcance,
  type TipoAsignacion,
  type RiskLevel,
} from "@/extensions/tec-bii/schema";

// ── Constantes visuales ───────────────────────────────────────────────────────

const ACCENT  = "#6366F1";
const ACCENT2 = "#8B5CF6";

const MXN = new Intl.NumberFormat("es-MX", {
  style:                 "currency",
  currency:              "MXN",
  maximumFractionDigits: 0,
});

const ESTADOS: EstadoProyecto[] = [
  "Pendiente", "En producción", "En revisión", "Entregado", "Cancelado",
];

const ESTADO_STYLE: Record<EstadoProyecto, { bg: string; color: string }> = {
  "Pendiente":      { bg: "rgba(99,102,241,0.12)",  color: "#6366F1" },
  "En producción":  { bg: "rgba(16,185,129,0.12)",  color: "#10B981" },
  "En revisión":    { bg: "rgba(245,158,11,0.12)",  color: "#F59E0B" },
  "Entregado":      { bg: "rgba(52,211,153,0.10)",  color: "#34D399" },
  "Cancelado":      { bg: "rgba(239,68,68,0.10)",   color: "#EF4444" },
};

const RISK_STYLE: Record<RiskLevel, { bg: string; color: string; label: string }> = {
  bajo:     { bg: "rgba(16,185,129,0.12)",  color: "#10B981", label: "Bajo" },
  medio:    { bg: "rgba(245,158,11,0.12)",  color: "#F59E0B", label: "Medio" },
  alto:     { bg: "rgba(239,68,68,0.12)",   color: "#EF4444", label: "Alto" },
  crítico:  { bg: "rgba(239,68,68,0.20)",   color: "#F87171", label: "Crítico" },
};

// ── Formulario vacío ──────────────────────────────────────────────────────────

const EMPTY_FORM = {
  briefId:         "",
  titulo:          "",
  tipoAlcance:     "Campus" as TipoAlcance,
  tipoAsignacion:  "Interno" as TipoAsignacion,
  asignadoId:      "",
  estado:          "Pendiente" as EstadoProyecto,
  valorEstimado:   0,
  linkEntregables: "",
  notas:           "",
  deadlineDays:    30,
};

// ── Sub-componentes ───────────────────────────────────────────────────────────

function UrgencyBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.8 ? "#EF4444"
    : score >= 0.6 ? "#F59E0B"
    : score >= 0.4 ? "#6366F1"
    : "#10B981";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{
        flex: 1, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: color, borderRadius: 99,
          transition: "width 0.4s",
          boxShadow: `0 0 6px ${color}66`,
        }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color, minWidth: 28 }}>{pct}%</span>
    </div>
  );
}

function Badge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color,
      background: bg, borderRadius: 99, padding: "2px 7px",
      border: `1px solid ${color}33`,
    }}>
      {label}
    </span>
  );
}

function ProyectoCard({
  p,
  onEdit,
  onDelete,
}: {
  p: ProyectoV2;
  onEdit:   () => void;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);
  const estadoS = ESTADO_STYLE[p.estado] ?? ESTADO_STYLE["Pendiente"];
  const riskS   = p.riskLevel ? RISK_STYLE[p.riskLevel] : null;
  const urgency = p.urgencyScore ?? calcularUrgencia(p.deadlineDays ?? 30, p.assigneeLoad);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background:   hover ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
        border:       `1px solid ${hover ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.07)"}`,
        borderLeft:   `3px solid ${estadoS.color}`,
        borderRadius: 14,
        padding:      "16px 18px",
        transition:   "all 0.2s",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0", wordBreak: "break-word" }}>
              {p.titulo}
            </span>
            {p.nexoNodeId && (
              <span title="Publicado al grafo NEXO" style={{
                fontSize: 9, fontWeight: 700, color: ACCENT,
                background: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.25)",
                borderRadius: 99, padding: "1px 6px",
              }}>
                ✦ NEXO
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Badge label={p.estado} bg={estadoS.bg} color={estadoS.color} />
            <Badge label={p.tipoAsignacion} bg="rgba(255,255,255,0.06)" color="rgba(226,232,240,0.5)" />
            <Badge label={p.tipoAlcance}    bg="rgba(255,255,255,0.06)" color="rgba(226,232,240,0.5)" />
            {riskS && <Badge label={`⚠ Riesgo ${riskS.label}`} bg={riskS.bg} color={riskS.color} />}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#E2E8F0" }}>
            {MXN.format(p.valorEstimado ?? 0)}
          </p>
          <p style={{ margin: 0, fontSize: 10, color: "rgba(226,232,240,0.3)" }}>valor estimado</p>
        </div>
      </div>

      {/* Urgencia */}
      <div style={{ marginBottom: 8 }}>
        <p style={{ margin: "0 0 4px", fontSize: 10, color: "rgba(226,232,240,0.35)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Urgencia cognitiva
        </p>
        <UrgencyBar score={urgency} />
      </div>

      {/* AI Summary */}
      {p.aiSummary && (
        <p style={{
          margin: "8px 0 0",
          fontSize: 11,
          color: "rgba(226,232,240,0.45)",
          lineHeight: 1.55,
          background: "rgba(99,102,241,0.05)",
          border: "1px solid rgba(99,102,241,0.12)",
          borderRadius: 8,
          padding: "6px 10px",
        }}>
          ✦ {p.aiSummary}
        </p>
      )}

      {/* Notas */}
      {p.notas && !p.aiSummary && (
        <p style={{ margin: "8px 0 0", fontSize: 11, color: "rgba(226,232,240,0.35)", lineHeight: 1.5 }}>
          {p.notas.slice(0, 120)}{p.notas.length > 120 ? "…" : ""}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
        <button onClick={onEdit} style={{
          background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 8, padding: "4px 12px", fontSize: 11, color: ACCENT, cursor: "pointer",
        }}>
          Editar
        </button>
        <button onClick={onDelete} style={{
          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
          borderRadius: 8, padding: "4px 12px", fontSize: 11, color: "#EF4444", cursor: "pointer",
        }}>
          Eliminar
        </button>
      </div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function ProyectoModal({
  editing,
  form,
  saving,
  onChange,
  onSubmit,
  onClose,
}: {
  editing:  ProyectoV2 | null;
  form:     typeof EMPTY_FORM;
  saving:   boolean;
  onChange: (k: keyof typeof EMPTY_FORM, v: string | number) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose:  () => void;
}) {
  const inputS: React.CSSProperties = {
    width: "100%", padding: "8px 12px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, fontSize: 13, color: "#E2E8F0",
    outline: "none", boxSizing: "border-box",
  };
  const labelS: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 600,
    color: "rgba(226,232,240,0.5)", marginBottom: 4,
    textTransform: "uppercase", letterSpacing: "0.05em",
  };
  const field = (label: string, children: React.ReactNode) => (
    <div style={{ marginBottom: 14 }}>
      <label style={labelS}>{label}</label>
      {children}
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0F0B1E", border: "1px solid rgba(99,102,241,0.3)",
          borderRadius: 18, padding: "24px 28px", width: "100%", maxWidth: 540,
          maxHeight: "90vh", overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#E2E8F0" }}>
            {editing ? "Editar proyecto" : "Nuevo proyecto"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "rgba(226,232,240,0.4)", cursor: "pointer" }}>×</button>
        </div>

        <form onSubmit={onSubmit}>
          {field("Título *",
            <input style={inputS} required value={form.titulo}
              onChange={(e) => onChange("titulo", e.target.value)} placeholder="Nombre del proyecto" />
          )}
          {field("Brief ID",
            <input style={inputS} value={form.briefId}
              onChange={(e) => onChange("briefId", e.target.value)} placeholder="ID del brief origen (opcional)" />
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {field("Estado",
              <select style={{ ...inputS, cursor: "pointer" }} value={form.estado}
                onChange={(e) => onChange("estado", e.target.value as EstadoProyecto)}>
                {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            )}
            {field("Días hasta deadline",
              <input style={inputS} type="number" min={0} value={form.deadlineDays}
                onChange={(e) => onChange("deadlineDays", Number(e.target.value))} />
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {field("Tipo de asignación",
              <select style={{ ...inputS, cursor: "pointer" }} value={form.tipoAsignacion}
                onChange={(e) => onChange("tipoAsignacion", e.target.value as TipoAsignacion)}>
                <option value="Interno">Interno</option>
                <option value="Externo">Externo</option>
              </select>
            )}
            {field("Alcance",
              <select style={{ ...inputS, cursor: "pointer" }} value={form.tipoAlcance}
                onChange={(e) => onChange("tipoAlcance", e.target.value as TipoAlcance)}>
                <option value="Campus">Campus</option>
                <option value="Nacional">Nacional</option>
              </select>
            )}
          </div>
          {field("Asignado (ID o nombre)",
            <input style={inputS} value={form.asignadoId}
              onChange={(e) => onChange("asignadoId", e.target.value)} placeholder="ID o nombre del responsable" />
          )}
          {field("Valor estimado (MXN)",
            <input style={inputS} type="number" min={0} value={form.valorEstimado}
              onChange={(e) => onChange("valorEstimado", Number(e.target.value))} />
          )}
          {field("Link de entregables",
            <input style={inputS} value={form.linkEntregables}
              onChange={(e) => onChange("linkEntregables", e.target.value)} placeholder="https://..." />
          )}
          {field("Notas",
            <textarea style={{ ...inputS, minHeight: 72, resize: "vertical" }} value={form.notas}
              onChange={(e) => onChange("notas", e.target.value)} placeholder="Contexto, observaciones, instrucciones especiales…" />
          )}

          {/* Indicador cognitivo */}
          <div style={{
            background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)",
            borderRadius: 10, padding: "10px 14px", marginBottom: 18,
          }}>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(99,102,241,0.7)", lineHeight: 1.5 }}>
              ✦ Al guardar, SOFIAA generará un resumen cognitivo y publicará este proyecto al Experience Graph para razonamiento cruzado con NEXO.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              width: "100%", padding: "11px",
              background: saving ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg, #6366F1, #8B5CF6)",
              border: "none", borderRadius: 10,
              fontSize: 13, fontWeight: 700, color: "#fff", cursor: saving ? "not-allowed" : "pointer",
              transition: "opacity 0.2s",
            }}
          >
            {saving ? "Guardando + publicando al grafo…" : editing ? "Actualizar proyecto" : "Crear proyecto"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ProyectosV2Page() {
  const { user }                          = useAuth();
  const [proyectos, setProyectos]         = useState<ProyectoV2[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [filterEstado, setFilterEstado]   = useState<string>("Todos");
  const [modalOpen, setModalOpen]         = useState(false);
  const [editing, setEditing]             = useState<ProyectoV2 | null>(null);
  const [form, setForm]                   = useState({ ...EMPTY_FORM });
  const [saving, setSaving]               = useState(false);
  const [toast, setToast]                 = useState<string | null>(null);

  const uid = user?.uid ?? "";

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeProyectosV2(uid, (data) => {
      setProyectos(data);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Filtros
  const filtered = proyectos
    .filter((p) => filterEstado === "Todos" || p.estado === filterEstado)
    .filter((p) =>
      !search ||
      p.titulo.toLowerCase().includes(search.toLowerCase()) ||
      (p.notas ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.aiSummary ?? "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0)); // más urgentes primero

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const openEdit = (p: ProyectoV2) => {
    setEditing(p);
    setForm({
      briefId:         p.briefId ?? "",
      titulo:          p.titulo,
      tipoAlcance:     p.tipoAlcance ?? "Campus",
      tipoAsignacion:  p.tipoAsignacion ?? "Interno",
      asignadoId:      p.asignadoId ?? "",
      estado:          p.estado ?? "Pendiente",
      valorEstimado:   p.valorEstimado ?? 0,
      linkEntregables: p.linkEntregables ?? "",
      notas:           p.notas ?? "",
      deadlineDays:    p.deadlineDays ?? 30,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || saving) return;
    setSaving(true);
    try {
      const urgencyScore = calcularUrgencia(form.deadlineDays, 0.5);
      const payload = {
        ...EMPTY_FOOTPRINT,
        ...form,
        urgencyScore,
        momentum: 0.5,
      };

      if (editing?.id) {
        await updateProyectoV2(uid, editing.id, payload);
        setToast("Proyecto actualizado · publicando al grafo…");
      } else {
        await createProyectoV2(uid, payload);
        setToast("Proyecto creado · SOFIAA está generando el resumen cognitivo…");
      }
      setModalOpen(false);
      setEditing(null);
    } catch {
      setToast("Error al guardar el proyecto");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!uid) return;
    if (!confirm("¿Eliminar este proyecto?")) return;
    await deleteProyectoV2(uid, id);
    setToast("Proyecto eliminado");
  };

  // Stats cognitivos
  const activos    = proyectos.filter((p) => p.estado === "En producción").length;
  const enGrafo    = proyectos.filter((p) => !!p.nexoNodeId).length;
  const urgentes   = proyectos.filter((p) => (p.urgencyScore ?? 0) >= 0.7).length;

  return (
    <>
      <PageGuard section="proyectos" />
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#E2E8F0" }}>
              🎬 Proyectos
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(99,102,241,0.7)", fontWeight: 600 }}>
              TEC Bii · Tracking cognitivo · RUMBO A TIER 4
            </p>
          </div>
          <button
            onClick={openNew}
            style={{
              background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
              border: "none", borderRadius: 10,
              padding: "9px 18px", fontSize: 13, fontWeight: 700,
              color: "#fff", cursor: "pointer",
              boxShadow: "0 0 20px rgba(99,102,241,0.3)",
            }}
          >
            + Nuevo proyecto
          </button>
        </div>

        {/* ── KPIs cognitivos ─────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          {[
            { label: "Total",        value: proyectos.length, color: "#E2E8F0" },
            { label: "En producción", value: activos,         color: "#10B981" },
            { label: "Urgentes",     value: urgentes,         color: "#EF4444" },
            { label: "En NEXO",      value: enGrafo,          color: ACCENT    },
          ].map((kpi) => (
            <div key={kpi.label} style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12, padding: "12px 18px", flex: "1 1 120px",
            }}>
              <p style={{ margin: "0 0 2px", fontSize: 10, color: "rgba(226,232,240,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{kpi.label}</p>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: kpi.color }}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* ── Filtros ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar proyectos…"
            style={{
              flex: 1, minWidth: 180, padding: "8px 12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, fontSize: 13, color: "#E2E8F0", outline: "none",
            }}
          />
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            style={{
              padding: "8px 12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, fontSize: 13, color: "#E2E8F0", outline: "none", cursor: "pointer",
            }}
          >
            <option value="Todos">Todos los estados</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        {/* ── Lista ───────────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "rgba(226,232,240,0.3)", fontSize: 13 }}>
            Cargando proyectos…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "48px 24px",
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16,
          }}>
            <p style={{ margin: "0 0 8px", fontSize: 32 }}>🎬</p>
            <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#E2E8F0" }}>
              {proyectos.length === 0 ? "Aún no hay proyectos" : "Sin resultados"}
            </p>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "rgba(226,232,240,0.35)" }}>
              {proyectos.length === 0
                ? "Crea tu primer proyecto y SOFIAA lo integrará al grafo cognitivo."
                : "Prueba con otro término de búsqueda."}
            </p>
            {proyectos.length === 0 && (
              <button
                onClick={openNew}
                style={{
                  background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)",
                  borderRadius: 10, padding: "8px 18px", fontSize: 12, fontWeight: 700,
                  color: ACCENT, cursor: "pointer",
                }}
              >
                + Crear primer proyecto
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((p) => (
              <ProyectoCard
                key={p.id}
                p={p}
                onEdit={() => openEdit(p)}
                onDelete={() => p.id && handleDelete(p.id)}
              />
            ))}
          </div>
        )}

        {/* ── Info cognitiva ──────────────────────────────────────────── */}
        {enGrafo < proyectos.length && proyectos.length > 0 && (
          <p style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: "rgba(99,102,241,0.4)" }}>
            ✦ {proyectos.length - enGrafo} proyecto{proyectos.length - enGrafo !== 1 ? "s" : ""} pendiente{proyectos.length - enGrafo !== 1 ? "s" : ""} de sincronización cognitiva
          </p>
        )}
      </div>

      {/* ── Modal ───────────────────────────────────────────────────────── */}
      {modalOpen && (
        <ProyectoModal
          editing={editing}
          form={form}
          saving={saving}
          onChange={(k, v) => setForm((prev) => ({ ...prev, [k]: v }))}
          onSubmit={handleSubmit}
          onClose={() => { setModalOpen(false); setEditing(null); }}
        />
      )}

      {/* ── Toast ───────────────────────────────────────────────────────── */}
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
