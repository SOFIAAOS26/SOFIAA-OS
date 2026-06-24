"use client";
// TEC BI v1.1 — Brief Canvas: wizard de 4 pasos + Brief Score

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrief } from "@/lib/firestore/briefs";
import { subscribeClientes } from "@/lib/firestore/clientes";
import type { TipoProyecto, EstadoBrief, BriefAssets, ClienteInterno } from "@/extensions/tec-bi/schema";
import PageGuard from "@/components/tec-bi/PageGuard";
import Toast, { useToast } from "@/components/tec-bi/Toast";
import { useMondaySync } from "@/hooks/useMondaySync";
import { useEffect } from "react";

const ACCENT = "#0EA5E9";
const GREEN  = "#34C759";
const RED    = "#FF3B30";
const AMBER  = "#FF9F0A";

const TIPOS: TipoProyecto[] = [
  "Spot Publicitario","Cápsula Educativa","Diseño Gráfico",
  "Evento en Vivo","Fotografía","Motion Graphics",
  "Podcast / Audio","Reel / Short","Otro",
];

const PLATAFORMAS = [
  "Pantallas campus","YouTube","Instagram","TikTok",
  "LinkedIn","Correo institucional","Evento presencial","Otro",
];

const today = () => new Date().toISOString().split("T")[0];

const EMPTY_ASSETS: BriefAssets = {
  logoVectorial: false, guionTexto: false, fotosRef: false,
  locacionConfirmada: false, talentConfirmado: false, editableFile: false,
};

const ASSET_LABELS: Record<keyof BriefAssets, string> = {
  logoVectorial:      "Logo vectorial (.ai / .eps / .svg)",
  guionTexto:         "Guión o texto aprobado",
  fotosRef:           "Fotos / imágenes de referencia",
  locacionConfirmada: "Locación confirmada",
  talentConfirmado:   "Personas / talent confirmados",
  editableFile:       "Editable / archivo fuente",
};

// ── Brief Score ────────────────────────────────────────────────────────────────
function calcScore(f: FormState): { score: number; desglose: { label: string; pts: number; max: number }[] } {
  const d = [
    { label: "Título descriptivo",     pts: f.titulo.trim().length >= 10 ? 10 : 0,                  max: 10 },
    { label: "Área solicitante",       pts: f.clienteId ? 10 : 0,                                   max: 10 },
    { label: "Fecha límite",           pts: f.fechaLimite ? (diasHabiles(f.fechaLimite) >= 3 ? 15 : 8) : 0, max: 15 },
    { label: "Objetivo claro",         pts: f.objetivo.trim().length >= 20 ? 20 : f.objetivo.trim().length >= 5 ? 10 : 0, max: 20 },
    { label: "Audiencia definida",     pts: f.audiencia.trim().length >= 5 ? 10 : 0,                 max: 10 },
    { label: "Plataforma",             pts: f.plataforma ? 5 : 0,                                   max: 5  },
    { label: "Descripción detallada",  pts: f.descripcion.trim().length >= 50 ? 10 : f.descripcion.trim().length >= 20 ? 5 : 0, max: 10 },
    { label: "Assets disponibles",     pts: Math.min(Object.values(f.assets).filter(Boolean).length * 5, 20), max: 20 },
  ];
  return { score: d.reduce((s, x) => s + x.pts, 0), desglose: d };
}

function diasHabiles(fechaStr: string): number {
  if (!fechaStr) return 0;
  const hoy  = new Date(); hoy.setHours(0,0,0,0);
  const fin  = new Date(fechaStr + "T12:00:00");
  let dias = 0, cur = new Date(hoy);
  while (cur < fin) { cur.setDate(cur.getDate() + 1); if (cur.getDay() !== 0 && cur.getDay() !== 6) dias++; }
  return dias;
}

interface FormState {
  clienteId: string; titulo: string; tipoProyecto: TipoProyecto;
  descripcion: string; referencias: string; requisitosTecnicos: string;
  fechaSolicitud: string; fechaLimite: string;
  objetivo: string; audiencia: string; plataforma: string;
  duracionSeg: number; contactoSolicitante: string; emailSolicitante: string;
  assets: BriefAssets;
}

