"use client";

// ── JP Memorial — Catálogo de Paquetes JDJP Total Service ────────
// Sprint 1: Paquetes VIP, Platino, Oro, Plata y Nichos (Columbarios).

import { useState } from "react";

const BRAND = {
  primary: "#3D1C08",
  gold:    "#C8922A",
  muted:   "#7A6A5A",
  soft:    "#F5F0EB",
  border:  "#E8DDD5",
  brown:   "#8B5A2B",
};

type Paquete = {
  id:        string;
  nombre:    string;
  sector:    string;
  tagline:   string;
  tier:      string;
  tierColor: string;
  tierBg:    string;
  gavetas:   string;
  lapida:    string;
  bono:      string;
  eventos:   string;
  rosas:     string;
  catering:  string;
  extras:    string[];
  comunes:   boolean;
};

const paquetes: Paquete[] = [
  {
    id:        "vip",
    nombre:    "VIP",
    sector:    "Sector VIP",
    tagline:   "La experiencia más completa. Para familias que desean lo mejor.",
    tier:      "VIP",
    tierColor: "#FFF8E8",
    tierBg:    "#7B5C1A",
    gavetas:   "4 gavetas + 4 espacios osarios",
    lapida:    "Lápida para 4 nombres",
    bono:      "Mantenimiento 10 años",
    eventos:   "Ceremonia Total Service",
    rosas:     "30 rosas",
    catering:  "Catering para 50 personas",
    extras:    [
      "Concierge funerario exclusivo",
      "Director funerario personal",
      "Video homenaje / tributo",
      "Sesión de tanatología incluida",
      "Consulta legal de patrimonio",
      "Flores blancas todo el año",
      "Invitación a ceremonia aniversario luctuoso",
    ],
    comunes: true,
  },
  {
    id:        "platino",
    nombre:    "Platino",
    sector:    "Área Platino",
    tagline:   "Prestaciones de élite con acompañamiento total.",
    tier:      "PLATINO",
    tierColor: "#F0F4F8",
    tierBg:    "#3A5070",
    gavetas:   "4 gavetas + 4 espacios osarios",
    lapida:    "Lápida para 4 nombres",
    bono:      "Mantenimiento 10 años",
    eventos:   "4 ceremonias Total Service",
    rosas:     "30 rosas",
    catering:  "Catering para 50 personas",
    extras:    [
      "Director funerario personal",
      "Video homenaje / tributo",
      "Sesión de tanatología incluida",
      "Flores blancas todo el año",
      "Invitación a ceremonia aniversario luctuoso",
    ],
    comunes: true,
  },
  {
    id:        "oro",
    nombre:    "Oro",
    sector:    "Área Oro",
    tagline:   "Cobertura amplia con calidez en cada detalle.",
    tier:      "ORO",
    tierColor: "#FFF9EC",
    tierBg:    "#B07C1A",
    gavetas:   "3 gavetas + 3 espacios osarios",
    lapida:    "Lápida para 3 nombres",
    bono:      "Mantenimiento 7 años",
    eventos:   "3 ceremonias Total Service",
    rosas:     "24 rosas",
    catering:  "Catering para 40 personas",
    extras:    [
      "Director funerario personal",
      "Sesión de tanatología incluida",
    ],
    comunes: true,
  },
  {
    id:        "plata",
    nombre:    "Plata",
    sector:    "Sector Plata",
    tagline:   "Todo lo esencial con dignidad y atención personalizada.",
    tier:      "PLATA",
    tierColor: "#F5F5F5",
    tierBg:    "#6A7A6A",
    gavetas:   "2 gavetas + 2 espacios osarios",
    lapida:    "Lápida para 2 nombres",
    bono:      "Mantenimiento 5 años",
    eventos:   "2 eventos Total Service",
    rosas:     "18 rosas",
    catering:  "Coffee break para 30 personas",
    extras:    [
      "Director funerario personal",
    ],
    comunes: true,
  },
  {
    id:        "nichos",
    nombre:    "Nichos",
    sector:    "Área Columbarios",
    tagline:   "Espacios para cenizas con toda la dignidad y el cariño de un lugar propio.",
    tier:      "NICHOS",
    tierColor: "#F3EEF8",
    tierBg:    "#5A3A7A",
    gavetas:   "1 nicho en columbario",
    lapida:    "Placa familiar",
    bono:      "Mantenimiento 10 años",
    eventos:   "2 ceremonias Total Service",
    rosas:     "—",
    catering:  "Coffee break incluido",
    extras:    [
      "Título de uso a perpetuidad",
      "Urna estándar incluida",
      "Espacio abierto en área de jardín",
    ],
    comunes: false,
  },
];

