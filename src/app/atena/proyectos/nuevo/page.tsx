"use client";

/**
 * ATENA — Nuevo Proyecto (Sprint A-9)
 *
 * Wizard de 3 pasos:
 *   1. Formulario con la idea del proyecto
 *   2. Generación IA (Groq) con animación progresiva
 *   3. Preview del plan generado → guardar en Firestore
 *
 * Metodologías: PMBOK · Lean Six Sigma DMAIC/DMADV · Poka-Yoke · Kaizen
 */

import { useState, useEffect } from "react";
import { useRouter }            from "next/navigation";
import { db, auth }             from "@/lib/firebase";
import { onAuthStateChanged }   from "firebase/auth";
import {
  collection,
  addDoc,
  writeBatch,
  doc,
}                               from "firebase/firestore";
import type {
  ProyectoGenerado,
  FMEAItem,
  Hito,
  RiesgoProyecto,
  KaizenEvent,
} from "@/extensions/atena/schema";
import { atenaPath }            from "@/extensions/atena/schema";

// ── Paleta ────────────────────────────────────────────────────────────────────
const BLUE   = "#60a5fa";
const GREEN  = "#22c55e";
const YELLOW = "#f59e0b";
const RED    = "#ef4444";
const PURPLE = "#a78bfa";
const CYAN   = "#22d3ee";
const TEXT   = "#e2e8f0";
const MUTED  = "#64748b";
const CARD   = "#111118";
const BORDER = "#1e1e2e";
const BG     = "#0a0a0f";

// ── Colores por fase DMAIC ────────────────────────────────────────────────────
const FASE_COLOR: Record<string, string> = {
  DEFINE:  "#60a5fa",
  MEASURE: "#34d399",
  ANALYZE: "#fb923c",
  IMPROVE: "#a78bfa",
  CONTROL: "#818cf8",
  DESIGN:  "#f472b6",
  VERIFY:  "#22d3ee",
};

// ── Tipos para el formulario ──────────────────────────────────────────────────
interface FormData {
  nombre:        string;
  area:          string;
  metodologia:   "DMAIC" | "DMADV";
  problema:      string;
  objetivo:      string;
  duracionMeses: string;
  presupuesto:   string;
  responsable:   string;
}

type Step = "form" | "loading" | "preview";

// ── Mensajes de loading progresivos ──────────────────────────────────────────
const LOADING_MSGS = [
  "Analizando el problema con PMBOK 7a edición…",
  "Estructurando metodología " ,
  "Identificando variables CTQ críticas…",
  "Generando hitos y roadmap de fases…",
  "Construyendo análisis FMEA inicial…",
  "Diseñando poka-yokes específicos…",
  "Calculando eventos Kaizen…",
  "Finalizando plan de proyecto…",
];

