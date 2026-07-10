"use client";

/**
 * TEC Bii — Centro de Mando (Dashboard Cognitivo)
 * RUMBO A TIER 4
 *
 * No muestra solo KPIs numéricos: muestra el estado cognitivo del área.
 * Proyectos con urgencyScore, riskLevel, conexiones al grafo NEXO,
 * e insights en lenguaje natural de SOFIAA.
 *
 * Sprint T2-0: versión foundation — módulos listos para conectar datos
 * en los sprints siguientes.
 */

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const ACCENT  = "#6366F1";
const ACCENT2 = "#8B5CF6";

// ── Módulos del sistema ───────────────────────────────────────────────────────
const MODULES = [
  {
    path:   "/tec-bii/proyectos",
    icon:   "🎬",
    label:  "Proyectos",
    desc:   "Tracking cognitivo con urgencia, riesgo y conexiones NEXO",
    accent: "#6366F1",
    ready:  false,
  },
  {
    path:   "/tec-bii/briefs",
    icon:   "📋",
    label:  "Briefs",
    desc:   "Solicitudes con Brief Score v2 y generación desde conversación",
    accent: "#8B5CF6",
    ready:  false,
  },
  {
    path:   "/tec-bii/equipo",
    icon:   "👥",
    label:  "Equipo",
    desc:   "Personas con SkillProfile cognitivo y carga dinámica",
    accent: "#06B6D4",
    ready:  false,
  },
  {
    path:   "/tec-bii/proveedores",
    icon:   "🏢",
    label:  "Proveedores",
    desc:   "Track record, predicción de costo y reliability score",
    accent: "#10B981",
    ready:  false,
  },
  {
    path:   "/tec-bii/clientes",
    icon:   "🎓",
    label:  "Clientes",
    desc:   "Departamentos del TEC con historial y satisfacción",
    accent: "#F59E0B",
    ready:  false,
  },
  {
    path:   "/tec-bii/evaluaciones",
    icon:   "⭐",
    label:  "Evaluaciones",
    desc:   "Calificaciones con análisis cognitivo de patrones",
    accent: "#EF4444",
    ready:  false,
  },
  {
    path:   "/tec-bii/inteligencia",
    icon:   "✦",
    label:  "Inteligencia",
    desc:   "Hipótesis cruzadas, patrones detectados, reflexiones N.O.R.A.",
    accent: "#6366F1",
    ready:  false,
  },
];

// ── Componentes ───────────────────────────────────────────────────────────────

function ModuleCard({
  mod,
  onClick,
}: {
  mod: typeof MODULES[number];
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background:   hover ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
        border:       `1px solid ${hover ? mod.accent + "44" : "rgba(255,255,255,0.06)"}`,
        borderLeft:   `3px solid ${mod.accent}`,
        borderRadius: 14,
        padding:      "18px 20px",
        cursor:       "pointer",
        transition:   "all 0.2s",
        transform:    hover ? "translateY(-2px)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={{ fontSize: 24, lineHeight: 1 }}>{mod.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0" }}>{mod.label}</span>
            {!mod.ready && (
              <span style={{
                fontSize:   9,
                color:      mod.accent,
                background: mod.accent + "18",
                border:     `1px solid ${mod.accent}33`,
                borderRadius: 99,
                padding:    "1px 6px",
                fontWeight: 700,
              }}>
                T2-1 →
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(226,232,240,0.45)", lineHeight: 1.5 }}>
            {mod.desc}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <div style={{
      background:   "rgba(255,255,255,0.03)",
      border:       "1px solid rgba(255,255,255,0.07)",
      borderRadius: 14,
      padding:      "16px 20px",
      flex:         "1 1 140px",
    }}>
      <p style={{ margin: "0 0 4px", fontSize: 10, color: "rgba(226,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color }}>
        {value}
      </p>
      {sub && (
        <p style={{ margin: "2px 0 0", fontSize: 10, color: "rgba(226,232,240,0.3)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Dashboard principal ───────────────────────────────────────────────────────

export default function TecBiiDashboard() {
  const router          = useRouter();
  const { profile }     = useAuth();
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }));
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* ── Header del dashboard ─────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{
                width:        36,
                height:       36,
                borderRadius: "50%",
                background:   `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
                fontSize:     18,
                boxShadow:    `0 0 20px ${ACCENT}40`,
              }}>
                🧠
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#E2E8F0" }}>
                  Centro de Mando
                </h1>
                <p style={{ margin: 0, fontSize: 11, color: "rgba(99,102,241,0.7)", fontWeight: 600 }}>
                  TEC Bii · Producción Audiovisual · RUMBO A TIER 4
                </p>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(226,232,240,0.4)", maxWidth: 520 }}>
              Sistema cognitivo en construcción. Cada entidad que registres se convierte en conocimiento
              activo en el Experience Graph de SOFIAA.
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: ACCENT }}>{time}</p>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(226,232,240,0.3)" }}>
              {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
        </div>
      </div>

      {/* ── KPIs de estado del sistema ───────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
        <StatPill label="Versión del sistema" value="2.0" color={ACCENT}    sub="Cognitiva · RUMBO A TIER 4" />
        <StatPill label="Grafo cognitivo"      value="—"   color={ACCENT2}   sub="Conectando en T2-1" />
        <StatPill label="Proyectos activos"    value="—"   color="#10B981"   sub="Disponible en T2-1" />
        <StatPill label="Hipótesis activas"    value="—"   color="#F59E0B"   sub="Disponible en T2-4" />
      </div>

      {/* ── Aviso de activación ──────────────────────────────────────── */}
      <div style={{
        background:   "rgba(99,102,241,0.06)",
        border:       "1px solid rgba(99,102,241,0.2)",
        borderLeft:   "4px solid #6366F1",
        borderRadius: 14,
        padding:      "16px 20px",
        marginBottom: 32,
        display:      "flex",
        alignItems:   "flex-start",
        gap:          14,
      }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>✦</span>
        <div>
          <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: ACCENT }}>
            Foundation lista — Sprint T2-0 completado
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(226,232,240,0.55)", lineHeight: 1.6 }}>
            El schema cognitivo, el manifest y la arquitectura base están activos.
            El próximo sprint (T2-1) conecta los módulos al Experience Graph:
            cada proyecto, brief y persona generará un nodo con embedding en el grafo de SOFIAA.
            Desde ese momento, el motor semántico podrá razonar sobre tu operación del TEC.
          </p>
        </div>
      </div>

      {/* ── Módulos del sistema ──────────────────────────────────────── */}
      <div style={{ marginBottom: 8 }}>
        <p style={{
          margin:        "0 0 16px",
          fontSize:      10,
          color:         "rgba(226,232,240,0.3)",
          fontWeight:    700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}>
          Módulos del sistema · {MODULES.length} disponibles
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {MODULES.map((mod) => (
            <ModuleCard
              key={mod.path}
              mod={mod}
              onClick={() => router.push(mod.path)}
            />
          ))}
        </div>
      </div>

      {/* ── Nota del usuario ─────────────────────────────────────────── */}
      {profile && (
        <p style={{
          marginTop:  24,
          textAlign:  "center",
          fontSize:   11,
          color:      "rgba(226,232,240,0.2)",
          lineHeight: 1.6,
        }}>
          Sesión activa: {profile.nombre} · {profile.rol} · TEC Bii v2.0.0
        </p>
      )}
    </div>
  );
}
