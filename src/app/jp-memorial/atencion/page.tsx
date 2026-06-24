"use client";

// ── JP Memorial — Atención y Acompañamiento ──────────────────────
// Sprint 1: FAQ + Glosario con sentido humano + contacto directo.

import { useState } from "react";

const BRAND = {
  primary: "#3D1C08",
  gold:    "#C8922A",
  muted:   "#7A6A5A",
  soft:    "#F5F0EB",
  border:  "#E8DDD5",
  green:   "#4A7C59",
  brown:   "#8B5A2B",
};

type FaqItem = { q: string; a: string };
type GlosarioItem = { termino: string; significado: string };

const faqs: FaqItem[] = [
  {
    q: "¿Qué hago si un familiar fallece en casa o en el hospital?",
    a: "Llama de inmediato al 8115-20-2121 (Churubusco) o 8180-88-2031 (Apodaca). Nuestro equipo llega en menos de 60 minutos dentro del AMM. No te preocupes por los trámites — nosotros gestionamos el acta de defunción y todos los papeles necesarios.",
  },
  {
    q: "¿En qué consiste un servicio Total Service?",
    a: "El JDJP Total Service incluye traslado, velación en capilla, acta de defunción, ataúd o urna, inhumación o cremación, y acompañamiento durante todo el proceso. Cada paquete (VIP, Platino, Oro, Plata, Nichos) define la cantidad de ceremonias y los servicios adicionales incluidos.",
  },
  {
    q: "¿Qué diferencia hay entre inhumación y cremación?",
    a: "La inhumación es el acto de depositar los restos en un espacio de tierra en el parque — un retorno a lo esencial. La cremación transforma el cuerpo mediante calor; las cenizas pueden colocarse en un nicho del columbario, en un relicario personal o darse al mar o a la tierra. Ambas opciones están disponibles en Jardines de Juan Pablo.",
  },
  {
    q: "¿Cómo funciona la Previsión Funeraria?",
    a: "Contratas un paquete Total Service hoy, al precio de hoy, y lo congelas para uso futuro — tuyo o de un familiar. El seguro de saldo deudor protege el plan en caso de fallecimiento antes de completar el pago. No hay ajuste por inflación ni cargos ocultos.",
  },
  {
    q: "¿Qué son los Columbarios (Nichos)?",
    a: "Son espacios individuales en una estructura de gavetas diseñada para albergar urnas con cenizas. Cada nicho tiene su placa familiar grabada y forma parte del área del parque, con mantenimiento incluido. Son la opción perfecta después de una cremación.",
  },
  {
    q: "¿Puedo llevar flores o arreglos propios a la capilla?",
    a: "Claro que sí. Además, nuestra florería puede preparar y entregar coronas, arreglos de mesa y ofrendas directamente en la capilla. Los paquetes Total Service incluyen entre 18 y 30 rosas frescas según el nivel elegido.",
  },
  {
    q: "¿Ofrecen apoyo emocional para la familia?",
    a: "Sí. Los paquetes VIP, Platino y Oro incluyen sesiones de tanatología sin costo adicional. Un especialista acompaña a la familia en las fases del duelo — incluyendo orientación para niños y adolescentes. Para cualquier paquete puedes solicitar referencia a especialistas externos.",
  },
  {
    q: "¿Cuáles son los horarios de atención?",
    a: "Atendemos 24 hrs, 365 días del año. Para urgencias: 8115-20-2121 (Churubusco, MTY) o 8180-88-2031 (Apodaca). WhatsApp disponible: 81-8088-2031. También puedes visitarnos en www.juanpablo.com.mx.",
  },
];