// ── Componente principal ──────────────────────────────────────────────────────
export default function NuevoProyectoPage() {
  const router = useRouter();
  const [uid,       setUid]       = useState<string | null>(null);
  const [step,      setStep]      = useState<Step>("form");
  const [loadMsg,   setLoadMsg]   = useState(0);
  const [generated, setGenerated] = useState<ProyectoGenerado | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    nombre:        "",
    area:          "Manufactura",
    metodologia:   "DMAIC",
    problema:      "",
    objetivo:      "",
    duracionMeses: "6",
    presupuesto:   "0",
    responsable:   "",
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUid(u.uid);
    });
    return unsub;
  }, []);

  // Ciclo de mensajes de loading
  useEffect(() => {
    if (step !== "loading") return;
    const id = setInterval(() => {
      setLoadMsg((prev) => (prev + 1) % LOADING_MSGS.length);
    }, 1800);
    return () => clearInterval(id);
  }, [step]);

  // ── Generar proyecto con IA ────────────────────────────────────────────────
  const handleGenerate = async () => {
    setError(null);
    setStep("loading");
    setLoadMsg(0);

    try {
      const res = await fetch("/api/atena/generar-proyecto", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          nombre:        form.nombre,
          area:          form.area,
          metodologia:   form.metodologia,
          problema:      form.problema,
          objetivo:      form.objetivo,
          duracionMeses: parseInt(form.duracionMeses) || 6,
          presupuesto:   parseFloat(form.presupuesto) || 0,
        }),
      });

      const data = await res.json() as { generated?: ProyectoGenerado; error?: string };

      if (!res.ok || data.error) {
        setError(data.error ?? "Error desconocido");
        setStep("form");
        return;
      }

      setGenerated(data.generated ?? null);
      setStep("preview");
    } catch {
      setError("Error de red al conectar con ATENA.");
      setStep("form");
    }
  };

  // ── Guardar en Firestore ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!uid || !generated) return;
    setSaving(true);

    try {
      const now       = Date.now();
      const meses     = parseInt(form.duracionMeses) || 6;
      const fechaFin  = now + meses * 30 * 24 * 60 * 60 * 1000;

      // 1. Crear ProjectCharter
      const charterRef = await addDoc(
        collection(db, atenaPath(uid, "proyectos")),
        {
          nombre:        form.nombre,
          objetivoSMART: generated.charter.objetivoSMART,
          alcance:       generated.charter.alcance,
          limites:       generated.charter.limites,
          metodologia:   form.metodologia,
          faseActual:    "DEFINE",
          avance:        0,
          estado:        "activo",
          involucrados:  form.responsable
            ? [{
                id:              `sh-${now}`,
                nombre:          form.responsable,
                rolLSS:          "BB",
                nivelCompromiso: "LIDER",
              }]
            : [],
          ctq:           generated.charter.ctq,
          area:          form.area,
          fechaInicio:   now,
          fechaLimite:   fechaFin,
          createdAt:     now,
          updatedAt:     now,
        },
      );

      const proyectoId = charterRef.id;

      // 2. Batch: hitos + riesgos + amef + kaizen
      const batch = writeBatch(db);

      generated.hitos.forEach((h) => {
        const r = doc(collection(db, atenaPath(uid, "hitos")));
        batch.set(r, {
          ...h,
          proyectoId,
          completado: false,
          createdAt:  now,
        } satisfies Omit<Hito, "id"> & { createdAt: number });
      });

      generated.riesgos.forEach((r) => {
        const ref = doc(collection(db, atenaPath(uid, "riesgos")));
        batch.set(ref, {
          ...r,
          proyectoId,
          createdAt: now,
        } satisfies Omit<RiesgoProyecto, "id"> & { createdAt: number });
      });

      generated.amefInicial.forEach((a, i) => {
        const ref = doc(collection(db, atenaPath(uid, "amef")));
        const npr = (a.severidad ?? 1) * (a.ocurrencia ?? 1) * (a.deteccion ?? 1);
        batch.set(ref, {
          ...a,
          proyectoId,
          numeracion: i + 1,
          npr,
          estado:     "abierto",
          critico:    npr > 200,
          createdAt:  now,
        } satisfies Omit<FMEAItem, "id"> & { createdAt: number });
      });

      generated.kaizenEvents.forEach((k) => {
        const ref = doc(collection(db, atenaPath(uid, "kaizen")));
        batch.set(ref, {
          ...k,
          proyectoId,
          completado: false,
          createdAt:  now,
        } satisfies Omit<KaizenEvent, "id"> & { createdAt: number });
      });

      await batch.commit();

      router.push("/atena/proyectos");
    } catch (e) {
      console.error(e);
      setError("Error al guardar el proyecto. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  // ── Campo de formulario helper ────────────────────────────────────────────
  const Field = ({
    label, name, type = "text", placeholder, required, as,
    options,
  }: {
    label:        string;
    name:         keyof FormData;
    type?:        string;
    placeholder?: string;
    required?:    boolean;
    as?:          "textarea" | "select";
    options?:     { value: string; label: string }[];
  }) => {
    const inputStyle: React.CSSProperties = {
      width: "100%", background: BG, border: `1px solid ${BORDER}`,
      borderRadius: 8, padding: "9px 12px", color: TEXT,
      fontSize: 13, outline: "none", boxSizing: "border-box",
      fontFamily: "inherit",
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: "0.5px" }}>
          {label}{required && <span style={{ color: RED }}> *</span>}
        </label>
        {as === "textarea" ? (
          <textarea
            rows={3}
            value={form[name]}
            onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
            placeholder={placeholder}
            style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
          />
        ) : as === "select" ? (
          <select
            value={form[name]}
            onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
            style={{ ...inputStyle }}
          >
            {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input
            type={type}
            value={form[name]}
            onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
            placeholder={placeholder}
            style={inputStyle}
          />
        )}
      </div>
    );
  };

  // ── NPR color ─────────────────────────────────────────────────────────────
  const nprColor = (npr: number) =>
    npr > 200 ? RED : npr > 100 ? YELLOW : GREEN;

  // ── Risk nivel color ──────────────────────────────────────────────────────
  const nivelColor = (n: string) =>
    n === "ALTA" ? RED : n === "MEDIA" ? YELLOW : GREEN;

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{
        borderBottom: `1px solid ${BORDER}`, padding: "18px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: TEXT }}>
            ✨ Nuevo Proyecto DMAIC
          </h1>
          <p style={{ fontSize: 11, color: MUTED, margin: "2px 0 0", fontFamily: "monospace" }}>
            ATENA · PMBOK + Lean Six Sigma + Poka-Yoke + Kaizen
          </p>
        </div>
        <button
          onClick={() => router.push("/atena/proyectos")}
          style={{
            background: "transparent", border: `1px solid ${BORDER}`,
            borderRadius: 8, padding: "7px 14px", color: MUTED,
            fontSize: 12, cursor: "pointer",
          }}
        >
          ← Volver
        </button>
      </div>

      {/* ── Step indicators ── */}
      <div style={{
        display: "flex", gap: 0, borderBottom: `1px solid ${BORDER}`,
        padding: "0 28px",
      }}>
        {[
          { id: "form",    num: 1, label: "Descripción del proyecto" },
          { id: "loading", num: 2, label: "Generando con IA" },
          { id: "preview", num: 3, label: "Revisar y guardar" },
        ].map((s, i) => {
          const active  = s.id === step;
          const done    = (step === "preview" && i < 2) || (step === "loading" && i < 1);
          return (
            <div key={s.id} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 0", marginRight: 32,
              borderBottom: active ? `2px solid ${BLUE}` : "2px solid transparent",
              opacity: (!active && !done) ? 0.4 : 1,
              transition: "all 0.2s",
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%",
                background: done ? GREEN : active ? BLUE : BORDER,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0,
              }}>
                {done ? "✓" : s.num}
              </div>
              <span style={{ fontSize: 12, fontWeight: active ? 700 : 400, color: active ? TEXT : MUTED }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* ════════════════════════ STEP 1: Formulario ════════════════════════ */}
      {step === "form" && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>

          {error && (
            <div style={{
              background: `${RED}10`, border: `1px solid ${RED}33`,
              borderRadius: 10, padding: "12px 16px", marginBottom: 24,
              fontSize: 13, color: RED,
            }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Nombre */}
            <Field
              label="Nombre del proyecto"
              name="nombre"
              placeholder="Ej: Reducción de Scrap en Línea 3"
              required
            />

            {/* Área + Metodología */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field
                label="Área / Proceso"
                name="area"
                as="select"
                options={[
                  { value: "Manufactura",    label: "🏭 Manufactura" },
                  { value: "Calidad",        label: "✅ Calidad" },
                  { value: "Logística",      label: "🚚 Logística" },
                  { value: "Servicios",      label: "🤝 Servicios" },
                  { value: "Administración", label: "📋 Administración" },
                  { value: "IT",             label: "💻 IT / Tecnología" },
                  { value: "Ventas",         label: "📈 Ventas" },
                  { value: "RH",             label: "👥 Recursos Humanos" },
                  { value: "Finanzas",       label: "💰 Finanzas" },
                ]}
              />
              <Field
                label="Metodología"
                name="metodologia"
                as="select"
                options={[
                  { value: "DMAIC", label: "DMAIC — Mejora de proceso existente" },
                  { value: "DMADV", label: "DMADV — Diseño de proceso nuevo" },
                ]}
              />
            </div>

            {/* Problema */}
            <Field
              label="Problema detectado"
              name="problema"
              as="textarea"
              placeholder="Describe el problema con datos: defectos, tiempos, costos, frecuencia…"
              required
            />

            {/* Objetivo */}
            <Field
              label="Objetivo deseado"
              name="objetivo"
              as="textarea"
              placeholder="¿Qué nivel de mejora buscas? ¿En qué plazo? ¿Qué métricas?"
            />

            {/* Duración + Presupuesto + Responsable */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: 16 }}>
              <Field
                label="Duración (meses)"
                name="duracionMeses"
                type="number"
                placeholder="6"
              />
              <Field
                label="Presupuesto (MXN)"
                name="presupuesto"
                type="number"
                placeholder="250000"
              />
              <Field
                label="Black Belt / Responsable"
                name="responsable"
                placeholder="Nombre del líder del proyecto"
              />
            </div>

          </div>

          {/* Botón generar */}
          <div style={{ marginTop: 32, display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleGenerate}
              disabled={!form.nombre.trim() || !form.problema.trim()}
              style={{
                background: (!form.nombre.trim() || !form.problema.trim())
                  ? `${BLUE}40` : BLUE,
                border: "none", borderRadius: 10, padding: "12px 28px",
                color: "#fff", fontSize: 14, fontWeight: 700,
                cursor: (!form.nombre.trim() || !form.problema.trim()) ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              ✨ Generar plan con IA
            </button>
          </div>

        </div>
      )}

      {/* ════════════════════════ STEP 2: Loading ════════════════════════ */}
      {step === "loading" && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: "60vh", gap: 32, padding: "40px 24px",
        }}>
          {/* Spinner */}
          <div style={{ position: "relative", width: 80, height: 80 }}>
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              border: `3px solid ${BORDER}`,
            }} />
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              border: `3px solid transparent`,
              borderTopColor: BLUE,
              animation: "spin 0.9s linear infinite",
            }} />
            <div style={{
              position: "absolute", inset: 10, borderRadius: "50%",
              border: `2px solid transparent`,
              borderTopColor: PURPLE,
              animation: "spin 1.4s linear infinite reverse",
            }} />
            <div style={{
              position: "absolute", inset: "50%", transform: "translate(-50%, -50%)",
              fontSize: 22,
            }}>
              🧠
            </div>
          </div>

          {/* Nombre del proyecto */}
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", marginBottom: 6 }}>
              GENERANDO PLAN
            </p>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: TEXT, margin: 0 }}>
              {form.nombre}
            </h2>
          </div>

          {/* Mensaje progresivo */}
          <div style={{
            background: CARD, border: `1px solid ${BORDER}`,
            borderRadius: 12, padding: "16px 24px",
            maxWidth: 420, width: "100%", textAlign: "center",
          }}>
            <p style={{ fontSize: 13, color: BLUE, margin: 0, fontFamily: "monospace" }}>
              {LOADING_MSGS[loadMsg]}{loadMsg === 1 ? ` ${form.metodologia}…` : ""}
            </p>
          </div>

          {/* Pills de metodología */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {["PMBOK", "Lean Six Sigma", "Poka-Yoke", "Kaizen", "FMEA"].map((m) => (
              <span key={m} style={{
                background: `${BLUE}15`, border: `1px solid ${BLUE}30`,
                borderRadius: 20, padding: "4px 12px",
                fontSize: 11, color: BLUE, fontFamily: "monospace",
              }}>
                {m}
              </span>
            ))}
          </div>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ════════════════════════ STEP 3: Preview ════════════════════════ */}
      {step === "preview" && generated && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}>

          {error && (
            <div style={{
              background: `${RED}10`, border: `1px solid ${RED}33`,
              borderRadius: 10, padding: "12px 16px", marginBottom: 20,
              fontSize: 13, color: RED,
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Barra de acción sticky */}
          <div style={{
            position: "sticky", top: 0, zIndex: 10,
            background: BG, borderBottom: `1px solid ${BORDER}`,
            padding: "12px 0 14px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 24,
          }}>
            <div>
              <p style={{ fontSize: 11, color: GREEN, fontFamily: "monospace", margin: 0 }}>
                ✓ Plan generado — revisa y guarda
              </p>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: TEXT, margin: "2px 0 0" }}>
                {form.nombre}
              </h2>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => { setGenerated(null); setStep("form"); }}
                style={{
                  background: "transparent", border: `1px solid ${BORDER}`,
                  borderRadius: 8, padding: "9px 16px", color: MUTED,
                  fontSize: 12, cursor: "pointer",
                }}
              >
                ↩ Regenerar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !uid}
                style={{
                  background: saving ? `${GREEN}50` : GREEN,
                  border: "none", borderRadius: 8, padding: "9px 20px",
                  color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {saving ? "Guardando…" : "✅ Crear Proyecto"}
              </button>
            </div>
          </div>

          {/* ── Objetivo SMART ── */}
          <Section title="🎯 Objetivo SMART">
            <p style={{ fontSize: 13, color: TEXT, lineHeight: 1.7, margin: 0 }}>
              {generated.charter.objetivoSMART}
            </p>
          </Section>

          {/* ── Alcance y Límites ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <Section title="📐 Alcance" compact>
              <p style={{ fontSize: 12, color: TEXT, lineHeight: 1.6, margin: 0 }}>
                {generated.charter.alcance}
              </p>
            </Section>
            <Section title="🚧 Límites" compact>
              <p style={{ fontSize: 12, color: TEXT, lineHeight: 1.6, margin: 0 }}>
                {generated.charter.limites}
              </p>
            </Section>
          </div>

          {/* ── CTQ Variables ── */}
          {generated.charter.ctq?.length > 0 && (
            <Section title="📊 Variables CTQ — Critical to Quality">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                {generated.charter.ctq.map((c, i) => (
                  <div key={i} style={{
                    background: BG, border: `1px solid ${BORDER}`,
                    borderRadius: 10, padding: "12px 14px",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: CYAN, marginBottom: 6 }}>
                      {c.nombre}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: MUTED }}>
                      <span>Actual: <strong style={{ color: RED }}>{c.valorActual} {c.unidad}</strong></span>
                      <span>→ <strong style={{ color: GREEN }}>{c.valorObjetivo}</strong></span>
                    </div>
                    {(c.lsl != null || c.usl != null) && (
                      <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>
                        LSL {c.lsl} · USL {c.usl}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Hitos por Fase ── */}
          {generated.hitos?.length > 0 && (
            <Section title="🗓️ Roadmap de Hitos">
              {(["DEFINE","MEASURE","ANALYZE","IMPROVE","CONTROL","DESIGN","VERIFY"] as const)
                .filter((f) => generated.hitos.some((h) => h.fase === f))
                .map((fase) => {
                  const faseMilestones = generated.hitos.filter((h) => h.fase === fase);
                  const color = FASE_COLOR[fase] ?? BLUE;
                  return (
                    <div key={fase} style={{ marginBottom: 14 }}>
                      <div style={{
                        fontSize: 10, fontWeight: 800, color, letterSpacing: "1.5px",
                        marginBottom: 6, fontFamily: "monospace",
                        display: "flex", alignItems: "center", gap: 6,
                      }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
                        {fase}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 12 }}>
                        {faseMilestones.map((h, i) => (
                          <div key={i} style={{
                            background: BG, border: `1px solid ${BORDER}`,
                            borderLeft: `3px solid ${color}`,
                            borderRadius: "0 8px 8px 0", padding: "10px 14px",
                            display: "flex", gap: 14, alignItems: "flex-start",
                          }}>
                            <div style={{
                              fontSize: 10, color, fontFamily: "monospace",
                              fontWeight: 700, minWidth: 48, flexShrink: 0,
                            }}>
                              Sem {h.semana}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: TEXT, marginBottom: 2 }}>
                                {h.nombre}
                              </div>
                              <div style={{ fontSize: 11, color: MUTED }}>{h.descripcion}</div>
                              {h.entregable && (
                                <div style={{
                                  fontSize: 10, color: CYAN, marginTop: 4,
                                  display: "flex", alignItems: "center", gap: 4,
                                }}>
                                  📄 {h.entregable}
                                </div>
                              )}
                            </div>
                            <span style={{
                              fontSize: 9, fontWeight: 700, color,
                              background: `${color}15`, padding: "2px 7px", borderRadius: 4,
                              flexShrink: 0,
                            }}>
                              {h.tipo}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </Section>
          )}

          {/* ── Riesgos + Poka-Yokes ── */}
          {generated.riesgos?.length > 0 && (
            <Section title="⚠️ Riesgos e Iniciativas Poka-Yoke">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {generated.riesgos.map((r, i) => (
                  <div key={i} style={{
                    background: BG, border: `1px solid ${BORDER}`,
                    borderLeft: `3px solid ${nivelColor(r.probabilidad)}`,
                    borderRadius: "0 10px 10px 0", padding: "12px 16px",
                  }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: TEXT, flex: 1 }}>
                        {r.descripcion}
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, color: nivelColor(r.probabilidad),
                        background: `${nivelColor(r.probabilidad)}15`, padding: "2px 7px", borderRadius: 4,
                      }}>P: {r.probabilidad}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, color: nivelColor(r.impacto),
                        background: `${nivelColor(r.impacto)}15`, padding: "2px 7px", borderRadius: 4,
                      }}>I: {r.impacto}</span>
                      <span style={{
                        fontSize: 9, color: MUTED,
                        background: `${MUTED}15`, padding: "2px 7px", borderRadius: 4,
                      }}>{r.tipo}</span>
                    </div>
                    <div style={{ fontSize: 11, color: MUTED, marginBottom: r.pokayoke ? 6 : 0 }}>
                      🛡️ {r.mitigacion}
                    </div>
                    {r.pokayoke && (
                      <div style={{
                        fontSize: 11, color: YELLOW,
                        background: `${YELLOW}08`, borderRadius: 6, padding: "6px 10px",
                        display: "flex", gap: 6, alignItems: "flex-start",
                      }}>
                        <span style={{ flexShrink: 0 }}>🔒</span>
                        <span><strong>Poka-Yoke:</strong> {r.pokayoke}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── AMEF Inicial ── */}
          {generated.amefInicial?.length > 0 && (
            <Section title="🔬 AMEF Inicial — Análisis de Modo y Efecto de Falla">
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: BORDER }}>
                      {["Paso", "Modo de Falla", "Efecto", "Causa Raíz", "S", "O", "D", "NPR", "Acción"].map((h) => (
                        <th key={h} style={{
                          padding: "8px 10px", textAlign: "left",
                          color: MUTED, fontWeight: 700, fontSize: 10,
                          letterSpacing: "0.5px", whiteSpace: "nowrap",
                          borderBottom: `1px solid ${BORDER}`,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {generated.amefInicial.map((a, i) => {
                      const npr = (a.severidad ?? 1) * (a.ocurrencia ?? 1) * (a.deteccion ?? 1);
                      return (
                        <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                          <td style={{ padding: "8px 10px", color: TEXT, fontSize: 11 }}>{a.pasoDelProceso}</td>
                          <td style={{ padding: "8px 10px", color: YELLOW, fontWeight: 600 }}>{a.modoDeFalla}</td>
                          <td style={{ padding: "8px 10px", color: MUTED }}>{a.efectoDelFallo}</td>
                          <td style={{ padding: "8px 10px", color: MUTED, maxWidth: 160 }}>{a.causaRaiz}</td>
                          <td style={{ padding: "8px 10px", color: RED, fontWeight: 700, textAlign: "center" }}>{a.severidad}</td>
                          <td style={{ padding: "8px 10px", color: YELLOW, fontWeight: 700, textAlign: "center" }}>{a.ocurrencia}</td>
                          <td style={{ padding: "8px 10px", color: CYAN, fontWeight: 700, textAlign: "center" }}>{a.deteccion}</td>
                          <td style={{ padding: "8px 10px", fontWeight: 800, textAlign: "center", color: nprColor(npr) }}>
                            {npr}
                          </td>
                          <td style={{ padding: "8px 10px", color: MUTED, fontSize: 10 }}>{a.accionCorrectiva}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* ── Kaizen Events ── */}
          {generated.kaizenEvents?.length > 0 && (
            <Section title="⚡ Eventos Kaizen">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                {generated.kaizenEvents.map((k, i) => {
                  const color = FASE_COLOR[k.fase] ?? PURPLE;
                  return (
                    <div key={i} style={{
                      background: BG, border: `1px solid ${BORDER}`,
                      borderTop: `3px solid ${color}`,
                      borderRadius: "0 0 10px 10px", padding: "14px",
                    }}>
                      <div style={{
                        fontSize: 9, fontWeight: 700, color, letterSpacing: "1px",
                        fontFamily: "monospace", marginBottom: 4,
                      }}>
                        {k.fase} · {k.duracionDias} días
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 6 }}>
                        {k.nombre}
                      </div>
                      <div style={{ fontSize: 11, color: MUTED, marginBottom: 8, lineHeight: 1.5 }}>
                        {k.descripcion}
                      </div>
                      <div style={{
                        fontSize: 11, color: GREEN, fontFamily: "monospace",
                        background: `${GREEN}08`, borderRadius: 6, padding: "5px 8px",
                      }}>
                        🎯 {k.metricaObjetivo}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Botón final guardar */}
          <div style={{ marginTop: 32, display: "flex", justifyContent: "center", paddingBottom: 40 }}>
            <button
              onClick={handleSave}
              disabled={saving || !uid}
              style={{
                background: saving ? `${GREEN}50` : GREEN,
                border: "none", borderRadius: 12, padding: "14px 40px",
                color: "#fff", fontSize: 15, fontWeight: 800,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Guardando en Firestore…" : "✅ Crear Proyecto"}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

// ── Helper Section ────────────────────────────────────────────────────────────
function Section({
  title,
  children,
  compact,
}: {
  title:     string;
  children:  React.ReactNode;
  compact?:  boolean;
}) {
  return (
    <div style={{
      background: "#111118", border: "1px solid #1e1e2e",
      borderRadius: 12, padding: compact ? "16px" : "20px",
      marginBottom: 16,
    }}>
      <h3 style={{
        fontSize: 11, fontWeight: 800, color: "#64748b",
        letterSpacing: "1.5px", margin: "0 0 14px",
        textTransform: "uppercase", fontFamily: "monospace",
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}
