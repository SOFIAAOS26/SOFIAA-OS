"use client";

/**
 * TEC Bii — Centro de Mando (Dashboard Cognitivo)
 * RUMBO A TIER 4
 *
 * Sprint T2-2: KPIs reales desde Firestore — proyectos activos,
 * entidades en el grafo NEXO, urgentes e hipótesis.
 */

import { useRouter }           from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useAuth }             from "@/contexts/AuthContext";
import { subscribeProyectosV2, subscribeEmpleadosV2 } from "@/lib/tec-bii/firestore";
import type { ProyectoV2, EmpleadoV2 }              from "@/extensions/tec-bii/schema";
import type { RefineResult }                         from "@/lib/tec-bii/refine";

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
    ready:  true,
  },
  {
    path:   "/tec-bii/briefs",
    icon:   "📋",
    label:  "Briefs",
    desc:   "Solicitudes con Brief Score v2 y generación desde conversación",
    accent: "#8B5CF6",
    ready:  true,
  },
  {
    path:   "/tec-bii/equipo",
    icon:   "👥",
    label:  "Equipo",
    desc:   "Personas con SkillProfile cognitivo y carga dinámica",
    accent: "#06B6D4",
    ready:  true,
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
    ready:  true,
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
      onClick={mod.ready ? onClick : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background:   hover && mod.ready ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
        border:       `1px solid ${hover && mod.ready ? mod.accent + "44" : "rgba(255,255,255,0.06)"}`,
        borderLeft:   `3px solid ${mod.accent}`,
        borderRadius: 14,
        padding:      "18px 20px",
        cursor:       mod.ready ? "pointer" : "default",
        opacity:      mod.ready ? 1 : 0.5,
        transition:   "all 0.2s",
        transform:    hover && mod.ready ? "translateY(-2px)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={{ fontSize: 24, lineHeight: 1 }}>{mod.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0" }}>{mod.label}</span>
            {mod.ready ? (
              <span style={{
                fontSize:   9,
                color:      "#10B981",
                background: "rgba(16,185,129,0.12)",
                border:     "1px solid rgba(16,185,129,0.25)",
                borderRadius: 99,
                padding:    "1px 6px",
                fontWeight: 700,
              }}>
                ✓ ACTIVO
              </span>
            ) : (
              <span style={{
                fontSize:   9,
                color:      mod.accent,
                background: mod.accent + "18",
                border:     `1px solid ${mod.accent}33`,
                borderRadius: 99,
                padding:    "1px 6px",
                fontWeight: 700,
              }}>
                T2-3 →
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
  const router              = useRouter();
  const { profile, user }   = useAuth();
  const [time, setTime]     = useState("");
  const [proyectos, setProyectos]     = useState<ProyectoV2[]>([]);
  const [empleados, setEmpleados]     = useState<EmpleadoV2[]>([]);
  const [lastRefine, setLastRefine]   = useState<RefineResult | null>(null);
  const [refineLoading, setRefineLoading] = useState(false);

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }));
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    const unsubP = subscribeProyectosV2(uid, setProyectos);
    const unsubE = subscribeEmpleadosV2(uid, setEmpleados);
    return () => { unsubP(); unsubE(); };
  }, [user?.uid]);

  // Cargar último log de refinamiento al montar
  useEffect(() => {
    if (!user) return;
    user.getIdToken().then((token) =>
      fetch("/api/tec-bii/refine", {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` },
      })
        .then((r) => r.json() as Promise<{ success: boolean; lastRun?: RefineResult }>)
        .then((json) => { if (json.lastRun) setLastRefine(json.lastRun); })
        .catch(() => {})
    );
  }, [user]);

  const triggerRefine = useCallback(async () => {
    if (!user || refineLoading) return;
    setRefineLoading(true);
    try {
      const token = await user.getIdToken();
      const res   = await fetch("/api/tec-bii/refine", {
        method:  "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });
      const json = await res.json() as { success: boolean; result?: RefineResult };
      if (json.result) setLastRefine(json.result);
    } catch {/* silencioso */}
    finally { setRefineLoading(false); }
  }, [user, refineLoading]);

  // KPIs reales
  const activos    = proyectos.filter((p) => p.estado === "En producción").length;
  const enGrafo    = proyectos.filter((p) => !!p.nexoNodeId).length;
  const urgentes   = proyectos.filter((p) => (p.urgencyScore ?? 0) >= 0.7).length;
  const hipotesis  = proyectos.reduce((acc, p) => acc + (p.hypotheses?.length ?? 0), 0);
  const equipoActivo = empleados.filter((e) => e.activo).length;
  const saturados    = empleados.filter((e) => (e.cargaActual ?? 0) >= 0.85).length;

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
        <StatPill label="Grafo cognitivo"      value={proyectos.length === 0 ? "—" : String(enGrafo)}               color={ACCENT}   sub={enGrafo > 0 ? `de ${proyectos.length} proyectos` : "sin datos aún"} />
        <StatPill label="Proyectos activos"    value={proyectos.length === 0 ? "—" : String(activos)}               color="#10B981"  sub={urgentes > 0 ? `${urgentes} urgente${urgentes > 1 ? "s" : ""}` : "sin urgencias"} />
        <StatPill label="Equipo activo"        value={empleados.length === 0  ? "—" : String(equipoActivo)}         color="#06B6D4"  sub={saturados > 0 ? `${saturados} saturado${saturados > 1 ? "s" : ""}` : "carga normal"} />
        <StatPill label="Hipótesis cruzadas"   value={proyectos.length === 0 ? "—" : String(hipotesis)}             color="#F59E0B"  sub="NEXO ↔ TEC Bii" />
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
            Motor cognitivo activo — Sprints T2-0 → T2-5 completados
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(226,232,240,0.55)", lineHeight: 1.6 }}>
            Proyectos, Briefs y Equipo se publican automáticamente al Experience Graph.
            Ve a <strong style={{ color: ACCENT }}>Equipo</strong> para gestionar carga y SkillProfiles cognitivos,
            a <strong style={{ color: ACCENT }}>Inteligencia</strong> para análisis operacional y razonamiento cruzado NEXO ↔ TEC Bii.
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

      {/* ── Motor de Refinamiento M-7 ────────────────────────────────── */}
      <div style={{
        marginTop:    24,
        background:   "rgba(99,102,241,0.04)",
        border:       "1px solid rgba(99,102,241,0.14)",
        borderRadius: 16,
        padding:      "16px 20px",
        display:      "flex",
        alignItems:   "center",
        gap:          16,
        flexWrap:     "wrap",
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: ACCENT }}>
            ⚙ Motor de Refinamiento Cognitivo
          </p>
          <p style={{ margin: 0, fontSize: 11, color: "rgba(226,232,240,0.35)" }}>
            {lastRefine
              ? `Último run: ${new Date(lastRefine.runAt).toLocaleString("es-MX")} · ${lastRefine.usersProcessed} usuario(s) · ${lastRefine.totalRepublish} re-publicaciones · ${lastRefine.totalXdHyp} hipótesis nuevas`
              : "CRON diario 05:00 CST · Re-publica entidades, reflexión NORA y razonamiento cruzado"
            }
          </p>
        </div>
        <button
          onClick={triggerRefine}
          disabled={refineLoading}
          style={{
            background:   refineLoading ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.15)",
            border:       "1px solid rgba(99,102,241,0.25)",
            borderRadius: 10,
            padding:      "8px 16px",
            fontSize:     12,
            fontWeight:   700,
            color:        refineLoading ? "rgba(99,102,241,0.4)" : ACCENT,
            cursor:       refineLoading ? "not-allowed" : "pointer",
            whiteSpace:   "nowrap",
            transition:   "all 0.2s",
          }}
        >
          {refineLoading ? "Ejecutando…" : "▶ Ejecutar ahora"}
        </button>
      </div>

      {/* ── Nota del usuario ─────────────────────────────────────────── */}
      {profile && (
        <p style={{
          marginTop:  20,
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
