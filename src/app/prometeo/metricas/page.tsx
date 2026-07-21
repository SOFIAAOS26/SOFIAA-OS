"use client";

import { useState, useEffect, FormEvent } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { subscribeClientes, subscribeMetricas, upsertMetrica, deleteMetrica } from "@/lib/marketing/firestore";
import type { SmmCliente, SmmMetrica, PlataformaMetrica } from "@/lib/marketing/types";
import { PLATAFORMAS } from "@/lib/marketing/types";

const P = "#f97316";
const field: React.CSSProperties = {
  width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 8,
  padding: "7px 11px", fontSize: 12, color: "#1D1D1F",
  outline: "none", boxSizing: "border-box", background: "#fff",
};
const label: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "#6B7280",
  letterSpacing: "0.4px", marginBottom: 3, display: "block",
};

const MES_ACTUAL = new Date().toISOString().slice(0, 7);

const EMPTY_MET = (clienteId = "", clienteNombre = ""): Omit<SmmMetrica, "id" | "createdAt" | "updatedAt"> => ({
  clienteId, clienteNombre, plataforma: "Instagram", mes: MES_ACTUAL,
  seguidores: 0, nuevosSeguidores: 0, alcance: 0, impresiones: 0,
  engagementPct: 0, publicaciones: 0, guardados: 0, clicsPerfil: 0,
  invPubli: 0, retorno: 0, leads: 0,
});

function PlatBadge({ p }: { p: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    Instagram:  { bg: "#FDF0F8", color: "#E1306C" },
    Facebook:   { bg: "#EFF6FF", color: "#1877F2" },
    TikTok:     { bg: "#F0FDF4", color: "#010101" },
    YouTube:    { bg: "#FEF2F2", color: "#FF0000" },
    LinkedIn:   { bg: "#EFF6FF", color: "#0A66C2" },
    Google:     { bg: "#FEF9C3", color: "#DB4437" },
  };
  const s = colors[p] ?? { bg: "#F3F4F6", color: "#374151" };
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
      {p}
    </span>
  );
}

