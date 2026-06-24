"use client";

// ── JP Memorial — Inicio ─────────────────────────────────────────
// Sprint 1: Bienvenida, módulos principales y datos de contacto rápido.

const BRAND = {
  primary:   "#3D1C08",
  gold:      "#C8922A",
  brown:     "#8B5A2B",
  soft:      "#F5F0EB",
  muted:     "#7A6A5A",
  border:    "#E8DDD5",
};

const modules = [
  {
    color:  "#4A7C59",
    bg:     "#EDF5EF",
    border: "#CCE3D4",
    label:  "Servicios y Capillas",
    desc:   "Servicios funerarios inmediatos 24 hrs, capillas de velación en Monterrey y Apodaca, crematorio y más.",
    href:   "/jp-memorial/servicios",
    icon:   "◈",
  },
  {
    color:  BRAND.brown,
    bg:     "#F5F0EB",
    border: "#E0D4C8",
    label:  "Catálogo de Paquetes",
    desc:   "Paquetes JDJP Total Service: VIP, Platino, Oro, Plata y Nichos. Todo incluido desde la firma.",
    href:   "/jp-memorial/catalogo",
    icon:   "◉",
  },
  {
    color:  "#2D5E8A",
    bg:     "#EBF2F5",
    border: "#C4D8E8",
    label:  "Atención y Acompañamiento",
    desc:   "Glosario con sentido humano, preguntas frecuentes y apoyo empático para familias en el duelo.",
    href:   "/jp-memorial/atencion",
    icon:   "◎",
  },
];

const quickInfo = [
  { label: "Churubusco (MTY)", value: "8115-20-2121", sub: "Av. Churubusco 217 Nte, Monterrey" },
  { label: "Apodaca",          value: "8180-88-2031", sub: "Av. Hacienda Agua Fría 851, Apodaca" },
  { label: "WhatsApp",         value: "81-8088-2031", sub: "Respuesta en minutos · 24 hrs" },
];

export default function JpMemorialHome() {
  return (
    <div className="tbi-page-enter" style={{ maxWidth: 960, margin: "0 auto" }}>

      {/* Encabezado */}
      <div style={{ marginBottom: 36, textAlign: "center" }}>
        <div style={{
          display: "inline-block",
          background: BRAND.soft,
          borderRadius: 10,
          padding: "4px 14px",
          fontSize: 11,
          fontWeight: 700,
          color: BRAND.brown,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}>
          Primer CIAF en Monterrey · 20 años de trayectoria
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: BRAND.primary, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Jardines de Juan Pablo
        </h1>
        <p style={{ fontSize: 14, color: BRAND.muted, margin: "0 0 4px", fontStyle: "italic" }}>
          "Un lugar donde el final no se escribe con un punto, sino con un sinfín de recuerdos."
        </p>
        <p style={{ fontSize: 12, color: BRAND.gold, fontWeight: 700, margin: 0, letterSpacing: "0.06em" }}>
          TRASCENDIENDO JUNTOS
        </p>
      </div>

      {/* Cards de módulos */}
      <div
        className="tbi-stagger"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18, marginBottom: 36 }}
      >
        {modules.map(({ color, bg, border, label, desc, href, icon }) => (
          <a
            key={href}
            href={href}
            style={{
              display: "block",
              background: "#fff",
              borderRadius: 16,
              border: `1px solid ${border}`,
              padding: "22px 22px 20px",
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-3px)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
            }}
          >
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: bg, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 20, color,
              marginBottom: 14, fontWeight: 800,
            }}>
              {icon}
            </div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color, margin: "0 0 6px" }}>{label}</h2>
            <p style={{ fontSize: 13, color: BRAND.muted, margin: 0, lineHeight: 1.55 }}>{desc}</p>
          </a>
        ))}
      </div>

      {/* Contacto rápido */}
      <div style={{
        background: BRAND.primary,
        borderRadius: 16,
        padding: "22px 28px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 20,
      }}>
        {quickInfo.map(({ label, value, sub }) => (
          <div key={label}>
            <p style={{ fontSize: 10, color: "#A89880", fontWeight: 700, margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              {label}
            </p>
            <p style={{ fontSize: 17, fontWeight: 800, color: BRAND.gold, margin: "0 0 2px", letterSpacing: "0.01em" }}>
              {value}
            </p>
            <p style={{ fontSize: 11, color: "#BFB0A0", margin: 0 }}>{sub}</p>
          </div>
        ))}
      </div>

    </div>
  );
}
