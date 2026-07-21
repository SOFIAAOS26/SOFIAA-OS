"use client";

import { useState, useEffect, FormEvent } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  subscribeClientes, subscribeCalendario,
  createEntrada, updateEntrada, deleteEntrada,
} from "@/lib/marketing/firestore";
import type { SmmCliente, SmmCalendario, EstadoContenido, FormatoContenido, PlataformaSmm } from "@/lib/marketing/types";
import {
  PLATAFORMAS, ESTADOS_CONTENIDO, FORMATOS_CONTENIDO, ESTADO_CONTENT_BADGE,
} from "@/lib/marketing/types";
import { Timestamp } from "firebase/firestore";

const P = "#f97316";
const field: React.CSSProperties = {
  width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 8,
  padding: "7px 11px", fontSize: 12, color: "#1D1D1F",
  outline: "none", boxSizing: "border-box", background: "#fff",
};
const lbl: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "#6B7280",
  letterSpacing: "0.4px", marginBottom: 3, display: "block",
};

const EMPTY_CAL = (): Omit<SmmCalendario, "id" | "createdAt" | "updatedAt"> => ({
  clienteId: "", clienteNombre: "", titulo: "", copy: "",
  plataforma: "Instagram", formato: "Reel", estado: "Idea",
  responsable: "", fecha: null, fechaPubli: null,
  copyAprobado: false, assetsListos: false,
  alcanceReal: 0, engagementPct: 0,
});

function EstadoBadge({ e }: { e: EstadoContenido }) {
  const s = ESTADO_CONTENT_BADGE[e];
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 99, whiteSpace: "nowrap" }}>
      {e}
    </span>
  );
}

