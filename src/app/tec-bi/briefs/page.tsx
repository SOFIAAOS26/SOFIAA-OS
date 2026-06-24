"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import TecBiModal, { fieldStyle, labelStyle, SubmitBtn } from "@/components/tec-bi/TecBiModal";
import Toast, { useToast } from "@/components/tec-bi/Toast";
import AdminOnly, { LockButton } from "@/components/tec-bi/AdminOnly";
import { SkeletonTable } from "@/components/tec-bi/Skeleton";
import { subscribeBriefs, createBrief, updateBrief, updateEstadoBrief, calcularMargenDias } from "@/lib/firestore/briefs";
import { subscribeClientes } from "@/lib/firestore/clientes";
import type { Brief, EstadoBrief, TipoProyecto, ClienteInterno } from "@/extensions/tec-bi/schema";

const ACCENT = "#0EA5E9";

const TIPOS_PROYECTO: TipoProyecto[] = [
  "Spot Publicitario", "Cápsula Educativa", "Diseño Gráfico",
  "Evento en Vivo", "Fotografía", "Motion Graphics",
  "Podcast / Audio", "Reel / Short", "Otro",
];

const ESTADOS: EstadoBrief[] = [
  "Recibido", "En revisión", "Aprobado", "En producción", "Entregado", "Cancelado",
];

const ESTADO_STYLE: Record<EstadoBrief, { bg: string; color: string }> = {
  "Recibido":      { bg: "rgba(14,165,233,0.12)",  color: "#0EA5E9" },
  "En revisión":   { bg: "rgba(255,159,10,0.12)",  color: "#FF9F0A" },
  "Aprobado":      { bg: "rgba(0,212,170,0.12)",   color: "#00D4AA" },
  "En producción": { bg: "rgba(123,79,232,0.12)",  color: "#7B4FE8" },
  "Entregado":     { bg: "rgba(52,199,89,0.12)",   color: "#34C759" },
  "Cancelado":     { bg: "rgba(142,142,147,0.12)", color: "#8E8E93" },
};

const today = () => new Date().toISOString().split("T")[0];

const EMPTY_FORM = {
  clienteId: "", titulo: "", tipoProyecto: "Spot Publicitario" as TipoProyecto,
  descripcion: "", requisitos: "", referencias: "",
  fechaSolicitud: today(), fechaLimite: "", estado: "Recibido" as EstadoBrief,
};

function EstadoBadge({ estado }: { estado: EstadoBrief }) {
  const s = ESTADO_STYLE[estado];
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>
      {estado}
    </span>
  );
}

