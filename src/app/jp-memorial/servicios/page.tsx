"use client";

// ── JP Memorial — Servicios y Capillas ───────────────────────────
// Sprint 1: Servicios funerarios completos con info de ubicaciones.

const BRAND = {
  primary: "#3D1C08",
  gold:    "#C8922A",
  muted:   "#7A6A5A",
  soft:    "#F5F0EB",
  border:  "#E8DDD5",
};

type Servicio = {
  id:     string;
  icon:   string;
  color:  string;
  bg:     string;
  titulo: string;
  desc:   string;
  detalles: string[];
};

const servicios: Servicio[] = [
  {
    id:     "inmediato",
    icon:   "◈",
    color:  "#C44040",
    bg:     "#FDF0F0",
    titulo: "Servicio Funerario Inmediato",
    desc:   "Atención 24 hrs, 365 días. Llegamos en menos de 60 minutos dentro del Área Metropolitana de Monterrey.",
    detalles: [
      "Traslado inmediato desde cualquier punto del AMM",
      "Asesor personal asignado desde el primer contacto",
      "Trámites legales y acta de defunción gestionados por nosotros",
      "Coordinación con hospitales, clínicas y domicilios",
      "Línea directa: 8115-20-2121 (Churubusco) · 8180-88-2031 (Apodaca)",
    ],
  },
  {
    id:     "capillas",
    icon:   "⬡",
    color:  "#4A7C59",
    bg:     "#EDF5EF",
    titulo: "Capillas de Velación",
    desc:   "Espacios de encuentro, consuelo y despedida. Dos ubicaciones en Monterrey y Apodaca con servicios de 12 y 24 horas.",
    detalles: [
      "Capillas Churubusco — Av. Churubusco 217 Nte, Col. Churubusco, Monterrey · Tel: 8115-20-2121",
      "Capillas Apodaca — Av. Hacienda Agua Fría 851, Apodaca · Tel: 8135-77-3023",
      "Salas privadas con clima controlado y área de descanso para la familia",
      "Música ambiental, iluminación cálida y atención ininterrumpida",
      "Servicio de café y refrigerio disponible para acompañantes",
    ],
  },
  {
    id:     "parque",
    icon:   "◉",
    color:  "#2D6B4A",
    bg:     "#EAF3ED",
    titulo: "Parque de Descanso",
    desc:   "El único parque tipo americano en el norte del AMM. Sin lápidas verticales — césped Bermuda continuo con marcadores de granito a nivel del suelo.",
    detalles: [
      "Diseño tipo americano: paisaje abierto, sereno y sin interrupciones visuales",
      "Marcadores de granito al nivel del suelo con grabado personalizado",
      "Acceso amplio para sillas de ruedas y familias numerosas",
      "Mantenimiento de jardín incluido con bono según paquete",
      "Sectores: VIP, Platino, Oro, Plata y Columbarios (nichos)",
    ],
  },
  {
    id:     "crematorio",
    icon:   "◎",
    color:  "#5A4A8A",
    bg:     "#F3F0F8",
    titulo: "Crematorio",
    desc:   "Instalaciones modernas en nuestra sede de Apodaca. Cremación directa o integrada a ceremonias de velación.",
    detalles: [
      "Crematorio integrado al parque y capillas de Apodaca",
      "Cremación directa sin velación disponible",
      "Entrega de cenizas en urna estándar incluida (upgrade disponible)",
      "Relicarios y urnas ecológicas como opción adicional",
      "Acompañamiento durante todo el proceso con asesor personal",
    ],
  },
  {
    id:     "floreria",
    icon:   "◆",
    color:  "#B07C1A",
    bg:     "#FEF7EA",
    titulo: "Florería",
    desc:   "Coronas, arreglos florales y ofrendas enviadas directamente a la capilla. Entrega en tiempo y forma garantizada.",
    detalles: [
      "Coronas de pie, arreglos de mesa y ofrendas florales",
      "Entrega directa en capilla sin costo adicional",
      "Rosas incluidas según paquete Total Service (18–30 piezas)",
      "Flores blancas todo el año para paquetes Platino y VIP",
      "Pedidos con horario flexible — llámanos al 8115-20-2121",
    ],
  },
  {
    id:     "tanatologia",
    icon:   "◇",
    color:  "#2D5E8A",
    bg:     "#EBF2F5",
    titulo: "Tanatología y Acompañamiento",
    desc:   "Apoyo profesional durante el duelo. Sesiones individuales y orientación para la familia ante la pérdida.",
    detalles: [
      "Sesiones de tanatología incluidas en paquetes VIP, Platino y Oro",
      "Guía para el proceso de duelo — fases, emociones y herramientas",
      "Acompañamiento a niños y adolescentes ante la pérdida de un ser querido",
      "Referencia a especialistas externos si el proceso lo requiere",
      "Sin costo adicional para titulares de paquetes que incluyen este servicio",
    ],
  },
  {
    id:     "prevision",
    icon:   "◈",
    color:  "#7A5C2A",
    bg:     "#F7F2EA",
    titulo: "Previsión Funeraria",
    desc:   "Planifica a futuro con total tranquilidad. Precio congelado desde la firma — sin ajustes por inflación.",
    detalles: [
      "Contrata hoy cualquier paquete Total Service y congela el precio actual",
      "Sin límite de edad para contratar",
      "Financiamiento disponible — consulta opciones con un asesor",
      "Seguro de saldo deudor incluido en todos los planes",
      "Asignación inmediata del espacio desde el día de la firma",
    ],
  },
];

