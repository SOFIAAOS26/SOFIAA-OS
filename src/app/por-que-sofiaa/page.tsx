"use client";

import { useRouter } from "next/navigation";

const NAVY   = "#0B1628";
const NAVY2  = "#0F1E35";
const NAVY3  = "#162240";
const BLUE   = "#4F7CFF";
const CYAN   = "#00C6FF";
const GOLD   = "#D4A843";
const RED    = "#FF4D4D";
const WHITE  = "#FFFFFF";
const MUTED  = "rgba(255,255,255,0.55)";
const CARD   = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";

const VS_LEFT = [
  "Herramienta de consumo generalista",
  "Datos usados para reentrenamiento público",
  "Respuestas de texto plano sin ejecución",
  "Memoria limitada a la sesión activa",
  "Sin integración con sistemas empresariales",
  "UI estática tipo ventana de chat",
];

const VS_RIGHT = [
  "Sistema Operativo Inteligente (IX-OS)",
  "Soberanía total — datos aislados por workspace",
  "Ejecuta acciones reales sobre bases de datos live",
  "Memoria estructurada de 3 capas (persistente)",
  "Integración bidireccional (Monday, ERP, Webhooks)",
  "Liquid Glass UI — interfaces reactivas generativas",
];

const PILLARS = [
  {
    num: "01", tag: "GOBERNANZA", icon: "🔒",
    title: "Privacidad y\nSoberanía de Datos",
    sub: "El argumento de Compliance que ninguna IA comercial puede resolver.",
    risk: "Los datos de tu organización —reportes financieros, costos de producción, briefs estratégicos— son procesados en nubes comerciales abiertas y pueden utilizarse para reentrenar modelos globales.",
    items: [
      { t: "Multi-Workspace Firebase", d: "Cada organización opera en un entorno completamente estanco a nivel de base de datos en Firestore." },
      { t: "Filtro Perimetral", d: "Las peticiones pasan por guardrails.engine. Las claves corren ocultas en servidor, nunca expuestas al cliente." },
      { t: "Costo Cero en Licencias", d: "Arquitectura serverless de desarrollo interno. $0 en software comercial recurrente." },
    ],
  },
  {
    num: "02", tag: "EJECUCIÓN", icon: "⚡",
    title: "Orquestación\nOperativa Real",
    sub: "SOFIAA no te dice qué hacer. SOFIAA ejecuta.",
    risk: "Las IA comerciales son cajas de texto. Responden. No actúan. No crean proyectos, no sincronizan tableros, no acceden a tus datos en tiempo real.",
    items: [
      { t: "Input", d: "El usuario hace una solicitud en lenguaje natural al orbe neural SOFIAA." },
      { t: "IX-OS", d: "SOFIAA Extension Ecosystem (SEE) procesa, valida y orquesta la acción." },
      { t: "Ejecución", d: "Crea proyectos, actualiza tableros Monday.com y consulta el ERP en tiempo real." },
    ],
  },
  {
    num: "03", tag: "MEMORIA", icon: "🧠",
    title: "Arquitectura de\nMemoria Estructurada",
    sub: "Tres capas persistentes contra la amnesia de sesión de las IA comerciales.",
    risk: "Al abrir una nueva ventana, el asistente olvida quién eres, tu presupuesto, tus proveedores y tus políticas. El usuario vuelve a empezar desde cero.",
    items: [
      { t: "Capa 1 — Memoria Operativa", d: "Mantiene el contexto completo del prompt durante la interacción en curso." },
      { t: "Capa 2 — Memory Timeline", d: "Recupera y reinyecta el historial analítico de las últimas 5 sesiones como contexto activo." },
      { t: "Capa 3 — Memoria Histórica", d: "Resumen estructurado de largo plazo. Persiste permanentemente entre visitas." },
    ],
  },
  {
    num: "04", tag: "EXPERIENCIA", icon: "✨",
    title: "Liquid Glass UI\n& Generative Interface",
    sub: "La interfaz respira y muta con el objetivo semántico del usuario.",
    risk: "Las IA comerciales ofrecen una ventana de texto estática y monótona. Texto plano. Sin ejecución. Sin datos reales.",
    items: [
      { t: "Orbe Neural SVG", d: "7 estados cognitivos que reflejan en tiempo real el estado mental del sistema." },
      { t: "Interfaces Generativas", d: "Componentes React renderizados dinámicamente según el contexto de la conversación." },
      { t: "Liquid Glass Design", d: "Sistema de materiales translúcidos con backdrop blur y animaciones de spring physics." },
    ],
  },
];

const TABLE_ROWS = [
  ["Gobernanza de Datos",     "Fuga: datos expuestos al reentrenamiento global",       "Soberanía total — workspace aislado en Firestore"],
  ["Infraestructura",         "Monolítica — igual para 100M de usuarios",              "Modular (SEE) — extensiones por industria en semanas"],
  ["Acceso a Datos Vivos",    "Ciegos — requieren subida manual en cada interacción",  "Live listeners activos sobre bases de datos en tiempo real"],
  ["Integración Empresarial", "Nula o plugins experimentales de lectura ligera",       "Bidireccional enterprise — Monday.com, ERP vía GraphQL"],
  ["Costo de Licenciamiento", "Prohibitivo por asiento Enterprise con analítica",      "Arquitectura serverless interna — $0 en licencias"],
  ["Experiencia de Usuario",  "Ventana de texto estática y monótona",                  "Liquid Glass UI — orbe neural, interfaces generativas"],
];

