"use client";

import { useState, useEffect, FormEvent } from "react";
import TecBiModal, {
  fieldStyle, labelStyle, formGrid, formRow, SubmitBtn,
} from "@/components/tec-bi/TecBiModal";
import {
  subscribeProveedores, createProveedor, updateProveedor, toggleProveedor,
} from "@/lib/firestore/proveedores";
import type { Proveedor, TipoServicio } from "@/extensions/tec-bi/schema";

const ACCENT = "#0EA5E9";
const MXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

const TIPOS_SERVICIO: TipoServicio[] = [
  "Animación 3D", "Edición y Post-producción", "Motion Graphics",
  "Fotografía", "Producción de Audio", "Diseño Gráfico",
  "Transmisión en Vivo", "Renta de Equipo", "Otro",
];

const EMPTY: Omit<Proveedor, "id" | "createdAt" | "updatedAt"> = {
  nombre: "", tipoServicio: "Edición y Post-producción",
  email: "", telefono: "", activo: true,
};

function Semaforo({ rentabilidad }: { rentabilidad?: number | null }) {
  if (rentabilidad == null) return <span style={{ color: "#ccc", fontSize: 11 }}>Sin datos</span>;
  const color = rentabilidad >= 20 ? "#34C759" : rentabilidad >= 0 ? "#FF9F0A" : "#FF3B30";
  const label = rentabilidad >= 20 ? "Rentable" : rentabilidad >= 0 ? "Marginal" : "Pérdida";
  return (
    <span style={{
      background: color + "20", color, fontSize: 10, fontWeight: 700,
      padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap",
    }}>
      {label} {rentabilidad.toFixed(0)}%
    </span>
  );
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [soloActivos, setSoloActivos] = useState(true);
  const [filterTipo, setFilterTipo]   = useState<string>("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Proveedor | null>(null);
  const [form, setForm]           = useState({ ...EMPTY });
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    const unsub = subscribeProveedores((data) => {
      setProveedores(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = proveedores.filter((p) => {
    if (soloActivos && !p.activo) return false;
    if (filterTipo !== "Todos" && p.tipoServicio !== filterTipo) return false;
    const q = search.toLowerCase();
    return p.nombre.toLowerCase().includes(q) || p.tipoServicio.toLowerCase().includes(q);
  });

  const openNew = () => { setEditing(null); setForm({ ...EMPTY }); setModalOpen(true); };
  const openEdit = (p: Proveedor) => {
    setEditing(p);
    setForm({ nombre: p.nombre, tipoServicio: p.tipoServicio, email: p.email, telefono: p.telefono, activo: p.activo });
    setModalOpen(true);
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault(); setSaving(true);
    try {
      if (editing?.id) await updateProveedor(editing.id, form);
      else await createProveedor(form);
      setModalOpen(false);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const fieldVal = (key: keyof typeof form) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>🏢 Proveedores</h1>
          <p style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{filtered.length} {soloActivos ? "activos" : "registros"}</p>
        </div>
        <button onClick={openNew} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Nuevo proveedor
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o tipo de servicio…"
          style={{ ...fieldStyle, maxWidth: 280, flex: 1 }}
        />
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
          style={{ ...fieldStyle, maxWidth: 200 }}
        >
          <option>Todos</option>
          {TIPOS_SERVICIO.map((t) => <option key={t}>{t}</option>)}
        </select>
        <button
          onClick={() => setSoloActivos((v) => !v)}
          style={{ padding: "9px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, border: `1px solid ${soloActivos ? ACCENT : "#ddd"}`, background: soloActivos ? `rgba(14,165,233,0.08)` : "white", color: soloActivos ? ACCENT : "#888", cursor: "pointer" }}
        >
          {soloActivos ? "✓ Solo activos" : "Todos"}
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ color: "#aaa", fontSize: 13 }}>Cargando…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", background: "rgba(255,255,255,0.6)", borderRadius: 14, border: "1px dashed rgba(14,165,233,0.2)" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏢</div>
          <p style={{ color: "#888", fontSize: 13 }}>{search ? "Sin resultados" : "Aún no hay proveedores registrados"}</p>
          {!search && <button onClick={openNew} style={{ marginTop: 12, color: ACCENT, background: "none", border: "none", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>+ Agregar el primero</button>}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid rgba(14,165,233,0.15)" }}>
                {["Nombre", "Tipo de Servicio", "Email", "Teléfono", "Proyectos", "Costo Prom.", "Calidad", "Rentabilidad", ""].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#888", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  style={{ borderBottom: "1px solid rgba(14,165,233,0.08)", opacity: p.activo ? 1 : 0.5, transition: "background 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(14,165,233,0.04)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1D1D1F" }}>{p.nombre}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ background: "rgba(14,165,233,0.1)", color: ACCENT, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>
                      {p.tipoServicio}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#666" }}>{p.email || "—"}</td>
                  <td style={{ padding: "10px 12px", color: "#666" }}>{p.telefono || "—"}</td>
                  <td style={{ padding: "10px 12px", color: "#888" }}>{p.proyectosTotales ?? 0}</td>
                  <td style={{ padding: "10px 12px", color: "#444", whiteSpace: "nowrap" }}>
                    {p.costoPromedio ? MXN.format(p.costoPromedio) : <span style={{ color: "#ccc" }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {p.calidadPromedio ? <span style={{ color: ACCENT, fontWeight: 600 }}>{p.calidadPromedio.toFixed(1)} ⭐</span> : <span style={{ color: "#ccc" }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <Semaforo rentabilidad={p.rentabilidadPromedio} />
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(p)} style={{ background: "rgba(14,165,233,0.1)", border: "none", borderRadius: 7, padding: "5px 10px", fontSize: 11, cursor: "pointer", color: ACCENT, fontWeight: 600 }}>Editar</button>
                      <button onClick={() => p.id && toggleProveedor(p.id, !p.activo)} style={{ background: p.activo ? "rgba(255,59,48,0.08)" : "rgba(52,199,89,0.1)", border: "none", borderRadius: 7, padding: "5px 10px", fontSize: 11, cursor: "pointer", color: p.activo ? "#FF3B30" : "#34C759", fontWeight: 600 }}>
                        {p.activo ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <TecBiModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar proveedor" : "Nuevo proveedor"}>
        <form onSubmit={handleSubmit}>
          <div style={formGrid}>
            <div style={{ ...formRow, gridColumn: "1 / -1" }}>
              <label style={labelStyle}>NOMBRE / RAZÓN SOCIAL</label>
              <input required style={fieldStyle} placeholder="Ej. Estudio Nómada" {...fieldVal("nombre")} />
            </div>
            <div style={{ ...formRow, gridColumn: "1 / -1" }}>
              <label style={labelStyle}>TIPO DE SERVICIO</label>
              <select required style={fieldStyle} value={form.tipoServicio} onChange={(e) => setForm((f) => ({ ...f, tipoServicio: e.target.value as TipoServicio }))}>
                {TIPOS_SERVICIO.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={formRow}>
              <label style={labelStyle}>EMAIL</label>
              <input type="email" style={fieldStyle} placeholder="contacto@estudio.com" {...fieldVal("email")} />
            </div>
            <div style={formRow}>
              <label style={labelStyle}>TELÉFONO</label>
              <input style={fieldStyle} placeholder="81 XXXX XXXX" {...fieldVal("telefono")} />
            </div>
          </div>
          {editing && (
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" id="activop" checked={form.activo as boolean} onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))} />
              <label htmlFor="activop" style={{ fontSize: 13, color: "#444" }}>Proveedor activo</label>
            </div>
          )}
          <SubmitBtn loading={saving} label={editing ? "Guardar cambios" : "Crear proveedor"} />
        </form>
      </TecBiModal>
    </div>
  );
}