export default function MetricasPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [clientes,   setClientes]   = useState<SmmCliente[]>([]);
  const [metricas,   setMetricas]   = useState<SmmMetrica[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [mes,        setMes]        = useState(MES_ACTUAL);
  const [filtCliente, setFiltCliente] = useState("Todos");
  const [modalOpen,  setModalOpen]  = useState(false);
  const [form,       setForm]       = useState(EMPTY_MET());
  const [saving,     setSaving]     = useState(false);
  const [editId,     setEditId]     = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    const u1 = subscribeClientes(activeWorkspaceId, setClientes);
    return () => u1();
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    setLoading(true);
    const u2 = subscribeMetricas(activeWorkspaceId, mes, (data) => {
      setMetricas(data);
      setLoading(false);
    });
    return () => u2();
  }, [activeWorkspaceId, mes]);

  const filtered = metricas.filter(
    (m) => filtCliente === "Todos" || m.clienteNombre === filtCliente
  );

  const openNew = () => {
    setEditId(null);
    setForm(EMPTY_MET());
    setModalOpen(true);
  };

  const openEdit = (m: SmmMetrica) => {
    setEditId(m.id ?? null);
    setForm({
      clienteId: m.clienteId, clienteNombre: m.clienteNombre,
      plataforma: m.plataforma, mes: m.mes,
      seguidores: m.seguidores, nuevosSeguidores: m.nuevosSeguidores,
      alcance: m.alcance, impresiones: m.impresiones,
      engagementPct: m.engagementPct, publicaciones: m.publicaciones,
      guardados: m.guardados, clicsPerfil: m.clicsPerfil,
      invPubli: m.invPubli, retorno: m.retorno, leads: m.leads,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!activeWorkspaceId) return;
    setSaving(true);
    try {
      await upsertMetrica(activeWorkspaceId, form);
      setModalOpen(false);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (m: SmmMetrica) => {
    if (!activeWorkspaceId || !m.id) return;
    if (!confirm("¿Eliminar este registro de métricas?")) return;
    await deleteMetrica(activeWorkspaceId, m.id);
  };

  const n = (key: keyof typeof form) => ({
    value: (form[key] as number) || "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [key]: Number(e.target.value) })),
  });

  const fmt = (v: number) => new Intl.NumberFormat("es-MX").format(Math.round(v));
  const roas = (m: SmmMetrica) => m.invPubli > 0 ? (m.retorno / m.invPubli).toFixed(2) : "—";

  return (
    <div className="tbi-page-enter" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1D1D1F", margin: 0 }}>📈 Métricas</h1>
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: "4px 0 0" }}>
            KPIs por cuenta y plataforma
          </p>
        </div>
        <button
          onClick={openNew}
          style={{ background: P, color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + Registrar métricas
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          style={{ ...field, width: "auto" }}
        />
        <select
          value={filtCliente}
          onChange={(e) => setFiltCliente(e.target.value)}
          style={{ ...field, width: "auto", minWidth: 180 }}
        >
          <option value="Todos">Todos los clientes</option>
          {clientes.map((c) => <option key={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9CA3AF" }}>Cargando métricas…</div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(124,58,237,0.1)", overflowX: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "#9CA3AF" }}>
              Sin métricas para este período.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ background: "#FAFAFA" }}>
                  {["Cliente","Plataforma","Segs","Nuevos","Alcance","Impres.","Eng%","Pubs","ROAS","Leads",""].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 14px", textAlign: "left",
                        fontSize: 10, fontWeight: 700, color: "#9CA3AF",
                        letterSpacing: "0.4px", borderBottom: "1px solid #F3F0FF",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => {
                  const eng = (m.engagementPct * 100).toFixed(1) + "%";
                  const engOk = m.engagementPct >= 0.04;
                  const roasVal = roas(m);
                  const roasOk  = m.invPubli > 0 && m.retorno / m.invPubli >= 3;
                  return (
                    <tr key={m.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #F9F7FF" : "none" }}>
                      <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 600, color: "#1D1D1F" }}>{m.clienteNombre}</td>
                      <td style={{ padding: "11px 14px" }}><PlatBadge p={m.plataforma} /></td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: "#374151" }}>{fmt(m.seguidores)}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: "#10B981", fontWeight: 600 }}>+{fmt(m.nuevosSeguidores)}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: "#374151" }}>{fmt(m.alcance)}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: "#374151" }}>{fmt(m.impresiones)}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 700, color: engOk ? "#10B981" : "#F59E0B" }}>{eng}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: "#374151" }}>{m.publicaciones}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 700, color: roasOk ? "#10B981" : "#EF4444" }}>{roasVal}x</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: "#374151" }}>{m.leads}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button onClick={() => openEdit(m)} style={{ background: "rgba(124,58,237,0.08)", border: "none", borderRadius: 6, padding: "4px 9px", fontSize: 11, color: P, cursor: "pointer", fontWeight: 600 }}>✏️</button>
                          <button onClick={() => handleDelete(m)} style={{ background: "rgba(239,68,68,0.08)", border: "none", borderRadius: 6, padding: "4px 9px", fontSize: 11, color: "#EF4444", cursor: "pointer" }}>✕</button>
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
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 999, padding: 20,
          }}
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <div style={{
            background: "#fff", borderRadius: 20, padding: 28,
            width: "100%", maxWidth: 560, maxHeight: "90vh",
            overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: "#1D1D1F", margin: "0 0 20px" }}>
              {editId ? "Editar métricas" : "Registrar métricas"}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              <div className="ext-form-3" style={{ gap: 10 }}>
                <div>
                  <span style={label}>CLIENTE</span>
                  <select style={field} value={form.clienteId}
                    onChange={(e) => {
                      const c = clientes.find((c) => c.id === e.target.value);
                      setForm((p) => ({ ...p, clienteId: e.target.value, clienteNombre: c?.nombre ?? "" }));
                    }}>
                    <option value="">Selecciona…</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <span style={label}>PLATAFORMA</span>
                  <select style={field} value={form.plataforma}
                    onChange={(e) => setForm((p) => ({ ...p, plataforma: e.target.value as PlataformaMetrica }))}>
                    {PLATAFORMAS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <span style={label}>MES (YYYY-MM)</span>
                  <input type="month" style={field} value={form.mes}
                    onChange={(e) => setForm((p) => ({ ...p, mes: e.target.value }))} />
                </div>
              </div>

              <div className="ext-form-2" style={{ gap: 10 }}>
                {[
                  ["SEGUIDORES",        "seguidores"],
                  ["NUEVOS SEGS.",      "nuevosSeguidores"],
                  ["ALCANCE",           "alcance"],
                  ["IMPRESIONES",       "impresiones"],
                  ["PUBLICACIONES",     "publicaciones"],
                  ["GUARDADOS",         "guardados"],
                  ["CLICS AL PERFIL",   "clicsPerfil"],
                  ["INV. PUBLICITARIA", "invPubli"],
                  ["RETORNO GENERADO",  "retorno"],
                  ["LEADS",             "leads"],
                ].map(([lbl, key]) => (
                  <div key={key}>
                    <span style={label}>{lbl}</span>
                    <input type="number" min={0} style={field} {...n(key as keyof typeof form)} />
                  </div>
                ))}
                <div>
                  <span style={label}>ENGAGEMENT % (ej: 4.8)</span>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={100}
                    style={field}
                    value={form.engagementPct > 0 ? (form.engagementPct * 100).toFixed(1) : ""}
                    onChange={(e) => setForm((p) => ({ ...p, engagementPct: Number(e.target.value) / 100 }))}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <button type="button" onClick={() => setModalOpen(false)}
                  style={{ background: "#F3F4F6", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, cursor: "pointer", fontWeight: 600, color: "#374151" }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  style={{ background: P, color: "#fff", border: "none", borderRadius: 10, padding: "9px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
