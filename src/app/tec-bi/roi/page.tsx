"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, ReferenceLine, Cell,
} from "recharts";
import { subscribeEvaluaciones } from "@/lib/firestore/evaluaciones";
import type { Evaluacion } from "@/extensions/tec-bi/schema";

const ACCENT = "#0EA5E9";
const MXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", border: "1px solid rgba(14,165,233,0.15)", borderRadius: 14, padding: "20px 22px", ...style }}>
      {children}
    </div>
  );
}
function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 12, fontWeight: 700, color: ACCENT, letterSpacing: "0.5px", margin: "0 0 18px", textTransform: "uppercase" }}>{children}</h3>;
}

export default function ROIPage() {
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingresoSlider, setIngresoSlider] = useState(500);

  useEffect(() => {
    const u = subscribeEvaluaciones((d) => { setEvaluaciones(d); setLoading(false); });
    return () => u();
  }, []);

  // ── Cálculos base ─────────────────────────────────────────────────────────
  const evConUnidades = evaluaciones.filter((e) => e.unidadesProducidas > 0);

  // Costo total y unidades
  const costoTotal = evaluaciones.reduce((s, e) => {
    return s + (e.tipo === "Interno" ? (e.datosInternos?.costoTotal ?? 0) : (e.datosExternos?.costoFinal ?? 0));
  }, 0);

  const unidadesTotal = evaluaciones.reduce((s, e) => s + (e.unidadesProducidas ?? 0), 0);

  // Horas totales
  const horasTotal = evaluaciones.reduce((s, e) => {
    return s + (e.datosInternos?.horasNormales ?? 0) + (e.datosInternos?.horasExtra ?? 0);
  }, 0);

  const costoPorUnidad   = unidadesTotal > 0 ? costoTotal / unidadesTotal : 0;
  const productividad    = horasTotal > 0 && unidadesTotal > 0 ? unidadesTotal / horasTotal : 0;

  // ROI con el slider
  const roi = costoPorUnidad > 0
    ? ((ingresoSlider - costoPorUnidad) / costoPorUnidad) * 100
    : 0;

  const utilidadPorUnidad = ingresoSlider - costoPorUnidad;

  // ── Datos para gráfica de barras (costo vs ingreso por unidad) ────────────
  const barData = [
    { name: "Costo / Unidad", value: Math.round(costoPorUnidad), color: "#7B4FE8" },
    { name: "Ingreso / Unidad", value: ingresoSlider, color: ingresoSlider > costoPorUnidad ? "#34C759" : "#FF3B30" },
    { name: "Utilidad", value: Math.max(0, Math.round(utilidadPorUnidad)), color: "#0EA5E9" },
  ];

  // ── Datos para gráfica de línea (ROI según ingreso) ──────────────────────
  const lineData = Array.from({ length: 20 }, (_, i) => {
    const ing = 50 + i * 50;
    const r = costoPorUnidad > 0 ? ((ing - costoPorUnidad) / costoPorUnidad) * 100 : 0;
    return { ingreso: ing, ROI: Math.round(r) };
  });

  // ── Recomendación inteligente ─────────────────────────────────────────────
  const recomendacion = (() => {
    if (evaluaciones.length === 0) return null;
    if (costoPorUnidad === 0) return "Registra evaluaciones con unidades producidas para activar el simulador.";
    if (roi > 50) return `🚀 Excelente ROI. Con un ingreso de ${MXN.format(ingresoSlider)} por unidad estás generando ${roi.toFixed(0)}% de retorno. Considera escalar volumen.`;
    if (roi > 0) return `✅ ROI positivo de ${roi.toFixed(0)}%. El negocio es rentable. Para mejorar, reduce el costo por unidad o aumenta el precio.`;
    if (roi === 0) return `⚠️ Punto de equilibrio exacto. Cualquier reducción de costo o incremento de precio mejora la rentabilidad.`;
    return `🔴 ROI negativo (${roi.toFixed(0)}%). El costo por unidad (${MXN.format(costoPorUnidad)}) supera el ingreso actual. Sube el precio a más de ${MXN.format(Math.ceil(costoPorUnidad))} para ser rentable.`;
  })();

  if (loading) return <p style={{ color: "#aaa", fontSize: 13 }}>Cargando datos…</p>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1D1D1F", margin: "0 0 4px" }}>📈 Simulador ROI</h1>
        <p style={{ fontSize: 12, color: "#888", margin: 0 }}>Proyecciones de retorno basadas en datos reales</p>
      </div>

      {evaluaciones.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📈</div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#1D1D1F", margin: "0 0 8px" }}>Sin datos aún</h2>
          <p style={{ fontSize: 13, color: "#888" }}>Registra evaluaciones para activar el simulador ROI.</p>
        </div>
      ) : (
        <>
          {/* KPIs base */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Costo por Unidad",   value: costoPorUnidad > 0 ? MXN.format(costoPorUnidad) : "—",       icon: "💸", color: "#7B4FE8" },
              { label: "Unidades Producidas", value: unidadesTotal,                                                icon: "📦", color: ACCENT },
              { label: "Productividad",       value: productividad > 0 ? `${productividad.toFixed(2)} u/h` : "—", icon: "⚡", color: "#FF9F0A" },
              { label: "Horas Totales",       value: horasTotal > 0 ? `${horasTotal}h` : "—",                     icon: "⏱", color: "#34C759" },
            ].map((k) => (
              <Card key={k.label}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{k.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>{k.label}</div>
              </Card>
            ))}
          </div>

          {/* Slider ROI */}
          <Card style={{ marginBottom: 20 }}>
            <CardTitle>Simulador — Ingreso por Unidad</CardTitle>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "#888" }}>Ingreso estimado por unidad</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: ACCENT }}>{MXN.format(ingresoSlider)}</span>
              </div>
              <input
                type="range" min={10} max={1000} step={10}
                value={ingresoSlider}
                onChange={(e) => setIngresoSlider(Number(e.target.value))}
                style={{ width: "100%", accentColor: ACCENT, height: 6 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 10, color: "#ccc" }}>$10</span>
                <span style={{ fontSize: 10, color: "#ccc" }}>$1,000</span>
              </div>
            </div>

            {/* ROI resultado */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div style={{ background: roi > 0 ? "rgba(52,199,89,0.08)" : "rgba(255,59,48,0.06)", border: `1px solid ${roi > 0 ? "rgba(52,199,89,0.2)" : "rgba(255,59,48,0.15)"}`, borderRadius: 10, padding: "14px", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: roi > 0 ? "#34C759" : "#FF3B30" }}>
                  {roi >= 0 ? "+" : ""}{roi.toFixed(0)}%
                </div>
                <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>ROI</div>
              </div>
              <div style={{ background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.15)", borderRadius: 10, padding: "14px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: utilidadPorUnidad >= 0 ? "#34C759" : "#FF3B30" }}>
                  {MXN.format(utilidadPorUnidad)}
                </div>
                <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>Utilidad / Unidad</div>
              </div>
              <div style={{ background: "rgba(123,79,232,0.06)", border: "1px solid rgba(123,79,232,0.15)", borderRadius: 10, padding: "14px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#7B4FE8" }}>{MXN.format(costoPorUnidad)}</div>
                <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>Costo Real / Unidad</div>
              </div>
            </div>

            {/* Recomendación */}
            {recomendacion && (
              <div style={{ background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.15)", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#1D1D1F", lineHeight: 1.5 }}>
                {recomendacion}
              </div>
            )}
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            {/* Bar chart: costo vs ingreso vs utilidad */}
            <Card>
              <CardTitle>Costo vs Ingreso vs Utilidad (por unidad)</CardTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.1)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#888" }} />
                  <YAxis tick={{ fontSize: 9, fill: "#888" }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v: unknown) => MXN.format(Number(v ?? 0))} contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Line chart: ROI según ingreso */}
            <Card>
              <CardTitle>Curva ROI según precio de venta</CardTitle>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={lineData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.1)" />
                  <XAxis dataKey="ingreso" tick={{ fontSize: 9, fill: "#888" }} tickFormatter={(v) => `$${v}`} />
                  <YAxis tick={{ fontSize: 9, fill: "#888" }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: unknown) => `${v ?? 0}%`} labelFormatter={(l: unknown) => `Ingreso: $${l}`} contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="#FF3B30" strokeDasharray="4 4" label={{ value: "Punto equilibrio", fontSize: 9, fill: "#FF3B30" }} />
                  <ReferenceLine x={ingresoSlider} stroke={ACCENT} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="ROI" stroke="#34C759" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Productividad por evaluación */}
          {evConUnidades.length > 1 && (
            <Card>
              <CardTitle>Productividad histórica (unidades producidas por evaluación)</CardTitle>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={evConUnidades.map((e, i) => ({ name: `Eval ${i + 1}`, Unidades: e.unidadesProducidas }))} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.1)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#888" }} />
                  <YAxis tick={{ fontSize: 9, fill: "#888" }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="Unidades" fill={ACCENT} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

