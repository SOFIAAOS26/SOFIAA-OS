"use client";

import { useState, useEffect, FormEvent } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  subscribeClientes, createCliente, updateCliente, deleteCliente,
} from "@/lib/marketing/firestore";
import type { SmmCliente, EstadoCliente, PlataformaSmm } from "@/lib/marketing/types";
import {
  PLATAFORMAS, ESTADOS_CLIENTE, INDUSTRIAS, ESTADO_BADGE,
} from "@/lib/marketing/types";
import { Timestamp } from "firebase/firestore";

const P  = "#f97316";
const field: React.CSSProperties = {
  width: "100%",
  border: "1.5px solid #E5E7EB",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  color: "#1D1D1F",
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
};
const label: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#6B7280",
  letterSpacing: "0.4px",
  marginBottom: 4,
  display: "block",
};

const EMPTY: Omit<SmmCliente, "id" | "createdAt" | "updatedAt"> = {
  nombre:      "",
  industria:   "",
  contacto:    "",
  email:       "",
  telefono:    "",
  plataformas: [],
  paqueteMXN:  0,
  estado:      "Activo",
  fechaInicio: null,
  notas:       "",
  scoreEst:    5,
};

export default function ClientesPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [clientes,  setClientes]  = useState<SmmCliente[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [filtEst,   setFiltEst]   = useState<string>("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState<SmmCliente | null>(null);
  const [form,      setForm]      = useState({ ...EMPTY });
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting,  setDeleting]  = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    const unsub = subscribeClientes(activeWorkspaceId, (data) => {
      setClientes(data);
      setLoading(false);
    });
    return () => unsub();
  }, [activeWorkspaceId]);

  const filtered = clientes.filter((c) => {
    if (filtEst !== "Todos" && c.estado !== filtEst) return false;
    const q = search.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(q) ||
      c.industria.toLowerCase().includes(q) ||
      c.contacto.toLowerCase().includes(q)
    );
  });

  const openNew  = () => { setEditing(null); setForm({ ...EMPTY }); setSaveError(null); setModalOpen(true); };
  const openEdit = (c: SmmCliente) => {
    setEditing(c);
    setForm({
      nombre: c.nombre, industria: c.industria, contacto: c.contacto,
      email: c.email, telefono: c.telefono, plataformas: [...c.plataformas],
      paqueteMXN: c.paqueteMXN, estado: c.estado, fechaInicio: c.fechaInicio,
      notas: c.notas, scoreEst: c.scoreEst,
    });
    setSaveError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setSaveError(null);
    if (!activeWorkspaceId) {
      setSaveError("No hay workspace activo. Selecciona uno en el menú superior.");
      return;
    }
    setSaving(true);
    try {
      if (editing?.id) await updateCliente(activeWorkspaceId, editing.id, form);
      else             await createCliente(activeWorkspaceId, form);
      setModalOpen(false);
    } catch (err: unknown) {
      console.error("Error guardando cliente:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setSaveError(`Error al guardar: ${msg}`);
    } finally { setSaving(false); }
  };

  const handleDelete = async (c: SmmCliente) => {
    if (!activeWorkspaceId || !c.id) return;
    if (!confirm(`¿Eliminar a ${c.nombre}? Esta acción no se puede deshacer.`)) return;
    setDeleting(c.id);
    await deleteCliente(activeWorkspaceId, c.id);
    setDeleting(null);
  };

  const togglePlatform = (p: PlataformaSmm) => {
    setForm((f) => ({
      ...f,
      plataformas: f.plataformas.includes(p)
        ? f.plataformas.filter((x) => x !== p)
        : [...f.plataformas, p],
    }));
  };

  const f = (key: keyof typeof form) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

  return (
    <div className="tbi-page-enter" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1D1D1F", margin: 0 }}>🏢 Clientes</h1>
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: "4px 0 0" }}>
            {filtered.length} de {clientes.length} en cartera
          </p>
        </div>
        <button
          onClick={openNew}
          style={{ background: P, color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + Nuevo cliente
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, industria o contacto…"
          style={{ ...field, maxWidth: 320, flex: 1 }}
        />
        <select
          value={filtEst}
          onChange={(e) => setFiltEst(e.target.value)}
          style={{ ...field, width: "auto", minWidth: 140 }}
        >
          <option value="Todos">Todos los estados</option>
          {ESTADOS_CLIENTE.map((e) => <option key={e}>{e}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9CA3AF" }}>Cargando clientes…</div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(124,58,237,0.1)", overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "#9CA3AF" }}>
              Sin clientes. ¡Agrega el primero!
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#FAFAFA" }}>
                  {["Cliente", "Industria", "Contacto", "Plataformas", "Paquete MXN/mes", "Estado", "⚙️"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#9CA3AF",
                        letterSpacing: "0.4px",
                        borderBottom: "1px solid #F3F0FF",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const badge = ESTADO_BADGE[c.estado];
                  return (
                    <tr
                      key={c.id}
                      style={{ borderBottom: i < filtered.length - 1 ? "1px solid #F9F7FF" : "none" }}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#1D1D1F" }}>{c.nombre}</p>
                        <p style={{ margin: 0, fontSize: 10, color: "#9CA3AF" }}>{c.email}</p>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "#6B7280" }}>{c.industria}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <p style={{ margin: 0, fontSize: 12, color: "#374151" }}>{c.contacto}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF" }}>{c.telefono}</p>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 11, color: "#6B7280" }}>
                        {c.plataformas.slice(0, 3).join(" · ")}
                        {c.plataformas.length > 3 && ` +${c.plataformas.length - 3}`}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 700, color: "#10B981" }}>
                        ${new Intl.NumberFormat("es-MX").format(c.paqueteMXN)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            background: badge.bg, color: badge.color,
                            fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99,
                          }}
                        >
                          {c.estado}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => openEdit(c)}
                            style={{ background: "rgba(124,58,237,0.08)", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, color: P, cursor: "pointer", fontWeight: 600 }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            disabled={deleting === c.id}
                            style={{ background: "rgba(239,68,68,0.08)", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, color: "#EF4444", cursor: "pointer", fontWeight: 600 }}
                          >
                            {deleting === c.id ? "…" : "✕"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            overflowY: "auto", zIndex: 999, padding: "24px 16px",
          }}
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <div
            style={{
              background: "#fff", borderRadius: 20, padding: 28,
              width: "100%", maxWidth: 560, margin: "0 auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1D1D1F", margin: "0 0 24px" }}>
              {editing ? "Editar cliente" : "Nuevo cliente"}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              <div className="ext-form-2" style={{ gap: 12 }}>
                <div>
                  <span style={label}>EMPRESA / MARCA</span>
                  <input required placeholder="Clínica Derma Norte" style={field} {...f("nombre")} />
                </div>
                <div>
                  <span style={label}>INDUSTRIA</span>
                  <select style={field} value={form.industria}
                    onChange={(e) => setForm((p) => ({ ...p, industria: e.target.value }))}>
                    <option value="">Selecciona…</option>
                    {INDUSTRIAS.map((i) => <option key={i}>{i}</option>)}
                  </select>
                </div>
              </div>

              <div className="ext-form-2" style={{ gap: 12 }}>
                <div>
                  <span style={label}>CONTACTO PRINCIPAL</span>
                  <input placeholder="Dr. Ana García" style={field} {...f("contacto")} />
                </div>
                <div>
                  <span style={label}>TELÉFONO / WHATSAPP</span>
                  <input placeholder="81 1234 5678" style={field} {...f("telefono")} />
                </div>
              </div>

              <div>
                <span style={label}>EMAIL</span>
                <input type="email" placeholder="contacto@empresa.mx" style={field} {...f("email")} />
              </div>

              <div>
                <span style={label}>PLATAFORMAS</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                  {PLATAFORMAS.map((p) => {
                    const active = form.plataformas.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 99,
                          fontSize: 11,
                          fontWeight: 600,
                          border: `1.5px solid ${active ? P : "#E5E7EB"}`,
                          background: active ? `${P}15` : "#fff",
                          color: active ? P : "#6B7280",
                          cursor: "pointer",
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="ext-form-2" style={{ gap: 12 }}>
                <div>
                  <span style={label}>PAQUETE MXN/MES</span>
                  <input
                    type="number"
                    placeholder="8000"
                    style={field}
                    value={form.paqueteMXN || ""}
                    onChange={(e) => setForm((p) => ({ ...p, paqueteMXN: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <span style={label}>ESTADO</span>
                  <select style={field} value={form.estado}
                    onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value as EstadoCliente }))}>
                    {ESTADOS_CLIENTE.map((e) => <option key={e}>{e}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <span style={label}>FECHA DE INICIO</span>
                <input
                  type="date"
                  style={field}
                  value={
                    form.fechaInicio
                      ? (form.fechaInicio as Timestamp).toDate().toISOString().slice(0, 10)
                      : ""
                  }
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      fechaInicio: e.target.value
                        ? Timestamp.fromDate(new Date(e.target.value))
                        : null,
                    }))
                  }
                />
              </div>

              <div>
                <span style={label}>NOTAS INTERNAS</span>
                <textarea
                  rows={3}
                  placeholder="Notas sobre el cliente, acuerdos especiales, contexto…"
                  style={{ ...field, resize: "vertical" }}
                  value={form.notas}
                  onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
                />
              </div>

              {saveError && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#DC2626" }}>
                  ⚠️ {saveError}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ background: "#F3F4F6", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, cursor: "pointer", fontWeight: 600, color: "#374151" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ background: P, color: "#fff", border: "none", borderRadius: 10, padding: "9px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? "Guardando…" : editing ? "Actualizar" : "Crear cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
