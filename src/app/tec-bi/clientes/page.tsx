"use client";

import { useState, useEffect, FormEvent } from "react";
import TecBiModal, {
  fieldStyle, labelStyle, formGrid, formRow, SubmitBtn,
} from "@/components/tec-bi/TecBiModal";
import {
  subscribeClientes, createCliente, updateCliente, toggleCliente,
} from "@/lib/firestore/clientes";
import type { ClienteInterno, TipoCampus } from "@/extensions/tec-bi/schema";
import PageGuard from "@/components/tec-bi/PageGuard";

const ACCENT = "#0EA5E9";
const TIPOS: TipoCampus[] = ["Nacional", "Campus", "Ambos"];

const EMPTY: Omit<ClienteInterno, "id" | "createdAt" | "updatedAt"> = {
  departamento: "", campusONacional: "Campus",
  nombreResponsable: "", emailResponsable: "", activo: true,
};

const tipoBadge = (tipo: TipoCampus) => {
  const map = {
    Nacional: { bg: "rgba(79,124,255,0.1)", color: "#4F7CFF" },
    Campus:   { bg: "rgba(14,165,233,0.1)", color: "#0EA5E9" },
    Ambos:    { bg: "rgba(123,79,232,0.1)", color: "#7B4FE8" },
  };
  const { bg, color } = map[tipo] ?? map.Campus;
  return (
    <span style={{ background: bg, color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
      {tipo}
    </span>
  );
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteInterno[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [soloActivos, setSoloActivos] = useState(true);
  const [filterTipo, setFilterTipo]   = useState<string>("Todos");
  const [modalOpen, setModalOpen]     = useState(false);
  const [editing, setEditing]         = useState<ClienteInterno | null>(null);
  const [form, setForm]               = useState({ ...EMPTY });
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    const unsub = subscribeClientes((data) => { setClientes(data); setLoading(false); });
    return () => unsub();
  }, []);

  const filtered = clientes.filter((c) => {
    if (soloActivos && !c.activo) return false;
    if (filterTipo !== "Todos" && c.campusONacional !== filterTipo) return false;
    const q = search.toLowerCase();
    return (
      c.departamento.toLowerCase().includes(q) ||
      c.nombreResponsable.toLowerCase().includes(q)
    );
  });

  const openNew  = () => { setEditing(null); setForm({ ...EMPTY }); setModalOpen(true); };
  const openEdit = (c: ClienteInterno) => {
    setEditing(c);
    setForm({ departamento: c.departamento, campusONacional: c.campusONacional, nombreResponsable: c.nombreResponsable, emailResponsable: c.emailResponsable, activo: c.activo });
    setModalOpen(true);
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault(); setSaving(true);
    try {
      if (editing?.id) await updateCliente(editing.id, form);
      else await createCliente(form);
      setModalOpen(false);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const fv = (key: keyof typeof form) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div>
      <PageGuard section="clientes" />
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>🎓 Clientes Internos</h1>
          <p style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Departamentos del TEC que solicitan producción</p>
        </div>
        <button onClick={openNew} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Nuevo cliente
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por departamento o responsable…"
          style={{ ...fieldStyle, maxWidth: 300, flex: 1 }}
        />
        <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} style={{ ...fieldStyle, maxWidth: 150 }}>
          <option>Todos</option>
          {TIPOS.map((t) => <option key={t}>{t}</option>)}
        </select>
        <button
          onClick={() => setSoloActivos((v) => !v)}
          style={{ padding: "9px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, border: `1px solid ${soloActivos ? ACCENT : "#ddd"}`, background: soloActivos ? `rgba(14,165,233,0.08)` : "white", color: soloActivos ? ACCENT : "#888", cursor: "pointer" }}
        >
          {soloActivos ? "✓ Solo activos" : "Todos"}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <p style={{ color: "#aaa", fontSize: 13 }}>Cargando…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", background: "rgba(255,255,255,0.6)", borderRadius: 14, border: "1px dashed rgba(14,165,233,0.2)" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎓</div>
          <p style={{ color: "#888", fontSize: 13 }}>{search ? "Sin resultados" : "Aún no hay clientes internos registrados"}</p>
          {!search && <button onClick={openNew} style={{ marginTop: 12, color: ACCENT, background: "none", border: "none", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>+ Agregar el primero</button>}
        </div>
      ) : (
        /* Card grid — los clientes internos se ven mejor en cards */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {filtered.map((c) => (
            <div
              key={c.id}
              style={{
                background: "rgba(255,255,255,0.75)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(14,165,233,0.15)",
                borderRadius: 14,
                padding: "16px 18px",
                opacity: c.activo ? 1 : 0.5,
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(14,165,233,0.4)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(14,165,233,0.15)")}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  {tipoBadge(c.campusONacional)}
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  <button onClick={() => openEdit(c)} style={{ background: "rgba(14,165,233,0.1)", border: "none", borderRadius: 7, padding: "4px 9px", fontSize: 10, cursor: "pointer", color: ACCENT, fontWeight: 600 }}>Editar</button>
                  <button onClick={() => c.id && toggleCliente(c.id, !c.activo)} style={{ background: c.activo ? "rgba(255,59,48,0.08)" : "rgba(52,199,89,0.1)", border: "none", borderRadius: 7, padding: "4px 9px", fontSize: 10, cursor: "pointer", color: c.activo ? "#FF3B30" : "#34C759", fontWeight: 600 }}>
                    {c.activo ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F", margin: "0 0 4px" }}>
                {c.departamento}
              </h3>
              <p style={{ fontSize: 12, color: "#666", margin: 0 }}>
                👤 {c.nombreResponsable}
              </p>
              {c.emailResponsable && (
                <p style={{ fontSize: 11, color: "#aaa", margin: "4px 0 0" }}>{c.emailResponsable}</p>
              )}

              <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(14,165,233,0.1)" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F" }}>{c.briefsTotales ?? 0}</div>
                  <div style={{ fontSize: 10, color: "#aaa" }}>Briefs</div>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F" }}>{c.proyectosCompletados ?? 0}</div>
                  <div style={{ fontSize: 10, color: "#aaa" }}>Completados</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <TecBiModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar cliente" : "Nuevo cliente interno"}>
        <form onSubmit={handleSubmit}>
          <div style={formGrid}>
            <div style={{ ...formRow, gridColumn: "1 / -1" }}>
              <label style={labelStyle}>DEPARTAMENTO</label>
              <input required style={fieldStyle} placeholder="Ej. Dirección de Marketing" {...fv("departamento")} />
            </div>
            <div style={{ ...formRow, gridColumn: "1 / -1" }}>
              <label style={labelStyle}>ALCANCE</label>
              <select required style={fieldStyle} value={form.campusONacional} onChange={(e) => setForm((f) => ({ ...f, campusONacional: e.target.value as TipoCampus }))}>
                {TIPOS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={formRow}>
              <label style={labelStyle}>NOMBRE DEL RESPONSABLE</label>
              <input required style={fieldStyle} placeholder="Ej. Luis Ramírez" {...fv("nombreResponsable")} />
            </div>
            <div style={formRow}>
              <label style={labelStyle}>EMAIL DEL RESPONSABLE</label>
              <input type="email" style={fieldStyle} placeholder="l.ramirez@tec.mx" {...fv("emailResponsable")} />
            </div>
          </div>
          {editing && (
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" id="activoc" checked={form.activo as boolean} onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))} />
              <label htmlFor="activoc" style={{ fontSize: 13, color: "#444" }}>Cliente activo</label>
            </div>
          )}
          <SubmitBtn loading={saving} label={editing ? "Guardar cambios" : "Crear cliente"} />
        </form>
      </TecBiModal>
    </div>
  );
}