const INITIAL: FormState = {
  clienteId: "", titulo: "", tipoProyecto: "Spot Publicitario",
  descripcion: "", referencias: "", requisitosTecnicos: "",
  fechaSolicitud: today(), fechaLimite: "",
  objetivo: "", audiencia: "", plataforma: "",
  duracionSeg: 0, contactoSolicitante: "", emailSolicitante: "",
  assets: { ...EMPTY_ASSETS },
};

// ── Componentes de UI ─────────────────────────────────────────────────────────
const field: React.CSSProperties = {
  width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10,
  padding: "10px 14px", fontSize: 13, color: "#1D1D1F", outline: "none",
  boxSizing: "border-box", background: "#fff",
};
const lbl: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#6B7280",
  letterSpacing: "0.4px", marginBottom: 6, display: "block",
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <span style={lbl}>{label}{required && <span style={{ color: RED }}> *</span>}</span>
      {children}
    </div>
  );
}

function ScoreMeter({ score }: { score: number }) {
  const color = score >= 80 ? GREEN : score >= 50 ? AMBER : RED;
  const label = score >= 80 ? "COMPLETO ✓" : score >= 50 ? "BÁSICO — puedes enviar" : "INCOMPLETO — añade más info";
  return (
    <div style={{ background: `${color}10`, border: `1.5px solid ${color}30`, borderRadius: 14, padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: "0.4px" }}>{label}</span>
        <span style={{ fontSize: 28, fontWeight: 900, color }}>{score}/100</span>
      </div>
      <div style={{ height: 8, background: "#f0f0f0", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 99, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function BriefCanvasPage() {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const { push: mondayPush } = useMondaySync();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({ ...INITIAL });
  const [clientes, setClientes] = useState<ClienteInterno[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u = subscribeClientes((d) => setClientes(d.filter((c) => c.activo)));
    return () => u();
  }, []);

  const set = (key: keyof FormState, val: unknown) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const setAsset = (key: keyof BriefAssets, val: boolean) =>
    setForm((prev) => ({ ...prev, assets: { ...prev.assets, [key]: val } }));

  const { score, desglose } = calcScore(form);
  const canSubmit = score >= 40;

  const STEPS = ["Identificación", "Contexto", "Assets", "Resumen"];

  // ── Paso 1: Identificación ────────────────────────────────────────────────
  const Step1 = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Field label="Área / Cliente interno" required>
        <select value={form.clienteId} onChange={(e) => set("clienteId", e.target.value)} style={field}>
          <option value="">— Selecciona el área solicitante —</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.departamento}</option>)}
        </select>
      </Field>
      <div className="ext-form-2" style={{ gap: 14 }}>
        <Field label="Nombre del solicitante">
          <input value={form.contactoSolicitante} onChange={(e) => set("contactoSolicitante", e.target.value)}
            placeholder="Ej. Laura Martínez" style={field} />
        </Field>
        <Field label="Email del solicitante">
          <input type="email" value={form.emailSolicitante} onChange={(e) => set("emailSolicitante", e.target.value)}
            placeholder="lmartinez@tec.mx" style={field} />
        </Field>
      </div>
      <Field label="Título del proyecto" required>
        <input value={form.titulo} onChange={(e) => set("titulo", e.target.value)}
          placeholder="Ej. Video institucional Semana i 2025 — Campus MTY" style={field} />
        <span style={{ fontSize: 10, color: "#bbb", marginTop: 4, display: "block" }}>
          Sé específico: área + evento/campaña + fecha. Evita "video para mañana".
        </span>
      </Field>
      <div className="ext-form-2" style={{ gap: 14 }}>
        <Field label="Tipo de proyecto" required>
          <select value={form.tipoProyecto} onChange={(e) => set("tipoProyecto", e.target.value as TipoProyecto)} style={field}>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Fecha límite de entrega" required>
          <input type="date" value={form.fechaLimite} onChange={(e) => set("fechaLimite", e.target.value)} style={field} min={today()} />
          {form.fechaLimite && (
            <span style={{ fontSize: 10, color: diasHabiles(form.fechaLimite) < 3 ? RED : GREEN, marginTop: 4, display: "block" }}>
              {diasHabiles(form.fechaLimite) < 1
                ? "⚠️ Fecha ya pasada o sin margen"
                : diasHabiles(form.fechaLimite) < 3
                  ? `⚠️ Solo ${diasHabiles(form.fechaLimite)} días hábiles — puede afectar la calidad`
                  : `✓ ${diasHabiles(form.fechaLimite)} días hábiles disponibles`}
            </span>
          )}
        </Field>
      </div>
    </div>
  );

  // ── Paso 2: Contexto ──────────────────────────────────────────────────────
  const Step2 = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Field label="Objetivo del proyecto" required>
        <textarea value={form.objetivo}
          onChange={(e) => set("objetivo", e.target.value)}
          placeholder="¿Qué quieres lograr con este contenido? ¿Cuál es el resultado esperado? Sé específico."
          style={{ ...field, minHeight: 90, resize: "vertical" }} />
        <span style={{ fontSize: 10, color: "#bbb", marginTop: 4, display: "block" }}>
          Mínimo 20 caracteres. Ejemplo: &quot;Aumentar inscripciones a Semana i un 15% entre alumnos de 2°-4° semestre.&quot;
        </span>
      </Field>
      <Field label="Audiencia objetivo" required>
        <input value={form.audiencia} onChange={(e) => set("audiencia", e.target.value)}
          placeholder="Ej. Alumnos de preparatoria campus MTY, 15-18 años" style={field} />
      </Field>
      <div className="ext-form-2" style={{ gap: 14 }}>
        <Field label="Plataforma / distribución">
          <select value={form.plataforma} onChange={(e) => set("plataforma", e.target.value)} style={field}>
            <option value="">— Selecciona —</option>
            {PLATAFORMAS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Duración estimada (si es video)">
          <select value={form.duracionSeg} onChange={(e) => set("duracionSeg", Number(e.target.value))} style={field}>
            <option value={0}>No aplica / No definida</option>
            <option value={15}>15 seg (Reel / Story)</option>
            <option value={30}>30 seg (Spot corto)</option>
            <option value={60}>60 seg (1 minuto)</option>
            <option value={90}>90 seg</option>
            <option value={120}>2 minutos</option>
            <option value={180}>3 minutos</option>
            <option value={300}>5 minutos</option>
            <option value={600}>10+ minutos</option>
          </select>
        </Field>
      </div>
      <Field label="Descripción detallada">
        <textarea value={form.descripcion}
          onChange={(e) => set("descripcion", e.target.value)}
          placeholder="Contexto, estilo, tono, referencias visuales, restricciones, mensajes clave…"
          style={{ ...field, minHeight: 100, resize: "vertical" }} />
      </Field>
      <Field label="Referencias (links o descripción)">
        <input value={form.referencias} onChange={(e) => set("referencias", e.target.value)}
          placeholder="https://… o describe el estilo de referencia" style={field} />
      </Field>
    </div>
  );

  // ── Paso 3: Assets ────────────────────────────────────────────────────────
  const Step3 = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 13, color: "#555", margin: "0 0 4px", lineHeight: 1.6 }}>
        Marca los activos que tienes <strong>listos y disponibles hoy</strong> para entregarlos al área de producción.
        Sin estos materiales, la producción no puede iniciar correctamente.
      </p>

      {(Object.keys(ASSET_LABELS) as (keyof BriefAssets)[]).map((key) => {
        const on = form.assets[key];
        return (
          <div key={key}
            onClick={() => setAsset(key, !on)}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 18px", borderRadius: 12, cursor: "pointer",
              border: `1.5px solid ${on ? GREEN : "#E5E7EB"}`,
              background: on ? `${GREEN}08` : "#FAFAFA",
              transition: "all 0.15s",
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              border: `2px solid ${on ? GREEN : "#D1D5DB"}`,
              background: on ? GREEN : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {on && <span style={{ color: "#fff", fontSize: 13, fontWeight: 900 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: on ? "#1D1D1F" : "#6B7280" }}>
                {ASSET_LABELS[key]}
              </div>
              {!on && (
                <div style={{ fontSize: 10, color: "#F59E0B", marginTop: 2 }}>
                  Sin este material, la producción puede retrasarse o generar rondas de cambios
                </div>
              )}
            </div>
          </div>
        );
      })}

      <Field label="Requisitos técnicos adicionales">
        <input value={form.requisitosTecnicos}
          onChange={(e) => set("requisitosTecnicos", e.target.value)}
          placeholder="Ej. Formato 4K, subtítulos en inglés, colores institucionales azul #003087…"
          style={field} />
      </Field>
    </div>
  );

  // ── Paso 4: Resumen ───────────────────────────────────────────────────────
  const Step4 = () => {
    const cliente = clientes.find((c) => c.id === form.clienteId);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <ScoreMeter score={score} />

        {/* Desglose de puntuación */}
        <div style={{ background: "rgba(255,255,255,0.8)", border: "1px solid #E5E7EB", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.4px", marginBottom: 12 }}>
            DESGLOSE DEL BRIEF SCORE
          </div>
          {desglose.map(({ label, pts, max }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f5f5f5" }}>
              <span style={{ fontSize: 12, color: "#555" }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: pts === max ? GREEN : pts > 0 ? AMBER : RED }}>
                {pts}/{max} pts
              </span>
            </div>
          ))}
        </div>

        {/* Resumen del brief */}
        <div style={{ background: "rgba(255,255,255,0.8)", border: "1px solid #E5E7EB", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.4px", marginBottom: 12 }}>
            RESUMEN DEL BRIEF
          </div>
          {[
            { label: "Área", value: cliente?.departamento ?? "—" },
            { label: "Solicitante", value: form.contactoSolicitante || "—" },
            { label: "Proyecto", value: form.titulo || "—" },
            { label: "Tipo", value: form.tipoProyecto },
            { label: "Deadline", value: form.fechaLimite ? `${form.fechaLimite} (${diasHabiles(form.fechaLimite)} días hábiles)` : "—" },
            { label: "Objetivo", value: form.objetivo || "—" },
            { label: "Audiencia", value: form.audiencia || "—" },
            { label: "Plataforma", value: form.plataforma || "—" },
            { label: "Assets listos", value: `${Object.values(form.assets).filter(Boolean).length}/6` },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", gap: 12, padding: "5px 0", borderBottom: "1px solid #f5f5f5" }}>
              <span style={{ fontSize: 11, color: "#9CA3AF", width: 90, flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: 12, color: "#1D1D1F", fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>

        {!canSubmit && (
          <div style={{ background: `${RED}08`, border: `1px solid ${RED}22`, borderRadius: 10, padding: "12px 16px", fontSize: 12, color: RED }}>
            ⚠️ El brief score es {score}/100. Necesitas al menos 40 puntos para enviarlo. Regresa y completa la información faltante.
          </div>
        )}
      </div>
    );
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      const docRef = await createBrief({
        clienteId:           form.clienteId,
        tipoProyecto:        form.tipoProyecto,
        titulo:              form.titulo,
        descripcion:         form.descripcion,
        entregables:         [],
        requisitosTecnicos:  form.requisitosTecnicos,
        referencias:         form.referencias,
        fechaSolicitud:      new Date(form.fechaSolicitud) as unknown as import("@/extensions/tec-bi/schema").Brief["fechaSolicitud"],
        fechaLimite:         new Date(form.fechaLimite + "T12:00:00") as unknown as import("@/extensions/tec-bi/schema").Brief["fechaLimite"],
        estado:              "Recibido" as EstadoBrief,
        objetivo:            form.objetivo,
        audiencia:           form.audiencia,
        plataforma:          form.plataforma,
        duracionSeg:         form.duracionSeg || undefined,
        contactoSolicitante: form.contactoSolicitante,
        emailSolicitante:    form.emailSolicitante,
        assets:              form.assets,
        briefScore:          score,
      } as Parameters<typeof createBrief>[0]);

      // Sync a Monday — fire-and-forget, no bloquea la UI
      void mondayPush({
        type:         "brief",
        docId:        docRef.id,
        titulo:       form.titulo,
        estado:       "Recibido",
        tipoProyecto: form.tipoProyecto,
        fechaLimite:  form.fechaLimite,
      });

      showToast("Brief enviado correctamente ✓", "success");
      setTimeout(() => router.push("/tec-bi/briefs"), 1200);
    } catch {
      showToast("Error al guardar el brief", "error");
      setSaving(false);
    }
  };

  // Llamados como funciones (no como componentes) para evitar unmount en cada render
  const stepContent = [Step1(), Step2(), Step3(), Step4()];

  return (
    <div style={{ maxWidth: 740, margin: "0 auto" }}>
      <PageGuard section="briefs" />
      <Toast toast={toast} />

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <button onClick={() => router.push("/tec-bi/briefs")}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: ACCENT, fontWeight: 600, padding: 0 }}>
            ← Volver a Briefs
          </button>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1D1D1F", margin: "0 0 4px" }}>📋 Brief Canvas</h1>
        <p style={{ fontSize: 12, color: "#888", margin: 0 }}>
          Completa cada sección para generar un brief estructurado y accionable
        </p>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", gap: 0, marginBottom: 28, borderRadius: 12, overflow: "hidden", border: "1px solid #E5E7EB" }}>
        {STEPS.map((s, i) => {
          const active  = i === step;
          const done    = i < step;
          const bg      = active ? ACCENT : done ? `${GREEN}15` : "#F9FAFB";
          const color   = active ? "#fff"  : done ? GREEN : "#9CA3AF";
          return (
            <button key={s} onClick={() => i < step && setStep(i)}
              style={{
                flex: 1, padding: "12px 8px", border: "none", background: bg, color,
                fontSize: 11, fontWeight: 700, cursor: i < step ? "pointer" : "default",
                borderRight: i < 3 ? "1px solid #E5E7EB" : "none", transition: "all 0.15s",
              }}>
              <span style={{ display: "block", fontSize: 14, marginBottom: 2 }}>
                {done ? "✓" : `${i + 1}`}
              </span>
              {s}
            </button>
          );
        })}
      </div>

      {/* Brief Score flotante */}
      <div style={{ marginBottom: 20 }}>
        <ScoreMeter score={score} />
      </div>

      {/* Contenido del paso */}
      <div style={{
        background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)",
        border: "1px solid rgba(14,165,233,0.12)", borderRadius: 16,
        padding: "26px 28px", marginBottom: 20,
      }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#1D1D1F", marginBottom: 20 }}>
          {["🏢 Identificación del Proyecto","🎯 Contexto y Objetivo","📦 Assets disponibles","✅ Resumen y Envío"][step]}
        </div>
        {stepContent[step]}
      </div>

      {/* Navegación */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          style={{
            padding: "11px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
            border: "1.5px solid #E5E7EB", background: "#fff", color: "#374151",
            cursor: step === 0 ? "not-allowed" : "pointer", opacity: step === 0 ? 0.4 : 1,
          }}
        >
          ← Anterior
        </button>

        {step < 3 ? (
          <button
            onClick={() => setStep((s) => Math.min(3, s + 1))}
            style={{
              padding: "11px 28px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: "none", background: ACCENT, color: "#fff", cursor: "pointer",
            }}
          >
            Siguiente →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            style={{
              padding: "11px 28px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: "none", cursor: canSubmit && !saving ? "pointer" : "not-allowed",
              background: canSubmit ? GREEN : "#E5E7EB",
              color: canSubmit ? "#fff" : "#9CA3AF",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Enviando…" : `✓ Enviar Brief (Score: ${score}/100)`}
          </button>
        )}
      </div>
    </div>
  );
}
