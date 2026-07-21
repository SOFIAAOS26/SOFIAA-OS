"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { subscribeClientes } from "@/lib/marketing/firestore";
import { getAuth } from "firebase/auth";
import {
  subscribeBrandDNA, saveBrandDNA, getBrandDNAByCliente,
} from "@/lib/prometeo/firestore";
import type { SmmCliente } from "@/lib/marketing/types";
import type { BrandDNA, ArquetipoDeMarca } from "@/extensions/prometeo/schema";

// ── Fire palette ──────────────────────────────────────────────────────────────
const FIRE   = "#f97316";
const CARD   = "#14141f";
const BORDER = "#1e1e2e";
const BG     = "#09090f";
const TEXT   = "#e2e8f0";
const MUTED  = "#64748b";
const GREEN  = "#22c55e";

const ARQUETIPOS: ArquetipoDeMarca[] = [
  "El Héroe", "El Sabio", "El Creador", "El Rebelde", "El Mago",
  "El Inocente", "El Explorador", "El Gobernante", "El Cuidador",
  "El Amante", "El Bromista", "El Hombre Corriente",
];

const ARQUETIPO_DESC: Record<ArquetipoDeMarca, string> = {
  "El Héroe":          "Determinado, valiente, supera obstáculos",
  "El Sabio":          "Experto, analítico, busca la verdad",
  "El Creador":        "Innovador, artístico, visionario",
  "El Rebelde":        "Disruptivo, auténtico, rompe reglas",
  "El Mago":           "Transformador, carismático, hace lo imposible",
  "El Inocente":       "Optimista, honesto, puro",
  "El Explorador":     "Aventurero, independiente, curioso",
  "El Gobernante":     "Líder, responsable, ordenado",
  "El Cuidador":       "Empático, protector, servicial",
  "El Amante":         "Apasionado, sensorial, íntimo",
  "El Bromista":       "Divertido, irreverente, espontáneo",
  "El Hombre Corriente": "Cercano, humilde, confiable",
};

// ── Helpers UI ────────────────────────────────────────────────────────────────
const field: React.CSSProperties = {
  width: "100%", background: BG, border: `1.5px solid ${BORDER}`,
  borderRadius: 8, padding: "8px 12px", fontSize: 13, color: TEXT,
  outline: "none", boxSizing: "border-box",
};
const label: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: "0.5px",
  marginBottom: 4, display: "block",
};
const sectionTitle = (icon: string, title: string) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, marginTop: 4 }}>
    <span style={{ fontSize: 18 }}>{icon}</span>
    <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{title}</span>
  </div>
);

