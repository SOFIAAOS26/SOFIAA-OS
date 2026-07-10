"use client";

/**
 * TEC Bii — Simulador ROI V2 (Sprint T2-7)
 * RUMBO A TIER 4
 *
 * Calcula el ROI real de la producción audiovisual:
 *  - Valor generado por proyectos entregados
 *  - Costos (horas internas + proveedores externos)
 *  - ROI = (Valor - Costo) / Costo × 100
 *  - Impacto institucional estimado
 */

import { useState, useEffect } from "react";
import { useAuth }             from "@/contexts/AuthContext";
import PageGuard               from "@/components/tec-bi/PageGuard";
import {
  subscribeProyectosV2,
  subscribeEvaluacionesV2,
  subscribeEmpleadosV2,
} from "@/lib/tec-bii/firestore";
import type {
  ProyectoV2,
  EvaluacionV2,
  EmpleadoV2,
} from "@/extensions/tec-bii/schema";

const ACCENT  = "#6366F1";
const ACCENT2 = "#8B5CF6";

const MXN = new Intl.NumberFormat("es-MX", {
  style:                 "currency",
  currency:              "MXN",
  maximumFractionDigits: 0,
});

function KpiCard({
  label, value, sub, color, icon,
}: {
  label: string; value: string | number; sub?: string; color?: string; icon?: string;
}) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: `1px solid ${color ? color + "25" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 14, padding: "16px 20px", flex: "1 1 160px",
    }}>
      {icon && <p style={{ margin: "0 0 6px", fontSize: 20 }}>{icon}</p>}
      <p style={{ margin: "0 0 4px", fontSize: 10, color: "rgba(226,232,240,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: color ?? "#E2E8F0", lineHeight: 1.1 }}>{value}</p>
      {sub && <p style={{ margin: "3px 0 0", fontSize: 10, color: "rgba(226,232,240,0.3)" }}>{sub}</p>}
    </div>
  );
}

function RoiGauge({ roi }: { roi: number }) {
  const clamped = Math.min(Math.max(roi, -100), 400);
  const pct     = (clamped + 100) / 500 * 100;
  const color   = roi >= 100 ? "#10B981" : roi >= 0 ? "#F59E0B" : "#EF4444";
  const label   = roi >= 200 ? "Excelente" : roi >= 100 ? "Muy bueno" : roi >= 50 ? "Bueno" : roi >= 0 ? "Positivo" : "Negativo";
  return (
    <div style={{ textAlign: "center", padding: "24px 20px" }}>
      <p style={{ margin: "0 0 6px", fontSize: 48, fontWeight: 900, color, lineHeight: 1 }}>
        {roi > 0 ? "+" : ""}{roi.toFixed(0)}%
      </p>
      <p style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color }}>ROI {label}</p>
      <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", maxWidth: 300, margin: "0 auto" }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 99,
          background: `linear-gradient(90deg, #EF4444, ${color})`,
          transition: "width 0.6s",
          boxShadow: `0 0 10px ${color}66`,
        }} />
      </div>
      <p style={{ margin: "6px 0 0", fontSize: 10, color: "rgba(226,232,240,0.25)" }}>
        −100% ←──────────────────────→ +400%
      </p>
    </div>
  );
}

