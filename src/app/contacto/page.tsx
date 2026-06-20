"use client";
import BackButton from "@/components/ui/BackButton";

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.9)",
  boxShadow: "0 4px 24px rgba(100,100,200,0.07)",
  borderRadius: "24px",
};

const gradientText: React.CSSProperties = {
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  background: "linear-gradient(135deg, #4F7CFF 0%, #9B4FD9 38%, #E91E8C 68%, #FF6B35 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

const canales = [
  {
    label: "Portfolio",
    desc: "Proyectos audiovisuales y trabajos de Abrahan",
    url: "https://benjacobcurrutia.myportfolio.com/",
    accent: "#4F7CFF",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    desc: "Perfil profesional y trayectoria",
    url: "https://www.linkedin.com/in/abrahan-benjacob-cruz-urrutia-53181373/",
    accent: "#0A66C2",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    label: "Instagram",
    desc: "Proyectos visuales y vida creativa",
    url: "https://www.instagram.com/benjacob_urrutia?igsh=NHhpemk3bHhwOWY3&utm_source=qr",
    accent: "#E91E8C",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    label: "Facebook",
    desc: "Actualizaciones y comunidad",
    url: "https://www.facebook.com/share/1LMR9YGjn6/?mibextid=wwXIfr",
    accent: "#1877F2",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
];

export default function ContactoPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        overflowY: "auto",
        padding: "32px 24px 64px",
        fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: "620px", margin: "0 auto" }}>

        {/* Nav */}
        <div style={{ marginBottom: "48px" }}>
          <BackButton />
        </div>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "52px" }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", fontWeight: 500, marginBottom: "12px" }}>
            SOFIAA LAB
          </p>
          <h1 style={{ ...gradientText, fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "16px" }}>
            Contacto
          </h1>
          <p style={{ fontSize: "16px", color: "rgba(0,0,0,0.45)", lineHeight: 1.6, maxWidth: "400px", margin: "0 auto" }}>
            ¿Tienes un proyecto en mente? Abrahan está disponible para colaboraciones, consultoría y producción.
          </p>
        </div>

        {/* Canales */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
          {canales.map(({ label, desc, url, accent, icon }) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...glass,
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                gap: "18px",
                textDecoration: "none",
                transition: "transform 0.18s, box-shadow 0.18s",
                cursor: "pointer",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${accent}22`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(100,100,200,0.07)";
              }}
            >
              <div style={{
                width: "44px", height: "44px", borderRadius: "12px", flexShrink: 0,
                background: `${accent}12`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: accent,
              }}>
                {icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "15px", fontWeight: 600, color: "#1D1D1F", marginBottom: "2px" }}>{label}</p>
                <p style={{ fontSize: "13px", color: "rgba(0,0,0,0.4)" }}>{desc}</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="rgba(0,0,0,0.2)" strokeWidth={2} strokeLinecap="round">
                <path d="M7 17L17 7M7 7h10v10" />
              </svg>
            </a>
          ))}
        </div>

        {/* Disponibilidad */}
        <div style={{ ...glass, padding: "28px 32px", textAlign: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: "rgba(52,199,89,0.1)", borderRadius: "999px",
            padding: "4px 12px", marginBottom: "12px",
          }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34C759" }} />
            <span style={{ fontSize: "12px", color: "#1D7A2A", fontWeight: 500 }}>Disponible para proyectos</span>
          </div>
          <p style={{ fontSize: "15px", color: "rgba(0,0,0,0.5)", lineHeight: 1.6 }}>
            Para producciones, consultoría o propuestas de colaboración,<br />
            conecta directamente a través de cualquiera de los canales anteriores.
          </p>
        </div>

        {/* Footer suave */}
        <p style={{ textAlign: "center", fontSize: "12px", color: "rgba(0,0,0,0.2)", marginTop: "40px" }}>
          Monterrey, México · SOFIAA LAB · {new Date().getFullYear()}
        </p>

      </div>
    </div>
  );
}
