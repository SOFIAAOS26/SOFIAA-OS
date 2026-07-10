"use client";

/**
 * TEC Bii — Equipo (Sprint T2-5: Team Cognition)
 * RUMBO A TIER 4
 *
 * Gestión cognitiva del equipo de producción audiovisual:
 * - EmpleadoCard con barra de carga, SkillProfile y conexión NEXO
 * - Sorted por cargaActual desc (los más cargados primero)
 * - CRUD completo con cognitive publish automático
 * - aiSummary generado por Gemini al registrar
 */

import { useState, useEffect }    from "react";
import { useAuth }                 from "@/contexts/AuthContext";
import PageGuard                   from "@/components/tec-bi/PageGuard";
import {
  subscribeEmpleadosV2,
  createEmpleadoV2,
  updateEmpleadoV2,
  deleteEmpleadoV2,
} from "@/lib/tec-bii/firestore";
import { EMPTY_FOOTPRINT }         from "@/extensions/tec-bii/schema";
import type { EmpleadoV2 }         from "@/extensions/tec-bii/schema";

// ── Constantes ────────────────────────────────────────────────────────────────

const ACCENT  = "#06B6D4";   // cyan — color del módulo Equipo
const ACCENT2 = "#0891B2";

const PUESTOS = [
  "Director de Producción", "Productor Audiovisual", "Editor de Video",
  "Camarógrafo", "Diseñador Gráfico", "Animador 3D", "Sonidista",
  "Fotógrafo", "Motion Designer", "Community Manager", "Otro",
];

const DEPARTAMENTOS = [
  "Producción", "Diseño", "Post-producción", "Audio", "Fotografía", "Administración",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function cargaColor(carga: number): string {
  if (carga >= 0.85) return "#EF4444";
  if (carga >= 0.65) return "#F59E0B";
  if (carga >= 0.35) return ACCENT;
  return "#10B981";
}

function cargaLabel(carga: number): string {
  if (carga >= 0.85) return "Saturado";
  if (carga >= 0.65) return "Alta carga";
  if (carga >= 0.35) return "Activo";
  return "Disponible";
}

function momentumColor(m: number): string {
  if (m >= 0.7) return "#10B981";
  if (m >= 0.4) return ACCENT;
  return "rgba(226,232,240,0.3)";
}

// ── Form vacío ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  nombre:         "",
  puesto:         "Productor Audiovisual",
  departamento:   "Producción",
  tarifaHora:     0,
  salarioMensual: 0,
  activo:         true,
  cargaActual:    0.0,
  momentum:       0.5,
};

type FormState = typeof EMPTY_FORM;

// ── Sub-componentes ───────────────────────────────────────────────────────────

function CargaBar({ value, color }: { value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 9, color: "rgba(226,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Carga actual
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div style={{
        height: 4, borderRadius: 99,
        background: "rgba(255,255,255,0.07)",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width:  `${pct}%`,
          borderRadius: 99,
          background: color,
          boxShadow: pct >= 65 ? `0 0 8px ${color}88` : "none",
          transition: "width 0.4s ease",
        }} />
      </div>
    </div>
  );
}

