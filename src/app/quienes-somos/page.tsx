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

const stats = [
  { value: "15+", label: "años de experiencia" },
  { value: "52+", label: "certificaciones" },
  { value: "3", label: "proyectos activos" },
  { value: "4", label: "cámaras Sony profesionales" },
];

const skills = [
  { area: "Producción Audiovisual", items: ["Dirección y guión", "Filmación e iluminación", "Sonido directo", "Vuelo de dron DJI Air 3"] },
  { area: "Post-producción", items: ["DaVinci Resolve", "Premiere Pro", "After Effects", "Audition"] },
  { area: "Diseño", items: ["Photoshop", "Illustrator", "Dirección de arte"] },
  { area: "Tecnología & IA", items: ["Ciencia de Datos", "Inteligencia Artificial", "Optimización con IA", "Arquitectura de IX-OS"] },
];

const formacion = [
  { titulo: "Maestría en Ingeniería de Ciencia de Datos e IA", inst: "UVM" },
  { titulo: "Licenciatura en Lenguaje y Producción Audiovisual", inst: "UANL · 2016" },
  { titulo: "Licenciatura en Economía y Finanzas", inst: "UVM" },
];

export default function QuienesSomosPage() {
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
        <div style={{ textAlign: "center", marginBottom: "52px" }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", fontWeight: 500, marginBottom: "12px" }}>
            SOFIAA LAB
          </p>
          <h1 style={{ ...gradientText, fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "16px" }}>
            Quiénes somos
          </h1>
          <p style={{ fontSize: "16px", color: "rgba(0,0,0,0.45)", lineHeight: 1.6, maxWidth: "480px", margin: "0 auto" }}>
            La historia detrás de SOFIAA: quién la creó, por qué existe y qué lo mueve.
          </p>
        </div>

        {/* Perfil principal */}
        <div style={{ ...glass, padding: "36px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "24px", flexWrap: "wrap" }}>
            {/* Avatar */}
            <div style={{
              width: "72px", height: "72px", borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #4F7CFF 0%, #9B4FD9 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "24px", fontWeight: 700, color: "#fff",
            }}>
              AB
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", fontWeight: 500, marginBottom: "4px" }}>
                Fundador & Director Creativo
              </p>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#1D1D1F", marginBottom: "2px" }}>
                Abrahan Cruz Urrutia
              </h2>
              <p style={{ fontSize: "14px", color: "#4F7CFF", fontWeight: 500, marginBottom: "16px" }}>
                Benjacob · Monterrey, México
              </p>
              <p style={{ fontSize: "15px", color: "rgba(0,0,0,0.6)", lineHeight: 1.7 }}>
                Profesional multidisciplinario con más de 15 años de experiencia en producción audiovisual, estrategia creativa, ciencia de datos e inteligencia artificial. Su perfil une tres mundos: la narrativa visual, el análisis de datos y la tecnología emergente. Creador de SOFIAA, fundador de PASCALL y Director Creativo de BERRYWORKS.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
          {stats.map(({ value, label }) => (
            <div key={label} style={{ ...glass, padding: "20px 16px", textAlign: "center" }}>
              <p style={{ ...gradientText, fontSize: "1.8rem", fontWeight: 700, marginBottom: "4px" }}>{value}</p>
              <p style={{ fontSize: "11px", color: "rgba(0,0,0,0.4)", lineHeight: 1.4 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Formación */}
        <div style={{ ...glass, padding: "28px 32px", marginBottom: "20px" }}>
          <p style={{ fontSize: "10px", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", fontWeight: 600, marginBottom: "16px" }}>
            Formación académica
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {formacion.map(({ titulo, inst }) => (
              <div key={titulo} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "4px", paddingBottom: "12px", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                <p style={{ fontSize: "14px", color: "#1D1D1F", fontWeight: 500, flex: 1 }}>{titulo}</p>
                <p style={{ fontSize: "12px", color: "rgba(0,0,0,0.4)", whiteSpace: "nowrap" }}>{inst}</p>
              </div>
            ))}
            <p style={{ fontSize: "13px", color: "rgba(0,0,0,0.4)", marginTop: "4px" }}>
              + 52 certificaciones y cursos especializados en universidades internacionales
            </p>
          </div>
        </div>

        {/* Skills grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
          {skills.map(({ area, items }) => (
            <div key={area} style={{ ...glass, padding: "24px" }}>
              <p style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#4F7CFF", fontWeight: 600, marginBottom: "12px" }}>
                {area}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {items.map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#9B4FD9", flexShrink: 0 }} />
                    <span style={{ fontSize: "13px", color: "rgba(0,0,0,0.6)" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Equipamiento */}
        <div style={{ ...glass, padding: "28px 32px", marginBottom: "20px" }}>
          <p style={{ fontSize: "10px", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", fontWeight: 600, marginBottom: "16px" }}>
            Equipamiento profesional
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {["3× Sony a7 IV + Sony FX30", "DJI Air 3", "Óptica Sony G Master", "Mac Pro M2 Ultra", "Iluminación de estudio", "DaVinci Resolve Studio"].map(eq => (
              <div key={eq} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#E91E8C", flexShrink: 0 }} />
                <span style={{ fontSize: "13px", color: "rgba(0,0,0,0.55)" }}>{eq}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Jhosua */}
        <div style={{ ...glass, padding: "28px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #E91E8C 0%, #FF6B35 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px", fontWeight: 700, color: "#fff",
            }}>
              JC
            </div>
            <div>
              <p style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", fontWeight: 500, marginBottom: "2px" }}>
                Co-creador
              </p>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1D1D1F", marginBottom: "2px" }}>
                Jhosua Cruz Urrutia
              </h3>
              <p style={{ fontSize: "13px", color: "rgba(0,0,0,0.5)" }}>
                Colaborador en el desarrollo del proyecto SOFIAA. Hermano y socio de visión de Abrahan en la construcción del IX-OS.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