function MargenBadge({ dias }: { dias: number }) {
  const color = dias < 0 ? "#FF3B30" : dias < 5 ? "#FF9F0A" : "#34C759";
  const label = dias < 0 ? `${Math.abs(dias)}d vencido` : dias === 0 ? "Hoy vence" : `${dias}d hábiles`;
  return (
    <span style={{ background: color + "18", color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>
      ⏱ {label}
    </span>
  );
}

export default function BriefsPage() {
  const router = useRouter();
  const [briefs, setBriefs]       = useState<Brief[]>([]);
  const [clientes, setClientes]   = useState<ClienteInterno[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing]     = useState<Brief | null>(null);
  const [selected, setSelected]   = useState<Brief | null>(null);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [entregables, setEntregables] = useState<string[]>([""]);
  const [saving, setSaving]       = useState(false);
  const { toast, showToast }      = useToast();

  useEffect(() => {
    const u1 = subscribeBriefs((data) => { setBriefs(data); setLoading(false); });
    const u2 = subscribeClientes((data) => setClientes(data.filter((c) => c.activo)));
    return () => { u1(); u2(); };
  }, []);

  const filtered = briefs.filter((b) => {
    if (filterEstado !== "Todos" && b.estado !== filterEstado) return false;
    const q = search.toLowerCase();
    return b.titulo.toLowerCase().includes(q) || b.tipoProyecto.toLowerCase().includes(q);
  });

  const clienteNombre = (id: string) =>
    clientes.find((c) => c.id === id)?.departamento ?? id;

  const getMargen = (b: Brief) => {
    try {
      const ini = b.fechaSolicitud instanceof Date ? b.fechaSolicitud : (b.fechaSolicitud as unknown as { toDate(): Date }).toDate?.() ?? new Date(b.fechaSolicitud as unknown as string);
      const fin = b.fechaLimite instanceof Date ? b.fechaLimite : (b.fechaLimite as unknown as { toDate(): Date }).toDate?.() ?? new Date(b.fechaLimite as unknown as string);
      return calcularMargenDias(new Date(), fin);
    } catch { return null; }
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setEntregables([""]);
    setModalOpen(true);
  };

  const openEdit = (b: Brief) => {
    setEditing(b);
    setForm({
      clienteId: b.clienteId, titulo: b.titulo,
      tipoProyecto: b.tipoProyecto, descripcion: b.descripcion ?? "",
      requisitos: b.requisitosTecnicos ?? "", referencias: b.referencias ?? "",
      fechaSolicitud: today(), fechaLimite: "",
      estado: b.estado,
    });
    setEntregables(b.entregables?.length ? b.entregables : [""]);
    setModalOpen(true);
  };

  const openDetail = (b: Brief) => { setSelected(b); setDetailOpen(true); };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault(); setSaving(true);
    const entregablesLimpios = entregables.filter((e) => e.trim() !== "");
    try {
      const payload = {
        clienteId: form.clienteId,
        titulo: form.titulo,
        tipoProyecto: form.tipoProyecto,
        descripcion: form.descripcion,
        entregables: entregablesLimpios,
        requisitosTecnicos: form.requisitos,
        referencias: form.referencias,
        fechaSolicitud: new Date(form.fechaSolicitud),
        fechaLimite: new Date(form.fechaLimite),
        estado: form.estado,
      };
      if (editing?.id) { await updateBrief(editing.id, payload); showToast("Brief actualizado"); }
      else { await createBrief(payload); showToast("Brief creado"); }
      setModalOpen(false);
    } catch (err) { console.error(err); showToast("Error al guardar", "error"); }
    finally { setSaving(false); }
  };

  const addEntregable = () => setEntregables((e) => [...e, ""]);
  const removeEntregable = (i: number) => setEntregables((e) => e.filter((_, idx) => idx !== i));
  const setEntregable = (i: number, v: string) =>
    setEntregables((e) => e.map((x, idx) => (idx === i ? v : x)));

  const fv = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className="tbi-page-enter">
      <Toast toast={toast} />
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>📋 Briefs</h1>
          <p style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{filtered.length} solicitudes</p>
        </div>
        <AdminOnly section="briefs" fallback={<LockButton label="Nuevo brief" />}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={openNew} style={{ background: "rgba(14,165,233,0.1)", color: ACCENT, border: "1.5px solid rgba(14,165,233,0.25)", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              + Rápido
            </button>
            <button onClick={() => router.push("/tec-bi/briefs/nuevo")}
              style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              📋 Brief Canvas
            </button>
          </div>
        </AdminOnly>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título o tipo…" style={{ ...fieldStyle, maxWidth: 280, flex: 1 }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["Todos", ...ESTADOS].map((e) => (
            <button key={e} onClick={() => setFilterEstado(e)}
              style={{ padding: "7px 12px", borderRadius: 9, fontSize: 11, fontWeight: 600, border: `1px solid ${filterEstado === e ? ACCENT : "#e0e0e0"}`, background: filterEstado === e ? "rgba(14,165,233,0.1)" : "white", color: filterEstado === e ? ACCENT : "#888", cursor: "pointer", whiteSpace: "nowrap" }}>
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <SkeletonTable rows={4} headers={["Título", "Cliente", "Tipo", "Estado", "Fecha entrega", "Margen", ""]} />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", background: "rgba(255,255,255,0.6)", borderRadius: 14, border: "1px dashed rgba(14,165,233,0.2)" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <p style={{ color: "#888", fontSize: 13 }}>{search ? "Sin resultados" : "Aún no hay briefs registrados"}</p>
          {!search && <button onClick={openNew} style={{ marginTop: 12, color: ACCENT, background: "none", border: "none", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>+ Crear el primero</button>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((b) => {
            const margen = getMargen(b);
            const enRiesgo = margen !== null && margen < 5 && b.estado !== "Entregado" && b.estado !== "Cancelado";
            return (
              <div key={b.id}
                style={{ background: enRiesgo ? "rgba(255,159,10,0.04)" : "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", border: `1px solid ${enRiesgo ? "rgba(255,159,10,0.3)" : "rgba(14,165,233,0.15)"}`, borderRadius: 14, padding: "16px 18px", cursor: "pointer", transition: "border-color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = enRiesgo ? "rgba(255,159,10,0.5)" : "rgba(14,165,233,0.4)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = enRiesgo ? "rgba(255,159,10,0.3)" : "rgba(14,165,233,0.15)")}
                onClick={() => openDetail(b)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                      <EstadoBadge estado={b.estado} />
                      <span style={{ background: "rgba(14,165,233,0.08)", color: "#0EA5E9", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>{b.tipoProyecto}</span>
                      {margen !== null && <MargenBadge dias={margen} />}
                      {b.briefScore !== undefined && (
                        <span style={{
                          background: b.briefScore >= 80 ? "rgba(52,199,89,0.12)" : b.briefScore >= 50 ? "rgba(255,159,10,0.12)" : "rgba(255,59,48,0.12)",
                          color: b.briefScore >= 80 ? "#34C759" : b.briefScore >= 50 ? "#FF9F0A" : "#FF3B30",
                          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                        }}>
                          📊 {b.briefScore}/100
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F", margin: "0 0 4px" }}>{b.titulo}</h3>
                    <p style={{ fontSize: 12, color: "#888", margin: 0 }}>🎓 {clienteNombre(b.clienteId)}</p>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <select
                      value={b.estado}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => { e.stopPropagation(); b.id && updateEstadoBrief(b.id, e.target.value as EstadoBrief); }}
                      style={{ ...fieldStyle, maxWidth: 150, fontSize: 11, padding: "5px 8px" }}
                    >
                      {ESTADOS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <button onClick={(e) => { e.stopPropagation(); openEdit(b); }}
                      style={{ background: "rgba(14,165,233,0.1)", border: "none", borderRadius: 7, padding: "5px 10px", fontSize: 11, cursor: "pointer", color: ACCENT, fontWeight: 600 }}>
                      Editar
                    </button>
                  </div>
                </div>

                {b.entregables?.length > 0 && (
                  <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {b.entregables.slice(0, 4).map((ent, i) => (
                      <span key={i} style={{ background: "rgba(0,0,0,0.05)", color: "#555", fontSize: 10, padding: "2px 8px", borderRadius: 6 }}>{ent}</span>
                    ))}
                    {b.entregables.length > 4 && <span style={{ color: "#aaa", fontSize: 10 }}>+{b.entregables.length - 4} más</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <TecBiModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar brief" : "Nuevo brief"} width={600}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>CLIENTE INTERNO</label>
              <select required style={fieldStyle} value={form.clienteId} onChange={(e) => setForm((f) => ({ ...f, clienteId: e.target.value }))}>
                <option value="">Selecciona un departamento…</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.departamento} — {c.nombreResponsable}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>TÍTULO DEL BRIEF</label>
              <input required style={fieldStyle} placeholder="Ej. Spot institucional Semana i 2026" {...fv("titulo")} />
            </div>

            <div>
              <label style={labelStyle}>TIPO DE PROYECTO</label>
              <select required style={fieldStyle} value={form.tipoProyecto} onChange={(e) => setForm((f) => ({ ...f, tipoProyecto: e.target.value as TipoProyecto }))}>
                {TIPOS_PROYECTO.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>DESCRIPCIÓN</label>
              <textarea style={{ ...fieldStyle, minHeight: 72, resize: "vertical" }} placeholder="Describe el objetivo y contexto del proyecto…" value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} />
            </div>

            {/* Entregables dinámicos */}
            <div>
              <label style={labelStyle}>ENTREGABLES</label>
              {entregables.map((ent, i) => (
                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  <input
                    style={{ ...fieldStyle, flex: 1 }}
                    placeholder={`Entregable ${i + 1}…`}
                    value={ent}
                    onChange={(e) => setEntregable(i, e.target.value)}
                  />
                  {entregables.length > 1 && (
                    <button type="button" onClick={() => removeEntregable(i)}
                      style={{ background: "rgba(255,59,48,0.1)", border: "none", borderRadius: 8, padding: "0 10px", color: "#FF3B30", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addEntregable}
                style={{ background: "none", border: `1px dashed rgba(14,165,233,0.4)`, borderRadius: 8, padding: "6px 12px", color: ACCENT, cursor: "pointer", fontSize: 12, fontWeight: 600, width: "100%" }}>
                + Agregar entregable
              </button>
            </div>

            <div>
              <label style={labelStyle}>REQUISITOS TÉCNICOS</label>
              <textarea style={{ ...fieldStyle, minHeight: 56, resize: "vertical" }} placeholder="Formato, resolución, duración, etc." value={form.requisitos} onChange={(e) => setForm((f) => ({ ...f, requisitos: e.target.value }))} />
            </div>

            <div>
              <label style={labelStyle}>REFERENCIAS</label>
              <input style={fieldStyle} placeholder="Links de Drive, referencias visuales…" {...fv("referencias")} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>FECHA DE SOLICITUD</label>
                <input required type="date" style={fieldStyle} {...fv("fechaSolicitud")} />
              </div>
              <div>
                <label style={labelStyle}>FECHA LÍMITE</label>
                <input required type="date" style={fieldStyle} {...fv("fechaLimite")} />
              </div>
            </div>

            {editing && (
              <div>
                <label style={labelStyle}>ESTADO</label>
                <select style={fieldStyle} value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as EstadoBrief }))}>
                  {ESTADOS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>

          <SubmitBtn loading={saving} label={editing ? "Guardar cambios" : "Crear brief"} />
        </form>
      </TecBiModal>

      {/* Detail Modal */}
      {selected && (
        <TecBiModal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={selected.titulo} width={560}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <EstadoBadge estado={selected.estado} />
              <span style={{ background: "rgba(14,165,233,0.08)", color: ACCENT, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>{selected.tipoProyecto}</span>
              {(() => { const m = getMargen(selected); return m !== null ? <MargenBadge dias={m} /> : null; })()}
            </div>

            <div>
              <p style={{ ...labelStyle, marginBottom: 3 }}>CLIENTE</p>
              <p style={{ fontSize: 13, color: "#1D1D1F", margin: 0 }}>🎓 {clienteNombre(selected.clienteId)}</p>
            </div>

            {selected.descripcion && (
              <div>
                <p style={{ ...labelStyle, marginBottom: 3 }}>DESCRIPCIÓN</p>
                <p style={{ fontSize: 13, color: "#444", margin: 0, lineHeight: 1.5 }}>{selected.descripcion}</p>
              </div>
            )}

            {selected.entregables?.length > 0 && (
              <div>
                <p style={{ ...labelStyle, marginBottom: 6 }}>ENTREGABLES</p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {selected.entregables.map((e, i) => (
                    <li key={i} style={{ fontSize: 13, color: "#444", marginBottom: 3 }}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {selected.requisitosTecnicos && (
              <div>
                <p style={{ ...labelStyle, marginBottom: 3 }}>REQUISITOS TÉCNICOS</p>
                <p style={{ fontSize: 13, color: "#444", margin: 0 }}>{selected.requisitosTecnicos}</p>
              </div>
            )}

            {selected.referencias && (
              <div>
                <p style={{ ...labelStyle, marginBottom: 3 }}>REFERENCIAS</p>
                <p style={{ fontSize: 13, color: ACCENT, margin: 0 }}>{selected.referencias}</p>
              </div>
            )}

            <div style={{ display: "flex", gap: 16, paddingTop: 12, borderTop: "1px solid rgba(14,165,233,0.1)" }}>
              <button onClick={() => { setDetailOpen(false); openEdit(selected); }}
                style={{ flex: 1, background: ACCENT, color: "#fff", border: "none", borderRadius: 10, padding: "9px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Editar brief
              </button>
            </div>
          </div>
        </TecBiModal>
      )}
    </div>
  );
}