const comunesATodos = [
  "Título de uso a perpetuidad",
  "Seguro de saldo deudor",
  "Asignación inmediata del espacio",
  "4 urnas estándar",
  "Precio congelado desde la firma",
];

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      background: bg, color, fontSize: 10, fontWeight: 800,
      padding: "3px 10px", borderRadius: 20, letterSpacing: "0.08em",
    }}>
      {label}
    </span>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  if (value === "—") return null;
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
      <span style={{ color: BRAND.gold, fontSize: 14, lineHeight: 1.2 }}>{icon}</span>
      <div>
        <span style={{ fontSize: 12, color: BRAND.muted }}>{label}: </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#3D2A1A" }}>{value}</span>
      </div>
    </div>
  );
}

export default function CatalogoPage() {
  const [open, setOpen] = useState<string | null>("vip");

  return (
    <div className="tbi-page-enter" style={{ maxWidth: 960, margin: "0 auto" }}>

      {/* Encabezado */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: BRAND.primary, margin: "0 0 6px" }}>
          Catálogo de Paquetes
        </h1>
        <p style={{ fontSize: 13, color: BRAND.muted, margin: 0 }}>
          Paquetes <strong>JDJP Total Service</strong> — precio congelado desde la firma · asignación inmediata.
        </p>
      </div>

      {/* Lista de paquetes */}
      <div className="tbi-stagger" style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
        {paquetes.map((p) => {
          const isOpen = open === p.id;
          return (
            <div
              key={p.id}
              style={{
                background: "#fff",
                borderRadius: 16,
                border: `1.5px solid ${isOpen ? p.tierBg + "55" : BRAND.border}`,
                overflow: "hidden",
                boxShadow: isOpen ? `0 4px 16px ${p.tierBg}22` : "0 1px 4px rgba(0,0,0,0.05)",
                transition: "box-shadow 0.2s, border-color 0.2s",
              }}
            >
              {/* Cabecera — siempre visible */}
              <button
                onClick={() => setOpen(isOpen ? null : p.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center",
                  gap: 14, padding: "18px 22px",
                  background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                }}
              >
                <Badge label={p.tier} color={p.tierColor} bg={p.tierBg} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: BRAND.primary, margin: 0 }}>
                    Paquete {p.nombre} — {p.sector}
                  </p>
                  <p style={{ fontSize: 12, color: BRAND.muted, margin: "2px 0 0", fontStyle: "italic" }}>
                    {p.tagline}
                  </p>
                </div>
                <span style={{ color: BRAND.muted, fontSize: 18, lineHeight: 1 }}>
                  {isOpen ? "−" : "+"}
                </span>
              </button>

              {/* Detalle expandible */}
              {isOpen && (
                <div style={{ padding: "0 22px 22px", borderTop: `1px solid ${BRAND.border}` }}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 20,
                    marginTop: 18,
                  }}>
                    {/* Columna izquierda — inclusions principales */}
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: BRAND.muted, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        Incluye
                      </p>
                      <Row icon="⬡" label="Espacio" value={p.gavetas} />
                      <Row icon="⬡" label="Identificación" value={p.lapida} />
                      <Row icon="⬡" label="Bono" value={p.bono} />
                      <Row icon="⬡" label="Ceremonias" value={p.eventos} />
                      <Row icon="⬡" label="Floral" value={p.rosas} />
                      <Row icon="⬡" label="Catering" value={p.catering} />
                    </div>

                    {/* Columna derecha — extras */}
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: BRAND.muted, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        Servicios adicionales
                      </p>
                      {p.extras.map((e) => (
                        <div key={e} style={{ display: "flex", gap: 8, marginBottom: 7, alignItems: "flex-start" }}>
                          <span style={{ color: p.tierBg, fontSize: 12, marginTop: 1 }}>✓</span>
                          <span style={{ fontSize: 12, color: "#3D2A1A", lineHeight: 1.4 }}>{e}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <div style={{ marginTop: 20, paddingTop: 18, borderTop: `1px solid ${BRAND.border}` }}>
                    <p style={{ fontSize: 12, color: BRAND.muted, margin: "0 0 10px" }}>
                      Para cotizaciones y disponibilidad, un asesor te contactará directamente.
                    </p>
                    <a
                      href="https://wa.me/528180882031"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block",
                        background: "#25D366",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        padding: "8px 18px",
                        borderRadius: 8,
                        textDecoration: "none",
                        letterSpacing: "0.02em",
                      }}
                    >
                      Solicitar información por WhatsApp
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Común a todos */}
      <div style={{
        background: BRAND.soft,
        borderRadius: 14,
        padding: "18px 22px",
        border: `1px solid ${BRAND.border}`,
      }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: BRAND.brown, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          ✓ Incluido en todos los paquetes
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {comunesATodos.map((item) => (
            <span key={item} style={{
              background: "#fff",
              border: `1px solid ${BRAND.border}`,
              borderRadius: 20,
              padding: "5px 14px",
              fontSize: 12,
              color: "#3D2A1A",
              fontWeight: 500,
            }}>
              {item}
            </span>
          ))}
        </div>
      </div>

    </div>
  );
}
