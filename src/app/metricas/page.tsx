"use client";

import { useEffect, useState } from "react";
import BackButton from "@/components/ui/BackButton";
import {
  readTelemetryStore,
  avg,
  type TelemetrySession,
} from "@/config/metrics.schema";
import { getCacheStats } from "@/core/cache.adapter";

// ── Estilos base ─────────────────────────────────────────────────────────────

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.9)",
  boxShadow: "0 4px 24px rgba(100,100,200,0.07)",
  borderRadius: "20px",
};

const gradientText: React.CSSProperties = {
  background: "linear-gradient(135deg, #4F7CFF 0%, #9B4FD9 38%, #E91E8C 68%, #FF6B35 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

const COLORS = {
  blue:   "#4F7CFF",
  purple: "#9B4FD9",
  pink:   "#E91E8C",
  green:  "#34C759",
  orange: "#FF6B35",
  yellow: "#FFD60A",
};

// ── Componentes pequeños ──────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase",
      color: "rgba(0,0,0,0.3)", fontWeight: 600, marginBottom: "12px",
    }}>
      {children}
    </p>
  );
}

function KpiCard({
  label, value, sub, color, hint,
}: {
  label: string; value: string; sub: string; color: string; hint?: string;
}) {
  return (
    <div style={{ ...glass, padding: "18px 16px", textAlign: "center" }}>
      <p style={{ fontSize: "1.8rem", fontWeight: 700, color, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontSize: "11px", color: "rgba(0,0,0,0.55)", fontWeight: 600, marginTop: "6px" }}>{label}</p>
      <p style={{ fontSize: "10px", color: "rgba(0,0,0,0.3)", marginTop: "2px" }}>{sub}</p>
      {hint && (
        <p style={{
          fontSize: "9px", marginTop: "6px",
          background: `${color}15`, color, borderRadius: "999px",
          padding: "2px 8px", display: "inline-block", fontWeight: 500,
        }}>
          {hint}
        </p>
      )}
    </div>
  );
}

/** Barra horizontal con etiquetas */
function HBar({ label, value, max, color, format }: {
  label: string; value: number; max: number; color: string; format: (v: number) => string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "12px", color: "rgba(0,0,0,0.5)" }}>{label}</span>
        <span style={{ fontSize: "12px", fontWeight: 700, color }}>{format(value)}</span>
      </div>
      <div style={{ height: "6px", background: "rgba(0,0,0,0.06)", borderRadius: "999px" }}>
        <div style={{
          height: "100%", width: `${pct}%`, background: color,
          borderRadius: "999px", transition: "width 0.5s ease",
        }} />
      </div>
    </div>
  );
}

/** SVG Sparkline de línea */
function Sparkline({ values, color, height = 48 }: { values: number[]; color: string; height?: number }) {
  if (values.length < 2) return (
    <p style={{ fontSize: "12px", color: "rgba(0,0,0,0.25)", textAlign: "center", padding: "12px 0" }}>
      Necesitas al menos 2 sesiones con datos
    </p>
  );
  const W = 280, H = height;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 8) - 4;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: `${H}px` }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      {values.map((v, i) => {
        const x = (i / (values.length - 1)) * W;
        const y = H - ((v - min) / range) * (H - 8) - 4;
        return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
      })}
    </svg>
  );
}

