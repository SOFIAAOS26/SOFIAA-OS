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

const servicios = [
  {
    tag: "IA & Experiencias Digitales",
    name: "SOFIAA LAB",
    tagline: "El sistema operativo de la experiencia.",
    description:
      "SOFIAA LAB desarrolla IX-OS (Intelligent Experience Operating Systems) — capas cognitivas que transforman la manera en que las personas interactúan con información, servicios y decisiones. No construimos chatbots. Construimos presencias inteligentes.",
    items: ["IX-OS a medida", "Asistentes de marca con personalidad", "Arquitectura de experiencia IA", "Consultoría en estrategia de IA"],
    accent: "#4F7CFF",
    accentBg: "rgba(79,124,255,0.06)",
  },
  {
    tag: "Consultoría Creativa y Estratégica",
    name: "PASCALL",
    tagline: "Estrategia que se convierte en acción.",
    description:
      "PASCALL es la consultoría creativa y estratégica fundada por Abrahan Cruz Urrutia. Acompañamos a marcas, proyectos y personas en la definición de su dirección, narrativa y presencia. Donde otros dan consejos, nosotros construimos junto a ti.",
    items: ["Dirección creativa de proyectos", "Estrategia de marca y narrativa", "Consultoría de producción", "Gestión de proyectos creativos"],
    accent: "#9B4FD9",
    accentBg: "rgba(155,79,217,0.06)",
  },
  {
    tag: "Producción Audiovisual",
    name: "BERRYWORKS",
    tagline: "Imágenes que permanecen.",
    description:
      "BERRYWORKS es la casa productora dirigida creativamente por Abrahan Cruz Urrutia. Con más de 15 años de experiencia en producción audiovisual profesional, realizamos desde spots para cine hasta campañas de marketing nacional con resultado de élite.",
    items: ["Producción de video y foto", "Dirección y guión", "Post-producción avanzada", "Drone cinematográfico (DJI Air 3)"],
    accent: "#E91E8C",
    accentBg: "rgba(233,30,140,0.06)",
  },
];

export default function ServiciosPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        overflowY: "auto",
        padding: "32px 24px 64px",
        fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: "780px", margin: "0 auto" }}>

        {/* Nav */}
        <div style={{ marginBottom: "48px" }}>
          <BackButton />
        </div>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", fontWeight: 500, marginBottom: "12px" }}>
            SOFIAA LAB · PASCALL · BERRYWORKS
          </p>
          <h1 style={{ ...gradientText, fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "16px" }}>
            Servicios
          </h1>
          <p style={{ fontSize: "16px", color: "rgba(0,0,0,0.45)", lineHeight: 1.6, maxWidth: "480px", margin: "0 auto" }}>
            Tres frentes de trabajo, una sola visión: crear experiencias que eleven lo ordinario a lo extraordinario.
          </p>
        </div>

        {/* Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {servicios.map((s) => (
            <div key={s.name} style={{ ...glass, padding: "32px", background: s.accentBg }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                <span style={{
                  fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase",
                  color: s.accent, fontWeight: 600, background: `${s.accent}15`,
                  padding: "4px 10px", borderRadius: "999px",
                }}>
                  {s.tag}
                </span>
              </div>

              <h2 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#1D1D1F", marginBottom: "4px" }}>
                {s.name}
              </h2>
              <p style={{ fontSize: "14px", color: s.accent, fontWeight: 500, marginBottom: "16px" }}>
                {s.tagline}
              </p>
              <p style={{ fontSize: "15px", color: "rgba(0,0,0,0.6)", lineHeight: 1.7, marginBottom: "24px" }}>
                {s.description}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {s.items.map((item) => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: s.accent, flexShrink: 0 }} />
                    <span style={{ fontSize: "13px", color: "rgba(0,0,0,0.55)" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ ...glass, padding: "28px 32px", marginTop: "32px", textAlign: "center" }}>
          <p style={{ fontSize: "15px", color: "rgba(0,0,0,0.5)", marginBottom: "4px" }}>
            ¿Quieres saber más o iniciar un proyecto?
          </p>
          <p style={{ ...gradientText, fontSize: "17px", fontWeight: 600 }}>
            Dile a SOFIAA lo que necesitas — está lista para ayudarte.
          </p>
        </div>

      </div>
    </div>
  );
}
