"use client";

import { useState, useEffect } from "react";
import { useAuth }             from "@/contexts/AuthContext";
import PageGuard               from "@/components/tec-bi/PageGuard";
import {
  subscribeEvaluacionesV2,
  subscribeProyectosV2,
  createEvaluacionV2,
  deleteEvaluacionV2,
} from "@/lib/tec-bii/firestore";
import { EMPTY_FOOTPRINT }     from "@/extensions/tec-bii/schema";
import type {
  EvaluacionV2,
  ProyectoV2,
  TipoEvaluacion,
  CumplimientoTiempo,
} from "@/extensions/tec-bii/schema";

const ACCENT  = "#EC4899";
const ACCENT2 = "#DB2777";

const TIPOS_EVALUACION: TipoEvaluacion[]     = ["Interno", "Externo"];
const TIPOS_CUMPLIMIENTO: CumplimientoTiempo[] = ["A tiempo", "Tarde", "Temprano"];

type FormState = {
  proyectoId:         string;
  tipo:               TipoEvaluacion;
  // Métricas 1-5
  calidadGeneral:     number;
  creatividad:        number;
  ejecucionTecnica:   number;
  alineacionBrief:    number;
  // Datos generales
  valorProyecto:      number;
  unidadesProducidas: number;
  cumplimientoTiempo: CumplimientoTiempo;
  numeroDVersiones:   number;
  feedback:           string;
  fecha:              string;
  // Interno
  horasNormales:      number;
  horasExtra:         number;
  // Externo
  costoCotizado:      number;
  costoFinal:         number;
};

const EMPTY_FORM: FormState = {
  proyectoId:         "",
  tipo:               "Interno",
  calidadGeneral:     4,
  creatividad:        4,
  ejecucionTecnica:   4,
  alineacionBrief:    4,
  valorProyecto:      0,
  unidadesProducidas: 1,
  cumplimientoTiempo: "A tiempo",
  numeroDVersiones:   1,
  feedback:           "",
  fecha:              new Date().toISOString().split("T")[0],
  horasNormales:      0,
  horasExtra:         0,
  costoCotizado:      0,
  costoFinal:         0,
};

function cumplimientoBadge(c: CumplimientoTiempo) {
  const map: Record<CumplimientoTiempo, { color: string; bg: string }> = {
    "A tiempo": { color: "#10B981", bg: "rgba(16,185,129,0.15)" },
    Tarde:      { color: "#EF4444", bg: "rgba(239,68,68,0.15)"  },
    Temprano:   { color: "#6366F1", bg: "rgba(99,102,241,0.15)" },
  };
  const { color, bg } = map[c];
  return <span style={{ fontSize: 9, fontWeight: 700, color, background: bg, border: `1px solid ${color}30`, borderRadius: 99, padding: "1px 7px" }}>{c}</span>;
}

function promedioMetricas(e: EvaluacionV2): number {
  const m = e.metricas;
  return (m.calidadGeneral + m.creatividad + m.ejecucionTecnica + m.alineacionBrief) / 4;
}

function scoreColor(s: number): string {
  if (s >= 4.5) return "#10B981";
  if (s >= 3.5) return "#F59E0B";
  if (s >= 2.5) return ACCENT;
  return "#EF4444";
}

