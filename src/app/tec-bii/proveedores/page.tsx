"use client";

import { useState, useEffect } from "react";
import { useAuth }             from "@/contexts/AuthContext";
import PageGuard               from "@/components/tec-bi/PageGuard";
import {
  subscribeProveedoresV2,
  createProveedorV2,
  updateProveedorV2,
  deleteProveedorV2,
} from "@/lib/tec-bii/firestore";
import { EMPTY_FOOTPRINT }     from "@/extensions/tec-bii/schema";
import type { ProveedorV2, TipoServicio } from "@/extensions/tec-bii/schema";

const ACCENT  = "#10B981";
const ACCENT2 = "#059669";

const TIPOS_SERVICIO: TipoServicio[] = [
  "Animación 3D", "Edición y Post-producción", "Motion Graphics",
  "Fotografía", "Producción de Audio", "Diseño Gráfico",
  "Transmisión en Vivo", "Renta de Equipo", "Otro",
];

const EMPTY_FORM = {
  nombre:       "",
  tipoServicio: "Edición y Post-producción" as TipoServicio,
  email:        "",
  telefono:     "",
  activo:       true,
};
type FormState = typeof EMPTY_FORM;

function reliabilityColor(r?: number): string {
  if (!r) return "rgba(226,232,240,0.3)";
  if (r >= 0.8) return "#10B981";
  if (r >= 0.5) return "#F59E0B";
  return "#EF4444";
}