/** SVG barras verticales */
function BarChart({ values, color, labels }: { values: number[]; color: string | string[]; labels?: string[] }) {
  if (values.length === 0) return (
    <p style={{ fontSize: "12px", color: "rgba(0,0,0,0.25)", textAlign: "center", padding: "12px 0" }}>
      Sin datos aún
    </p>
  );
  const max = Math.max(...values, 1);
  const H = 60;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: `${H + 18}px` }}>
      {values.map((v, i) => {
        const barH = Math.max((v / max) * H, 3);
        const c = Array.isArray(color) ? color[i % color.length] : color;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
            <div
              title={String(v)}
              style={{
                width: "100%", height: `${barH}px`,
                background: c, borderRadius: "4px 4px 0 0",
                transition: "height 0.4s ease",
              }}
            />
            {labels && (
              <span style={{ fontSize: "8px", color: "rgba(0,0,0,0.3)", textAlign: "center", lineHeight: 1 }}>
                {labels[i]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Donut SVG simple */
function Donut({ pct, color, size = 72 }: { pct: number; color: string; size?: number }) {
  const r = 28, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="6" />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>
        {pct}%
      </text>
    </svg>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function MetricasPage() {
  const [store, setStore] = useState(() => readTelemetryStore());

  useEffect(() => {
    setStore(readTelemetryStore());
  }, []);

  const sessions = store.sessions;
  const totalSessions = sessions.length;
  const cacheStats = getCacheStats();

  if (totalSessions === 0) {
    return (
      <div style={{ minHeight: "100vh", padding: "32px 24px", fontFamily: '"Inter", system-ui, sans-serif', display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px" }}>
        <BackButton />
        <p style={{ ...gradientText, fontSize: "2rem", fontWeight: 700 }}>Panel Cognitivo</p>
        <p style={{ color: "rgba(0,0,0,0.35)", fontSize: "15px" }}>
          Sin datos aún. Inicia conversaciones con SOFIAA para ver métricas.
        </p>
      </div>
    );
  }

  // ── Cálculo de métricas ───────────────────────────────────────────────────

  const allTTIs      = sessions.flatMap((s) => s.metrics.tti);
  const allIFCs      = sessions.flatMap((s) => s.metrics.ifc);
  const totalMsgs    = sessions.reduce((a, s) => a + s.metrics.totalMessages, 0);
  const totalCVR     = sessions.reduce((a, s) => a + s.metrics.cvr, 0);
  const totalGuard   = sessions.reduce((a, s) => a + s.metrics.guardrailsTriggered, 0);
  const voiceSess    = sessions.filter((s) => s.metrics.voiceUsed).length;
  const memorySess   = sessions.filter((s) => s.metrics.cks).length;

  const avgTTI  = avg(allTTIs);
  const avgIFC  = avg(allIFCs);
  const avgMsgs = totalSessions > 0 ? Math.round(totalMsgs / totalSessions) : 0;

  // IAI global: total quick actions / total mensajes
  const globalIAI = totalMsgs > 0 ? Math.round((totalCVR / totalMsgs) * 100) : 0;
  // CVR rate: sesiones donde se usó al menos 1 quick action
  const sessWithQA = sessions.filter((s) => s.metrics.cvr > 0).length;
  const cvrRate    = totalSessions > 0 ? Math.round((sessWithQA / totalSessions) * 100) : 0;
  // CKS rate
  const cksRate    = totalSessions > 0 ? Math.round((memorySess / totalSessions) * 100) : 0;
  // Voice rate
  const voiceRate  = totalSessions > 0 ? Math.round((voiceSess / totalSessions) * 100) : 0;
  // Security rate: sesiones limpias
  const secureRate = totalSessions > 0 ? Math.round(((totalSessions - (totalGuard > 0 ? 1 : 0)) / totalSessions) * 100) : 100;

  // TTI por sesión (promedio de cada sesión)
  const ttiPerSession = sessions.map((s) => avg(s.metrics.tti)).filter((v) => v > 0);
  // Msgs por sesión
  const msgsPerSession = sessions.map((s) => s.metrics.totalMessages);
  // IFC por sesión
  const ifcPerSession  = sessions.map((s) => avg(s.metrics.ifc)).filter((v) => v > 0);

  // Últimas 8 sesiones para gráficas
  const last8 = sessions.slice(-8);
  const last8Labels = last8.map((_, i) => `S${sessions.length - last8.length + i + 1}`);

  // TTI color
  const ttiColor = avgTTI < 2000 ? COLORS.green : avgTTI < 4000 ? COLORS.blue : COLORS.pink;
  // IFC color (menos es mejor)
  const ifcColor = avgIFC < 80 ? COLORS.green : avgIFC < 150 ? COLORS.orange : COLORS.pink;

  const now = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{
      minHeight: "100vh", overflowY: "auto", padding: "32px 24px 80px",
      fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
    }}>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>

        {/* Nav */}
        <div style={{ marginBottom: "40px" }}>
          <BackButton />
        </div>

        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", fontWeight: 500, marginBottom: "8px" }}>
            SOFIAA LAB · Telemetría
          </p>
          <h1 style={{ ...gradientText, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "8px" }}>
            Panel Cognitivo
          </h1>
          <p style={{ fontSize: "13px", color: "rgba(0,0,0,0.35)" }}>
            {totalSessions} sesión{totalSessions !== 1 ? "es" : ""} registrada{totalSessions !== 1 ? "s" : ""} · {totalMsgs} mensajes totales · Actualizado {now}
          </p>
        </div>

        {/* ── KPIs principales ── */}
        <SectionLabel>Indicadores clave</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "24px" }}>
          <KpiCard
            label="TTI"
            value={avgTTI > 0 ? `${(avgTTI / 1000).toFixed(1)}s` : "—"}
            sub="Tiempo hasta respuesta"
            color={ttiColor}
            hint={avgTTI < 2000 ? "Rápido" : avgTTI < 4000 ? "Normal" : "Lento"}
          />
          <KpiCard
            label="IFC"
            value={avgIFC > 0 ? `${avgIFC}c` : "—"}
            sub="Fricción de interacción"
            color={ifcColor}
            hint={avgIFC < 80 ? "Fluido" : avgIFC < 150 ? "Moderado" : "Alto esfuerzo"}
          />
          <KpiCard
            label="IAI"
            value={`${globalIAI}%`}
            sub="Índice de anticipación"
            color={COLORS.orange}
            hint={globalIAI > 30 ? "SOFIAA anticipa bien" : "Baja anticipación"}
          />
          <KpiCard
            label="CVR"
            value={`${cvrRate}%`}
            sub="Sesiones con quick actions"
            color={COLORS.purple}
            hint={cvrRate > 50 ? "Alta adopción" : "Baja adopción"}
          />
          <KpiCard
            label="CKS"
            value={`${cksRate}%`}
            sub="Sesiones con memoria activa"
            color={COLORS.blue}
            hint={cksRate > 70 ? "Memoria frecuente" : "Pocas memorias"}
          />
          <KpiCard
            label="VOZ"
            value={`${voiceRate}%`}
            sub="Sesiones con input de voz"
            color={COLORS.pink}
            hint={voiceRate > 40 ? "Uso frecuente" : "Uso esporádico"}
          />
        </div>

        {/* ── TTI Trend ── */}
        <div style={{ ...glass, padding: "24px 28px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <SectionLabel>TTI — Tendencia por sesión</SectionLabel>
              <p style={{ fontSize: "12px", color: "rgba(0,0,0,0.35)", marginTop: "-8px" }}>
                Velocidad de respuesta de SOFIAA a lo largo del tiempo
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              {[{ label: "< 2s", color: COLORS.green }, { label: "< 4s", color: COLORS.blue }, { label: "> 4s", color: COLORS.pink }].map(({ label, color }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color }} />
                  <span style={{ fontSize: "9px", color: "rgba(0,0,0,0.35)" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          {ttiPerSession.length >= 2 ? (
            <Sparkline values={ttiPerSession.map((v) => v / 1000)} color={ttiColor} height={56} />
          ) : (
            <BarChart
              values={last8.map((s) => avg(s.metrics.tti) / 1000)}
              color={last8.map((s) => {
                const t = avg(s.metrics.tti);
                return t < 2000 ? COLORS.green : t < 4000 ? COLORS.blue : COLORS.pink;
              })}
              labels={last8Labels}
            />
          )}
        </div>

        {/* ── Mensajes y fricción ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>

          <div style={{ ...glass, padding: "24px 28px" }}>
            <SectionLabel>Mensajes por sesión</SectionLabel>
            <BarChart
              values={last8.map((s) => s.metrics.totalMessages)}
              color={COLORS.blue}
              labels={last8Labels}
            />
            <p style={{ fontSize: "11px", color: "rgba(0,0,0,0.35)", marginTop: "10px" }}>
              Promedio: <strong style={{ color: COLORS.blue }}>{avgMsgs} msgs/sesión</strong>
            </p>
          </div>

          <div style={{ ...glass, padding: "24px 28px" }}>
            <SectionLabel>IFC — Fricción por sesión</SectionLabel>
            <BarChart
              values={last8.map((s) => avg(s.metrics.ifc))}
              color={COLORS.purple}
              labels={last8Labels}
            />
            <p style={{ fontSize: "11px", color: "rgba(0,0,0,0.35)", marginTop: "10px" }}>
              Promedio: <strong style={{ color: COLORS.purple }}>{avgIFC}c por mensaje</strong>
            </p>
          </div>
        </div>

        {/* ── Ratios comparativos ── */}
        <div style={{ ...glass, padding: "24px 28px", marginBottom: "16px" }}>
          <SectionLabel>Ratios de uso</SectionLabel>
          <HBar label="IAI — Índice de anticipación" value={globalIAI} max={100} color={COLORS.orange} format={(v) => `${v}%`} />
          <HBar label="CVR — Adopción de quick actions" value={cvrRate} max={100} color={COLORS.purple} format={(v) => `${v}%`} />
          <HBar label="CKS — Sesiones con memoria activa" value={cksRate} max={100} color={COLORS.blue} format={(v) => `${v}%`} />
          <HBar label="VOZ — Uso de input de voz" value={voiceRate} max={100} color={COLORS.pink} format={(v) => `${v}%`} />
          <HBar label="Seguridad — Sesiones sin incidentes" value={secureRate} max={100} color={COLORS.green} format={(v) => `${v}%`} />
        </div>

        {/* ── Donuts de ratios ── */}
        <div style={{ ...glass, padding: "24px 28px", marginBottom: "16px" }}>
          <SectionLabel>Distribución visual</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
            {[
              { label: "IAI",        pct: globalIAI, color: COLORS.orange },
              { label: "CVR",        pct: cvrRate,   color: COLORS.purple },
              { label: "CKS",        pct: cksRate,   color: COLORS.blue   },
              { label: "Voz",        pct: voiceRate, color: COLORS.pink   },
              { label: "Seguridad",  pct: secureRate, color: COLORS.green },
            ].map(({ label, pct, color }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                <Donut pct={pct} color={color} />
                <span style={{ fontSize: "10px", color: "rgba(0,0,0,0.4)", fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Guardrails ── */}
        {totalGuard > 0 && (
          <div style={{
            ...glass,
            padding: "20px 28px",
            marginBottom: "16px",
            background: "rgba(233,30,140,0.04)",
            border: "1px solid rgba(233,30,140,0.12)",
          }}>
            <SectionLabel>Eventos de seguridad</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: "13px", color: "rgba(0,0,0,0.5)" }}>
                Total de guardrails disparados en todas las sesiones
              </p>
              <p style={{ fontSize: "1.8rem", fontWeight: 700, color: COLORS.pink }}>{totalGuard}</p>
            </div>
          </div>
        )}

        {/* ── Cache ── */}
        <div style={{ ...glass, padding: "20px 28px", marginBottom: "16px" }}>
          <SectionLabel>Response Cache</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            <div style={{ textAlign: "center", padding: "12px", background: "rgba(255,255,255,0.6)", borderRadius: "14px" }}>
              <p style={{ fontSize: "1.6rem", fontWeight: 700, color: COLORS.blue }}>{cacheStats.total}</p>
              <p style={{ fontSize: "10px", color: "rgba(0,0,0,0.4)", marginTop: "3px" }}>Entradas en cache</p>
            </div>
            <div style={{ textAlign: "center", padding: "12px", background: "rgba(255,255,255,0.6)", borderRadius: "14px" }}>
              <p style={{ fontSize: "1.6rem", fontWeight: 700, color: COLORS.green }}>{cacheStats.hits}</p>
              <p style={{ fontSize: "10px", color: "rgba(0,0,0,0.4)", marginTop: "3px" }}>Respuestas desde cache</p>
            </div>
            <div style={{ textAlign: "center", padding: "12px", background: "rgba(255,255,255,0.6)", borderRadius: "14px" }}>
              <p style={{ fontSize: "1.6rem", fontWeight: 700, color: COLORS.orange }}>{cacheStats.expired}</p>
              <p style={{ fontSize: "10px", color: "rgba(0,0,0,0.4)", marginTop: "3px" }}>Entradas expiradas</p>
            </div>
          </div>
          <p style={{ fontSize: "11px", color: "rgba(0,0,0,0.3)", marginTop: "10px" }}>
            Normalización por keywords · TTL: identidad 7d · general 1h · saludos sin cache
          </p>
        </div>

        {/* ── Glosario ── */}
        <div style={{ ...glass, padding: "24px 28px" }}>
          <SectionLabel>Glosario de métricas</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[
              { key: "TTI", desc: "Time to Interaction — ms desde que el usuario envía hasta que llega la primera respuesta" },
              { key: "IFC", desc: "Interaction Friction — caracteres promedio por mensaje del usuario (menos = más fluido)" },
              { key: "IAI", desc: "Índice de Anticipación — % de mensajes que fueron quick actions (SOFIAA predijo bien)" },
              { key: "CVR", desc: "Conversion Rate — % de sesiones donde el usuario usó al menos una quick action" },
              { key: "CKS", desc: "Cognitive Knowledge Share — % de sesiones que arrancaron con memoria de largo plazo activa" },
              { key: "VOZ", desc: "% de sesiones donde el usuario usó el micrófono para interactuar" },
            ].map(({ key, desc }) => (
              <div key={key} style={{ padding: "10px 12px", background: "rgba(255,255,255,0.6)", borderRadius: "12px" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: COLORS.blue, marginBottom: "3px" }}>{key}</p>
                <p style={{ fontSize: "11px", color: "rgba(0,0,0,0.45)", lineHeight: 1.5 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: "11px", color: "rgba(0,0,0,0.2)", marginTop: "40px" }}>
          SOFIAA LAB · Panel Cognitivo · {now}
        </p>
      </div>
    </div>
  );
}