function EmpleadoCard({
  emp,
  onEdit,
  onDelete,
}: {
  emp:      EmpleadoV2;
  onEdit:   (e: EmpleadoV2) => void;
  onDelete: (id: string) => void;
}) {
  const [hover, setHover]   = useState(false);
  const [menu,  setMenu]    = useState(false);
  const carga = emp.cargaActual ?? 0;
  const color = cargaColor(carga);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setMenu(false); }}
      style={{
        background:   hover ? "rgba(6,182,212,0.04)" : "rgba(255,255,255,0.02)",
        border:       `1px solid ${hover ? ACCENT + "33" : "rgba(255,255,255,0.06)"}`,
        borderLeft:   `3px solid ${emp.activo ? color : "rgba(255,255,255,0.12)"}`,
        borderRadius: 14,
        padding:      "16px 18px",
        transition:   "all 0.2s",
        position:     "relative",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        {/* Avatar */}
        <div style={{
          width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
          background: `linear-gradient(135deg, ${ACCENT}30, ${ACCENT2}20)`,
          border: `1px solid ${ACCENT}33`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, color: ACCENT, fontWeight: 800,
        }}>
          {emp.nombre.charAt(0).toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0" }}>{emp.nombre}</span>

            {/* Estado activo/inactivo */}
            {!emp.activo && (
              <span style={{
                fontSize: 9, fontWeight: 700,
                color: "rgba(226,232,240,0.35)",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 99, padding: "1px 6px",
              }}>
                INACTIVO
              </span>
            )}

            {/* Badge NEXO */}
            {emp.nexoNodeId && (
              <span style={{
                fontSize: 9, fontWeight: 700, color: "#6366F1",
                background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)",
                borderRadius: 99, padding: "1px 6px",
              }}>
                ✦ NEXO
              </span>
            )}

            {/* Momentum */}
            <span style={{
              fontSize: 9, fontWeight: 700,
              color: momentumColor(emp.momentum ?? 0),
              marginLeft: "auto",
            }}>
              ⬆ {Math.round((emp.momentum ?? 0) * 100)}%
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: "rgba(226,232,240,0.45)" }}>
            {emp.puesto} · {emp.departamento}
          </p>
        </div>

        {/* Menú */}
        <div style={{ position: "relative" }}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenu(!menu); }}
            style={{
              background: "transparent", border: "none", color: "rgba(226,232,240,0.3)",
              cursor: "pointer", padding: "4px 6px", fontSize: 16, lineHeight: 1,
              borderRadius: 6,
            }}
          >
            ···
          </button>
          {menu && (
            <div style={{
              position: "absolute", right: 0, top: "100%", zIndex: 50,
              background: "#1E2035", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, overflow: "hidden", minWidth: 130, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}>
              <button
                onClick={() => { setMenu(false); onEdit(emp); }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "transparent", border: "none", color: "#E2E8F0", fontSize: 12, cursor: "pointer" }}
              >
                ✎ Editar
              </button>
              <button
                onClick={() => { setMenu(false); onDelete(emp.id!); }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "transparent", border: "none", color: "#EF4444", fontSize: 12, cursor: "pointer" }}
              >
                🗑 Eliminar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Barra de carga */}
      <CargaBar value={carga} color={color} />

      {/* SkillProfile */}
      {emp.skillProfile && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {emp.skillProfile.topSkills.slice(0, 4).map((s) => (
              <span key={s} style={{
                fontSize: 9, padding: "2px 8px", borderRadius: 99,
                background: `${ACCENT}15`, border: `1px solid ${ACCENT}30`,
                color: ACCENT, fontWeight: 600,
              }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI Summary */}
      {emp.aiSummary && (
        <p style={{
          margin: "10px 0 0", fontSize: 11,
          color: "rgba(226,232,240,0.45)", lineHeight: 1.55,
          borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 8,
        }}>
          {emp.aiSummary}
        </p>
      )}

      {/* Footer métricas */}
      <div style={{
        marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap",
        borderTop: emp.aiSummary ? "none" : "1px solid rgba(255,255,255,0.04)",
        paddingTop: emp.aiSummary ? 0 : 8,
      }}>
        {emp.tarifaHora > 0 && (
          <span style={{ fontSize: 10, color: "rgba(226,232,240,0.35)" }}>
            ${emp.tarifaHora.toLocaleString("es-MX")}/hr
          </span>
        )}
        {emp.proyectosTotales !== undefined && emp.proyectosTotales > 0 && (
          <span style={{ fontSize: 10, color: "rgba(226,232,240,0.35)" }}>
            {emp.proyectosTotales} proyectos
          </span>
        )}
        {emp.calidadPromedio !== undefined && emp.calidadPromedio > 0 && (
          <span style={{ fontSize: 10, color: "#F59E0B" }}>
            ★ {emp.calidadPromedio.toFixed(1)}
          </span>
        )}
        <span style={{
          fontSize: 10, fontWeight: 600, color,
          marginLeft: "auto",
        }}>
          {cargaLabel(carga)}
        </span>
      </div>
    </div>
  );
}

// ── Modal Formulario ──────────────────────────────────────────────────────────

function EmpleadoModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: EmpleadoV2;
  onClose:  () => void;
  onSave:   (data: FormState) => Promise<void>;
}) {
  const [form, setForm]     = useState<FormState>(
    initial
      ? {
          nombre:         initial.nombre,
          puesto:         initial.puesto,
          departamento:   initial.departamento,
          tarifaHora:     initial.tarifaHora,
          salarioMensual: initial.salarioMensual,
          activo:         initial.activo,
          cargaActual:    initial.cargaActual ?? 0,
          momentum:       initial.momentum ?? 0.5,
        }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const field = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return setError("El nombre es requerido");
    setSaving(true); setError(null);
    try {
      await onSave(form);
      onClose();
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const INPUT = {
    background:   "rgba(255,255,255,0.04)",
    border:       "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding:      "9px 12px",
    fontSize:     13,
    color:        "#E2E8F0",
    width:        "100%",
    outline:      "none",
    boxSizing:    "border-box" as const,
  };

  const LABEL = {
    display:      "block" as const,
    fontSize:     11,
    color:        "rgba(226,232,240,0.4)",
    marginBottom: 5,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    fontWeight:   700 as const,
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
    }}>
      <div style={{
        background:   "#141626",
        border:       `1px solid ${ACCENT}33`,
        borderRadius: 20,
        padding:      "28px 28px 24px",
        width:        "100%",
        maxWidth:     520,
        maxHeight:    "90vh",
        overflowY:    "auto",
        boxShadow:    `0 0 60px ${ACCENT}20`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <span style={{ fontSize: 22 }}>👥</span>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#E2E8F0" }}>
              {initial ? "Editar empleado" : "Registrar empleado"}
            </h2>
            <p style={{ margin: 0, fontSize: 11, color: `${ACCENT}99` }}>
              TEC Bii · Team Cognition
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Nombre */}
            <div>
              <label style={LABEL}>Nombre completo *</label>
              <input
                style={INPUT}
                placeholder="Ej: Ana García López"
                value={form.nombre}
                onChange={(e) => field("nombre", e.target.value)}
                autoFocus
              />
            </div>

            {/* Puesto + Departamento */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={LABEL}>Puesto</label>
                <select
                  style={{ ...INPUT, cursor: "pointer" }}
                  value={form.puesto}
                  onChange={(e) => field("puesto", e.target.value)}
                >
                  {PUESTOS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={LABEL}>Departamento</label>
                <select
                  style={{ ...INPUT, cursor: "pointer" }}
                  value={form.departamento}
                  onChange={(e) => field("departamento", e.target.value)}
                >
                  {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {/* Tarifa + Salario */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={LABEL}>Tarifa/hora (MXN)</label>
                <input
                  style={INPUT}
                  type="number" min="0" step="50"
                  placeholder="Ej: 250"
                  value={form.tarifaHora || ""}
                  onChange={(e) => field("tarifaHora", Number(e.target.value))}
                />
              </div>
              <div>
                <label style={LABEL}>Salario mensual (MXN)</label>
                <input
                  style={INPUT}
                  type="number" min="0" step="500"
                  placeholder="Ej: 18000"
                  value={form.salarioMensual || ""}
                  onChange={(e) => field("salarioMensual", Number(e.target.value))}
                />
              </div>
            </div>

            {/* Carga actual */}
            <div>
              <label style={LABEL}>
                Carga actual — {Math.round(form.cargaActual * 100)}%
                <span style={{ color: cargaColor(form.cargaActual), marginLeft: 8, fontWeight: 700 }}>
                  {cargaLabel(form.cargaActual)}
                </span>
              </label>
              <input
                type="range" min="0" max="1" step="0.05"
                value={form.cargaActual}
                onChange={(e) => field("cargaActual", Number(e.target.value))}
                style={{ width: "100%", accentColor: cargaColor(form.cargaActual) }}
              />
            </div>

            {/* Momentum */}
            <div>
              <label style={LABEL}>
                Momentum — {Math.round(form.momentum * 100)}%
              </label>
              <input
                type="range" min="0" max="1" step="0.05"
                value={form.momentum}
                onChange={(e) => field("momentum", Number(e.target.value))}
                style={{ width: "100%", accentColor: ACCENT }}
              />
            </div>

            {/* Activo */}
            <label style={{
              display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
              padding: "10px 12px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
            }}>
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => field("activo", e.target.checked)}
                style={{ accentColor: ACCENT }}
              />
              <span style={{ fontSize: 13, color: "#E2E8F0" }}>Empleado activo</span>
            </label>

          </div>

          {error && (
            <p style={{ margin: "14px 0 0", fontSize: 12, color: "#EF4444" }}>⚠ {error}</p>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <button
              type="button" onClick={onClose}
              style={{
                flex: 1, padding: "10px", borderRadius: 12, fontSize: 13, fontWeight: 600,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(226,232,240,0.5)", cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={saving}
              style={{
                flex: 2, padding: "10px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                background: saving ? `${ACCENT}40` : `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
                border: "none", color: saving ? `${ACCENT}60` : "#fff",
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: saving ? "none" : `0 0 20px ${ACCENT}40`,
              }}
            >
              {saving ? "Guardando…" : initial ? "Guardar cambios" : "✓ Registrar empleado"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function EquipoPage() {
  const { user }                        = useAuth();
  const [empleados, setEmpleados]       = useState<EmpleadoV2[]>([]);
  const [showModal, setShowModal]       = useState(false);
  const [editing, setEditing]           = useState<EmpleadoV2 | null>(null);
  const [search, setSearch]             = useState("");
  const [filterActivo, setFilterActivo] = useState<"todos" | "activos" | "inactivos">("activos");

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    return subscribeEmpleadosV2(uid, setEmpleados);
  }, [user?.uid]);

  // ── Helpers ──
  const uid = user?.uid ?? "";

  const handleCreate = async (form: FormState) => {
    await createEmpleadoV2(uid, {
      ...EMPTY_FOOTPRINT,
      ...form,
      proyectosTotales: 0,
      horasHombreTotal: 0,
    });
  };

  const handleEdit = async (form: FormState) => {
    if (!editing?.id) return;
    await updateEmpleadoV2(uid, editing.id, form);
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este empleado del sistema?")) return;
    await deleteEmpleadoV2(uid, id);
  };

  // ── Filtros ──
  const filtered = empleados
    .filter((e) => {
      if (filterActivo === "activos"   && !e.activo) return false;
      if (filterActivo === "inactivos" &&  e.activo) return false;
      if (search) {
        const q = search.toLowerCase();
        return e.nombre.toLowerCase().includes(q) ||
               e.puesto.toLowerCase().includes(q) ||
               e.departamento.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => (b.cargaActual ?? 0) - (a.cargaActual ?? 0));

  // ── KPIs ──
  const activos   = empleados.filter((e) => e.activo).length;
  const saturados = empleados.filter((e) => (e.cargaActual ?? 0) >= 0.85).length;
  const enGrafo   = empleados.filter((e) => !!e.nexoNodeId).length;
  const cargaAvg  = activos > 0
    ? empleados.filter((e) => e.activo).reduce((s, e) => s + (e.cargaActual ?? 0), 0) / activos
    : 0;

  return (
    <>
      <PageGuard section="empleados" />
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <div>
              <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#E2E8F0" }}>
                👥 Equipo
              </h1>
              <p style={{ margin: 0, fontSize: 12, color: `${ACCENT}B0`, fontWeight: 600 }}>
                TEC Bii · Team Cognition · RUMBO A TIER 4
              </p>
            </div>
            <button
              onClick={() => { setEditing(null); setShowModal(true); }}
              style={{
                background:   `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
                border:       "none", borderRadius: 12,
                padding:      "10px 22px", fontSize: 13, fontWeight: 700,
                color:        "#fff", cursor: "pointer",
                boxShadow:    `0 0 20px ${ACCENT}40`,
              }}
            >
              + Registrar empleado
            </button>
          </div>
        </div>

        {/* ── KPIs ───────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          {[
            { label: "Activos",         value: activos,                  color: "#10B981"   },
            { label: "En grafo NEXO",   value: enGrafo,                  color: "#6366F1"   },
            { label: "Saturados",       value: saturados,                 color: "#EF4444"   },
            { label: "Carga promedio",  value: `${Math.round(cargaAvg * 100)}%`, color: cargaColor(cargaAvg) },
          ].map((k) => (
            <div key={k.label} style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14, padding: "14px 18px", flex: "1 1 110px",
            }}>
              <p style={{ margin: "0 0 3px", fontSize: 9, color: "rgba(226,232,240,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{k.label}</p>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* ── Filtros ────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <input
            placeholder="Buscar por nombre, puesto o depto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1, minWidth: 200,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, padding: "9px 14px",
              fontSize: 13, color: "#E2E8F0", outline: "none",
            }}
          />
          {(["todos", "activos", "inactivos"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterActivo(f)}
              style={{
                padding:    "9px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                background: filterActivo === f ? `${ACCENT}20` : "rgba(255,255,255,0.03)",
                border:     filterActivo === f ? `1px solid ${ACCENT}44` : "1px solid rgba(255,255,255,0.07)",
                color:      filterActivo === f ? ACCENT : "rgba(226,232,240,0.45)",
                cursor:     "pointer",
                textTransform: "capitalize",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* ── Lista ──────────────────────────────────────────────────────── */}
        {empleados.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "64px 24px",
            background: `${ACCENT}08`,
            border: `1px solid ${ACCENT}18`, borderRadius: 20,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: `linear-gradient(135deg, ${ACCENT}30, ${ACCENT2}15)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, margin: "0 auto 20px",
              boxShadow: `0 0 30px ${ACCENT}20`,
            }}>
              👥
            </div>
            <h2 style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 800, color: "#E2E8F0" }}>
              Sin empleados registrados
            </h2>
            <p style={{ margin: "0 0 24px", fontSize: 13, color: "rgba(226,232,240,0.35)", maxWidth: 380, lineHeight: 1.6 }}>
              Registra al equipo de producción y SOFIAA generará perfiles cognitivos automáticamente con análisis de carga y skills.
            </p>
            <button
              onClick={() => setShowModal(true)}
              style={{
                background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
                border: "none", borderRadius: 12, padding: "11px 28px",
                fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer",
                boxShadow: `0 0 24px ${ACCENT}40`,
              }}
            >
              + Registrar primer empleado
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "40px 24px",
            color: "rgba(226,232,240,0.3)", fontSize: 13,
          }}>
            Sin resultados para "{search}"
          </div>
        ) : (
          <>
            <p style={{
              margin: "0 0 14px", fontSize: 10, fontWeight: 700,
              color: "rgba(226,232,240,0.3)", textTransform: "uppercase", letterSpacing: "0.1em",
            }}>
              {filtered.length} empleado{filtered.length !== 1 ? "s" : ""} · ordenados por carga ↓
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
              {filtered.map((e) => (
                <EmpleadoCard
                  key={e.id}
                  emp={e}
                  onEdit={(emp) => { setEditing(emp); setShowModal(true); }}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </>
        )}

        {/* ── Modal ──────────────────────────────────────────────────────── */}
        {showModal && (
          <EmpleadoModal
            initial={editing ?? undefined}
            onClose={() => { setShowModal(false); setEditing(null); }}
            onSave={editing ? handleEdit : handleCreate}
          />
        )}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <p style={{ marginTop: 32, textAlign: "center", fontSize: 11, color: "rgba(226,232,240,0.15)" }}>
          TEC Bii v2 · Team Cognition · T2-5 · RUMBO A TIER 4
        </p>
      </div>
    </>
  );
}
