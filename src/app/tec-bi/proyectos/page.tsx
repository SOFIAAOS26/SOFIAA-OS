"use client";

import { useState, useEffect, FormEvent } from "react";
import TecBiModal, { fieldStyle, labelStyle, SubmitBtn } from "@/components/tec-bi/TecBiModal";
import Toast, { useToast } from "@/components/tec-bi/Toast";
import AdminOnly, { LockButton } from "@/components/tec-bi/AdminOnly";
import PageGuard from "@/components/tec-bi/PageGuard";
import { SkeletonTable } from "@/components/tec-bi/Skeleton";
import { subscribeProyectos, createProyecto, updateProyecto, updateEstadoProyecto } from "@/lib/firestore/proyectos";
import { subscribeBriefs } from "@/lib/firestore/briefs";
import { subscribeEmpleados } from "@/lib/firestore/empleados";
import { subscribeProveedores } from "@/lib/firestore/proveedores";
import type { Proyecto, EstadoProyecto, TipoAlcance, TipoAsignacion, Brief, Empleado, Proveedor } from "@/extensions/tec-bi/schema";

const ACCENT = "#0EA5E9";
const MXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

const ESTADOS: EstadoProyecto[] = ["Pendiente", "En producción", "En revisión", "Entregado", "Cancelado"];

const ESTADO_STYLE: Record<EstadoProyecto, { bg: string; color: string }> = {
  "Pendiente":      { bg: "rgba(142,142,147,0.12)", color: "#8E8E93" },
  "En producción":  { bg: "rgba(123,79,232,0.12)",  color: "#7B4FE8" },
  "En revisión":    { bg: "rgba(255,159,10,0.12)",  color: "#FF9F0A" },
  "Entregado":      { bg: "rgba(52,199,89,0.12)",   color: "#34C759" },
  "Cancelado":      { bg: "rgba(255,59,48,0.1)",    color: "#FF3B30" },
};

const ALCANCE_STYLE: Record<TipoAlcance, { bg: string; color: string }> = {
  Nacional: { bg: "rgba(79,124,255,0.1)", color: "#4F7CFF" },
  Campus:   { bg: "rgba(14,165,233,0.1)", color: "#0EA5E9" },
};

const EMPTY_FORM = {
  briefId: "", titulo: "",
  tipoAlcance: "Campus" as TipoAlcance,
  tipoAsignacion: "Interno" as TipoAsignacion,
  asignadoId: "",
  estado: "Pendiente" as EstadoProyecto,
  valorEstimado: 0,
  linkEntregables: "",
  notas: "",
};

