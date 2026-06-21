"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createEvaluacion } from "@/lib/firestore/evaluaciones";
import { subscribeProyectos } from "@/lib/firestore/proyectos";
import { subscribeEmpleados } from "@/lib/firestore/empleados";
import { subscribeProveedores } from "@/lib/firestore/proveedores";
import StarRating from "@/components/tec-bi/StarRating";
import { fieldStyle, labelStyle } from "@/components/tec-bi/TecBiModal";
import { calcularCostoInterno } from "@/extensions/tec-bi/schema";
import type {
  Proyecto, Empleado, Proveedor,
  CumplimientoTiempo, MetricasCualitativas,
} from "@/extensions/tec-bi/schema";

const ACCENT = "#0EA5E9";
const MXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

const CUMPLIMIENTO: CumplimientoTiempo[] = ["A tiempo", "Temprano", "Tarde"];

const METRICAS_LABELS: { key: keyof MetricasCualitativas; label: string; desc: string }[] = [
  { key: "calidadGeneral",    label: "Calidad General",           desc: "Resultado final vs. estándar esperado" },
  { key: "creatividad",       label: "Creatividad y Originalidad", desc: "Propuestas creativas y soluciones innovadoras" },
  { key: "ejecucionTecnica",  label: "Ejecución Técnica",         desc: "Dominio técnico y calidad de producción" },
  { key: "alineacionBrief",   label: "Alineación con el Brief",   desc: "Qué tanto se respetó lo solicitado" },
];

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px)", border: "1px solid rgba(14,165,233,0.15)", borderRadius: 14, padding: "20px 22px", marginBottom: 16 }}>
    <h3 style={{ fontSize: 12, fontWeight: 700, color: ACCENT, letterSpacing: "0.5px", margin: "0 0 16px", textTransform: "uppercase" }}>{title}</h3>
    {children}
  </div>
);