const glosario: GlosarioItem[] = [
  { termino: "Partir",          significado: "La transición de esta vida a otra dimensión del ser. No una pérdida absoluta, sino un cambio de estado." },
  { termino: "Trascender",      significado: "Ir más allá del cuerpo físico. El espíritu y la memoria de quien amamos permanecen con nosotros." },
  { termino: "Velatorio",       significado: "Tiempo sagrado para estar junto a quien ha partido. Un espacio de despedida, oración y consuelo colectivo." },
  { termino: "Destino final",   significado: "El espacio elegido con amor para el descanso eterno — ya sea en el parque o en un nicho del columbario." },
  { termino: "Inhumación",      significado: "El acto de depositar los restos en la tierra. Un regreso a lo esencial, a la naturaleza." },
  { termino: "Cremación",       significado: "Transformación del cuerpo mediante calor. Las cenizas representan la continuidad del ser en otra forma." },
  { termino: "Dolientes",       significado: "Corazones en reconstrucción. Personas merecedoras de apoyo, tiempo y acompañamiento compasivo." },
  { termino: "Capilla funeraria", significado: "Lugar de encuentro y consuelo. Un espacio diseñado para que la familia se reúna con dignidad y calor." },
  { termino: "Duelo",           significado: "El proceso natural de adaptación a la pérdida. No tiene límite de tiempo — cada persona lo vive a su ritmo." },
  { termino: "Tanatología",     significado: "Ciencia que acompaña a las personas en el proceso de muerte y duelo. No para sanar el dolor, sino para aprender a vivir con él." },
  { termino: "Previsión",       significado: "El acto de cuidar a los que amamos incluso cuando ya no estemos. Un regalo de paz para la familia." },
  { termino: "Columbario",      significado: "Estructura de nichos para urnas. Un lugar íntimo y permanente para las cenizas de quien amamos." },
  { termino: "Urna",            significado: "Recipiente que guarda las cenizas de quien ha partido. Puede ser estándar, ecológica o un relicario personal." },
  { termino: "Título de uso",   significado: "Documento legal que acredita el derecho a perpetuidad sobre el espacio contratado en el parque o columbario." },
];

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            background: "#fff",
            borderRadius: 12,
            border: `1px solid ${open === i ? BRAND.green + "55" : BRAND.border}`,
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              width: "100%", display: "flex", alignItems: "flex-start",
              gap: 12, padding: "14px 18px",
              background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
            }}
          >
            <span style={{ color: BRAND.green, fontSize: 14, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>
              {open === i ? "−" : "+"}
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: BRAND.primary, lineHeight: 1.4 }}>
              {item.q}
            </span>
          </button>
          {open === i && (
            <div style={{ padding: "0 18px 16px 44px", borderTop: `1px solid ${BRAND.border}` }}>
              <p style={{ fontSize: 13, color: BRAND.muted, margin: "12px 0 0", lineHeight: 1.65 }}>
                {item.a}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AtencionPage() {
  const [tab, setTab] = useState<"faq" | "glosario">("faq");

  return (
    <div className="tbi-page-enter" style={{ maxWidth: 960, margin: "0 auto" }}>

      {/* Encabezado */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: BRAND.primary, margin: "0 0 6px" }}>
          Atención y Acompañamiento
        </h1>
        <p style={{ fontSize: 13, color: BRAND.muted, margin: 0 }}>
          Estamos aquí para ti. Con calma, con respeto y con toda la información que necesitas.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
        {(["faq", "glosario"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 20px",
              borderRadius: 20,
              border: `1.5px solid ${tab === t ? BRAND.green : BRAND.border}`,
              background: tab === t ? BRAND.green : "#fff",
              color: tab === t ? "#fff" : BRAND.muted,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s",
              letterSpacing: "0.02em",
            }}
          >
            {t === "faq" ? "Preguntas frecuentes" : "Glosario empático"}
          </button>
        ))}
      </div>

      {/* FAQ */}
      {tab === "faq" && (
        <div>
          <FaqAccordion items={faqs} />
        </div>
      )}

      {/* Glosario */}
      {tab === "glosario" && (
        <div>
          <p style={{ fontSize: 13, color: BRAND.muted, marginBottom: 18, fontStyle: "italic" }}>
            En Jardines de Juan Pablo elegimos las palabras con cuidado. Aquí el significado que le damos a cada término.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {glosario.map(({ termino, significado }) => (
              <div
                key={termino}
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  border: `1px solid ${BRAND.border}`,
                  padding: "14px 18px",
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
                }}
              >
                <div style={{
                  minWidth: 130, fontSize: 13, fontWeight: 700,
                  color: BRAND.brown, paddingTop: 1,
                } as React.CSSProperties}>
                  {termino}
                </div>
                <p style={{ fontSize: 13, color: BRAND.muted, margin: 0, lineHeight: 1.6 }}>
                  {significado}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contacto */}
      <div style={{
        marginTop: 28,
        background: BRAND.soft,
        borderRadius: 14,
        padding: "18px 22px",
        border: `1px solid ${BRAND.border}`,
        display: "flex",
        flexWrap: "wrap",
        gap: 20,
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: BRAND.primary, margin: "0 0 4px" }}>
            ¿Necesitas hablar con alguien ahora?
          </p>
          <p style={{ fontSize: 12, color: BRAND.muted, margin: 0 }}>
            Llamamos a las familias con calma y sin prisa. Siempre hay alguien disponible.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a
            href="tel:81152021"
            style={{
              background: BRAND.primary, color: "#fff",
              padding: "9px 18px", borderRadius: 8,
              fontSize: 12, fontWeight: 700, textDecoration: "none",
            }}
          >
            8115-20-2121
          </a>
          <a
            href="https://wa.me/528180882031"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "#25D366", color: "#fff",
              padding: "9px 18px", borderRadius: 8,
              fontSize: 12, fontWeight: 700, textDecoration: "none",
            }}
          >
            WhatsApp
          </a>
        </div>
      </div>

    </div>
  );
}