export default function CalendarioPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [clientes,     setClientes]     = useState<SmmCliente[]>([]);
  const [entradas,     setEntradas]     = useState<SmmCalendario[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filtCliente,  setFiltCliente]  = useState("Todos");
  const [filtEstado,   setFiltEstado]   = useState("Todos");
  const [filtPlat,     setFiltPlat]     = useState("Todas");
  const [modalOpen,    setModalOpen]    = useState(false);
  const [form,         setForm]         = useState(EMPTY_CAL());
  const [editing,      setEditing]      = useState<SmmCalendario | null>(null);
  const [saving,       setSaving]       = useState(false);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    const u1 = subscribeClientes(activeWorkspaceId, setClientes);
    const u2 = subscribeCalendario(activeWorkspaceId, (data) => { setEntradas(data); setLoading(false); });
    return () => { u1(); u2(); };
  }, [activeWorkspaceId]);

  const filtered = entradas.filter((e) => {
    if (filtCliente !== "Todos"  && e.clienteNombre !== filtCliente) return false;
    if (filtEstado  !== "Todos"  && e.estado        !== filtEstado)  return false;
    if (filtPlat    !== "Todas"  && e.plataforma     !== filtPlat)   return false;
    return true;
  });

  const openNew  = () => { setEditing(null); setForm(EMPTY_CAL()); setModalOpen(true); };
  const openEdit = (e: SmmCalendario) => {
    setEditing(e);
    setForm({ ...e } as Omit<SmmCalendario, "id" | "createdAt" | "updatedAt">);
    setModalOpen(true);
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!activeWorkspaceId) return;
    setSaving(true);
    try {
      if (editing?.id) await updateEntrada(activeWorkspaceId, editing.id, form);
      else             await createEntrada(activeWorkspaceId, form);
      setModalOpen(false);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (e: SmmCalendario) => {
    if (!activeWorkspaceId || !e.id) return;
    if (!confirm(`¿Eliminar "${e.titulo}"?`)) return;
    await deleteEntrada(activeWorkspaceId, e.id);
  };

  const quickStatus = async (e: SmmCalendario, estado: EstadoContenido) => {
    if (!activeWorkspaceId || !e.id) return;
    await updateEntrada(activeWorkspaceId, e.id, { estado });
  };

  const f = (key: keyof typeof form) => ({
    value: (form[key] as string) ?? "",
    onChange: (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [key]: ev.target.value })),
  });

  const NEXT_STATE: Record<EstadoContenido, EstadoContenido> = {
    "Idea":          "En producción",
    "En producción": "En revisión",
    "En revisión":   "Aprobado",
    "Aprobado":      "Programado",
    "Programado":    "Publicado",
    "Publicado":     "Publicado",
  };

  // Group por estado para kanban summary
  const byEstado = ESTADOS_CONTENIDO.map((e) => ({
    estado: e,
    count: entradas.filter((en) => en.estado === e).length,
    badge: ESTADO_CONTENT_BADGE[e],
  }));

  return (
    <div className="tbi-page-enter" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1D1D1F", margin: 0 }}>📅 Calendario Editorial</h1>
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: "4px 0 0" }}>
            {filtered.length} entradas · {entradas.filter((e) => e.estado === "Publicado").length} publicadas
          </p>
        </div>
        <button
          onClick={openNew}
          style={{ background: P, color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + Nueva entrada
        </button>
      </div>

      {/* Estado summary */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {byEstado.map(({ estado, count, badge }) => (
          <div
            key={estado}
            onClick={() => setFiltEstado(filtEstado === estado ? "Todos" : estado)}
            style={{
              background: filtEstado === estado ? badge.bg : "#fff",
              border: `1.5px solid ${filtEstado === estado ? badge.color : "#E5E7EB"}`,
              borderRadius: 99,
              padding: "5px 14px",
              fontSize: 11,
              fontWeight: 700,
              color: filtEstado === estado ? badge.color : "#6B7280",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s",
            }}
          >
            {estado}
            <span
              style={{
                background: badge.color,
                color: "#fff",
                borderRadius: 99,
                fontSize: 9,
                padding: "1px 6px",
                fontWeight: 800,
              }}
            >
              {count}
            </span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <select value={filtCliente} onChange={(e) => setFiltCliente(e.target.value)}
          style={{ ...field, width: "auto", minWidth: 180 }}>
          <option value="Todos">Todos los clientes</option>
          {clientes.map((c) => <option key={c.id}>{c.nombre}</option>)}
        </select>
        <select value={filtPlat} onChange={(e) => setFiltPlat(e.target.value)}
          style={{ ...field, width: "auto", minWidth: 140 }}>
          <option value="Todas">Todas las plataformas</option>
          {PLATAFORMAS.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9CA3AF" }}>Cargando calendario…</div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(124,58,237,0.1)", overflowX: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "#9CA3AF" }}>
              Sin entradas. ¡Agrega la primera!
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
              <thead>
                <tr style={{ background: "#FAFAFA" }}>
                  {["Título","Cliente","Plataforma","Formato","Estado","Fecha","✓ Copy","✓ Assets","⚙️"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.4px", borderBottom: "1px solid #F3F0FF", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr key={e.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #F9F7FF" : "none" }}>
                    <td style={{ padding: "11px 14px" }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 12, color: "#1D1D1F", maxWidth: 180 }}>{e.titulo || "—"}</p>
                      {e.responsable && <p style={{ margin: 0, fontSize: 10, color: "#9CA3AF" }}>👤 {e.responsable}</p>}
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{e.clienteNombre}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ fontSize: 11, background: "#F3F0FF", color: P, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{e.plataforma}</span>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 11, color: "#6B7280" }}>{e.formato}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <EstadoBadge e={e.estado} />
                        {e.estado !== "Publicado" && (
                          <button
                            onClick={() => quickStatus(e, NEXT_STATE[e.estado])}
                            title={`Avanzar a: ${NEXT_STATE[e.estado]}`}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, opacity: 0.5 }}
                          >
                            →
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 11, color: "#6B7280", whiteSpace: "nowrap" }}>
                      {e.fecha ? (e.fecha as Timestamp).toDate().toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) : "—"}
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "center", fontSize: 14 }}>
                      {e.copyAprobado ? "✅" : "⬜"}
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "center", fontSize: 14 }}>
                      {e.assetsListos ? "✅" : "⬜"}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 5 }}>
                        <button onClick={() => openEdit(e)} style={{ background: "rgba(124,58,237,0.08)", border: "none", borderRadius: 6, padding: "4px 9px", fontSize: 11, color: P, cursor: "pointer", fontWeight: 600 }}>✏️</button>
                        <button onClick={() => handleDelete(e)} style={{ background: "rgba(239,68,68,0.08)", border: "none", borderRadius: 6, padding: "4px 9px", fontSize: 11, color: "#EF4444", cursor: "pointer" }}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}
          onClick={(ev) => ev.target === ev.currentTarget && setModalOpen(false)}
        >
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 580, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: "#1D1D1F", margin: "0 0 20px" }}>
              {editing ? "Editar entrada" : "Nueva entrada de contenido"}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              <div>
                <span style={lbl}>TÍTULO / IDEA</span>
                <input required placeholder="Ej: Rutina de skincare en 60 segundos" style={field} {...f("titulo")} />
              </div>

              <div className="ext-form-2" style={{ gap: 10 }}>
                <div>
                  <span style={lbl}>CLIENTE</span>
                  <select style={field} value={form.clienteId}
                    onChange={(ev) => {
                      const c = clientes.find((c) => c.id === ev.target.value);
                      setForm((p) => ({ ...p, clienteId: ev.target.value, clienteNombre: c?.nombre ?? "" }));
                    }}>
                    <option value="">Selecciona…</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <span style={lbl}>RESPONSABLE</span>
                  <input placeholder="Tu nombre o del equipo" style={field} {...f("responsable")} />
                </div>
              </div>

              <div className="ext-form-3" style={{ gap: 10 }}>
                <div>
                  <span style={lbl}>PLATAFORMA</span>
                  <select style={field} value={form.plataforma}
                    onChange={(ev) => setForm((p) => ({ ...p, plataforma: ev.target.value as PlataformaSmm }))}>
                    {PLATAFORMAS.map((pl) => <option key={pl}>{pl}</option>)}
                  </select>
                </div>
                <div>
                  <span style={lbl}>FORMATO</span>
                  <select style={field} value={form.formato}
                    onChange={(ev) => setForm((p) => ({ ...p, formato: ev.target.value as FormatoContenido }))}>
                    {FORMATOS_CONTENIDO.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <span style={lbl}>ESTADO</span>
                  <select style={field} value={form.estado}
                    onChange={(ev) => setForm((p) => ({ ...p, estado: ev.target.value as EstadoContenido }))}>
                    {ESTADOS_CONTENIDO.map((e) => <option key={e}>{e}</option>)}
                  </select>
                </div>
              </div>

              <div className="ext-form-2" style={{ gap: 10 }}>
                <div>
                  <span style={lbl}>FECHA PLANIFICADA</span>
                  <input type="date" style={field}
                    value={form.fecha ? (form.fecha as Timestamp).toDate().toISOString().slice(0,10) : ""}
                    onChange={(ev) => setForm((p) => ({ ...p, fecha: ev.target.value ? Timestamp.fromDate(new Date(ev.target.value)) : null }))} />
                </div>
                <div>
                  <span style={lbl}>FECHA DE PUBLICACIÓN</span>
                  <input type="date" style={field}
                    value={form.fechaPubli ? (form.fechaPubli as Timestamp).toDate().toISOString().slice(0,10) : ""}
                    onChange={(ev) => setForm((p) => ({ ...p, fechaPubli: ev.target.value ? Timestamp.fromDate(new Date(ev.target.value)) : null }))} />
                </div>
              </div>

              <div>
                <span style={lbl}>COPY / CAPTION</span>
                <textarea rows={3} placeholder="Escribe el caption o idea de copy…" style={{ ...field, resize: "vertical" }} value={form.copy}
                  onChange={(ev) => setForm((p) => ({ ...p, copy: ev.target.value }))} />
              </div>

              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                {[
                  { key: "copyAprobado", label: "Copy aprobado" },
                  { key: "assetsListos", label: "Assets listos" },
                ].map(({ key, label: labelTxt }) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={form[key as keyof typeof form] as boolean}
                      onChange={(ev) => setForm((p) => ({ ...p, [key]: ev.target.checked }))}
                      style={{ width: 16, height: 16, accentColor: P }}
                    />
                    {labelTxt}
                  </label>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <button type="button" onClick={() => setModalOpen(false)}
                  style={{ background: "#F3F4F6", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, cursor: "pointer", fontWeight: 600, color: "#374151" }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  style={{ background: P, color: "#fff", border: "none", borderRadius: 10, padding: "9px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Guardando…" : editing ? "Actualizar" : "Crear entrada"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