export default function NuevaEvaluacionPage() {
  const router = useRouter();

  const [proyectos, setProyectos]     = useState<Proyecto[]>([]);
  const [empleados, setEmpleados]     = useState<Empleado[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  const [proyectoId, setProyectoId]   = useState("");
  const [proyectoActual, setProyectoActual] = useState<Proyecto | null>(null);
  const [asignado, setAsignado]       = useState<Empleado | Proveedor | null>(null);

  // Interno
  const [horasNormales, setHorasNormales] = useState(0);
  const [horasExtra, setHorasExtra]       = useState(0);

  // Externo
  const [costoCotizado, setCostoCotizado]     = useState(0);
  const [costoFinal, setCostoFinal]           = useState(0);
  const [horasEsfuerzo, setHorasEsfuerzo]     = useState(0);
  const [ratingComm, setRatingComm]           = useState(0);
  const [ratingCalidadPrecio, setRatingCalidadPrecio] = useState(0);

  // Compartido
  const [metricas, setMetricas] = useState<MetricasCualitativas>({
    calidadGeneral: 0, creatividad: 0, ejecucionTecnica: 0, alineacionBrief: 0,
  });
  const [valorProyecto, setValorProyecto]   = useState(0);
  const [unidades, setUnidades]             = useState(0);
  const [cumplimiento, setCumplimiento]     = useState<CumplimientoTiempo>("A tiempo");
  const [versiones, setVersiones]           = useState(1);
  const [feedback, setFeedback]             = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u1 = subscribeProyectos((d) => setProyectos(d));
    const u2 = subscribeEmpleados((d) => setEmpleados(d));
    const u3 = subscribeProveedores((d) => setProveedores(d));
    return () => { u1(); u2(); u3(); };
  }, []);

  // Cuando cambia el proyecto, detectar tipo y asignado
  useEffect(() => {
    const proy = proyectos.find((p) => p.id === proyectoId) ?? null;
    setProyectoActual(proy);
    if (proy) {
      const found = proy.tipoAsignacion === "Interno"
        ? empleados.find((e) => e.id === proy.asignadoId) ?? null
        : proveedores.find((v) => v.id === proy.asignadoId) ?? null;
      setAsignado(found);
    } else {
      setAsignado(null);
    }
  }, [proyectoId, proyectos, empleados, proveedores]);

  const tarifa = proyectoActual?.tipoAsignacion === "Interno"
    ? (asignado as Empleado)?.tarifaHora ?? 0
    : 0;

  const costoCalculado = proyectoActual?.tipoAsignacion === "Interno"
    ? calcularCostoInterno(horasNormales, horasExtra, tarifa)
    : 0;

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!proyectoActual) return;
    setSaving(true);
    try {
      const tipo = proyectoActual.tipoAsignacion;
      await createEvaluacion({
        proyectoId,
        tipo,
        datosInternos: tipo === "Interno" ? {
          horasNormales, horasExtra,
          costoTotal: costoCalculado,
        } : undefined,
        datosExternos: tipo === "Externo" ? {
          costoCotizado, costoFinal,
          horasEsfuerzoEstimadas: horasEsfuerzo,
          calificacionComunicacion: ratingComm,
          calificacionCalidadPrecio: ratingCalidadPrecio,
        } : undefined,
        metricas,
        valorProyecto,
        unidadesProducidas: unidades,
        cumplimientoTiempo: cumplimiento,
        numeroDVersiones: versiones,
        feedback,
        fecha: new Date(),
      });
      router.push("/tec-bi/evaluaciones");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const setMetrica = (key: keyof MetricasCualitativas, val: number) =>
    setMetricas((m) => ({ ...m, [key]: val }));

  const promedioActual = Object.values(metricas).every((v) => v > 0)
    ? (Object.values(metricas).reduce((a, b) => a + b, 0) / 4).toFixed(1)
    : null;

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.back()} style={{ background: "rgba(14,165,233,0.1)", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: ACCENT, cursor: "pointer", fontWeight: 600 }}>
          ← Volver
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>Nueva Evaluación</h1>
          <p style={{ fontSize: 12, color: "#888", margin: 0 }}>Califica el desempeño de un proyecto</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>

        {/* 1 — Selección de proyecto */}
        <Section title="1 · Proyecto a evaluar">
          <div>
            <label style={labelStyle}>PROYECTO</label>
            <select required style={fieldStyle} value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
              <option value="">Selecciona un proyecto…</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>{p.titulo}</option>
              ))}
            </select>
          </div>

          {proyectoActual && asignado && (
            <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ background: proyectoActual.tipoAsignacion === "Interno" ? "rgba(123,79,232,0.08)" : "rgba(255,159,10,0.08)", border: `1px solid ${proyectoActual.tipoAsignacion === "Interno" ? "rgba(123,79,232,0.2)" : "rgba(255,159,10,0.2)"}`, borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: proyectoActual.tipoAsignacion === "Interno" ? "#7B4FE8" : "#FF9F0A", marginBottom: 3 }}>
                  {proyectoActual.tipoAsignacion === "Interno" ? "👥 EMPLEADO" : "🏢 PROVEEDOR"}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F" }}>{asignado.nombre}</div>
                {proyectoActual.tipoAsignacion === "Interno" && tarifa > 0 && (
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Tarifa: {MXN.format(tarifa)}/h</div>
                )}
              </div>
              <div style={{ background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.15)", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: ACCENT, marginBottom: 3 }}>ALCANCE</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F" }}>{proyectoActual.tipoAlcance}</div>
              </div>
            </div>
          )}
        </Section>

        {/* 2 — Datos específicos por tipo */}
        {proyectoActual?.tipoAsignacion === "Interno" && (
          <Section title="2 · Datos de producción interna">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>HORAS NORMALES</label>
                <input type="number" min={0} required style={fieldStyle} value={horasNormales || ""} onChange={(e) => setHorasNormales(Number(e.target.value))} placeholder="0" />
              </div>
              <div>
                <label style={labelStyle}>HORAS EXTRA</label>
                <input type="number" min={0} style={fieldStyle} value={horasExtra || ""} onChange={(e) => setHorasExtra(Number(e.target.value))} placeholder="0" />
              </div>
            </div>
            {costoCalculado > 0 && (
              <div style={{ marginTop: 14, background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.2)", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#34C759", marginBottom: 2 }}>COSTO CALCULADO AUTOMÁTICAMENTE</div>
                  <div style={{ fontSize: 10, color: "#888" }}>
                    ({horasNormales}h × {MXN.format(tarifa)}) + ({horasExtra}h × {MXN.format(tarifa)} × 1.5)
                  </div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#34C759" }}>{MXN.format(costoCalculado)}</div>
              </div>
            )}
          </Section>
        )}

        {proyectoActual?.tipoAsignacion === "Externo" && (
          <Section title="2 · Datos del proveedor externo">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>COSTO COTIZADO (MXN)</label>
                <input type="number" min={0} required style={fieldStyle} value={costoCotizado || ""} onChange={(e) => setCostoCotizado(Number(e.target.value))} placeholder="0" />
              </div>
              <div>
                <label style={labelStyle}>COSTO FINAL FACTURADO (MXN)</label>
                <input type="number" min={0} required style={fieldStyle} value={costoFinal || ""} onChange={(e) => setCostoFinal(Number(e.target.value))} placeholder="0" />
              </div>
              <div>
                <label style={labelStyle}>HORAS DE ESFUERZO ESTIMADAS</label>
                <input type="number" min={0} style={fieldStyle} value={horasEsfuerzo || ""} onChange={(e) => setHorasEsfuerzo(Number(e.target.value))} placeholder="0" />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ ...labelStyle, marginBottom: 8 }}>COMUNICACIÓN</label>
                <StarRating value={ratingComm} onChange={setRatingComm} />
              </div>
              <div>
                <label style={{ ...labelStyle, marginBottom: 8 }}>RELACIÓN CALIDAD-PRECIO</label>
                <StarRating value={ratingCalidadPrecio} onChange={setRatingCalidadPrecio} />
              </div>
            </div>
            {costoFinal > 0 && costoCotizado > 0 && (
              <div style={{ marginTop: 14, background: costoFinal <= costoCotizado ? "rgba(52,199,89,0.08)" : "rgba(255,59,48,0.06)", border: `1px solid ${costoFinal <= costoCotizado ? "rgba(52,199,89,0.2)" : "rgba(255,59,48,0.2)"}`, borderRadius: 10, padding: "10px 16px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#666" }}>Diferencia cotizado vs. facturado</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: costoFinal <= costoCotizado ? "#34C759" : "#FF3B30" }}>
                  {costoFinal <= costoCotizado ? "−" : "+"}{MXN.format(Math.abs(costoFinal - costoCotizado))}
                </span>
              </div>
            )}
          </Section>
        )}

        {/* 3 — Métricas cualitativas */}
        {proyectoActual && (
          <Section title="3 · Métricas cualitativas (1-5)">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {METRICAS_LABELS.map(({ key, label, desc }) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F" }}>{label}</div>
                    <div style={{ fontSize: 11, color: "#999" }}>{desc}</div>
                  </div>
                  <StarRating value={metricas[key]} onChange={(v) => setMetrica(key, v)} size={26} />
                </div>
              ))}
            </div>
            {promedioActual && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(14,165,233,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#888" }}>Promedio calidad</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <StarRating value={Math.round(Number(promedioActual))} readonly size={18} />
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#FF9F0A" }}>{promedioActual}</span>
                </div>
              </div>
            )}
          </Section>
        )}

        {/* 4 — Métricas operativas */}
        {proyectoActual && (
          <Section title="4 · Métricas operativas">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>VALOR DEL PROYECTO (MXN)</label>
                <input type="number" min={0} style={fieldStyle} value={valorProyecto || ""} onChange={(e) => setValorProyecto(Number(e.target.value))} placeholder="0" />
              </div>
              <div>
                <label style={labelStyle}>UNIDADES PRODUCIDAS</label>
                <input type="number" min={0} style={fieldStyle} value={unidades || ""} onChange={(e) => setUnidades(Number(e.target.value))} placeholder="0" />
              </div>
              <div>
                <label style={labelStyle}>NÚMERO DE REVISIONES / VERSIONES</label>
                <input type="number" min={1} style={fieldStyle} value={versiones} onChange={(e) => setVersiones(Number(e.target.value))} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>CUMPLIMIENTO DE TIEMPOS</label>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                {CUMPLIMIENTO.map((c) => (
                  <button key={c} type="button" onClick={() => setCumplimiento(c)}
                    style={{ flex: 1, padding: "10px", borderRadius: 10, border: `2px solid ${cumplimiento === c ? (c === "A tiempo" ? "#34C759" : c === "Temprano" ? ACCENT : "#FF3B30") : "#e0e0e0"}`, background: cumplimiento === c ? (c === "A tiempo" ? "rgba(52,199,89,0.1)" : c === "Temprano" ? "rgba(14,165,233,0.1)" : "rgba(255,59,48,0.08)") : "white", color: cumplimiento === c ? (c === "A tiempo" ? "#34C759" : c === "Temprano" ? ACCENT : "#FF3B30") : "#888", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
                    {c === "A tiempo" ? "✅" : c === "Temprano" ? "🚀" : "⚠️"}<br />
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>FEEDBACK Y OBSERVACIONES</label>
              <textarea
                style={{ ...fieldStyle, minHeight: 90, resize: "vertical" }}
                placeholder="Describe el desempeño general, áreas de mejora, aspectos destacados…"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>
          </Section>
        )}

        {/* Submit */}
        {proyectoActual && (
          <button
            type="submit"
            disabled={saving || Object.values(metricas).some((v) => v === 0)}
            style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: saving || Object.values(metricas).some((v) => v === 0) ? "#ccc" : ACCENT, color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", transition: "background 0.2s" }}
          >
            {saving ? "Guardando evaluación…" : Object.values(metricas).some((v) => v === 0) ? "Completa las 4 métricas cualitativas" : "Guardar evaluación"}
          </button>
        )}
      </form>
    </div>
  );
}