function EvaluacionCard({ e, onDelete }: { e: EvaluacionV2; onDelete: (id: string) => void }) {
  const [hover, setHover] = useState(false);
  const [menu,  setMenu]  = useState(false);
  const prom = promedioMetricas(e);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setMenu(false); }}
      style={{
        background:   hover ? "rgba(236,72,153,0.04)" : "rgba(255,255,255,0.02)",
        border:       `1px solid ${hover ? ACCENT + "33" : "rgba(255,255,255,0.06)"}`,
        borderLeft:   `3px solid ${scoreColor(prom)}`,
        borderRadius: 14,
        padding:      "16px 18px",
        transition:   "all 0.2s",
        position:     "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${ACCENT}30, ${ACCENT2}20)`, border: `1px solid ${ACCENT}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: ACCENT, fontWeight: 800 }}>
          ⭐
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0" }}>Proyecto: {e.proyectoId.slice(0, 8)}…</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: e.tipo === "Interno" ? "#06B6D4" : "#A78BFA", background: e.tipo === "Interno" ? "rgba(6,182,212,0.1)" : "rgba(167,139,250,0.1)", border: `1px solid ${e.tipo === "Interno" ? "#06B6D4" : "#A78BFA"}30`, borderRadius: 99, padding: "1px 7px" }}>{e.tipo}</span>
            {cumplimientoBadge(e.cumplimientoTiempo)}
          </div>
          <p style={{ margin: 0, fontSize: 11, color: "rgba(226,232,240,0.45)" }}>
            {new Date(e.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div style={{ position: "relative" }}>
          <button onClick={(e) => { e.stopPropagation(); setMenu(!menu); }} style={{ background: "transparent", border: "none", color: "rgba(226,232,240,0.3)", cursor: "pointer", padding: "4px 6px", fontSize: 16 }}>···</button>
          {menu && (
            <div style={{ position: "absolute", right: 0, top: "100%", zIndex: 50, background: "#1E2035", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden", minWidth: 130, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
              <button onClick={() => { setMenu(false); onDelete(e.id!); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "transparent", border: "none", color: "#EF4444", fontSize: 12, cursor: "pointer" }}>🗑 Eliminar</button>
            </div>
          )}
        </div>
      </div>

      {/* Score breakdown */}
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[
          { label: "Calidad",   v: e.metricas.calidadGeneral },
          { label: "Creatividad", v: e.metricas.creatividad },
          { label: "Ejecución",  v: e.metricas.ejecucionTecnica },
          { label: "Alineación", v: e.metricas.alineacionBrief },
        ].map(({ label, v }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "rgba(226,232,240,0.35)" }}>{label}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: scoreColor(v) }}>{v}/5</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 10 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor(prom) }}>{prom.toFixed(1)}</span>
        <div>
          <p style={{ margin: 0, fontSize: 9, color: "rgba(226,232,240,0.3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Promedio</p>
          {e.valorProyecto > 0 && <p style={{ margin: 0, fontSize: 10, color: "rgba(226,232,240,0.4)" }}>${e.valorProyecto.toLocaleString("es-MX")} MXN</p>}
        </div>
        {e.feedback && (
          <p style={{ margin: 0, fontSize: 11, color: "rgba(226,232,240,0.4)", lineHeight: 1.5, flex: 1, fontStyle: "italic" }}>
            &quot;{e.feedback.slice(0, 80)}{e.feedback.length > 80 ? "…" : ""}&quot;
          </p>
        )}
      </div>
    </div>
  );
}

function MetricaSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const color = scoreColor(value);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "rgba(226,232,240,0.4)", textTransform: "uppercase" as const, letterSpacing: "0.06em", fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{value}/5</span>
      </div>
      <input type="range" min={1} max={5} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: color }} />
    </div>
  );
}