export default function ProyectosPage() {
  const [proyectos, setProyectos]   = useState<Proyecto[]>([]);
  const [briefs, setBriefs]         = useState<Brief[]>([]);
  const [empleados, setEmpleados]   = useState<Empleado[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("Todos");
  const [filterAlcance, setFilterAlcance] = useState<string>("Todos");
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<Proyecto | null>(null);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [saving, setSaving]         = useState(false);
  const { toast, showToast }        = useToast();

  useEffect(() => {
    const u1 = subscribeProyectos((d) => { setProyectos(d); setLoading(false); });
    const u2 = subscribeBriefs((d) => setBriefs(d));
    const u3 = subscribeEmpleados((d) => setEmpleados(d.filter((e) => e.activo)));
    const u4 = subscribeProveedores((d) => setProveedores(d.filter((p) => p.activo)));
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const filtered = proyectos.filter((p) => {
    if (filterEstado !== "Todos" && p.estado !== filterEstado) return false;
    if (filterAlcance !== "Todos" && p.tipoAlcance !== filterAlcance) return false;
    return p.titulo.toLowerCase().includes(search.toLowerCase());
  });

  const getBriefTitulo = (id: string) => briefs.find((b) => b.id === id)?.titulo ?? "—";
  const getAsignadoNombre = (p: Proyecto) => {
    if (p.tipoAsignacion === "Interno") return empleados.find((e) => e.id === p.asignadoId)?.nombre ?? "—";
    return proveedores.find((v) => v.id === p.asignadoId)?.nombre ?? "—";
  };

  const openNew = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setModalOpen(true); };
  const openEdit = (p: Proyecto) => {
    setEditing(p);
    setForm({
      briefId: p.briefId, titulo: p.titulo,
      tipoAlcance: p.tipoAlcance, tipoAsignacion: p.tipoAsignacion,
      asignadoId: p.asignadoId, estado: p.estado,
      valorEstimado: p.valorEstimado, linkEntregables: p.linkEntregables ?? "",
      notas: p.notas ?? "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault(); setSaving(true);
    try {
      const payload = { ...form };
      if (editing?.id) { await updateProyecto(editing.id, payload); showToast("Proyecto actualizado"); }
      else { await createProyecto(payload); showToast("Proyecto creado"); }
      setModalOpen(false);
    } catch (err) { console.error(err); showToast("Error al guardar", "error"); }
    finally { setSaving(false); }
  };

  const fv = (key: keyof typeof form) => ({
    value: form[key] as string | number,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: key === "valorEstimado" ? Number(e.target.value) : e.target.value })),
  });

  const asignadosDisponibles = form.tipoAsignacion === "Interno" ? empleados : proveedores;

  // Kanban columns
  const columns: EstadoProyecto[] = ["Pendiente", "En producción", "En revisión", "Entregado"];

  return (
    <div className="tbi-page-enter">
      <PageGuard section="proyectos" />
      <Toast toast={toast} />
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>🎬 Proyectos</h1>
          <p style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{filtered.length} proyectos</p>
        </div>
        <AdminOnly fallback={<LockButton label="Nuevo proyecto" />}>
          <button onClick={openNew} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            + Nuevo proyecto
          </button>
        </AdminOnly>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título…" style={{ ...fieldStyle, maxWidth: 240, flex: 1 }} />
        <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} style={{ ...fieldStyle, maxWidth: 160 }}>
          <option>Todos</option>
          {ESTADOS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filterAlcance} onChange={(e) => setFilterAlcance(e.target.value)} style={{ ...fieldStyle, maxWidth: 130 }}>
          <option>Todos</option>
          <option>Nacional</option>
          <option>Campus</option>
        </select>
      </div>

      {/* Kanban board */}
      {loading ? (
        <SkeletonTable rows={4} headers={["Título", "Cliente", "Asignado", "Estado", "Costo", "Valor", "Margen", ""]} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, alignItems: "start" }}>
          {columns.map((col) => {
            const colItems = filtered.filter((p) => p.estado === col);
            const st = ESTADO_STYLE[col];
            return (
              <div key={col} style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(16px)", borderRadius: 14, border: "1px solid rgba(14,165,233,0.12)", overflow: "hidden" }}>
                {/* Column header */}
                <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(14,165,233,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: st.color }}>{col.toUpperCase()}</span>
                  <span style={{ background: st.bg, color: st.color, fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99 }}>{colItems.length}</span>
                </div>

                {/* Cards */}
                <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8, minHeight: 60 }}>
                  {colItems.length === 0 ? (
                    <p style={{ color: "#ccc", fontSize: 11, textAlign: "center", padding: "12px 0" }}>Sin proyectos</p>
                  ) : colItems.map((p) => (
                    <div key={p.id}
                      style={{ background: "rgba(255,255,255,0.85)", borderRadius: 10, padding: "12px 13px", border: "1px solid rgba(14,165,233,0.1)", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(14,165,233,0.35)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(14,165,233,0.1)")}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
                        <span style={{ ...ALCANCE_STYLE[p.tipoAlcance], fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: ALCANCE_STYLE[p.tipoAlcance].bg }}>
                          {p.tipoAlcance}
                        </span>
                        <span style={{ fontSize: 9, color: p.tipoAsignacion === "Interno" ? "#7B4FE8" : "#FF9F0A", fontWeight: 700, background: p.tipoAsignacion === "Interno" ? "rgba(123,79,232,0.1)" : "rgba(255,159,10,0.1)", padding: "1px 6px", borderRadius: 99 }}>
                          {p.tipoAsignacion}
                        </span>
                      </div>

                      <p style={{ fontSize: 12, fontWeight: 600, color: "#1D1D1F", margin: "0 0 4px", lineHeight: 1.3 }}>{p.titulo}</p>
                      <p style={{ fontSize: 10, color: "#999", margin: "0 0 8px" }}>📁 {getBriefTitulo(p.briefId)}</p>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: "#666" }}>👤 {getAsignadoNombre(p)}</span>
                        {p.valorEstimado > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: "#34C759" }}>{MXN.format(p.valorEstimado)}</span>}
                      </div>

                      <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
                        <select
                          value={p.estado}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => p.id && updateEstadoProyecto(p.id, e.target.value as EstadoProyecto)}
                          style={{ ...fieldStyle, flex: 1, fontSize: 10, padding: "4px 6px" }}
                        >
                          {ESTADOS.map((s) => <option key={s}>{s}</option>)}
                        </select>
                        <button onClick={() => openEdit(p)}
                          style={{ background: "rgba(14,165,233,0.1)", border: "none", borderRadius: 7, padding: "4px 8px", fontSize: 10, cursor: "pointer", color: ACCENT, fontWeight: 600 }}>
                          ✎
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <TecBiModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar proyecto" : "Nuevo proyecto"} width={560}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>BRIEF ASOCIADO</label>
              <select required style={fieldStyle} value={form.briefId} onChange={(e) => {
                const brief = briefs.find((b) => b.id === e.target.value);
                setForm((f) => ({ ...f, briefId: e.target.value, titulo: brief?.titulo ?? f.titulo }));
              }}>
                <option value="">Selecciona un brief…</option>
                {briefs.map((b) => <option key={b.id} value={b.id}>{b.titulo}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>TÍTULO DEL PROYECTO</label>
              <input required style={fieldStyle} placeholder="Ej. Spot Semana i — Edición Final" {...fv("titulo")} />
            </div>

            <div className="ext-form-2" style={{ gap: 12 }}>
              <div>
                <label style={labelStyle}>ALCANCE</label>
                <select style={fieldStyle} value={form.tipoAlcance} onChange={(e) => setForm((f) => ({ ...f, tipoAlcance: e.target.value as TipoAlcance }))}>
                  <option>Nacional</option>
                  <option>Campus</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>TIPO DE ASIGNACIÓN</label>
                <select style={fieldStyle} value={form.tipoAsignacion} onChange={(e) => setForm((f) => ({ ...f, tipoAsignacion: e.target.value as TipoAsignacion, asignadoId: "" }))}>
                  <option value="Interno">Interno (Empleado)</option>
                  <option value="Externo">Externo (Proveedor)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>{form.tipoAsignacion === "Interno" ? "EMPLEADO ASIGNADO" : "PROVEEDOR ASIGNADO"}</label>
              <select required style={fieldStyle} value={form.asignadoId} onChange={(e) => setForm((f) => ({ ...f, asignadoId: e.target.value }))}>
                <option value="">Selecciona…</option>
                {asignadosDisponibles.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>

            <div className="ext-form-2" style={{ gap: 12 }}>
              <div>
                <label style={labelStyle}>VALOR ESTIMADO (MXN)</label>
                <input type="number" min={0} style={fieldStyle} placeholder="0" {...fv("valorEstimado")} />
              </div>
              <div>
                <label style={labelStyle}>ESTADO</label>
                <select style={fieldStyle} value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as EstadoProyecto }))}>
                  {ESTADOS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>LINK DE ENTREGABLES</label>
              <input style={fieldStyle} placeholder="https://drive.google.com/…" {...fv("linkEntregables")} />
            </div>

            <div>
              <label style={labelStyle}>NOTAS</label>
              <textarea style={{ ...fieldStyle, minHeight: 60, resize: "vertical" }} placeholder="Observaciones, contexto adicional…" value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>

          <SubmitBtn loading={saving} label={editing ? "Guardar cambios" : "Crear proyecto"} />
        </form>
      </TecBiModal>
    </div>
  );
}
