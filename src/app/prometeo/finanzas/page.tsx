"use client";

import { useState, useEffect, FormEvent } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  subscribeClientes, subscribeFinanzas, upsertFinanza,
  deleteFinanza, subscribeMetricas, calcKPIs,
} from "@/lib/marketing/firestore";
import type { SmmCliente, SmmFinanza, SmmMetrica } from "@/lib/marketing/types";

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

const MES_ACTUAL = new Date().toISOString().slice(0, 7);

const EMPTY_FIN = (clienteId = "", clienteNombre = ""): Omit<SmmFinanza, "id" | "createdAt" | "updatedAt"> => ({
  clienteId, clienteNombre, mes: MES_ACTUAL,
  honorarios: 0, gastos: 0, invPubli: 0, retorno: 0, leads: 0, horasMes: 0,
});

function KpiMini({ label, value, color = "#1D1D1F", sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(124,58,237,0.1)", padding: "14px 18px" }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.4px", margin: "0 0 6px" }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 800, color, margin: 0, letterSpacing: "-0.5px" }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: "#9CA3AF", margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );
}

export default function FinanzasPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [clientes,  setClientes]  = useState<SmmCliente[]>([]);
  const [finanzas,  setFinanzas]  = useState<SmmFinanza[]>([]);
  const [metricas,  setMetricas]  = useState<SmmMetrica[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [mes,       setMes]       = useState(MES_ACTUAL);
  const [modalOpen, setModalOpen] = useState(false);
  const [form,      setForm]      = useState(EMPTY_FIN());
  const [saving,    setSaving]    = useState(false);
  const [editId,    setEditId]    = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    subscribeClientes(activeWorkspaceId, setClientes);
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    setLoading(true);
    const u1 = subscribeFinanzas(activeWorkspaceId, mes, (data) => { setFinanzas(data); setLoading(false); });
    const u2 = subscribeMetricas(activeWorkspaceId, mes, setMetricas);
    return () => { u1(); u2(); };
  }, [activeWorkspaceId, mes]);

  const kpis = calcKPIs(metricas, finanzas);
  const fmt  = (n: number, pfx = "") => pfx + new Intl.NumberFormat("es-MX").format(Math.round(n));

  const openNew = () => { setEditId(null); setForm(EMPTY_FIN()); setModalOpen(true); };
  const openEdit = (f: SmmFinanza) => {
    setEditId(f.id ?? null);
    setForm({ clienteId: f.clienteId, clienteNombre: f.clienteNombre, mes: f.mes, honorarios: f.honorarios, gastos: f.gastos, invPubli: f.invPubli, retorno: f.retorno, leads: f.leads, horasMes: f.horasMes });
    setModalOpen(true);
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!activeWorkspaceId) return;
    setSaving(true);
    try {
      await upsertFinanza(activeWorkspaceId, form);
      setModalOpen(false);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (f: SmmFinanza) => {
    if (!activeWorkspaceId || !f.id) return;
    if (!confirm(`¿Eliminar registro de ${f.clienteNombre}?`)) return;
    await deleteFinanza(activeWorkspaceId, f.id);
  };

  const n = (key: keyof typeof form) => ({
    value: (form[key] as number) || "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [key]: Number(e.target.value) })),
  });

  return (
    <div className="tbi-page-enter" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1D1D1F", margin: 0 }}>💰 Finanzas</h1>
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: "4px 0 0" }}>Centro financiero — ingresos, ROAS y margen por cliente</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} style={{ ...field, width: "auto" }} />
          <button
            onClick={openNew}
            style={{ background: P, color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            + Registrar
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 12 }}>
        <KpiMini label="INGRESOS MES"    value={fmt(kpis.ingresos, "$")}                       color="#10B981" sub="Honorarios facturados" />
        <KpiMini label="GASTOS MES"      value={fmt(kpis.gastos, "$")}                         color="#EF4444" />
        <KpiMini label="MARGEN NETO"     value={fmt(kpis.margen, "$")}                         color={P}       sub={`${(kpis.margenPct*100).toFixed(1)}%`} />
        <KpiMini label="INV. PUBLICITARIA" value={fmt(kpis.invPubli, "$")}                     color="#3B82F6" />
        <KpiMini label="RETORNO"         value={fmt(kpis.retorno, "$")}                        color="#10B981" />
        <KpiMini label="ROAS"            value={`${kpis.roas.toFixed(2)}x`}                    color={kpis.roas >= 3 ? "#10B981" : "#EF4444"} sub="meta ≥ 3x" />
        <KpiMini label="CPL"             value={kpis.cpl > 0 ? fmt(kpis.cpl, "$") : "—"}      color={kpis.cpl > 0 && kpis.cpl <= 100 ? "#10B981" : "#EF4444"} sub="meta ≤ $100" />
        <KpiMini label="LEADS"           value={String(kpis.leads)}                             color="#7C3AED" />
      </div>

      {/* Per-client table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9CA3AF" }}>Cargando finanzas…</div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(124,58,237,0.1)", overflowX: "auto" }}>
          {finanzas.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "#9CA3AF" }}>
              Sin registros para este mes. ¡Agrega el primero!
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
              <thead>
                <tr style={{ background: "#FAFAFA" }}>
                  {["Cliente","Honorarios","Gastos","Margen","Margen%","Inv. Publi.","Retorno","ROAS","CPL","Leads","Hrs/mes","$/hr",""].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.4px", borderBottom: "1px solid #F3F0FF", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {finanzas.map((f, i) => {
                  const margen    = f.honorarios - f.gastos;
                  const margenPct = f.honorarios > 0 ? margen / f.honorarios : 0;
                  const roas      = f.invPubli > 0 ? f.retorno / f.invPubli : 0;
                  const cpl       = f.leads > 0 ? f.invPubli / f.leads : 0;
                  const tarifaHr  = f.horasMes > 0 ? f.honorarios / f.horasMes : 0;
                  return (
                    <tr key={f.id} style={{ borderBottom: i < finanzas.length - 1 ? "1px solid #F9F7FF" : "none" }}>
                      <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 700, color: "#1D1D1F", whiteSpace: "nowrap" }}>{f.clienteNombre}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: "#10B981", fontWeight: 600 }}>{fmt(f.honorarios, "$")}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: "#EF4444" }}>{fmt(f.gastos, "$")}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: P, fontWeight: 600 }}>{fmt(margen, "$")}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: margenPct >= 0.5 ? "#10B981" : "#F59E0B", fontWeight: 600 }}>{(margenPct*100).toFixed(1)}%</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: "#3B82F6" }}>{fmt(f.invPubli, "$")}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: "#10B981" }}>{fmt(f.retorno, "$")}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 700, color: roas >= 3 ? "#10B981" : "#EF4444" }}>{roas > 0 ? roas.toFixed(2)+"x" : "—"}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: cpl > 0 && cpl <= 100 ? "#10B981" : "#F59E0B" }}>{cpl > 0 ? fmt(cpl, "$") : "—"}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: "#374151" }}>{f.leads}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: "#374151" }}>{f.horasMes}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: P, fontWeight: 600 }}>{tarifaHr > 0 ? fmt(tarifaHr, "$") : "—"}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button onClick={() => openEdit(f)} style={{ background: "rgba(124,58,237,0.08)", border: "none", borderRadius: 6, padding: "4px 9px", fontSize: 11, color: P, cursor: "pointer", fontWeight: 600 }}>✏️</button>
                          <button onClick={() => handleDelete(f)} style={{ background: "rgba(239,68,68,0.08)", border: "none", borderRadius: 6, padding: "4px 9px", fontSize: 11, color: "#EF4444", cursor: "pointer" }}>✕</button>
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
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}
          onClick={(ev) => ev.target === ev.currentTarget && setModalOpen(false)}
        >
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: "#1D1D1F", margin: "0 0 20px" }}>
              {editId ? "Editar registro" : "Nuevo registro financiero"}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

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
                  <span style={lbl}>MES (YYYY-MM)</span>
                  <input type="month" style={field} value={form.mes}
                    onChange={(ev) => setForm((p) => ({ ...p, mes: ev.target.value }))} />
                </div>
              </div>

              <div className="ext-form-2" style={{ gap: 10 }}>
                {[
                  ["HONORARIOS MXN",      "honorarios"],
                  ["GASTOS MXN",          "gastos"],
                  ["INV. PUBLICITARIA",   "invPubli"],
                  ["RETORNO GENERADO",    "retorno"],
                  ["LEADS GENERADOS",     "leads"],
                  ["HORAS/MES",           "horasMes"],
                ].map(([label, key]) => (
                  <div key={key}>
                    <span style={lbl}>{label}</span>
                    <input type="number" min={0} style={field} {...n(key as keyof typeof form)} />
                  </div>
                ))}
              </div>

              {/* Calculated preview */}
              {(form.honorarios > 0 || form.invPubli > 0) && (
                <div className="ext-form-3" style={{ background: "#F5F3FF", borderRadius: 10, padding: "12px 14px", gap: 8 }}>
                  {[
                    ["Margen", `$${fmt(form.honorarios - form.gastos)}`],
                    ["ROAS", form.invPubli > 0 ? `${(form.retorno / form.invPubli).toFixed(2)}x` : "—"],
                    ["CPL", form.leads > 0 ? `$${fmt(form.invPubli / form.leads)}` : "—"],
                  ].map(([k, v]) => (
                    <div key={k} style={{ textAlign: "center" }}>
                      <p style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, margin: "0 0 2px" }}>{k}</p>
                      <p style={{ fontSize: 15, fontWeight: 800, color: P, margin: 0 }}>{v}</p>
                    </div>
                  ))}
                </div>
              )}

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
