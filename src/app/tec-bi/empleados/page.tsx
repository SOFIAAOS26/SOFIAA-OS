"use client";

import { useState, useEffect, FormEvent } from "react";
import TecBiModal, {
  fieldStyle, labelStyle, formGrid, formRow, SubmitBtn,
} from "@/components/tec-bi/TecBiModal";
import {
  subscribeEmpleados, createEmpleado, updateEmpleado, toggleEmpleado,
} from "@/lib/firestore/empleados";
import type { Empleado } from "@/extensions/tec-bi/schema";

const ACCENT = "#0EA5E9";
const MXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

const EMPTY: Omit<Empleado, "id" | "createdAt" | "updatedAt"> = {
  nombre: "", puesto: "", departamento: "",
  tarifaHora: 0, salarioMensual: 0, activo: true,
};

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [soloActivos, setSoloActivos] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Empleado | null>(null);
  const [form, setForm]           = useState({ ...EMPTY });
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    const unsub = subscribeEmpleados((data) => {
      setEmpleados(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = empleados.filter((e) => {
    if (soloActivos && !e.activo) return false;
    const q = search.toLowerCase();
    return (
      e.nombre.toLowerCase().includes(q) ||
      e.puesto.toLowerCase().includes(q) ||
      e.departamento.toLowerCase().includes(q)
    );
  });

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setModalOpen(true);
  };

  const openEdit = (e: Empleado) => {
    setEditing(e);
    setForm({
      nombre: e.nombre, puesto: e.puesto, departamento: e.departamento,
      tarifaHora: e.tarifaHora, salarioMensual: e.salarioMensual, activo: e.activo,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    try {
      if (editing?.id) {
        await updateEmpleado(editing.id, form);
      } else {
        await createEmpleado(form);
      }
      setModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof form) => ({
    value: form[key] as string | number,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: key === "tarifaHora" || key === "salarioMensual" ? Number(e.target.value) : e.target.value })),
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>👥 Empleados</h1>
          <p style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            {filtered.length} {soloActivos ? "activos" : "registros"}
          </p>
        </div>
        <button
          onClick={openNew}
          style={{
            background: ACCENT, color: "#fff", border: "none",
            borderRadius: 10, padding: "9px 18px",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          + Nuevo empleado
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, puesto o departamento…"
          style={{ ...fieldStyle, maxWidth: 320, flex: 1 }}
        />
        <button
          onClick={() => setSoloActivos((v) => !v)}
          style={{
            padding: "9px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
            border: `1px solid ${soloActivos ? ACCENT : "#ddd"}`,
            background: soloActivos ? `rgba(14,165,233,0.08)` : "white",
            color: soloActivos ? ACCENT : "#888", cursor: "pointer",
          }}
        >
          {soloActivos ? "✓ Solo activos" : "Todos"}
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ color: "#aaa", fontSize: 13 }}>Cargando…</p>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 0",
          background: "rgba(255,255,255,0.6)", borderRadius: 14,
          border: "1px dashed rgba(14,165,233,0.2)",
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
          <p style={{ color: "#888", fontSize: 13 }}>
            {search ? "Sin resultados" : "Aún no hay empleados registrados"}
          </p>
          {!search && (
            <button onClick={openNew} style={{ marginTop: 12, color: ACCENT, background: "none", border: "none", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
              + Agregar el primero
            </button>
          )}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid rgba(14,165,233,0.15)" }}>
                {["Nombre", "Puesto", "Departamento", "Tarifa/h", "Salario", "Proyectos", "Calidad", ""].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#888", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  style={{
                    borderBottom: "1px solid rgba(14,165,233,0.08)",
                    background: e.activo ? "transparent" : "rgba(0,0,0,0.02)",
                    opacity: e.activo ? 1 : 0.5,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(ev) => (ev.currentTarget.style.background = "rgba(14,165,233,0.04)")}
                  onMouseLeave={(ev) => (ev.currentTarget.style.background = e.activo ? "transparent" : "rgba(0,0,0,0.02)")}
                >
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1D1D1F" }}>{e.nombre}</td>
                  <td style={{ padding: "10px 12px", color: "#444" }}>{e.puesto}</td>
                  <td style={{ padding: "10px 12px", color: "#666" }}>{e.departamento}</td>
                  <td style={{ padding: "10px 12px", color: "#444", whiteSpace: "nowrap" }}>{MXN.format(e.tarifaHora)}</td>
                  <td style={{ padding: "10px 12px", color: "#444", whiteSpace: "nowrap" }}>{MXN.format(e.salarioMensual)}</td>
                  <td style={{ padding: "10px 12px", color: "#888" }}>{e.proyectosTotales ?? 0}</td>
                  <td style={{ padding: "10px 12px" }}>
                    {e.calidadPromedio ? (
                      <span style={{ color: ACCENT, fontWeight: 600 }}>{e.calidadPromedio.toFixed(1)} ⭐</span>
                    ) : (
                      <span style={{ color: "#ccc" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => openEdit(e)}
                        style={{ background: "rgba(14,165,233,0.1)", border: "none", borderRadius: 7, padding: "5px 10px", fontSize: 11, cursor: "pointer", color: ACCENT, fontWeight: 600 }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => e.id && toggleEmpleado(e.id, !e.activo)}
                        style={{ background: e.activo ? "rgba(255,59,48,0.08)" : "rgba(52,199,89,0.1)", border: "none", borderRadius: 7, padding: "5px 10px", fontSize: 11, cursor: "pointer", color: e.activo ? "#FF3B30" : "#34C759", fontWeight: 600 }}
                      >
                        {e.activo ? "Desactivar" : "Activar"}
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
      <TecBiModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar empleado" : "Nuevo empleado"}
      >
        <form onSubmit={handleSubmit}>
          <div style={formGrid}>
            <div style={{ ...formRow, gridColumn: "1 / -1" }}>
              <label style={labelStyle}>NOMBRE COMPLETO</label>
              <input required style={fieldStyle} placeholder="Ej. Ana García López" {...field("nombre")} />
            </div>
            <div style={formRow}>
              <label style={labelStyle}>PUESTO</label>
              <input required style={fieldStyle} placeholder="Ej. Editor de Video" {...field("puesto")} />
            </div>
            <div style={formRow}>
              <label style={labelStyle}>DEPARTAMENTO</label>
              <input required style={fieldStyle} placeholder="Ej. Producción" {...field("departamento")} />
            </div>
            <div style={formRow}>
              <label style={labelStyle}>TARIFA POR HORA (MXN)</label>
              <input required type="number" min={0} step={0.01} style={fieldStyle} placeholder="150.00" {...field("tarifaHora")} />
            </div>
            <div style={formRow}>
              <label style={labelStyle}>SALARIO MENSUAL (MXN)</label>
              <input required type="number" min={0} style={fieldStyle} placeholder="25000" {...field("salarioMensual")} />
            </div>
          </div>
          {editing && (
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                id="activo"
                checked={form.activo as boolean}
                onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
              />
              <label htmlFor="activo" style={{ fontSize: 13, color: "#444" }}>Empleado activo</label>
            </div>
          )}
          <SubmitBtn loading={saving} label={editing ? "Guardar cambios" : "Crear empleado"} />
        </form>
      </TecBiModal>
    </div>
  );
}