const ubicaciones = [
  {
    nombre: "Capillas Churubusco · Monterrey",
    dir:    "Av. Churubusco 217 Nte, Col. Churubusco, Monterrey N.L. C.P. 64590",
    tel:    ["8115-20-2121", "8135-67-8949"],
    nota:   "Servicio 24 hrs · Capillas de velación",
  },
  {
    nombre: "Parque y Capillas Apodaca",
    dir:    "Av. Hacienda Agua Fría 851, Agua Fría N.L. C.P. 66620",
    tel:    ["8135-77-3023", "8180-88-2031"],
    nota:   "Servicio 24 hrs · Capillas + Crematorio + Parque",
  },
];

export default function ServiciosPage() {
  return (
    <div className="tbi-page-enter" style={{ maxWidth: 960, margin: "0 auto" }}>

      {/* Encabezado */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: BRAND.primary, margin: "0 0 6px" }}>
          Servicios y Capillas
        </h1>
        <p style={{ fontSize: 13, color: BRAND.muted, margin: 0 }}>
          Atención integral 24 hrs · 365 días · menos de 60 min en el AMM.
        </p>
      </div>

      {/* Grid de servicios */}
      <div
        className="tbi-stagger"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {servicios.map((s) => (
          <div
            key={s.id}
            style={{
              background: "#fff",
              borderRadius: 14,
              border: `1px solid ${BRAND.border}`,
              padding: "20px 20px 18px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: s.bg, color: s.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 800, flexShrink: 0,
              }}>
                {s.icon}
              </div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: s.color, margin: 0, lineHeight: 1.3 }}>
                {s.titulo}
              </h2>
            </div>
            <p style={{ fontSize: 12.5, color: BRAND.muted, margin: "0 0 12px", lineHeight: 1.55, fontStyle: "italic" }}>
              {s.desc}
            </p>
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
              {s.detalles.map((d, i) => (
                <li key={i} style={{ display: "flex", gap: 7, marginBottom: 5, alignItems: "flex-start" }}>
                  <span style={{ color: BRAND.gold, fontSize: 11, marginTop: 2, flexShrink: 0 }}>✦</span>
                  <span style={{ fontSize: 12, color: "#4A3A2A", lineHeight: 1.45 }}>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Ubicaciones */}
      <div style={{ marginBottom: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: BRAND.muted, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Nuestras Ubicaciones
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {ubicaciones.map((u) => (
            <div
              key={u.nombre}
              style={{
                background: BRAND.primary,
                borderRadius: 14,
                padding: "18px 20px",
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 700, color: BRAND.gold, margin: "0 0 6px" }}>{u.nombre}</p>
              <p style={{ fontSize: 12, color: "#BFB0A0", margin: "0 0 8px", lineHeight: 1.45 }}>{u.dir}</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                {u.tel.map((t) => (
                  <a
                    key={t}
                    href={`tel:${t.replace(/-/g, "")}`}
                    style={{
                      fontSize: 13, fontWeight: 700, color: "#fff",
                      textDecoration: "none", letterSpacing: "0.01em",
                    }}
                  >
                    {t}
                  </a>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "#8A7A6A", margin: 0 }}>{u.nota}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
