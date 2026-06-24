"use client";
// TEC BI v1.1 — Simulador de Impacto Institucional + ROI de Producción

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { subscribeEvaluaciones } from "@/lib/firestore/evaluaciones";
import type { Evaluacion } from "@/extensions/tec-bi/schema";
import PageGuard from "@/components/tec-bi/PageGuard";

const ACCENT  = "#0EA5E9";
const GREEN   = "#34C759";
const RED     = "#FF3B30";
const PURPLE  = "#7B4FE8";
const AMBER   = "#FF9F0A";

const MXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)",
      border: "1px solid rgba(14,165,233,0.15)", borderRadius: 14,
      padding: "20px 22px", ...style,
    }}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: "0.5px", marginBottom: 14, textTransform: "uppercase" }}>
      {children}
    </div>
  );
}

function KPI({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{
      background: `${color ?? ACCENT}08`,
      border: `1px solid ${color ?? ACCENT}22`,
      borderRadius: 12, padding: "16px 14px", textAlign: "center",
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: color ?? ACCENT }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>{sub}</div>}
      <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Slider({
  label, value, min, max, step, fmt, onChange, color,
}: {
  label: string; value: number; min: number; max: number; step: number;
  fmt: (v: number) => string; onChange: (v: number) => void; color?: string;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "#555", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: color ?? ACCENT }}>{fmt(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: color ?? ACCENT, height: 6 }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        <span style={{ fontSize: 9, color: "#ccc" }}>{fmt(min)}</span>
        <span style={{ fontSize: 9, color: "#ccc" }}>{fmt(max)}</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — Simulador de Impacto Institucional
// ══════════════════════════════════════════════════════════════════════════════
function SimuladorImpacto() {
  const [solicMes,       setSolicMes]       = useState(60);
  const [pctMalos,       setPctMalos]       = useState(70);
  const [rondasMin,      setRondasMin]      = useState(4);
  const [rondasBase,     setRondasBase]     = useState(1.5);
  const [costoReedicion, setCostoReedicion] = useState(17500);
  const [pctReduccion,   setPctReduccion]   = useState(85);

  const solicAnual      = solicMes * 12;
  const proyectosMalos  = Math.round(solicAnual * (pctMalos / 100));
  const proyectosBuenos = solicAnual - proyectosMalos;
  const rondasEvitables = Math.max(0, rondasMin - rondasBase);
  const rondasEvit      = Math.round(proyectosMalos * rondasEvitables);
  const costoActual     = rondasEvit * costoReedicion;

  const nuevoPctMalos    = pctMalos * (1 - pctReduccion / 100);
  const nuevosProyMalos  = Math.round(solicAnual * (nuevoPctMalos / 100));
  const nuevasRondasEvit = Math.round(nuevosProyMalos * rondasEvitables);
  const costoConSOFIAA   = nuevasRondasEvit * costoReedicion;
  const ahorro           = costoActual - costoConSOFIAA;
  const horasLibMes      = Math.round((rondasEvit - nuevasRondasEvit) / 12 * 8);

  // silence unused var warning
  void proyectosBuenos;

  const barData = [
    { name: "Sin SOFIAA", valor: costoActual,    fill: RED    },
    { name: "Con SOFIAA", valor: costoConSOFIAA, fill: GREEN  },
    { name: "Ahorro",     valor: ahorro,          fill: ACCENT },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{
        background: "linear-gradient(135deg, #0EA5E908 0%, #7B4FE808 100%)",
        border: "1px solid rgba(14,165,233,0.15)", borderRadius: 14, padding: "18px 22px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>🏛️</span>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1D1D1F", margin: 0 }}>
              Simulador de Impacto Institucional
            </h2>
            <p style={{ fontSize: 11, color: "#888", margin: "2px 0 0" }}>
              Cuantifica el costo real de la fragmentación operativa · Solo área de Video — sin fotografía, diseño ni eventos
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, alignItems: "start" }}>
        {/* Sliders */}
        <Card>
          <Label>Variables del Área (ajustables)</Label>
          <Slider label="Solicitudes de video / mes" value={solicMes} min={10} max={150} step={5}
            fmt={(v) => `${v} proyectos`} onChange={setSolicMes} />
          <Slider label="Briefs deficientes / incompletos" value={pctMalos} min={10} max={100} step={5}
            fmt={(v) => `${v}%`} onChange={setPctMalos} color={RED} />
          <Slider label="Rondas de cambios (brief malo)" value={rondasMin} min={2} max={10} step={1}
            fmt={(v) => `${v} rondas mín.`} onChange={setRondasMin} color={AMBER} />
          <Slider label="Rondas aceptables (brief correcto)" value={rondasBase} min={0.5} max={3} step={0.5}
            fmt={(v) => `${v} rondas`} onChange={setRondasBase} color={GREEN} />
          <Slider label="Costo por ronda de reedición" value={costoReedicion} min={5000} max={30000} step={500}
            fmt={(v) => MXN.format(v)} onChange={setCostoReedicion} color={PURPLE} />
          <Slider label="Reducción de errores con SOFIAA" value={pctReduccion} min={50} max={95} step={5}
            fmt={(v) => `${v}%`} onChange={setPctReduccion} color={ACCENT} />
          <div style={{ fontSize: 10, color: "#bbb", lineHeight: 1.5, borderTop: "1px solid #f0f0f0", paddingTop: 12, marginTop: 4 }}>
            <strong style={{ color: "#999" }}>Metodología:</strong> Rondas evitables = rondas por brief malo − rondas
            base aceptables de cualquier proyecto bien briefeado. Costo valuado a precio de mercado audiovisual.
          </div>
        </Card>

        {/* Resultados */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <Label>📍 Situación Actual — Sin SOFIAA</Label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
              <KPI label="Proyectos / año" value={NUM.format(solicAnual)} color={ACCENT} />
              <KPI label="Con brief deficiente" value={NUM.format(proyectosMalos)} sub={`${pctMalos}% del total`} color={RED} />
              <KPI label="Rondas evitables / año" value={NUM.format(rondasEvit)} sub="por briefs incompletos" color={AMBER} />
            </div>
            <div style={{ background: `${RED}08`, border: `1px solid ${RED}22`, borderRadius: 12, padding: "18px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: RED, fontWeight: 700, marginBottom: 4, letterSpacing: "0.4px" }}>
                COSTO ANUAL EN RETRABAJO EVITABLE
              </div>
              <div style={{ fontSize: 36, fontWeight: 900, color: RED }}>{MXN.format(costoActual)}</div>
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
                {NUM.format(rondasEvit)} rondas × {MXN.format(costoReedicion)} por reedición
              </div>
            </div>
          </Card>

          <Card>
            <Label>🚀 Con SOFIAA TEC BI — Proyección</Label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
              <KPI label="Briefs deficientes restantes" value={`${nuevoPctMalos.toFixed(1)}%`} sub={`vs ${pctMalos}% actual`} color={GREEN} />
              <KPI label="Rondas evitables / año" value={NUM.format(nuevasRondasEvit)} sub={`vs ${NUM.format(rondasEvit)} actual`} color={GREEN} />
              <KPI label="Horas liberadas / mes" value={`~${horasLibMes}h`} sub="para proyectos adicionales" color={PURPLE} />
            </div>
            <div style={{ background: `${GREEN}08`, border: `1px solid ${GREEN}22`, borderRadius: 12, padding: "18px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: GREEN, fontWeight: 700, marginBottom: 4, letterSpacing: "0.4px" }}>
                AHORRO ANUAL PROYECTADO
              </div>
              <div style={{ fontSize: 36, fontWeight: 900, color: GREEN }}>{MXN.format(ahorro)}</div>
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
                {NUM.format(rondasEvit - nuevasRondasEvit)} rondas eliminadas × {MXN.format(costoReedicion)} c/u
              </div>
            </div>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card>
              <Label>Comparativo de Costo Anual</Label>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.1)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} />
                  <YAxis tick={{ fontSize: 9, fill: "#888" }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(v: unknown) => MXN.format(Number(v ?? 0))} contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                    {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <Label>Resumen Ejecutivo</Label>
              {[
                { icon: "📋", label: "Solo área de video", note: "sin fotografía, diseño ni eventos" },
                { icon: "⚠️", label: `${pctMalos}% de briefs deficientes`, note: `${NUM.format(proyectosMalos)} proyectos/año afectados` },
                { icon: "💸", label: `${MXN.format(costoActual)} en retrabajo`, note: "valuado a precio de mercado" },
                { icon: "✅", label: `${MXN.format(ahorro)} recuperados`, note: `con ${pctReduccion}% de reducción de errores` },
                { icon: "🏗️", label: `~${horasLibMes}h/mes liberadas`, note: "capacidad para más proyectos sin ampliar plantilla" },
              ].map(({ icon, label, note }) => (
                <div key={label} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: "1px solid #f5f5f5" }}>
                  <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1D1D1F" }}>{label}</div>
                    <div style={{ fontSize: 10, color: "#aaa" }}>{note}</div>
                  </div>
                </div>
              ))}
              <div style={{ background: `${ACCENT}08`, border: `1px solid ${ACCENT}22`, borderRadius: 10, padding: "10px 12px", marginTop: 12, fontSize: 11, color: "#555", lineHeight: 1.5 }}>
                <strong style={{ color: ACCENT }}>Costo de licenciamiento SOFIAA: $0.</strong>{" "}
                El ahorro es neto desde el primer mes de operación.
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — ROI de Producción (datos reales Firestore)
// ══════════════════════════════════════════════════════════════════════════════
function ROIProduccion() {
  const [evaluaciones,  setEvaluaciones]  = useState<Evaluacion[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [ingresoSlider, setIngresoSlider] = useState(500);

  useEffect(() => {
    const u = subscribeEvaluaciones((d) => { setEvaluaciones(d); setLoading(false); });
    return () => u();
  }, []);

  const costoTotal     = evaluaciones.reduce((s, e) =>
    s + (e.tipo === "Interno" ? (e.datosInternos?.costoTotal ?? 0) : (e.datosExternos?.costoFinal ?? 0)), 0);
  const unidadesTotal  = evaluaciones.reduce((s, e) => s + (e.unidadesProducidas ?? 0), 0);
  const horasTotal     = evaluaciones.reduce((s, e) =>
    s + (e.datosInternos?.horasNormales ?? 0) + (e.datosInternos?.horasExtra ?? 0), 0);
  const evConUnidades  = evaluaciones.filter((e) => e.unidadesProducidas > 0);

  const costoPorUnidad    = unidadesTotal > 0 ? costoTotal / unidadesTotal : 0;
  const productividad     = horasTotal > 0 && unidadesTotal > 0 ? unidadesTotal / horasTotal : 0;
  const roi               = costoPorUnidad > 0 ? ((ingresoSlider - costoPorUnidad) / costoPorUnidad) * 100 : 0;
  const utilidadPorUnidad = ingresoSlider - costoPorUnidad;

  const barData = [
    { name: "Costo / Unidad",   value: Math.round(costoPorUnidad),              color: PURPLE },
    { name: "Ingreso / Unidad", value: ingresoSlider,                           color: ingresoSlider > costoPorUnidad ? GREEN : RED },
    { name: "Utilidad",         value: Math.max(0, Math.round(utilidadPorUnidad)), color: ACCENT },
  ];

  if (loading) return <p style={{ color: "#aaa", fontSize: 13 }}>Cargando datos…</p>;
  if (evaluaciones.length === 0) return (
    <div style={{ textAlign: "center", padding: "64px 0" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📈</div>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: "#1D1D1F", margin: "0 0 8px" }}>Sin evaluaciones registradas</h2>
      <p style={{ fontSize: 13, color: "#888" }}>Registra evaluaciones para activar el simulador de producción.</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {[
          { label: "Costo por Unidad",    value: costoPorUnidad > 0 ? MXN.format(costoPorUnidad) : "—", icon: "💸", color: PURPLE },
          { label: "Unidades Producidas", value: String(unidadesTotal),                                   icon: "📦", color: ACCENT },
          { label: "Productividad",       value: productividad > 0 ? `${productividad.toFixed(2)} u/h` : "—", icon: "⚡", color: AMBER },
          { label: "Horas Totales",       value: horasTotal > 0 ? `${horasTotal}h` : "—",                 icon: "⏱", color: GREEN },
        ].map((k) => (
          <Card key={k.label}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>{k.label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <Label>Simulador — Ingreso por Unidad</Label>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "#888" }}>Ingreso estimado por unidad</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: ACCENT }}>{MXN.format(ingresoSlider)}</span>
          </div>
          <input type="range" min={10} max={1000} step={10} value={ingresoSlider}
            onChange={(e) => setIngresoSlider(Number(e.target.value))}
            style={{ width: "100%", accentColor: ACCENT, height: 6 }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 10, color: "#ccc" }}>$10</span>
            <span style={{ fontSize: 10, color: "#ccc" }}>$1,000</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
          {[
            { label: "ROI", value: `${roi >= 0 ? "+" : ""}${roi.toFixed(0)}%`, color: roi > 0 ? GREEN : RED },
            { label: "Utilidad / Unidad", value: MXN.format(utilidadPorUnidad), color: utilidadPorUnidad >= 0 ? GREEN : RED },
            { label: "Costo Real / Unidad", value: MXN.format(costoPorUnidad), color: PURPLE },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: `${color}08`, border: `1px solid ${color}22`, borderRadius: 10, padding: 14, textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.1)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} />
            <YAxis tick={{ fontSize: 9, fill: "#888" }} tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={(v: unknown) => MXN.format(Number(v ?? 0))} contentStyle={{ borderRadius: 8, fontSize: 11 }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {barData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {evConUnidades.length > 1 && (
        <Card>
          <Label>Productividad histórica (unidades por evaluación)</Label>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={evConUnidades.map((e, i) => ({ name: `Eval ${i + 1}`, Unidades: e.unidadesProducidas }))}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.1)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#888" }} />
              <YAxis tick={{ fontSize: 9, fill: "#888" }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="Unidades" fill={ACCENT} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function ROIPage() {
  const [tab, setTab] = useState<"impacto" | "produccion">("impacto");

  return (
    <div>
      <PageGuard section="roi" />
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1D1D1F", margin: "0 0 4px" }}>📈 Simulador ROI</h1>
        <p style={{ fontSize: 12, color: "#888", margin: 0 }}>Análisis financiero del área de producción audiovisual</p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {([
          { id: "impacto",    label: "🏛️ Impacto Institucional" },
          { id: "produccion", label: "📦 ROI de Producción"     },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 18px", borderRadius: 20, fontSize: 12, fontWeight: 700,
            border: "none", cursor: "pointer", transition: "all 0.15s",
            background: tab === t.id ? ACCENT : "rgba(14,165,233,0.08)",
            color:      tab === t.id ? "#fff"  : ACCENT,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "impacto"    && <SimuladorImpacto />}
      {tab === "produccion" && <ROIProduccion />}
    </div>
  );
}
