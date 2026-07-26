"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

// ── Paleta ────────────────────────────────────────────────────────────────────
const AMBER   = "#D97706";
const AMBER2  = "#B45309";
const AMBER_L = "#FCD34D";
const CARD    = "#1a1205";
const CARD2   = "#120e03";
const BORDER  = "#2a1f08";
const TEXT    = "#fef3c7";
const MUTED   = "#78716c";
const GREEN   = "#4ade80";
const RED     = "#f87171";

// ── Constantes ────────────────────────────────────────────────────────────────
const REPORT_TYPES = [
  { id: "weekly_summary",       label: "Resumen Semanal",      icon: "📅" },
  { id: "executive_brief",      label: "Brief Ejecutivo",      icon: "🎯" },
  { id: "campaign_performance", label: "Reporte de Campaña",  icon: "🔥" },
  { id: "quality_report",       label: "Reporte de Calidad",  icon: "⚡" },
  { id: "project_status",       label: "Estado de Proyectos", icon: "🧠" },
  { id: "strategic_outlook",    label: "Outlook Estratégico", icon: "🔮" },
];

const ENGINES = [
  { id: "oraculo",  label: "ORÁCULO",  color: "#7c3aed" },
  { id: "prometeo", label: "PROMETEO", color: "#f97316" },
  { id: "tec_bii",  label: "TEC Bii",  color: "#06b6d4" },
  { id: "atena",    label: "ATENA",    color: "#a855f7" },
  { id: "nexo",     label: "NEXO",     color: "#10b981" },
];

const ENGINES_BY_TYPE: Record<string, string[]> = {
  weekly_summary:       ["oraculo", "prometeo", "tec_bii", "atena"],
  campaign_performance: ["prometeo"],
  project_status:       ["tec_bii"],
  quality_report:       ["atena"],
  executive_brief:      ["oraculo", "nexo", "tec_bii", "prometeo"],
  strategic_outlook:    ["oraculo", "nexo"],
};

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ApoloTemplate {
  id:           string;
  name:         string;
  type:         string;
  engines:      string[];
  customBranding?: {
    primaryColor?: string;
    clientName?:   string;
    footerText?:   string;
  };
  createdAt:    number;
}

interface FormState {
  name:        string;
  type:        string;
  engines:     string[];
  clientName:  string;
  footerText:  string;
}

const emptyForm = (): FormState => ({
  name:       "",
  type:       "weekly_summary",
  engines:    [...ENGINES_BY_TYPE.weekly_summary],
  clientName: "",
  footerText: "",
});