const UNIQUE = [
  { icon: "⚖️", color: GOLD, title: "Gobernanza Lean Six Sigma", desc: "Restringe las interacciones bajo las compuertas estrictas del ciclo DMAIC institucional. Genera briefs perfectos vía Brief Canvas antes de que errores generen pérdidas por refilmaciones." },
  { icon: "📊", color: CYAN, title: "Simulador de Impacto ROI", desc: "Módulo TEC BI nativo que modela dinámicamente desperdicio operativo para calcular matemáticamente el ahorro anual para directivos." },
  { icon: "🧬", color: "#A78BFA", title: "Adaptación Emocional Contextual", desc: "El sistema puede mutar de motor de inteligencia operacional de alta velocidad a JP Memorial — un santuario digital contemplativo de legado, mediante arquitectura SEE." },
];

export default function PorQueSofiaaPage() {
  const router = useRouter();

  return (
    <div style={{ background: NAVY, minHeight: "100dvh", color: WHITE, fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>

      {/* ── Back nav ── */}
      <div style={{ position: "fixed", top: 16, left: 16, zIndex: 50 }}>
        <button
          onClick={() => router.push("/")}
          style={{ background: "rgba(255,255,255,0.07)", border: BORDER, borderRadius: 99, padding: "7px 14px", fontSize: 12, color: MUTED, cursor: "pointer", backdropFilter: "blur(12px)" }}
        >
          ← SOFIAA
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section style={{ textAlign: "center", padding: "140px 24px 100px", maxWidth: 860, margin: "0 auto" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "3px", color: CYAN, marginBottom: 24 }}>
          SOFIAA · IX-OS · SOFIAA LAB
        </p>
        <h1 style={{ fontSize: "clamp(42px, 8vw, 80px)", fontWeight: 900, lineHeight: 1.05, margin: "0 0 28px", letterSpacing: "-1px" }}>
          Una Infraestructura.<br />
          <span style={{ color: CYAN }}>No un Chatbot.</span>
        </h1>
        <p style={{ fontSize: 18, color: MUTED, maxWidth: 560, margin: "0 auto 40px", lineHeight: 1.6 }}>
          Por qué SOFIAA supera a ChatGPT, Gemini y Claude en contextos empresariales de misión crítica.
        </p>
        <button
          onClick={() => router.push("/")}
          style={{ background: `linear-gradient(135deg, ${BLUE}, #8A20FF)`, border: "none", borderRadius: 99, padding: "12px 28px", fontSize: 14, fontWeight: 700, color: WHITE, cursor: "pointer" }}
        >
          Hablar con SOFIAA →
        </button>
      </section>

      {/* ══════════════════════════════════════════════════════
          VS COMPARISON
      ══════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 100px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 0, alignItems: "stretch" }}>

          {/* Left — IA Comercial */}
          <div style={{ background: "rgba(255,60,60,0.05)", border: "1px solid rgba(255,60,60,0.18)", borderRadius: "20px 0 0 20px", padding: "32px 28px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", color: RED, marginBottom: 8 }}>IA COMERCIAL</p>
            <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 28, color: WHITE }}>ChatGPT · Gemini · Claude</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {VS_LEFT.map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: RED, flexShrink: 0, marginTop: 6 }} />
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* VS circle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD}, #B8860B)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color: "#1a1a1a", flexShrink: 0 }}>
              VS
            </div>
          </div>

          {/* Right — SOFIAA */}
          <div style={{ background: "rgba(79,124,255,0.07)", border: "1px solid rgba(79,124,255,0.25)", borderRadius: "0 20px 20px 0", padding: "32px 28px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", color: CYAN, marginBottom: 8 }}>SOFIAA · IX-OS</p>
            <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 28, color: WHITE }}>Infraestructura Operativa Propietaria</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {VS_RIGHT.map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: CYAN, flexShrink: 0, marginTop: 6 }} />
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          4 PILARES
      ══════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 100px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "3px", color: CYAN, textAlign: "center", marginBottom: 12 }}>LOS 4 PILARES</p>
        <h2 style={{ fontSize: 36, fontWeight: 800, textAlign: "center", marginBottom: 64 }}>Dónde la diferencia es abismal</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
          {PILLARS.map((p, pi) => (
            <div key={pi} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>

              {/* Left — título + risk */}
              <div style={pi % 2 === 1 ? { order: 2 } : {}}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "3px", color: CYAN, marginBottom: 10 }}>{p.num} · {p.tag}</p>
                <h3 style={{ fontSize: 36, fontWeight: 900, lineHeight: 1.1, marginBottom: 16, whiteSpace: "pre-line" }}>{p.title}</h3>
                <p style={{ fontSize: 15, color: MUTED, marginBottom: 24, lineHeight: 1.6 }}>{p.sub}</p>
                <div style={{ background: "rgba(255,60,60,0.07)", border: "1px solid rgba(255,60,60,0.20)", borderRadius: 12, padding: "16px 20px" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", color: RED, marginBottom: 8 }}>⚠ RIESGO ACTIVO — ChatGPT / Gemini / Claude</p>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.60)", lineHeight: 1.6, margin: 0 }}>{p.risk}</p>
                </div>
              </div>

              {/* Right — solution cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, ...(pi % 2 === 1 ? { order: 1 } : {}) }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", color: CYAN, marginBottom: 4 }}>SOFIAA · SOLUCIÓN</p>
                {p.items.map((item, ii) => (
                  <div key={ii} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 20px" }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: CYAN, marginBottom: 6 }}>{item.t}</p>
                    <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, margin: 0 }}>{item.d}</p>
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          TABLA COMPARATIVA
      ══════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 100px" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>Tabla Comparativa de Arquitectura</h2>
        <p style={{ textAlign: "center", color: MUTED, marginBottom: 48, fontSize: 15 }}>SOFIAA vs. IA Comercial — Dimensiones Críticas</p>

        <div style={{ borderRadius: 20, overflow: "hidden", border: `1px solid ${BORDER}` }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: NAVY3 }}>
            <div style={{ padding: "14px 20px", fontSize: 11, fontWeight: 700, letterSpacing: "2px", color: MUTED }}>DIMENSIÓN</div>
            <div style={{ padding: "14px 20px", fontSize: 11, fontWeight: 700, letterSpacing: "2px", color: RED, borderLeft: "1px solid rgba(255,60,60,0.3)" }}>IA COMERCIAL</div>
            <div style={{ padding: "14px 20px", fontSize: 11, fontWeight: 700, letterSpacing: "2px", color: CYAN, borderLeft: `1px solid rgba(79,124,255,0.3)` }}>SOFIAA · IX-OS</div>
          </div>
          {TABLE_ROWS.map((row, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent", borderTop: `1px solid ${BORDER}` }}>
              <div style={{ padding: "16px 20px", fontSize: 13, fontWeight: 700, color: WHITE }}>{row[0]}</div>
              <div style={{ padding: "16px 20px", fontSize: 13, color: "rgba(255,90,90,0.85)", borderLeft: `1px solid ${BORDER}` }}>{row[1]}</div>
              <div style={{ padding: "16px 20px", fontSize: 13, color: "rgba(255,255,255,0.80)", borderLeft: `1px solid ${BORDER}` }}>{row[2]}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          LO QUE JAMÁS PODRÁN REPLICAR
      ══════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 100px" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>
          Lo que SOFIAA puede hacer que las IA Comerciales
        </h2>
        <p style={{ fontSize: 36, fontWeight: 900, textAlign: "center", color: GOLD, marginBottom: 56 }}>jamás podrán replicar</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {UNIQUE.map((u, i) => (
            <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "32px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: 40 }}>{u.icon}</span>
                <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${u.color}, transparent)`, margin: "16px 0" }} />
              </div>
              <p style={{ fontWeight: 700, fontSize: 16, color: u.color, textAlign: "center" }}>{u.title}</p>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65, textAlign: "center" }}>{u.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CLOSING ARGUMENT
      ══════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 120px" }}>
        <div style={{ background: "rgba(79,124,255,0.06)", border: "1px solid rgba(79,124,255,0.20)", borderRadius: 24, padding: "56px 48px", textAlign: "center" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "3px", color: CYAN, marginBottom: 24 }}>EL ARGUMENTO DE CIERRE</p>
          <p style={{ fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 800, marginBottom: 32, lineHeight: 1.3 }}>
            "ChatGPT y Gemini son herramientas de uso personal."
          </p>
          <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.8, maxWidth: 640, margin: "0 auto 40px" }}>
            "SOFIAA es una propiedad intelectual de software e infraestructura de la que eres el dueño absoluto. No dependemos de las licencias restrictivas de una gran corporación de Silicon Valley. Gobernamos nuestros procesos creativos y financieros, automatizamos Monday.com y blindamos la privacidad de nuestros datos institucionales desde un entorno serverless que costó cero pesos en software comercial."
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => router.push("/")}
              style={{ background: `linear-gradient(135deg, ${BLUE}, #8A20FF)`, border: "none", borderRadius: 99, padding: "13px 28px", fontSize: 14, fontWeight: 700, color: WHITE, cursor: "pointer" }}
            >
              Hablar con SOFIAA →
            </button>
            <button
              onClick={() => router.push("/contacto")}
              style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 99, padding: "13px 28px", fontSize: 14, fontWeight: 600, color: MUTED, cursor: "pointer" }}
            >
              Contactar al equipo
            </button>
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 32, letterSpacing: "2px" }}>SOFIAA · IX-OS · SOFIAA LAB · 2026</p>
        </div>
      </section>

    </div>
  );
}