function ProveedorCard({ p, onEdit, onDelete }: {
  p: ProveedorV2;
  onEdit:   (v: ProveedorV2) => void;
  onDelete: (id: string)    => void;
}) {
  const [hover, setHover] = useState(false);
  const [menu,  setMenu]  = useState(false);
  const rel = p.reliabilityScore;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setMenu(false); }}
      style={{
        background:   hover ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.02)",
        border:       `1px solid ${hover ? ACCENT + "33" : "rgba(255,255,255,0.06)"}`,
        borderLeft:   `3px solid ${p.activo ? ACCENT : "rgba(255,255,255,0.12)"}`,
        borderRadius: 14,
        padding:      "16px 18px",
        transition:   "all 0.2s",
        position:     "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
          background: `linear-gradient(135deg, ${ACCENT}30, ${ACCENT2}20)`,
          border: `1px solid ${ACCENT}33`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, color: ACCENT, fontWeight: 800,
        }}>
          {p.nombre.charAt(0).toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0" }}>{p.nombre}</span>
            {!p.activo && (
              <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(226,232,240,0.35)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 99, padding: "1px 6px" }}>
                INACTIVO
              </span>
            )}
            {p.nexoNodeId && (
              <span style={{ fontSize: 9, fontWeight: 700, color: "#6366F1", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 99, padding: "1px 6px" }}>
                ✦ NEXO
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 11, color: "rgba(226,232,240,0.45)" }}>{p.tipoServicio}</p>
        </div>

        <div style={{ position: "relative" }}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenu(!menu); }}
            style={{ background: "transparent", border: "none", color: "rgba(226,232,240,0.3)", cursor: "pointer", padding: "4px 6px", fontSize: 16 }}
          >···</button>
          {menu && (
            <div style={{ position: "absolute", right: 0, top: "100%", zIndex: 50, background: "#1E2035", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden", minWidth: 130, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
              <button onClick={() => { setMenu(false); onEdit(p); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "transparent", border: "none", color: "#E2E8F0", fontSize: 12, cursor: "pointer" }}>✎ Editar</button>
              <button onClick={() => { setMenu(false); onDelete(p.id!); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "transparent", border: "none", color: "#EF4444", fontSize: 12, cursor: "pointer" }}>🗑 Eliminar</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
        {p.email && <span style={{ fontSize: 10, color: "rgba(226,232,240,0.4)" }}>✉ {p.email}</span>}
        {p.telefono && <span style={{ fontSize: 10, color: "rgba(226,232,240,0.4)" }}>📞 {p.telefono}</span>}
        {rel !== undefined && (
          <span style={{ fontSize: 10, fontWeight: 700, color: reliabilityColor(rel), marginLeft: "auto" }}>
            ★ {Math.round(rel * 100)}% fiabilidad
          </span>
        )}
      </div>

      {p.costPrediction && (
        <p style={{ margin: "8px 0 0", fontSize: 11, color: "rgba(226,232,240,0.35)" }}>
          Costo estimado: ${p.costPrediction.minMXN.toLocaleString("es-MX")} – ${p.costPrediction.maxMXN.toLocaleString("es-MX")} MXN
        </p>
      )}

      {p.aiSummary && (
        <p style={{ margin: "10px 0 0", fontSize: 11, color: "rgba(226,232,240,0.45)", lineHeight: 1.55, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 8 }}>
          {p.aiSummary}
        </p>
      )}
    </div>
  );
}

function ProveedorModal({ initial, onClose, onSave }: {
  initial?: ProveedorV2;
  onClose:  () => void;
  onSave:   (d: FormState) => Promise<void>;
}) {
  const [form, setForm]     = useState<FormState>(
    initial
      ? { nombre: initial.nombre, tipoServicio: initial.tipoServicio, email: initial.email, telefono: initial.telefono, activo: initial.activo }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const f = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return setError("El nombre es requerido");
    setSaving(true); setError(null);
    try { await onSave(form); onClose(); }
    catch { setError("No se pudo guardar. Intenta de nuevo."); }
    finally { setSaving(false); }
  };

  const INPUT = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 12px", fontSize: 13, color: "#E2E8F0", width: "100%", outline: "none", boxSizing: "border-box" as const };
  const LABEL = { display: "block" as const, fontSize: 11, color: "rgba(226,232,240,0.4)", marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: "0.06em", fontWeight: 700 as const };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ background: "#141626", border: `1px solid ${ACCENT}33`, borderRadius: 20, padding: "28px 28px 24px", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: `0 0 60px ${ACCENT}20` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <span style={{ fontSize: 22 }}>🏢</span>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#E2E8F0" }}>{initial ? "Editar proveedor" : "Registrar proveedor"}</h2>
            <p style={{ margin: 0, fontSize: 11, color: `${ACCENT}99` }}>TEC Bii · Proveedores</p>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={LABEL}>Nombre / Empresa *</label>
              <input style={INPUT} placeholder="Ej: Produmax MX" value={form.nombre} onChange={(e) => f("nombre", e.target.value)} autoFocus />
            </div>
            <div>
              <label style={LABEL}>Tipo de servicio</label>
              <select style={{ ...INPUT, cursor: "pointer" }} value={form.tipoServicio} onChange={(e) => f("tipoServicio", e.target.value as TipoServicio)}>
                {TIPOS_SERVICIO.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={LABEL}>Email</label>
                <input style={INPUT} type="email" placeholder="contacto@proveedor.com" value={form.email} onChange={(e) => f("email", e.target.value)} />
              </div>
              <div>
                <label style={LABEL}>Teléfono</label>
                <input style={INPUT} placeholder="81 1234 5678" value={form.telefono} onChange={(e) => f("telefono", e.target.value)} />
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
              <input type="checkbox" checked={form.activo} onChange={(e) => f("activo", e.target.checked)} style={{ accentColor: ACCENT }} />
              <span style={{ fontSize: 13, color: "#E2E8F0" }}>Proveedor activo</span>
            </label>
          </div>
          {error && <p style={{ margin: "14px 0 0", fontSize: 12, color: "#EF4444" }}>⚠ {error}</p>}
          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 12, fontSize: 13, fontWeight: 600, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(226,232,240,0.5)", cursor: "pointer" }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: "10px", borderRadius: 12, fontSize: 13, fontWeight: 700, background: saving ? `${ACCENT}40` : `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, border: "none", color: saving ? `${ACCENT}60` : "#fff", cursor: saving ? "not-allowed" : "pointer", boxShadow: saving ? "none" : `0 0 20px ${ACCENT}40` }}>
              {saving ? "Guardando…" : initial ? "Guardar cambios" : "✓ Registrar proveedor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProveedoresPage() {
  const { user }                        = useAuth();
  const [proveedores, setProveedores]   = useState<ProveedorV2[]>([]);
  const [showModal, setShowModal]       = useState(false);
  const [editing, setEditing]           = useState<ProveedorV2 | null>(null);
  const [search, setSearch]             = useState("");
  const [filterActivo, setFilterActivo] = useState<"todos" | "activos" | "inactivos">("activos");

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    return subscribeProveedoresV2(uid, setProveedores);
  }, [user?.uid]);

  const uid = user?.uid ?? "";

  const handleCreate = async (form: FormState) => {
    await createProveedorV2(uid, { ...EMPTY_FOOTPRINT, ...form, proyectosTotales: 0 });
  };

  const handleEdit = async (form: FormState) => {
    if (!editing?.id) return;
    await updateProveedorV2(uid, editing.id, form);
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este proveedor?")) return;
    await deleteProveedorV2(uid, id);
  };

  const filtered = proveedores
    .filter((p) => {
      if (filterActivo === "activos"   && !p.activo) return false;
      if (filterActivo === "inactivos" &&  p.activo) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.nombre.toLowerCase().includes(q) || p.tipoServicio.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const activos  = proveedores.filter((p) => p.activo).length;
  const enGrafo  = proveedores.filter((p) => !!p.nexoNodeId).length;
  const conHistorial = proveedores.filter((p) => (p.proyectosTotales ?? 0) > 0).length;

  return (
    <>
      <PageGuard section="proveedores" />
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <div>
              <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#E2E8F0" }}>🏢 Proveedores</h1>
              <p style={{ margin: 0, fontSize: 12, color: `${ACCENT}B0`, fontWeight: 600 }}>TEC Bii · Red de Proveedores</p>
            </div>
            <button
              onClick={() => { setEditing(null); setShowModal(true); }}
              style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, border: "none", borderRadius: 12, padding: "10px 22px", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: `0 0 20px ${ACCENT}40` }}
            >+ Registrar proveedor</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          {[
            { label: "Activos",       value: activos,      color: "#10B981" },
            { label: "En grafo NEXO", value: enGrafo,      color: "#6366F1" },
            { label: "Con historial", value: conHistorial, color: "#F59E0B" },
            { label: "Total",         value: proveedores.length, color: ACCENT },
          ].map((k) => (
            <div key={k.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 18px", flex: "1 1 110px" }}>
              <p style={{ margin: "0 0 3px", fontSize: 9, color: "rgba(226,232,240,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{k.label}</p>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <input
            placeholder="Buscar por nombre o servicio…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "9px 14px", fontSize: 13, color: "#E2E8F0", outline: "none" }}
          />
          {(["todos", "activos", "inactivos"] as const).map((f) => (
            <button key={f} onClick={() => setFilterActivo(f)} style={{ padding: "9px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600, background: filterActivo === f ? `${ACCENT}20` : "rgba(255,255,255,0.03)", border: filterActivo === f ? `1px solid ${ACCENT}44` : "1px solid rgba(255,255,255,0.07)", color: filterActivo === f ? ACCENT : "rgba(226,232,240,0.45)", cursor: "pointer", textTransform: "capitalize" }}>{f}</button>
          ))}
        </div>

        {proveedores.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 24px", background: `${ACCENT}08`, border: `1px solid ${ACCENT}18`, borderRadius: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${ACCENT}30, ${ACCENT2}15)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 20px", boxShadow: `0 0 30px ${ACCENT}20` }}>🏢</div>
            <h2 style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 800, color: "#E2E8F0" }}>Sin proveedores registrados</h2>
            <p style={{ margin: "0 0 24px", fontSize: 13, color: "rgba(226,232,240,0.35)", maxWidth: 380, lineHeight: 1.6 }}>
              Registra tus proveedores y SOFIAA generará perfiles cognitivos con predicción de costos y fiabilidad.
            </p>
            <button onClick={() => setShowModal(true)} style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, border: "none", borderRadius: 12, padding: "11px 28px", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: `0 0 24px ${ACCENT}40` }}>+ Registrar primer proveedor</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 24px", color: "rgba(226,232,240,0.3)", fontSize: 13 }}>Sin resultados para &quot;{search}&quot;</div>
        ) : (
          <>
            <p style={{ margin: "0 0 14px", fontSize: 10, fontWeight: 700, color: "rgba(226,232,240,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {filtered.length} proveedor{filtered.length !== 1 ? "es" : ""}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
              {filtered.map((p) => (
                <ProveedorCard key={p.id} p={p} onEdit={(v) => { setEditing(v); setShowModal(true); }} onDelete={handleDelete} />
              ))}
            </div>
          </>
        )}

        {showModal && (
          <ProveedorModal
            initial={editing ?? undefined}
            onClose={() => { setShowModal(false); setEditing(null); }}
            onSave={editing ? handleEdit : handleCreate}
          />
        )}

        <p style={{ marginTop: 32, textAlign: "center", fontSize: 11, color: "rgba(226,232,240,0.15)" }}>TEC Bii v2 · Proveedores · RUMBO A TIER 4</p>
      </div>
    </>
  );
}
