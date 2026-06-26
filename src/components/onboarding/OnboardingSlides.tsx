"use client";

import { useEffect, useRef, useState } from "react";

// ── Constantes de diseño ────────────────────────────────────────────────────
const SLIDE_DURATION = 5000; // ms por slide
const EXIT_DELAY     = 1200; // ms antes de fade-out en última slide

// ── Animaciones CSS ─────────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes sofiaa-fadeUp {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes sofiaa-fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes sofiaa-orbPulse {
  0%,100% { transform: scale(1);   opacity: 0.90; }
  50%      { transform: scale(1.07); opacity: 1;    }
}
@keyframes sofiaa-orbRing {
  from { transform: scale(0.85); opacity: 0.6; }
  to   { transform: scale(1.40); opacity: 0;   }
}
@keyframes sofiaa-float0 {
  0%,100% { transform: translateY(0px); }
  50%      { transform: translateY(-10px); }
}
@keyframes sofiaa-float1 {
  0%,100% { transform: translateY(0px); }
  50%      { transform: translateY(-14px); }
}
@keyframes sofiaa-float2 {
  0%,100% { transform: translateY(0px); }
  50%      { transform: translateY(-8px); }
}
@keyframes sofiaa-chip {
  from { opacity: 0; transform: scale(0.80) translateY(12px); }
  to   { opacity: 1; transform: scale(1)    translateY(0px);  }
}
@keyframes sofiaa-lineDraw {
  from { width: 0; }
  to   { width: 100%; }
}
@keyframes sofiaa-overlayOut {
  from { opacity: 1; }
  to   { opacity: 0; }
}
@keyframes sofiaa-dotFill {
  from { width: 6px; }
  to   { width: 28px; }
}
@keyframes sofiaa-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
`;

// ── Orb neural (slide 1) ────────────────────────────────────────────────────
function NeuralOrb({ size = 140 }: { size?: number }) {
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      {/* Rings de fondo */}
      {[1, 2, 3].map((i) => (
        <div key={i} style={{
          position: "absolute", inset: 0,
          border: `1px solid rgba(79,124,255,${0.35 - i * 0.10})`,
          borderRadius: "50%",
          animation: `sofiaa-orbRing ${1.8 + i * 0.6}s ease-out ${i * 0.4}s infinite`,
        }} />
      ))}
      {/* Orb principal */}
      <div style={{
        position: "absolute", inset: 8,
        borderRadius: "50%",
        background: "radial-gradient(circle at 38% 32%, #7AB0FF 0%, #4F7CFF 35%, #2A1F8A 70%, #0B1628 100%)",
        boxShadow: "0 0 60px rgba(79,124,255,0.55), 0 0 120px rgba(79,124,255,0.20)",
        animation: "sofiaa-orbPulse 3.5s ease-in-out infinite",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: size * 0.27, lineHeight: 1, userSelect: "none" }}>✦</span>
      </div>
    </div>
  );
}

// ── Slide 1 — Bienvenida ────────────────────────────────────────────────────
function Slide1() {
  return (
    <div style={{ textAlign: "center", padding: "0 24px" }}>
      <div style={{ animation: "sofiaa-fadeUp 0.7s ease both" }}>
        <NeuralOrb size={130} />
      </div>

      <div style={{ animation: "sofiaa-fadeUp 0.7s ease 0.25s both" }}>
        <h1 style={{
          margin: "28px 0 6px",
          fontSize: "clamp(44px, 10vw, 72px)",
          fontWeight: 900,
          letterSpacing: "-2px",
          background: "linear-gradient(135deg, #FFFFFF 0%, #B4C8FF 60%, #7AABFF 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          SOFIAA
        </h1>
        <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "4px", color: "rgba(255,255,255,0.40)", marginBottom: 20 }}>
          IX-OS · SOFIAA LAB · 2026
        </p>
      </div>

      <div style={{ animation: "sofiaa-fadeUp 0.7s ease 0.45s both" }}>
        <p style={{
          fontSize: "clamp(16px, 3vw, 22px)",
          fontWeight: 700,
          color: "rgba(255,255,255,0.92)",
          marginBottom: 12,
          lineHeight: 1.3,
        }}>
          Sistema Operativo Inteligente
        </p>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.65, maxWidth: 360, margin: "0 auto" }}>
          Diseñada para organizaciones que operan diferente. No es un chatbot — es tu infraestructura cognitiva.
        </p>
      </div>
    </div>
  );
}

// ── Slide 2 — Ecosistema SEE ────────────────────────────────────────────────
const EXTENSIONS = [
  { icon: "🏛", name: "TEC BI",          color: "#4F7CFF", delay: 0,    anim: "sofiaa-float0", desc: "Business Intelligence" },
  { icon: "📱", name: "Marketing Sofia", color: "#9B59B6", delay: 0.15, anim: "sofiaa-float1", desc: "Social Media & Agencias" },
  { icon: "🕊", name: "JP Memorial",     color: "#2ECC71", delay: 0.30, anim: "sofiaa-float2", desc: "Catálogo & Acompañamiento" },
];

function Slide2() {
  return (
    <div style={{ textAlign: "center", padding: "0 24px" }}>
      <div style={{ animation: "sofiaa-fadeUp 0.6s ease both" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "3px", color: "#00C6FF", marginBottom: 10 }}>
          SEE · SOFIAA EXTENSION ECOSYSTEM
        </p>
        <h2 style={{
          fontSize: "clamp(26px, 6vw, 40px)",
          fontWeight: 900,
          color: "#fff",
          marginBottom: 8,
          letterSpacing: "-0.5px",
          lineHeight: 1.15,
        }}>
          Tu ecosistema<br />de extensiones
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 40 }}>
          Módulos especializados que SOFIAA activa según tu industria.
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
        {EXTENSIONS.map((ext, i) => (
          <div key={i} style={{
            animation: `sofiaa-chip 0.6s ease ${0.2 + ext.delay}s both`,
          }}>
            <div style={{
              background: "rgba(255,255,255,0.05)",
              border: `1px solid rgba(255,255,255,0.10)`,
              borderRadius: 20,
              padding: "22px 20px",
              width: 120,
              animation: `${ext.anim} ${3.5 + i * 0.5}s ease-in-out infinite`,
              boxShadow: `0 8px 32px ${ext.color}22`,
            }}>
              <div style={{
                width: 56, height: 56,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${ext.color}33, ${ext.color}11)`,
                border: `1px solid ${ext.color}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28,
                margin: "0 auto 12px",
                boxShadow: `0 0 20px ${ext.color}33`,
              }}>
                {ext.icon}
              </div>
              <p style={{ fontWeight: 700, fontSize: 13, color: "#fff", marginBottom: 4 }}>{ext.name}</p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.40)", lineHeight: 1.4 }}>{ext.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Slide 3 — Cierre épico ──────────────────────────────────────────────────
const PILLARS = [
  { icon: "🔒", label: "Gobernanza",  desc: "Soberanía total de datos" },
  { icon: "⚡", label: "Ejecución",   desc: "Acciones reales, no texto" },
  { icon: "🧠", label: "Memoria",     desc: "3 capas persistentes" },
];

function Slide3() {
  return (
    <div style={{ textAlign: "center", padding: "0 24px" }}>
      <div style={{ animation: "sofiaa-fadeUp 0.6s ease both" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "3px", color: "#D4A843", marginBottom: 16 }}>
          UNA INFRAESTRUCTURA. NO UN CHATBOT.
        </p>
        <h2 style={{
          fontSize: "clamp(24px, 5.5vw, 38px)",
          fontWeight: 900,
          color: "#fff",
          lineHeight: 1.15,
          marginBottom: 10,
          letterSpacing: "-0.5px",
        }}>
          Donde ChatGPT termina,<br />
          <span style={{ color: "#4F7CFF" }}>SOFIAA empieza.</span>
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 36 }}>
          Arquitectura propietaria diseñada para ejecutar, no solo responder.
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
        {PILLARS.map((p, i) => (
          <div key={i} style={{
            animation: `sofiaa-chip 0.55s ease ${0.15 + i * 0.12}s both`,
            background: "rgba(79,124,255,0.08)",
            border: "1px solid rgba(79,124,255,0.20)",
            borderRadius: 14,
            padding: "14px 18px",
            minWidth: 100,
          }}>
            <span style={{ fontSize: 22, display: "block", marginBottom: 8 }}>{p.icon}</span>
            <p style={{ fontWeight: 700, fontSize: 13, color: "#fff", marginBottom: 3 }}>{p.label}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.40)" }}>{p.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ animation: "sofiaa-fadeUp 0.6s ease 0.6s both", marginTop: 32 }}>
        <p style={{
          fontSize: 14,
          color: "rgba(255,255,255,0.30)",
          fontStyle: "italic",
          maxWidth: 340,
          margin: "0 auto",
          lineHeight: 1.6,
        }}>
          "No dependemos de las licencias de Silicon Valley. Gobernamos nuestros procesos desde infraestructura propia."
        </p>
      </div>
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────────────────
const SLIDES = [Slide1, Slide2, Slide3];

interface Props {
  onDone: () => void;
}

export default function OnboardingSlides({ onDone }: Props) {
  const [current, setCurrent]     = useState(0);
  const [exiting, setExiting]     = useState(false);
  const [slideKey, setSlideKey]   = useState(0); // fuerza re-mount de slide
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = (next?: number) => {
    const nextSlide = next ?? current + 1;
    if (nextSlide >= SLIDES.length) {
      // última slide → esperar y fade out
      setTimeout(() => {
        setExiting(true);
        setTimeout(onDone, 700);
      }, EXIT_DELAY);
    } else {
      setCurrent(nextSlide);
      setSlideKey((k) => k + 1);
    }
  };

  // Auto-avance
  useEffect(() => {
    timerRef.current = setTimeout(() => advance(), SLIDE_DURATION);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const handleManualNext = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    advance();
  };

  const isLast = current === SLIDES.length - 1;
  const SlideComponent = SLIDES[current];

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* Overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "#080F1F",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        animation: exiting ? "sofiaa-overlayOut 0.7s ease forwards" : "sofiaa-fadeIn 0.5s ease both",
        pointerEvents: exiting ? "none" : "auto",
      }}>

        {/* Gradiente radial de fondo */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(79,124,255,0.12) 0%, transparent 70%)",
        }} />

        {/* Card principal */}
        <div style={{
          position: "relative",
          background: "rgba(255,255,255,0.035)",
          backdropFilter: "blur(40px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 28,
          padding: "52px 40px 40px",
          width: "min(520px, 90vw)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.10)",
        }}>

          {/* Shimmer top bar */}
          <div style={{
            position: "absolute", top: 0, left: "20%", right: "20%", height: 1,
            background: "linear-gradient(to right, transparent, rgba(255,255,255,0.35), transparent)",
          }} />

          {/* Slide content (re-mount con key) */}
          <div key={slideKey} style={{ minHeight: 340, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SlideComponent />
          </div>

          {/* Dots + botón */}
          <div style={{ marginTop: 36, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>

            {/* Dot indicators */}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {SLIDES.map((_, i) => (
                <div
                  key={i}
                  onClick={() => { if (timerRef.current) clearTimeout(timerRef.current); setCurrent(i); setSlideKey((k) => k + 1); }}
                  style={{
                    height: 6, borderRadius: 99, cursor: "pointer",
                    background: i === current ? "#4F7CFF" : "rgba(255,255,255,0.20)",
                    transition: "background 0.3s",
                    animation: i === current ? `sofiaa-dotFill ${SLIDE_DURATION}ms linear forwards` : "none",
                    width: i === current ? undefined : 6,
                  }}
                />
              ))}
            </div>

            {/* Botón de avance manual */}
            {!isLast ? (
              <button
                onClick={handleManualNext}
                style={{
                  background: "rgba(79,124,255,0.12)",
                  border: "1px solid rgba(79,124,255,0.28)",
                  borderRadius: 99,
                  padding: "9px 24px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#7AABFF",
                  cursor: "pointer",
                  letterSpacing: "0.5px",
                  transition: "all 0.18s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(79,124,255,0.22)";
                  e.currentTarget.style.borderColor = "rgba(79,124,255,0.50)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(79,124,255,0.12)";
                  e.currentTarget.style.borderColor = "rgba(79,124,255,0.28)";
                }}
              >
                Siguiente →
              </button>
            ) : (
              /* En la última slide el botón desaparece — se cierra solo */
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", letterSpacing: "1px" }}>
                Iniciando SOFIAA…
              </p>
            )}

          </div>
        </div>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={() => { setExiting(true); setTimeout(onDone, 700); }}
            style={{
              marginTop: 20,
              background: "none", border: "none",
              fontSize: 12, color: "rgba(255,255,255,0.25)",
              cursor: "pointer", letterSpacing: "1px",
            }}
          >
            Saltar presentación
          </button>
        )}

      </div>
    </>
  );
}