function EvaluacionModal({ onClose, onSave, proyectos }: { onClose: () => void; onSave: (d: FormState) => Promise<void>; proyectos: ProyectoV2[] }) {
  const [form, setForm]     = useState<FormState>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const f = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.proyectoId.trim()) return setError("El ID del proyecto es requerido");
    setSaving(true); setError(null);
    try { await onSave(form); onClose(); }
    catch { setError("No se pudo guardar. Intenta de nuevo."); }
    finally { setSaving(false); }
  };

  const INPUT = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 12px", fontSize: 13, color: "#E2E8F0", width: "100%", outline: "none", boxSizing: "border-box" as const };
  const LABEL = { display: "block" as const, fontSize: 11, color: "rgba(226,232,240,0.4)", marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: "0.06em", fontWeight: 700 as const };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ background: "#141626", border: `1px solid ${ACCENT}33`, borderRadius: 20, padding: "28px 28px 24px", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: `0 0 60px ${ACCENT}20` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <span style={{ fontSize: 22 }}>⭐</span>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#E2E8F0" }}>Nueva evaluación</h2>
            <p style={{ margin: 0, fontSize: 11, color: `${ACCENT}99` }}>TEC Bii · Evaluaciones</p>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={LABEL}>Proyecto *</label>
                <select style={{ ...INPUT, cursor: "pointer" }} value={form.proyectoId} onChange={(e) => f("proyectoId", e.target.value)} autoFocus>
                  <option value="">— Selecciona un proyecto —</option>
                  {proyectos.map((p) => (
                    <option key={p.id} value={p.id}>{p.titulo} ({p.estado})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={LABEL}>Fecha</label>
                <input style={INPUT} type="date" value={form.fecha} onChange={(e) => f("fecha", e.target.value)} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={LABEL}>Tipo</label>
                <select style={{ ...INPUT, cursor: "pointer" }} value={form.tipo} onChange={(e) => f("tipo", e.target.value as TipoEvaluacion)}>
                  {TIPOS_EVALUACION.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={LABEL}>Cumplimiento</label>
                <select style={{ ...INPUT, cursor: "pointer" }} value={form.cumplimientoTiempo} onChange={(e) => f("cumplimientoTiempo", e.target.value as CumplimientoTiempo)}>
                  {TIPOS_CUMPLIMIENTO.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px" }}>
              <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 700, color: "rgba(226,232,240,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Métricas cualitativas</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <MetricaSlider label="Calidad general"    value={form.calidadGeneral}   onChange={(v) => f("calidadGeneral",   v)} />
                <MetricaSlider label="Creatividad"        value={form.creatividad}       onChange={(v) => f("creatividad",      v)} />
                <MetricaSlider label="Ejecución técnica"  value={form.ejecucionTecnica} onChange={(v) => f("ejecucionTecnica", v)} />
                <MetricaSlider label="Alineación al brief" value={form.alineacionBrief} onChange={(v) => f("alineacionBrief",  v)} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={LABEL}>Valor (MXN)</label>
                <input style={INPUT} type="number" min="0" placeholder="0" value={form.valorProyecto || ""} onChange={(e) => f("valorProyecto", Number(e.target.value))} />
              </div>
              <div>
                <label style={LABEL}>Unidades</label>
                <input style={INPUT} type="number" min="1" value={form.unidadesProducidas} onChange={(e) => f("unidadesProducidas", Number(e.target.value))} />
              </div>
              <div>
                <label style={LABEL}># Versiones</label>
                <input style={INPUT} type="number" min="1" value={form.numeroDVersiones} onChange={(e) => f("numeroDVersiones", Number(e.target.value))} />
              </div>
            </div>

            {form.tipo === "Interno" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={LABEL}>Horas normales</label>
                  <input style={INPUT} type="number" min="0" value={form.horasNormales || ""} onChange={(e) => f("horasNormales", Number(e.target.value))} />
                </div>
                <div>
                  <label style={LABEL}>Horas extra</label>
                  <input style={INPUT} type="number" min="0" value={form.horasExtra || ""} onChange={(e) => f("horasExtra", Number(e.target.value))} />
                </div>
              </div>
            )}

            {form.tipo === "Externo" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={LABEL}>Costo cotizado (MXN)</label>
                  <input style={INPUT} type="number" min="0" value={form.costoCotizado || ""} onChange={(e) => f("costoCotizado", Number(e.target.value))} />
                </div>
                <div>
                  <label style={LABEL}>Costo final (MXN)</label>
                  <input style={INPUT} type="number" min="0" value={form.costoFinal || ""} onChange={(e) => f("costoFinal", Number(e.target.value))} />
                </div>
              </div>
            )}

            <div>
              <label style={LABEL}>Feedback</label>
              <textarea
                style={{ ...INPUT, minHeight: 72, resize: "vertical" as const, fontFamily: "inherit" }}
                placeholder="Observaciones, comentarios del cliente, puntos de mejora…"
                value={form.feedback}
                onChange={(e) => f("feedback", e.target.value)}
              />
            </div>
          </div>
          {error && <p style={{ margin: "14px 0 0", fontSize: 12, color: "#EF4444" }}>⚠ {error}</p>}
          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 12, fontSize: 13, fontWeight: 600, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(226,232,240,0.5)", cursor: "pointer" }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: "10px", borderRadius: 12, fontSize: 13, fontWeight: 700, background: saving ? `${ACCENT}40` : `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, border: "none", color: saving ? `${ACCENT}60` : "#fff", cursor: saving ? "not-allowed" : "pointer", boxShadow: saving ? "none" : `0 0 20px ${ACCENT}40` }}>
              {saving ? "Guardando…" : "✓ Registrar evaluación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EvaluacionesPage() {
  const { user }                    = useAuth();
  const [evals, setEvals]           = useState<EvaluacionV2[]>([]);
  const [proyectos, setProyectos]   = useState<ProyectoV2[]>([]);
  const [showModal, setShowModal]   = useState(false);
  const [filterTipo, setFilterTipo] = useState<"todos" | "Interno" | "Externo">("todos");

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    const u1 = subscribeEvaluacionesV2(uid, setEvals);
    const u2 = subscribeProyectosV2(uid, setProyectos);
    return () => { u1(); u2(); };
  }, [user?.uid]);

  const uid = user?.uid ?? "";

  const handleCreate = async (form: FormState) => {
    await createEvaluacionV2(uid, {
      ...EMPTY_FOOTPRINT,
      proyectoId:         form.proyectoId,
      tipo:               form.tipo,
      metricas: {
        calidadGeneral:   form.calidadGeneral,
        creatividad:      form.creatividad,
        ejecucionTecnica: form.ejecucionTecnica,
        alineacionBrief:  form.alineacionBrief,
      },
      valorProyecto:      form.valorProyecto,
      unidadesProducidas: form.unidadesProducidas,
      cumplimientoTiempo: form.cumplimientoTiempo,
      numeroDVersiones:   form.numeroDVersiones,
      feedback:           form.feedback,
      fecha:              new Date(form.fecha).getTime(),
      ...(form.tipo === "Interno" && form.horasNormales > 0 ? {
        datosInternos: { horasNormales: form.horasNormales, horasExtra: form.horasExtra },
      } : {}),
      ...(form.tipo === "Externo" && form.costoCotizado > 0 ? {
        datosExternos: {
          costoCotizado:                form.costoCotizado,
          costoFinal:                   form.costoFinal,
          horasEsfuerzoEstimadas:       0,
          calificacionComunicacion:     form.calidadGeneral,
          calificacionCalidadPrecio:    form.creatividad,
        },
      } : {}),
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta evaluación?")) return;
    await deleteEvaluacionV2(uid, id);
  };

  const filtered = evals.filter((e) => filterTipo === "todos" || e.tipo === filterTipo);

  const promedioGeneral = evals.length > 0
    ? evals.reduce((s, e) => s + promedioMetricas(e), 0) / evals.length
    : 0;
  const aTiempo = evals.filter((e) => e.cumplimientoTiempo === "A tiempo").length;
  const internos = evals.filter((e) => e.tipo === "Interno").length;

  return (
    <>
      <PageGuard section="evaluaciones" />
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <div>
              <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#E2E8F0" }}>⭐ Evaluaciones</h1>
              <p style={{ margin: 0, fontSize: 12, color: `${ACCENT}B0`, fontWeight: 600 }}>TEC Bii · Análisis de Calidad</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, border: "none", borderRadius: 12, padding: "10px 22px", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: `0 0 20px ${ACCENT}40` }}
            >+ Nueva evaluación</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          {[
            { label: "Total",       value: evals.length,                      color: "#E2E8F0" },
            { label: "Prom. calidad", value: promedioGeneral > 0 ? promedioGeneral.toFixed(1) : "—", color: scoreColor(promedioGeneral) },
            { label: "A tiempo",    value: aTiempo,                           color: "#10B981" },
            { label: "Internos",    value: internos,                          color: "#06B6D4" },
          ].map((k) => (
            <div key={k.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 18px", flex: "1 1 110px" }}>
              <p style={{ margin: "0 0 3px", fontSize: 9, color: "rgba(226,232,240,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{k.label}</p>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {(["todos", "Interno", "Externo"] as const).map((f) => (
            <button key={f} onClick={() => setFilterTipo(f)} style={{ padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600, background: filterTipo === f ? `${ACCENT}20` : "rgba(255,255,255,0.03)", border: filterTipo === f ? `1px solid ${ACCENT}44` : "1px solid rgba(255,255,255,0.07)", color: filterTipo === f ? ACCENT : "rgba(226,232,240,0.45)", cursor: "pointer", textTransform: "capitalize" }}>{f}</button>
          ))}
        </div>

        {evals.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 24px", background: `${ACCENT}08`, border: `1px solid ${ACCENT}18`, borderRadius: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${ACCENT}30, ${ACCENT2}15)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 20px", boxShadow: `0 0 30px ${ACCENT}20` }}>⭐</div>
            <h2 style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 800, color: "#E2E8F0" }}>Sin evaluaciones registradas</h2>
            <p style={{ margin: "0 0 24px", fontSize: 13, color: "rgba(226,232,240,0.35)", maxWidth: 380, lineHeight: 1.6 }}>
              Registra evaluaciones de proyectos y SOFIAA generará análisis cognitivos de calidad y tendencias del equipo.
            </p>
            <button onClick={() => setShowModal(true)} style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, border: "none", borderRadius: 12, padding: "11px 28px", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: `0 0 24px ${ACCENT}40` }}>+ Primera evaluación</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 24px", color: "rgba(226,232,240,0.3)", fontSize: 13 }}>Sin evaluaciones de tipo &quot;{filterTipo}&quot;</div>
        ) : (
          <>
            <p style={{ margin: "0 0 14px", fontSize: 10, fontWeight: 700, color: "rgba(226,232,240,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {filtered.length} evaluación{filtered.length !== 1 ? "es" : ""}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
              {filtered.map((e) => (
                <EvaluacionCard key={e.id} e={e} onDelete={handleDelete} />
              ))}
            </div>
          </>
        )}

        {showModal && (
          <EvaluacionModal onClose={() => setShowModal(false)} onSave={handleCreate} proyectos={proyectos} />
        )}

        <p style={{ marginTop: 32, textAlign: "center", fontSize: 11, color: "rgba(226,232,240,0.15)" }}>TEC Bii v2 · Evaluaciones · RUMBO A TIER 4</p>
      </div>
    </>
  );
}
