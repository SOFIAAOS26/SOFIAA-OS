"use client";

import { useEffect, useRef, useState } from "react";
import SofiaLogo from "@/components/ui/SofiaLogo";

// ── Constantes de diseño ────────────────────────────────────────────────────
const SLIDE_DURATION = 5000;
const EXIT_DELAY     = 1200;

// ── Brand Aurora tokens ─────────────────────────────────────────────────────
const AURORA = "linear-gradient(135deg, #F472B6 0%, #A855F7 50%, #60A5FA 100%)";
const AURORA_GLOW = "0 4px 32px rgba(168,85,247,0.40), 0 1px 0 rgba(255,255,255,0.18) inset";

// ── Keyframes ───────────────────────────────────────────────────────────────
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
  0%,100% { transform: scale(1);    opacity: 0.88; }
  50%      { transform: scale(1.08); opacity: 1;    }
}
@keyframes sofiaa-orbRing {
  from { transform: scale(0.85); opacity: 0.55; }
  to   { transform: scale(1.55); opacity: 0;    }
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
@keyframes sofiaa-overlayOut {
  from { opacity: 1; }
  to   { opacity: 0; }
}
@keyframes sofiaa-dotFill {
  from { width: 6px; }
  to   { width: 28px; }
}
@keyframes sofiaa-auroraBlob {
  0%,100% { transform: scale(1)   rotate(0deg); }
  50%      { transform: scale(1.1) rotate(8deg); }
}
@keyframes sofiaa-logoSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
`;

// ── Slide 1 — Bienvenida con isotipo PHI ────────────────────────────────────
function Slide1() {
  return (
    <div style={{ textAlign: "center", padding: "0 24px" }}>
      {/* Isotipo + rings Aurora */}
      <div style={{ animation: "sofiaa-fadeUp 0.7s ease both", position: "relative", width: 140, margin: "0 auto" }}>
        {/* Rings de pulso */}
        {[1, 2, 3].map((i) => (
          <div key={i} style={{
            position: "absolute",
            inset: -i * 12,
            border: `1px solid rgba(168,85,247,${0.30 - i * 0.08})`,
            borderRadius: "50%",
            animation: `sofiaa-orbRing ${1.8 + i * 0.7}s ease-out ${i * 0.4}s infinite`,
          }} />
        ))}
        {/* Logo con pulso */}
        <div style={{ animation: "sofiaa-orbPulse 3.5s ease-in-out infinite" }}>
          <SofiaLogo size={140} animated />
        </div>
      </div>

      <div style={{ animation: "sofiaa-fadeUp 0.7s ease 0.25s both" }}>
        <h1 style={{
          margin: "28px 0 6px",
          fontSize: "clamp(44px, 10vw, 72px)",
          fontWeight: 900,
          letterSpacing: "-2px",
          fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
          background: AURORA,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          SOFIAA
        </h1>
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "4px",
          color: "rgba(255,255,255,0.35)", marginBottom: 20,
          fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        }}>
          INTELLIGENT EXPERIENCE OS · 2026
        </p>
      </div>

      <div style={{ animation: "sofiaa-fadeUp 0.7s ease 0.45s both" }}>
        <p style={{
          fontSize: "clamp(15px, 3vw, 20px)", fontWeight: 700,
          color: "rgba(255,255,255,0.90)", marginBottom: 12, lineHeight: 1.3,
          fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        }}>
          Reinventando el conocimiento
        </p>
        <p style={{
          fontSize: 13, color: "rgba(255,255,255,0.42)",
          lineHeight: 1.70, maxWidth: 340, margin: "0 auto",
        }}>
          No es un chatbot — es tu infraestructura cognitiva. Diseñada para organizaciones que operan diferente.
        </p>
      </div>
    </div>
  );
}

// ── Slide 2 — Ecosistema SEE ────────────────────────────────────────────────
const EXTENSIONS = [
  { icon: "🏛", name: "TEC BI",          color: "#60A5FA", delay: 0,    anim: "sofiaa-float0", desc: "Business Intelligence" },
  { icon: "📱", name: "Marketing Sofia", color: "#A855F7", delay: 0.15, anim: "sofiaa-float1", desc: "Social Media & Agencias" },
  { icon: "🕊", name: "JP Memorial",     color: "#F472B6", delay: 0.30, anim: "sofiaa-float2", desc: "Catálogo & Acompañamiento" },
];

function Slide2() {
  return (
    <div style={{ textAlign: "center", padding: "0 24px" }}>
      <div style={{ animation: "sofiaa-fadeUp 0.6s ease both" }}>
        <p style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "3px",
          marginBottom: 10, fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
          background: AURORA, WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>
          SEE · SOFIAA EXTENSION ECOSYSTEM
        </p>
        <h2 style={{
          fontSize: "clamp(24px, 6vw, 38px)", fontWeight: 900,
          color: "#fff", marginBottom: 8, letterSpacing: "-0.5px", lineHeight: 1.15,
          fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        }}>
          Tu ecosistema<br />de extensiones
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.40)", marginBottom: 40 }}>
          Módulos especializados que SOFIAA activa según tu industria.
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
        {EXTENSIONS.map((ext, i) => (
          <div key={i} style={{ animation: `sofiaa-chip 0.6s ease ${0.2 + ext.delay}s both` }}>
            <div style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${ext.color}33`,
              borderRadius: 20, padding: "22px 18px", width: 115,
              animation: `${ext.anim} ${3.5 + i * 0.5}s ease-in-out infinite`,
              boxShadow: `0 8px 32px ${ext.color}22`,
            }}>
              <div style={{
                width: 54, height: 54, borderRadius: "50%",
                background: `radial-gradient(circle, ${ext.color}28, ${ext.color}0A)`,
                border: `1px solid ${ext.color}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, margin: "0 auto 12px",
                boxShadow: `0 0 20px ${ext.color}33`,
              }}>
                {ext.icon}
              </div>
              <p style={{ fontWeight: 700, fontSize: 12, color: "#fff", marginBottom: 4,
                fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>{ext.name}</p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.38)", lineHeight: 1.4 }}>{ext.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Slide 3 — Cierre ────────────────────────────────────────────────────────
const PILLARS = [
  { icon: "🔒", label: "Gobernanza",  desc: "Soberanía total de datos" },
  { icon: "⚡", label: "Ejecución",   desc: "Acciones reales, no texto" },
  { icon: "🧠", label: "Memoria",     desc: "3 capas persistentes" },
];

function Slide3() {
  return (
    <div style={{ textAlign: "center", padding: "0 24px" }}>
      <div style={{ animation: "sofiaa-fadeUp 0.6s ease both" }}>
        <p style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "3px", marginBottom: 16,
          fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
          background: "linear-gradient(135deg, #FBBF24, #F59E0B)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>
          UNA INFRAESTRUCTURA. NO UN CHATBOT.
        </p>
        <h2 style={{
          fontSize: "clamp(22px, 5.5vw, 36px)", fontWeight: 900,
          color: "#fff", lineHeight: 1.15, marginBottom: 10, letterSpacing: "-0.5px",
          fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        }}>
          Donde ChatGPT termina,<br />
          <span style={{
            background: AURORA, WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>SOFIAA empieza.</span>
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", marginBottom: 32 }}>
          Arquitectura propietaria diseñada para ejecutar, no solo responder.
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
        {PILLARS.map((p, i) => (
          <div key={i} style={{
            animation: `sofiaa-chip 0.55s ease ${0.15 + i * 0.12}s both`,
            background: "rgba(168,85,247,0.08)",
            border: "1px solid rgba(168,85,247,0.22)",
            borderRadius: 14, padding: "14px 16px", minWidth: 96,
          }}>
            <span style={{ fontSize: 22, display: "block", marginBottom: 8 }}>{p.icon}</span>
            <p style={{ fontWeight: 700, fontSize: 12, color: "#fff", marginBottom: 3,
              fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>{p.label}</p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.38)" }}>{p.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ animation: "sofiaa-fadeUp 0.6s ease 0.6s both", marginTop: 28 }}>
        <p style={{
          fontSize: 13, color: "rgba(255,255,255,0.28)", fontStyle: "italic",
          maxWidth: 340, margin: "0 auto", lineHeight: 1.6,
        }}>
          "No dependemos de las licencias de Silicon Valley. Gobernamos nuestros procesos desde infraestructura propia."
        </p>
      </div>
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────────────────
const SLIDES = [Slide1, Slide2, Slide3];

interface Props { onDone: () => void; }

export default function OnboardingSlides({ onDone }: Props) {
  const [current, setCurrent]   = useState(0);
  const [exiting, setExiting]   = useState(false);
  const [slideKey, setSlideKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = (next?: number) => {
    const nextSlide = next ?? current + 1;
    if (nextSlide >= SLIDES.length) {
      setTimeout(() => { setExiting(true); setTimeout(onDone, 700); }, EXIT_DELAY);
    } else {
      setCurrent(nextSlide);
      setSlideKey((k) => k + 1);
    }
  };

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

      {/* Overlay — fondo dark SOFIAA */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "#09090F",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        animation: exiting ? "sofiaa-overlayOut 0.7s ease forwards" : "sofiaa-fadeIn 0.5s ease both",
        pointerEvents: exiting ? "none" : "auto",
        overflow: "hidden",
      }}>

        {/* Aurora blobs de fondo */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{
            position: "absolute", top: "-20%", left: "-20%",
            width: "60%", height: "60%", borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(244,114,182,0.14) 0%, transparent 70%)",
            filter: "blur(60px)",
            animation: "sofiaa-auroraBlob 12s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", bottom: "-10%", right: "-15%",
            width: "55%", height: "55%", borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(96,165,250,0.12) 0%, transparent 70%)",
            filter: "blur(60px)",
            animation: "sofiaa-auroraBlob 16s ease-in-out infinite reverse",
          }} />
          <div style={{
            position: "absolute", top: "35%", left: "30%",
            width: "40%", height: "40%", borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(168,85,247,0.10) 0%, transparent 70%)",
            filter: "blur(50px)",
            animation: "sofiaa-auroraBlob 20s ease-in-out infinite 4s",
          }} />
        </div>

        {/* Card principal */}
        <div style={{
          position: "relative",
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(40px) saturate(180%)",
          border: "1px solid rgba(168,85,247,0.15)",
          borderRadius: 28,
          padding: "52px 40px 40px",
          width: "min(520px, 90vw)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.70), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}>

          {/* Aurora top shimmer */}
          <div style={{
            position: "absolute", top: 0, left: "15%", right: "15%", height: 1,
            background: "linear-gradient(to right, transparent, rgba(168,85,247,0.60), rgba(96,165,250,0.40), transparent)",
          }} />

          {/* Slide content */}
          <div key={slideKey} style={{ minHeight: 340, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SlideComponent />
          </div>

          {/* Dots + botón */}
          <div style={{ marginTop: 36, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {SLIDES.map((_, i) => (
                <div
                  key={i}
                  onClick={() => { if (timerRef.current) clearTimeout(timerRef.current); setCurrent(i); setSlideKey((k) => k + 1); }}
                  style={{
                    height: 6, borderRadius: 99, cursor: "pointer",
                    background: i === current
                      ? "linear-gradient(135deg, #F472B6, #A855F7, #60A5FA)"
                      : "rgba(255,255,255,0.18)",
                    transition: "background 0.3s",
                    animation: i === current ? `sofiaa-dotFill ${SLIDE_DURATION}ms linear forwards` : "none",
                    width: i === current ? undefined : 6,
                  }}
                />
              ))}
            </div>

            {!isLast ? (
              <button
                onClick={handleManualNext}
                style={{
                  background: "rgba(168,85,247,0.10)",
                  border: "1px solid rgba(168,85,247,0.30)",
                  borderRadius: 99, padding: "9px 28px",
                  fontSize: 13, fontWeight: 700,
                  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                  color: "rgba(192,132,252,0.95)",
                  cursor: "pointer", letterSpacing: "0.5px", transition: "all 0.18s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(168,85,247,0.20)";
                  e.currentTarget.style.borderColor = "rgba(168,85,247,0.50)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(168,85,247,0.10)";
                  e.currentTarget.style.borderColor = "rgba(168,85,247,0.30)";
                }}
              >
                Siguiente →
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <SofiaLogo size={18} animated />
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", letterSpacing: "1.5px",
                  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
                  Iniciando SOFIAA…
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={() => { setExiting(true); setTimeout(onDone, 700); }}
            style={{
              marginTop: 20, background: "none", border: "none",
              fontSize: 11, color: "rgba(255,255,255,0.22)",
              cursor: "pointer", letterSpacing: "1.5px",
              fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
            }}
          >
            Saltar presentación
          </button>
        )}
      </div>
    </>
  );
}