// ── Tag input ─────────────────────────────────────────────────────────────────
function TagInput({
  values, onChange, placeholder, color = FIRE,
}: { values: string[]; onChange: (v: string[]) => void; placeholder: string; color?: string }) {
  const [input, setInput] = useState("");

  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
        {values.map((v) => (
          <span key={v} style={{
            background: `${color}22`, color, fontSize: 11, fontWeight: 600,
            padding: "3px 10px", borderRadius: 99, display: "flex", alignItems: "center", gap: 5,
          }}>
            {v}
            <button onClick={() => onChange(values.filter((x) => x !== v))}
              style={{ background: "none", border: "none", color, cursor: "pointer", fontSize: 12, lineHeight: 1 }}>
              ×
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          style={{ ...field, flex: 1 }}
        />
        <button onClick={add} style={{
          background: `${color}22`, color, border: `1px solid ${color}44`,
          borderRadius: 8, padding: "0 14px", fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}>+</button>
      </div>
    </div>
  );
}

// ── Valores por defecto ───────────────────────────────────────────────────────
const EMPTY_DNA = (): Omit<BrandDNA, "id" | "createdAt" | "updatedAt"> => ({
  clienteId:           "",
  clienteNombre:       "",
  personalidad:        [],
  lenguaje:            "",
  nivelTecnico:        3,
  valores:             [],
  tabus:               [],
  tono:                "",
  cultura:             "",
  promesas:            [],
  arquetipo:           "El Héroe",
  marcasInspiradoras:  [],
  marcasNoCopiar:      [],
  ejemploMensajeOK:    "",
  ejemploMensajeMAL:   "",
});

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BrandDnaPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [clientes,     setClientes]     = useState<SmmCliente[]>([]);
  const [allDNA,       setAllDNA]       = useState<BrandDNA[]>([]);
  const [selectedCid,  setSelectedCid]  = useState<string>("");
  const [existingId,   setExistingId]   = useState<string | undefined>();
  const [form,         setForm]         = useState(EMPTY_DNA());
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [publishing,   setPublishing]   = useState(false);
  const [published,    setPublished]    = useState(false);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    const u1 = subscribeClientes(activeWorkspaceId, setClientes);
    const u2 = subscribeBrandDNA(activeWorkspaceId, setAllDNA);
    return () => { u1(); u2(); };
  }, [activeWorkspaceId]);

  // Cuando cambia el cliente seleccionado, carga su DNA si existe
  const handleSelectCliente = async (clienteId: string) => {
    setSelectedCid(clienteId);
    setSaved(false);
    setPublished(false);
    const cliente = clientes.find((c) => c.id === clienteId);
    if (!cliente) return;

    const existing = allDNA.find((d) => d.clienteId === clienteId);
    if (existing) {
      const { id, createdAt, updatedAt, ...rest } = existing;
      setForm(rest as Omit<BrandDNA, "id" | "createdAt" | "updatedAt">);
      setExistingId(id);
    } else {
      setForm({ ...EMPTY_DNA(), clienteId, clienteNombre: cliente.nombre });
      setExistingId(undefined);
    }
  };

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!activeWorkspaceId || !selectedCid) return;
    setSaving(true);
    try {
      const id = await saveBrandDNA(activeWorkspaceId, form, existingId);
      if (!existingId) setExistingId(id);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!activeWorkspaceId || !existingId) return;
    setPublishing(true);
    try {
      const user  = getAuth().currentUser;
      const token = user ? await user.getIdToken() : "";
      await fetch("/api/prometeo/publish-brand-dna", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workspaceId: activeWorkspaceId, brandDnaId: existingId }),
      });
      setPublished(true);
      setTimeout(() => setPublished(false), 4000);
    } finally {
      setPublishing(false);
    }
  };

  const nivelLabels: Record<number, string> = {
    1: "Muy básico", 2: "Básico", 3: "Intermedio", 4: "Avanzado", 5: "Experto",
  };

  return (
    <div style={{ padding: "28px 24px", maxWidth: 880, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 22 }}>🧬</span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: TEXT, margin: 0 }}>Brand DNA</h1>
          <span style={{
            background: `${FIRE}22`, color: FIRE, fontSize: 9, fontWeight: 700,
            padding: "2px 8px", borderRadius: 99, letterSpacing: "1px",
          }}>P-1</span>
        </div>
        <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
          Identidad completa de marca — arquetipo, tono, valores, tabús y promesas
        </p>
      </div>

      {/* Selector cliente */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
        <label style={label}>SELECCIONAR CLIENTE</label>
        <select
          value={selectedCid}
          onChange={(e) => handleSelectCliente(e.target.value)}
          style={{ ...field, cursor: "pointer" }}
        >
          <option value="">— Elige un cliente —</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} {allDNA.find((d) => d.clienteId === c.id) ? "✓" : ""}
            </option>
          ))}
        </select>
        {selectedCid && (
          <p style={{ fontSize: 11, color: existingId ? GREEN : FIRE, margin: "6px 0 0", fontWeight: 600 }}>
            {existingId ? "✓ Brand DNA existente — editando" : "✦ Nuevo Brand DNA — completa el perfil"}
          </p>
        )}
      </div>

      {!selectedCid ? (
        <div style={{
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14,
          padding: "48px 24px", textAlign: "center", color: MUTED, fontSize: 13,
        }}>
          Selecciona un cliente para definir o editar su Brand DNA
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── Arquetipo ─────────────────────────────────────────── */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px" }}>
            {sectionTitle("🏺", "Arquetipo de Marca")}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 8 }}>
              {ARQUETIPOS.map((a) => (
                <button
                  key={a}
                  onClick={() => set("arquetipo", a)}
                  style={{
                    background: form.arquetipo === a ? `${FIRE}25` : BG,
                    border: `1.5px solid ${form.arquetipo === a ? FIRE : BORDER}`,
                    borderRadius: 10, padding: "10px 12px", cursor: "pointer",
                    textAlign: "left", color: form.arquetipo === a ? FIRE : TEXT,
                  }}
                >
                  <p style={{ fontSize: 12, fontWeight: 700, margin: "0 0 2px" }}>{a}</p>
                  <p style={{ fontSize: 10, color: MUTED, margin: 0, lineHeight: 1.3 }}>
                    {ARQUETIPO_DESC[a]}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* ── Personalidad + Lenguaje ───────────────────────────── */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px" }}>
            {sectionTitle("🗣️", "Personalidad y Lenguaje")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={label}>RASGOS DE PERSONALIDAD</label>
                <TagInput
                  values={form.personalidad}
                  onChange={(v) => set("personalidad", v)}
                  placeholder="Ej: Empático, Directo…"
                />
              </div>
              <div>
                <label style={label}>TONO DE COMUNICACIÓN</label>
                <input
                  value={form.tono}
                  onChange={(e) => set("tono", e.target.value)}
                  placeholder="Ej: Cálido, motivador, con humor sutil"
                  style={field}
                />
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={label}>DESCRIPCIÓN DEL LENGUAJE</label>
              <input
                value={form.lenguaje}
                onChange={(e) => set("lenguaje", e.target.value)}
                placeholder="Ej: Profesional pero cercano, sin tecnicismos"
                style={field}
              />
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={label}>NIVEL TÉCNICO DEL LENGUAJE — {nivelLabels[form.nivelTecnico]}</label>
              <input
                type="range" min={1} max={5}
                value={form.nivelTecnico}
                onChange={(e) => set("nivelTecnico", Number(e.target.value) as 1|2|3|4|5)}
                style={{ width: "100%", accentColor: FIRE }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: MUTED, marginTop: 2 }}>
                <span>Muy básico</span><span>Intermedio</span><span>Experto</span>
              </div>
            </div>
          </div>

          {/* ── Valores + Cultura ─────────────────────────────────── */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px" }}>
            {sectionTitle("💎", "Valores y Cultura")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={label}>VALORES DE MARCA</label>
                <TagInput
                  values={form.valores}
                  onChange={(v) => set("valores", v)}
                  placeholder="Ej: Calidad, Transparencia…"
                  color="#60a5fa"
                />
              </div>
              <div>
                <label style={label}>PROMESAS DE MARCA</label>
                <TagInput
                  values={form.promesas}
                  onChange={(v) => set("promesas", v)}
                  placeholder="Ej: Entrega en 24h…"
                  color="#22c55e"
                />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={label}>CULTURA / CONTEXTO DE LA EMPRESA</label>
              <textarea
                value={form.cultura}
                onChange={(e) => set("cultura", e.target.value)}
                placeholder="Ej: Empresa familiar mexicana de manufactura industrial, 20 años en el mercado"
                rows={2}
                style={{ ...field, resize: "vertical" }}
              />
            </div>
          </div>

          {/* ── Tabús + Referentes ────────────────────────────────── */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px" }}>
            {sectionTitle("🚫", "Tabús y Referentes")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={label}>TABÚS — TEMAS / PALABRAS PROHIBIDAS</label>
                <TagInput
                  values={form.tabus}
                  onChange={(v) => set("tabus", v)}
                  placeholder="Ej: Precio barato, Descuento…"
                  color="#ef4444"
                />
              </div>
              <div>
                <label style={label}>MARCAS INSPIRADORAS</label>
                <TagInput
                  values={form.marcasInspiradoras}
                  onChange={(v) => set("marcasInspiradoras", v)}
                  placeholder="Ej: Apple, Patagonia…"
                  color={FIRE}
                />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={label}>MARCAS A NO COPIAR</label>
              <TagInput
                values={form.marcasNoCopiar}
                onChange={(v) => set("marcasNoCopiar", v)}
                placeholder="Ej: Competidor directo X…"
                color={MUTED}
              />
            </div>
          </div>

          {/* ── Ejemplos de voz ───────────────────────────────────── */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px" }}>
            {sectionTitle("✍️", "Ejemplos de Voz de Marca")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ ...label, color: "#22c55e" }}>✅ EJEMPLO DE MENSAJE APROBADO</label>
                <textarea
                  value={form.ejemploMensajeOK}
                  onChange={(e) => set("ejemploMensajeOK", e.target.value)}
                  placeholder="Escribe un ejemplo de copy que SÍ representa la marca…"
                  rows={4}
                  style={{ ...field, borderColor: "#22c55e44", resize: "vertical" }}
                />
              </div>
              <div>
                <label style={{ ...label, color: "#ef4444" }}>❌ EJEMPLO DE MENSAJE RECHAZADO</label>
                <textarea
                  value={form.ejemploMensajeMAL}
                  onChange={(e) => set("ejemploMensajeMAL", e.target.value)}
                  placeholder="Escribe un ejemplo de copy que NO representa la marca…"
                  rows={4}
                  style={{ ...field, borderColor: "#ef444444", resize: "vertical" }}
                />
              </div>
            </div>
          </div>

          {/* ── Acciones ──────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={handleSave}
              disabled={saving || !selectedCid}
              style={{
                background: `linear-gradient(135deg, ${FIRE}, #ea580c)`,
                color: "#fff", border: "none", borderRadius: 10,
                padding: "11px 28px", fontSize: 14, fontWeight: 700,
                cursor: "pointer", opacity: saving ? 0.7 : 1,
                boxShadow: `0 0 16px ${FIRE}44`,
              }}
            >
              {saving ? "Guardando…" : saved ? "✓ Guardado" : existingId ? "Actualizar Brand DNA" : "Guardar Brand DNA"}
            </button>

            {existingId && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                style={{
                  background: publishing ? "#1e1e2e" : "#0f1929",
                  color: publishing ? MUTED : "#60a5fa",
                  border: "1.5px solid #60a5fa44",
                  borderRadius: 10, padding: "11px 24px",
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}
              >
                {publishing ? "Publicando…" : published ? "✓ Publicado en N.E.X.O." : "🔗 Publicar en N.E.X.O."}
              </button>
            )}
          </div>

          {/* ── Vista previa del DNA ──────────────────────────────── */}
          {existingId && (
            <div style={{
              background: `${FIRE}08`, border: `1px solid ${FIRE}30`,
              borderRadius: 14, padding: "16px 20px",
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: FIRE, margin: "0 0 8px", letterSpacing: "0.5px" }}>
                🔬 RESUMEN BRAND DNA — {form.clienteNombre}
              </p>
              <p style={{ fontSize: 12, color: TEXT, margin: 0, lineHeight: 1.7 }}>
                <strong>Arquetipo:</strong> {form.arquetipo} ·{" "}
                <strong>Tono:</strong> {form.tono || "—"} ·{" "}
                <strong>Nivel:</strong> {nivelLabels[form.nivelTecnico]}
                {form.valores.length > 0 && <> · <strong>Valores:</strong> {form.valores.join(", ")}</>}
                {form.tabus.length > 0 && <> · <strong>Tabús:</strong> {form.tabus.join(", ")}</>}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