export default function RoiPage() {
  const { user }                  = useAuth();
  const [proyectos, setProyectos] = useState<ProyectoV2[]>([]);
  const [evals,     setEvals]     = useState<EvaluacionV2[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoV2[]>([]);

  // Parámetros del simulador (ajustables por el usuario)
  const [tarifaHoraDefault, setTarifaHoraDefault] = useState<number>(150);
  const [multiplicadorExt,  setMultiplicadorExt]  = useState<number>(1.3);  // overhead proveedor externo
  const [valorInstitucional, setValorInstitucional] = useState<number>(2.5); // multiplicador impacto TEC

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    const u1 = subscribeProyectosV2(uid,  setProyectos);
    const u2 = subscribeEvaluacionesV2(uid, setEvals);
    const u3 = subscribeEmpleadosV2(uid,  setEmpleados);
    return () => { u1(); u2(); u3(); };
  }, [user?.uid]);

  // ── Cálculos ──────────────────────────────────────────────────────────────────

  const evalMap = evals.reduce<Record<string, EvaluacionV2[]>>((acc, e) => {
    acc[e.proyectoId] = [...(acc[e.proyectoId] ?? []), e];
    return acc;
  }, {});

  // Tarifa promedio real del equipo (o fallback al default)
  const tarifaEquipo = empleados.length > 0 && empleados.some((e) => e.tarifaHora > 0)
    ? empleados.filter((e) => e.tarifaHora > 0).reduce((s, e) => s + e.tarifaHora, 0) /
      empleados.filter((e) => e.tarifaHora > 0).length
    : tarifaHoraDefault;

  // Proyectos entregados con evaluación
  const proyectosEntregados = proyectos.filter((p) =>
    p.estado === "Entregado" && evalMap[p.id ?? ""]
  );

  // Para cada proyecto entregado, calcular valor y costo
  const rows = proyectosEntregados.map((p) => {
    const evs = evalMap[p.id ?? ""] ?? [];

    const valorDirecto = evs.reduce((s, e) => s + (e.valorProyecto ?? 0), 0) || (p.valorEstimado ?? 0);

    // Costo interno: horas × tarifa
    const horasNormales = evs.reduce((s, e) => s + (e.datosInternos?.horasNormales ?? 0), 0);
    const horasExtra    = evs.reduce((s, e) => s + (e.datosInternos?.horasExtra ?? 0), 0);
    const costoInterno  = (horasNormales + horasExtra * 1.5) * tarifaEquipo;

    // Costo externo: costo final del proveedor
    const costoExterno  = evs.reduce((s, e) => s + (e.datosExternos?.costoFinal ?? 0), 0) * multiplicadorExt;

    const costoTotal   = costoInterno + costoExterno;
    const valorInst    = valorDirecto * valorInstitucional;
    const roi          = costoTotal > 0 ? ((valorInst - costoTotal) / costoTotal) * 100 : 0;

    const promCalidad  = evs.length > 0
      ? evs.reduce((s, e) => s + (e.metricas.calidadGeneral + e.metricas.creatividad + e.metricas.ejecucionTecnica + e.metricas.alineacionBrief) / 4, 0) / evs.length
      : 0;

    return { p, evs, valorDirecto, costoInterno, costoExterno, costoTotal, valorInst, roi, promCalidad, horasNormales, horasExtra };
  });

  // Totales
  const totalValor     = rows.reduce((s, r) => s + r.valorInst, 0);
  const totalCosto     = rows.reduce((s, r) => s + r.costoTotal, 0);
  const roiTotal       = totalCosto > 0 ? ((totalValor - totalCosto) / totalCosto) * 100 : 0;
  const totalHoras     = rows.reduce((s, r) => s + r.horasNormales + r.horasExtra, 0);
  const totalUnidades  = evals.reduce((s, e) => s + (e.unidadesProducidas ?? 0), 0);

  // Todos los proyectos (no solo entregados) para contexto
  const totalProyectos    = proyectos.length;
  const proyEntregados    = proyectos.filter((p) => p.estado === "Entregado").length;
  const proyEnProduccion  = proyectos.filter((p) => p.estado === "En producción").length;

  const inputS: React.CSSProperties = {
    width: "100%", padding: "7px 10px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8, fontSize: 13, color: "#E2E8F0", outline: "none",
  };
  const labelS: React.CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 700, color: "rgba(226,232,240,0.4)",
    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5,
  };

  return (
    <>
      <PageGuard section="roi" />
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#E2E8F0" }}>💰 Simulador ROI</h1>
          <p style={{ margin: 0, fontSize: 12, color: `${ACCENT}B0`, fontWeight: 600 }}>
            TEC Bii · Retorno sobre Inversión · RUMBO A TIER 4
          </p>
        </div>

        {/* Parámetros del simulador */}
        <div style={{
          background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 14, padding: "18px 20px", marginBottom: 24,
        }}>
          <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 700, color: `${ACCENT}99`, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            ✦ Parámetros del simulador
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div>
              <label style={labelS}>Tarifa/hora fallback (MXN)</label>
              <input style={inputS} type="number" min={0} value={tarifaHoraDefault}
                onChange={(e) => setTarifaHoraDefault(Number(e.target.value))} />
              <p style={{ margin: "4px 0 0", fontSize: 10, color: "rgba(226,232,240,0.25)" }}>
                Tarifa real del equipo: {MXN.format(tarifaEquipo)}/h ({empleados.filter((e) => e.tarifaHora > 0).length} empleados con tarifa)
              </p>
            </div>
            <div>
              <label style={labelS}>Overhead proveedor externo</label>
              <input style={inputS} type="number" min={1} step={0.1} value={multiplicadorExt}
                onChange={(e) => setMultiplicadorExt(Number(e.target.value))} />
              <p style={{ margin: "4px 0 0", fontSize: 10, color: "rgba(226,232,240,0.25)" }}>
                Ej: 1.3 = costo × 1.3 (gestión + overhead)
              </p>
            </div>
            <div>
              <label style={labelS}>Multiplicador valor institucional</label>
              <input style={inputS} type="number" min={1} step={0.5} value={valorInstitucional}
                onChange={(e) => setValorInstitucional(Number(e.target.value))} />
              <p style={{ margin: "4px 0 0", fontSize: 10, color: "rgba(226,232,240,0.25)" }}>
                Valor estratégico del TEC Monterrey
              </p>
            </div>
          </div>
        </div>

        {/* ROI gauge principal */}
        {rows.length > 0 ? (
          <>
            <div style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 18, marginBottom: 20,
            }}>
              <RoiGauge roi={roiTotal} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "0 20px 20px" }}>
                <KpiCard label="Valor institucional"   value={MXN.format(totalValor)}  color="#10B981"  icon="📈" sub={`×${valorInstitucional} multiplicador`} />
                <KpiCard label="Costo total producción" value={MXN.format(totalCosto)} color="#EF4444"  icon="💸" sub="interno + externo" />
                <KpiCard label="Ganancia neta"         value={MXN.format(totalValor - totalCosto)} color={totalValor >= totalCosto ? "#34D399" : "#F87171"} icon="✦" />
                <KpiCard label="Horas invertidas"      value={`${totalHoras}h`}        color={ACCENT}   icon="⏱" sub="normales + extra" />
                <KpiCard label="Unidades producidas"   value={totalUnidades}            color={ACCENT2}  icon="🎬" sub="total histórico" />
              </div>
            </div>

            {/* Resumen portafolio */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
              <KpiCard label="Proyectos totales"       value={totalProyectos}    sub="en el sistema"           />
              <KpiCard label="Proyectos entregados"    value={proyEntregados}    color="#10B981" sub="completados" />
              <KpiCard label="En producción"           value={proyEnProduccion}  color="#F59E0B" sub="activos ahora" />
              <KpiCard label="Con datos de ROI"        value={rows.length}       color={ACCENT}  sub="entregados + evaluación" />
            </div>

            {/* Tabla proyecto por proyecto */}
            <div style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14, padding: "18px 20px", marginBottom: 24,
            }}>
              <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, color: "rgba(226,232,240,0.6)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                📋 ROI por proyecto
              </p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      {["Proyecto", "Evaluaciones", "Valor inst.", "Costo total", "ROI", "Calidad"].map((h) => (
                        <th key={h} style={{
                          textAlign: "left", padding: "6px 10px",
                          color: "rgba(226,232,240,0.3)", fontWeight: 700, fontSize: 10,
                          textTransform: "uppercase", letterSpacing: "0.06em",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.sort((a, b) => b.roi - a.roi).map(({ p, evs, valorInst, costoTotal, roi, promCalidad }) => {
                      const roiColor = roi >= 100 ? "#10B981" : roi >= 0 ? "#F59E0B" : "#EF4444";
                      const qColor   = promCalidad >= 4.5 ? "#10B981" : promCalidad >= 3.5 ? "#F59E0B" : "#EF4444";
                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                          <td style={{ padding: "8px 10px", color: "#E2E8F0", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.titulo}
                          </td>
                          <td style={{ padding: "8px 10px", color: "rgba(226,232,240,0.4)", textAlign: "center" }}>
                            {evs.length}
                          </td>
                          <td style={{ padding: "8px 10px", color: "#34D399", fontWeight: 600 }}>
                            {MXN.format(valorInst)}
                          </td>
                          <td style={{ padding: "8px 10px", color: "rgba(226,232,240,0.5)" }}>
                            {MXN.format(costoTotal)}
                          </td>
                          <td style={{ padding: "8px 10px", fontWeight: 800, color: roiColor }}>
                            {roi > 0 ? "+" : ""}{roi.toFixed(0)}%
                          </td>
                          <td style={{ padding: "8px 10px", fontWeight: 700, color: qColor }}>
                            {promCalidad > 0 ? promCalidad.toFixed(1) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                      <td colSpan={2} style={{ padding: "10px 10px", fontWeight: 700, color: "rgba(226,232,240,0.5)", fontSize: 11 }}>TOTAL</td>
                      <td style={{ padding: "10px 10px", fontWeight: 800, color: "#34D399" }}>{MXN.format(totalValor)}</td>
                      <td style={{ padding: "10px 10px", fontWeight: 800, color: "#EF4444" }}>{MXN.format(totalCosto)}</td>
                      <td style={{ padding: "10px 10px", fontWeight: 900, color: roiTotal >= 100 ? "#10B981" : roiTotal >= 0 ? "#F59E0B" : "#EF4444", fontSize: 14 }}>
                        {roiTotal > 0 ? "+" : ""}{roiTotal.toFixed(0)}%
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Nota metodológica */}
            <div style={{
              background: "rgba(99,102,241,0.03)", border: "1px solid rgba(99,102,241,0.12)",
              borderRadius: 10, padding: "12px 16px", marginBottom: 24,
            }}>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(99,102,241,0.6)", lineHeight: 1.7 }}>
                <strong style={{ color: `${ACCENT}90` }}>Metodología:</strong>{" "}
                Valor institucional = valor directo del proyecto × {valorInstitucional} (multiplicador estratégico TEC).
                Costo interno = horas (normales + extra×1.5) × tarifa promedio equipo ({MXN.format(tarifaEquipo)}/h).
                Costo externo = costo final proveedor × {multiplicadorExt} (overhead de gestión).
                ROI = (Valor institucional − Costo total) / Costo total × 100.
              </p>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <p style={{ fontSize: 36, marginBottom: 14 }}>💰</p>
            <p style={{ color: "rgba(226,232,240,0.4)", fontSize: 13, marginBottom: 8 }}>
              No hay proyectos entregados con evaluaciones aún.
            </p>
            <p style={{ color: "rgba(226,232,240,0.25)", fontSize: 12 }}>
              El ROI se calcula automáticamente cuando un proyecto pasa a estado <strong style={{ color: "#10B981" }}>Entregado</strong> y tiene evaluaciones registradas.
            </p>
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: "rgba(226,232,240,0.12)" }}>
          TEC Bii v2 · Simulador ROI · RUMBO A TIER 4
        </p>
      </div>
    </>
  );
}