// ── Componente principal ───────────────────────────────────────────────────────
export default function ApoloPlantillasPage() {
  const router = useRouter();
  const [templates, setTemplates]   = useState<ApoloTemplate[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  // Modal crear
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]             = useState<FormState>(emptyForm());
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);

  // Modal editar
  const [editTarget, setEditTarget] = useState<ApoloTemplate | null>(null);
  const [editForm, setEditForm]     = useState<FormState>(emptyForm());
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError]   = useState<string | null>(null);

  // Confirmar borrar
  const [deleteTarget, setDeleteTarget] = useState<ApoloTemplate | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // Generar desde plantilla
  const [generating, setGenerating] = useState<string | null>(null);
  const [genError, setGenError]     = useState<string | null>(null);

  // ── Token ────────────────────────────────────────────────────────────────
  async function getToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
  }

  // ── Cargar plantillas ────────────────────────────────────────────────────
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) { setLoading(false); return; }
      const res  = await fetch("/api/apolo/templates", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al cargar");
      const json = await res.json();
      setTemplates(json.templates ?? []);
    } catch {
      setError("No se pudieron cargar las plantillas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  // ── Crear ────────────────────────────────────────────────────────────────
  async function handleCreate() {
    setSaving(true);
    setSaveError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/apolo/templates", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          name:    form.name,
          type:    form.type,
          engines: form.engines,
          customBranding: {
            clientName: form.clientName || undefined,
            footerText: form.footerText || undefined,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error al crear");
      }
      await loadTemplates();
      setShowCreate(false);
      setForm(emptyForm());
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  // ── Editar ────────────────────────────────────────────────────────────────
  function openEdit(t: ApoloTemplate) {
    setEditTarget(t);
    setEditForm({
      name:       t.name,
      type:       t.type,
      engines:    [...t.engines],
      clientName: t.customBranding?.clientName ?? "",
      footerText: t.customBranding?.footerText ?? "",
    });
    setEditError(null);
  }

  async function handleEdit() {
    if (!editTarget) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/apolo/templates/${editTarget.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          name:    editForm.name,
          type:    editForm.type,
          engines: editForm.engines,
          customBranding: {
            clientName: editForm.clientName || undefined,
            footerText: editForm.footerText || undefined,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error al guardar");
      }
      await loadTemplates();
      setEditTarget(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEditSaving(false);
    }
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const token = await getToken();
      if (!token) return;
      await fetch(`/api/apolo/templates/${deleteTarget.id}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadTemplates();
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  // ── Generar reporte desde plantilla ──────────────────────────────────────
  async function handleGenerate(t: ApoloTemplate) {
    setGenerating(t.id);
    setGenError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/apolo/reports", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          type:       t.type,
          clientName: t.customBranding?.clientName,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error al generar");
      }
      const { report } = await res.json();
      router.push(`/apolo/reportes/${report.id}`);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div style={{ padding: "28px 24px", maxWidth: 860, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <a href="/apolo" style={{ fontSize: 12, color: AMBER, textDecoration: "none" }}>
          ← Centro Solar
        </a>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <div>
            <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: TEXT }}>
              Plantillas
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: MUTED }}>
              {loading ? "Cargando…" : `${templates.length} plantilla${templates.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={() => { setShowCreate(true); setForm(emptyForm()); setSaveError(null); }}
            style={{
              padding: "9px 18px", borderRadius: 9, cursor: "pointer",
              background: `linear-gradient(135deg, ${AMBER}, ${AMBER2})`,
              border: "none", color: "#0c0802", fontWeight: 700, fontSize: 12,
            }}
          >
            + Nueva plantilla
          </button>
        </div>
      </div>

      {/* Error generación */}
      {genError && (
        <div style={{ marginBottom: 16, padding: "8px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", fontSize: 12, color: RED }}>
          ⚠ {genError}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: "center" as const, padding: 48, color: MUTED, fontSize: 13 }}>
          ⏳ Cargando plantillas…
        </div>
      ) : error ? (
        <div style={{ textAlign: "center" as const, padding: 48, color: RED, fontSize: 13 }}>⚠ {error}</div>
      ) : templates.length === 0 ? (
        <EmptyState onNew={() => { setShowCreate(true); setForm(emptyForm()); setSaveError(null); }} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {templates.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              generating={generating === t.id}
              onGenerate={() => handleGenerate(t)}
              onEdit={() => openEdit(t)}
              onDelete={() => setDeleteTarget(t)}
              disabled={generating !== null}
            />
          ))}
        </div>
      )}

      {/* Modal Crear */}
      {showCreate && (
        <TemplateModal
          title="Nueva plantilla"
          form={form}
          onChange={setForm}
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
          saving={saving}
          error={saveError}
        />
      )}

      {/* Modal Editar */}
      {editTarget && (
        <TemplateModal
          title="Editar plantilla"
          form={editForm}
          onChange={setEditForm}
          onSave={handleEdit}
          onClose={() => setEditTarget(null)}
          saving={editSaving}
          error={editError}
        />
      )}

      {/* Confirm Borrar */}
      {deleteTarget && (
        <div style={OVERLAY}>
          <div style={{ ...MODAL_BOX, maxWidth: 380 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: TEXT }}>
              Eliminar plantilla
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
              ¿Eliminar <strong style={{ color: TEXT }}>{deleteTarget.name}</strong>? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteTarget(null)} style={CANCEL_BTN}>Cancelar</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ ...SAVE_BTN, background: "#ef4444", color: "#fff" }}
              >
                {deleting ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TemplateCard ───────────────────────────────────────────────────────────────
function TemplateCard({
  template, generating, onGenerate, onEdit, onDelete, disabled,
}: {
  template: ApoloTemplate;
  generating: boolean;
  onGenerate: () => void;
  onEdit:     () => void;
  onDelete:   () => void;
  disabled:   boolean;
}) {
  const rt   = REPORT_TYPES.find(r => r.id === template.type);
  const date = new Date(template.createdAt).toLocaleDateString("es-MX", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 13,
      padding: "16px 18px", display: "flex", flexDirection: "column" as const, gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
          background: `${AMBER}18`, border: `1px solid ${AMBER}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}>
          {rt?.icon ?? "📋"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, lineHeight: 1.3, marginBottom: 2 }}>
            {template.name}
          </div>
          <div style={{ fontSize: 11, color: MUTED }}>
            {rt?.label ?? template.type} · {date}
          </div>
        </div>
      </div>

      {/* Engines */}
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5 }}>
        {template.engines.map(e => {
          const eng = ENGINES.find(en => en.id === e);
          return (
            <span key={e} style={{
              fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 99,
              background: `${eng?.color ?? AMBER}18`, border: `1px solid ${eng?.color ?? AMBER}40`,
              color: eng?.color ?? AMBER, letterSpacing: "0.3px",
            }}>
              {eng?.label ?? e}
            </span>
          );
        })}
      </div>

      {/* Branding info */}
      {(template.customBranding?.clientName || template.customBranding?.footerText) && (
        <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.4 }}>
          {template.customBranding.clientName && <div>Cliente: {template.customBranding.clientName}</div>}
          {template.customBranding.footerText  && <div>Pie: {template.customBranding.footerText}</div>}
        </div>
      )}

      {/* Acciones */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onGenerate}
          disabled={disabled}
          style={{
            flex: 1, padding: "8px 0", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
            background: generating ? `${AMBER}30` : `linear-gradient(135deg, ${AMBER}, ${AMBER2})`,
            border: "none", color: generating ? AMBER_L : "#0c0802",
            fontWeight: 700, fontSize: 11, opacity: disabled && !generating ? 0.5 : 1,
          }}
        >
          {generating ? "⏳ Generando…" : "☀️ Usar plantilla"}
        </button>
        <button
          onClick={onEdit}
          style={{
            padding: "8px 12px", borderRadius: 8, cursor: "pointer",
            background: "transparent", border: `1px solid ${BORDER}`,
            color: MUTED, fontSize: 12,
          }}
        >
          ✏
        </button>
        <button
          onClick={onDelete}
          style={{
            padding: "8px 12px", borderRadius: 8, cursor: "pointer",
            background: "transparent", border: `1px solid ${BORDER}`,
            color: MUTED, fontSize: 12,
          }}
        >
          🗑
        </button>
      </div>
    </div>
  );
}

// ── TemplateModal ──────────────────────────────────────────────────────────────
function TemplateModal({
  title, form, onChange, onSave, onClose, saving, error,
}: {
  title:    string;
  form:     FormState;
  onChange: (f: FormState) => void;
  onSave:   () => void;
  onClose:  () => void;
  saving:   boolean;
  error:    string | null;
}) {
  function toggleEngine(id: string) {
    const next = form.engines.includes(id)
      ? form.engines.filter(e => e !== id)
      : [...form.engines, id];
    onChange({ ...form, engines: next });
  }

  function handleTypeChange(type: string) {
    onChange({ ...form, type, engines: [...(ENGINES_BY_TYPE[type] ?? [])] });
  }

  return (
    <div style={OVERLAY}>
      <div style={{ ...MODAL_BOX, maxWidth: 480 }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: TEXT }}>
          {title}
        </h3>

        {/* Nombre */}
        <label style={LABEL}>Nombre de la plantilla</label>
        <input
          value={form.name}
          onChange={e => onChange({ ...form, name: e.target.value })}
          placeholder="Ej: Resumen semanal Acme"
          style={INPUT}
        />

        {/* Tipo de reporte */}
        <label style={{ ...LABEL, marginTop: 14 }}>Tipo de reporte</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 14 }}>
          {REPORT_TYPES.map(rt => (
            <button
              key={rt.id}
              onClick={() => handleTypeChange(rt.id)}
              style={{
                padding: "8px 10px", borderRadius: 8, cursor: "pointer", textAlign: "left" as const,
                background: form.type === rt.id ? `${AMBER}20` : CARD2,
                border: `1px solid ${form.type === rt.id ? AMBER + "60" : BORDER}`,
                color: form.type === rt.id ? AMBER_L : MUTED,
                fontSize: 11, fontWeight: form.type === rt.id ? 700 : 400,
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <span>{rt.icon}</span><span>{rt.label}</span>
            </button>
          ))}
        </div>

        {/* Engines */}
        <label style={LABEL}>Engines a incluir</label>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" as const, marginBottom: 14 }}>
          {ENGINES.map(eng => {
            const active = form.engines.includes(eng.id);
            return (
              <button
                key={eng.id}
                onClick={() => toggleEngine(eng.id)}
                style={{
                  padding: "6px 11px", borderRadius: 99, cursor: "pointer",
                  background: active ? `${eng.color}20` : CARD2,
                  border: `1px solid ${active ? eng.color + "60" : BORDER}`,
                  color: active ? eng.color : MUTED,
                  fontSize: 11, fontWeight: active ? 700 : 400,
                }}
              >
                {eng.label}
              </button>
            );
          })}
        </div>

        {/* Branding */}
        <label style={LABEL}>Nombre del cliente (opcional)</label>
        <input
          value={form.clientName}
          onChange={e => onChange({ ...form, clientName: e.target.value })}
          placeholder="Ej: Acme Corp"
          style={{ ...INPUT, marginBottom: 10 }}
        />
        <label style={LABEL}>Pie de página (opcional)</label>
        <input
          value={form.footerText}
          onChange={e => onChange({ ...form, footerText: e.target.value })}
          placeholder="Ej: Confidencial — uso interno"
          style={INPUT}
        />

        {error && (
          <div style={{ marginTop: 12, padding: "7px 12px", borderRadius: 7, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", fontSize: 12, color: RED }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={CANCEL_BTN}>Cancelar</button>
          <button
            onClick={onSave}
            disabled={saving || !form.name.trim() || form.engines.length === 0}
            style={{
              ...SAVE_BTN,
              opacity: saving || !form.name.trim() || form.engines.length === 0 ? 0.6 : 1,
            }}
          >
            {saving ? "Guardando…" : "Guardar plantilla"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────────
function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div style={{
      textAlign: "center" as const, padding: "56px 24px",
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14,
    }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🎨</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: AMBER_L, marginBottom: 8 }}>
        Sin plantillas aún
      </div>
      <p style={{ margin: "0 0 20px", fontSize: 12, color: MUTED, maxWidth: 340, marginInline: "auto" }}>
        Crea una plantilla para reutilizar configuraciones de reporte con un solo click.
      </p>
      <button
        onClick={onNew}
        style={{
          padding: "10px 22px", borderRadius: 9, cursor: "pointer",
          background: `linear-gradient(135deg, ${AMBER}, ${AMBER2})`,
          border: "none", color: "#0c0802", fontWeight: 700, fontSize: 12,
        }}
      >
        + Crear primera plantilla
      </button>
    </div>
  );
}

// ── Estilos compartidos ────────────────────────────────────────────────────────
const OVERLAY: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 999,
  background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: "20px",
};

const MODAL_BOX: React.CSSProperties = {
  background: "#1a1205", border: "1px solid #2a1f08",
  borderRadius: 16, padding: "24px",
  width: "100%", maxHeight: "90vh", overflowY: "auto",
};

const LABEL: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700,
  color: "#78716c", letterSpacing: "0.6px", marginBottom: 6,
};

const INPUT: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  background: "#120e03", border: "1px solid #2a1f08",
  color: "#fef3c7", fontSize: 13, outline: "none",
  boxSizing: "border-box" as const,
};

const CANCEL_BTN: React.CSSProperties = {
  padding: "9px 18px", borderRadius: 8, cursor: "pointer",
  background: "transparent", border: "1px solid #2a1f08",
  color: "#78716c", fontSize: 12,
};

const SAVE_BTN: React.CSSProperties = {
  padding: "9px 20px", borderRadius: 8, cursor: "pointer",
  background: `linear-gradient(135deg, #D97706, #B45309)`,
  border: "none", color: "#0c0802",
  fontWeight: 700, fontSize: 12,
};

