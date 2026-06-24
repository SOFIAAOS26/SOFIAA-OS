"use client";

import { useState } from "react";

const P = "#7C3AED";

// ── Hooks data ─────────────────────────────────────────────────────────────
const HOOKS = [
  {
    tipo: "Pregunta Provocadora",
    industria: "Universal",
    estructura: "¿[Dolor del cliente]? Esto es lo que nadie te dice sobre [tema].",
    ejemplo: "¿Tu piel nunca mejora aunque gastes en cremas? Esto es lo que las marcas no quieren que sepas.",
  },
  {
    tipo: "Cifra Impactante",
    industria: "Salud / Finanzas",
    estructura: '"[X]% de [audiencia] no sabe que [dato sorprendente]."',
    ejemplo: '"El 78% de las personas en Monterrey pierde más de $3,000 pesos al año en skincare ineficiente."',
  },
  {
    tipo: "Antes / Después",
    industria: "Belleza / Fitness",
    estructura: '"De [estado negativo] a [resultado deseado] en [tiempo]."',
    ejemplo: '"De piel apagada a luminosa en 21 días. Esto fue lo único que cambié."',
  },
  {
    tipo: "El Secreto",
    industria: "Cualquier nicho",
    estructura: '"Lo que los [expertos/marcas] no quieren que sepas sobre [tema]."',
    ejemplo: '"Lo que los restaurantes de lujo no quieren que sepas sobre sus platillos del día."',
  },
  {
    tipo: "Identificación Directa",
    industria: "Ecommerce / Servicios",
    estructura: '"Si eres [descripción específica], este post es para ti."',
    ejemplo: '"Si eres mamá en Monterrey y cuidas tu piel, este post es para ti."',
  },
  {
    tipo: "El Error Común",
    industria: "Educativo",
    estructura: '"El error #1 que comete [audiencia] cuando [acción]."',
    ejemplo: '"El error #1 que cometen los emprendedores cuando contratan a un community manager."',
  },
  {
    tipo: "Promesa de Resultado",
    industria: "Fitness / Negocios",
    estructura: '"[Resultado específico] sin [objeción principal]. Así es cómo."',
    ejemplo: '"Más clientes para tu clínica sin gastar en publicidad costosa. Así es cómo."',
  },
  {
    tipo: "Storytelling de Empatía",
    industria: "Salud / Lifestyle",
    estructura: '"Hace [tiempo], yo también [problema]. Hoy [transformación]."',
    ejemplo: '"Hace 6 meses yo también pensaba que los Reels eran una pérdida de tiempo. Hoy generan el 60% de mis clientes."',
  },
  {
    tipo: "FOMO / Urgencia",
    industria: "Ecommerce / Eventos",
    estructura: '"Solo [X] lugares/piezas/días. [Beneficio] que no puedes dejar pasar."',
    ejemplo: '"Solo 5 lugares para nuestra consulta gratuita de esta semana. Tu piel no puede esperar."',
  },
  {
    tipo: "Social Proof",
    industria: "Universal",
    estructura: '"[X] personas en [lugar] ya [resultado]. ¿Tú cuándo?"',
    ejemplo: '"847 pacientes en Monterrey ya recuperaron la confianza en su piel. ¿Tú cuándo?"',
  },
];

// ── Frameworks data ────────────────────────────────────────────────────────
const FRAMEWORKS = [
  {
    id: "aida",
    nombre: "AIDA",
    cuandoUsar: "Posts de venta directa, Ads",
    pasos: [
      { letra: "A", nombre: "Atención", desc: "Hook impactante en línea 1 — para el scroll en los primeros 2 segundos." },
      { letra: "I", nombre: "Interés", desc: "Dato o historia que conecta emocionalmente con el dolor del lector." },
      { letra: "D", nombre: "Deseo", desc: "Beneficio específico + prueba social que hace querer el resultado." },
      { letra: "A", nombre: "Acción", desc: "CTA claro, único y con urgencia genuina." },
    ],
    checklist: ["Hook en <3 seg", "Beneficio antes de característica", "Un solo CTA", "Emojis estratégicos"],
    color: "#7C3AED",
  },
  {
    id: "pas",
    nombre: "PAS",
    cuandoUsar: "Contenido educativo, problemas de audiencia",
    pasos: [
      { letra: "P", nombre: "Problema", desc: "Nombra el dolor exacto — el lector debe sentir que lo conoces." },
      { letra: "A", nombre: "Agitación", desc: "Amplifica las consecuencias de NO resolverlo. Hazlo sentir el costo." },
      { letra: "S", nombre: "Solución", desc: "Presenta tu oferta como el alivio natural y específico al dolor." },
    ],
    checklist: ["El problema debe doler", "No resolver demasiado rápido", "Solución específica, no genérica"],
    color: "#0EA5E9",
  },
  {
    id: "pastor",
    nombre: "PASTOR",
    cuandoUsar: "Copy largo, emails, Reels de +60 seg",
    pasos: [
      { letra: "P", nombre: "Persona / Problema", desc: "¿A quién hablas exactamente? Define su situación actual." },
      { letra: "A", nombre: "Amplify", desc: "¿Qué pasa si no resuelve el problema? Eleva las consecuencias." },
      { letra: "S", nombre: "Story", desc: "Tu caso real o el de un cliente transformado. Hazlo concreto." },
      { letra: "T", nombre: "Transformation", desc: "El resultado después del cambio. Cuantificable si es posible." },
      { letra: "O", nombre: "Offer", desc: "La propuesta clara: qué es, qué incluye, qué cuesta." },
      { letra: "R", nombre: "Response", desc: "El CTA. Una sola acción, directa y sin fricción." },
    ],
    checklist: ["Persona definida", "Historia real", "Transformación cuantificable", "Oferta irresistible"],
    color: "#10B981",
  },
  {
    id: "4ps",
    nombre: "4Ps",
    cuandoUsar: "Carruseles, posts de valor",
    pasos: [
      { letra: "P", nombre: "Promise", desc: "Promesa del resultado que obtendrá el lector si sigue leyendo." },
      { letra: "P", nombre: "Picture", desc: "Visualización vívida del éxito. Haz que se vea en ese futuro." },
      { letra: "P", nombre: "Proof", desc: "Evidencia o testimonio que respalda la promesa. Real y verificable." },
      { letra: "P", nombre: "Push", desc: "El empuje a la acción. Urgencia genuina, no artificial." },
    ],
    checklist: ["Promesa realista", "Imagen mental vívida", "Prueba verificable", "Urgencia genuina"],
    color: "#F59E0B",
  },
];

// ── CTAs data ──────────────────────────────────────────────────────────────
const CTAS = [
  {
    objetivo: "💬 Comentarios",
    feed:    ["Cuéntanos en comentarios…", "¿Tú qué opinas? 👇", "Etiqueta a alguien que necesita esto"],
    story:   ["Responde esta story 👇", "Desliza y cuéntanos"],
    ads:     ["Comenta SÍ si quieres más info"],
  },
  {
    objetivo: "🔗 Tráfico web",
    feed:    ["Link en bio para ver más →", "Guarda este post para cuando lo necesites"],
    story:   ["Desliza arriba →", "Link en bio 🔗"],
    ads:     ["Haz clic para conocer más →", "Ver oferta completa"],
  },
  {
    objetivo: "📩 Leads / DM",
    feed:    ["Escríbenos GRATIS al DM para tu diagnóstico", "Manda un DM con la palabra [X]"],
    story:   ["Escríbenos aquí 👆", "Responde con [palabra clave]"],
    ads:     ["Solicita tu cita gratis hoy →", "Habla con un asesor ahora"],
  },
  {
    objetivo: "❤️ Engagement",
    feed:    ["Guarda si te sirvió 💾", "Comparte con quien lo necesite 🔁"],
    story:   ["Vota aquí 👆", "¿Cuál prefieres? →"],
    ads:     ["Dale me gusta si estás de acuerdo"],
  },
];

// ── Subcomponents ──────────────────────────────────────────────────────────
function CopyTag({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      title="Copiar"
      style={{
        background: copied ? "#D1FAE5" : "#F3F4F6",
        border: `1px solid ${copied ? "#6EE7B7" : "#E5E7EB"}`,
        borderRadius: 8, padding: "6px 10px", fontSize: 11,
        color: copied ? "#065F46" : "#374151", cursor: "pointer",
        transition: "all 0.15s", textAlign: "left", display: "block", width: "100%",
      }}
    >
      {copied ? "✅ Copiado" : text}
    </button>
  );
}

export default function CopyHooksPage() {
  const [activeFramework, setActiveFramework] = useState("aida");
  const [hookFilter, setHookFilter] = useState("Todos");

  const industrias = ["Todos", ...Array.from(new Set(HOOKS.map((h) => h.industria)))];
  const filteredHooks = hookFilter === "Todos" ? HOOKS : HOOKS.filter((h) => h.industria === hookFilter);
  const fw = FRAMEWORKS.find((f) => f.id === activeFramework)!;

  return (
    <div className="tbi-page-enter" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1D1D1F", margin: 0 }}>
        ✍️ Copy & Hooks
      </h1>

      {/* ── HOOKS ── */}
      <section style={{ background: "#fff", borderRadius: 16, border: `1px solid ${P}18`, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>
            🎣 Hooks de Apertura
            <span style={{ fontSize: 11, fontWeight: 400, color: "#9CA3AF", marginLeft: 8 }}>
              Los primeros 3 segundos son todo
            </span>
          </h2>
          {/* Industry filter */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {industrias.map((ind) => (
              <button key={ind} onClick={() => setHookFilter(ind)} style={{
                padding: "4px 10px", borderRadius: 99, fontSize: 10, fontWeight: 600,
                border: `1.5px solid ${hookFilter === ind ? P : "#E5E7EB"}`,
                background: hookFilter === ind ? `${P}12` : "transparent",
                color: hookFilter === ind ? P : "#6B7280", cursor: "pointer",
              }}>{ind}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {filteredHooks.map((hook) => (
            <div key={hook.tipo} style={{
              border: `1px solid ${P}18`, borderRadius: 12, padding: 14,
              display: "flex", flexDirection: "column", gap: 8, background: "#FAFAFA",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: P }}>{hook.tipo}</span>
                <span style={{
                  fontSize: 9, fontWeight: 600, color: "#6B7280",
                  background: "#F3F4F6", borderRadius: 99, padding: "2px 7px",
                }}>{hook.industria}</span>
              </div>
              <div>
                <p style={{ fontSize: 10, color: "#9CA3AF", margin: "0 0 4px", fontWeight: 600, letterSpacing: "0.3px" }}>ESTRUCTURA</p>
                <p style={{ fontSize: 11, color: "#374151", margin: 0, fontStyle: "italic", lineHeight: 1.5 }}>{hook.estructura}</p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: "#9CA3AF", margin: "0 0 4px", fontWeight: 600, letterSpacing: "0.3px" }}>EJEMPLO REAL</p>
                <CopyTag text={hook.ejemplo} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FRAMEWORKS ── */}
      <section style={{ background: "#fff", borderRadius: 16, border: `1px solid ${P}18`, padding: 22 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1D1D1F", margin: "0 0 16px" }}>
          🏗️ Frameworks de Copy
        </h2>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {FRAMEWORKS.map((f) => (
            <button key={f.id} onClick={() => setActiveFramework(f.id)} style={{
              padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700,
              border: `2px solid ${activeFramework === f.id ? f.color : "#E5E7EB"}`,
              background: activeFramework === f.id ? f.color : "#F9FAFB",
              color: activeFramework === f.id ? "#fff" : "#6B7280",
              cursor: "pointer", transition: "all 0.15s",
            }}>
              {f.nombre}
            </button>
          ))}
        </div>

        {/* Active framework detail */}
        <div className="ext-sidebar-layout" style={{ gap: 20 }}>
          <div>
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 14px", fontWeight: 600 }}>
              CUÁNDO USAR: <span style={{ color: "#374151", fontWeight: 400 }}>{fw.cuandoUsar}</span>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {fw.pasos.map((paso, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: fw.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 14, fontWeight: 900, flexShrink: 0,
                  }}>{paso.letra}</div>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#1D1D1F" }}>
                      {paso.nombre}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6B7280", lineHeight: 1.5 }}>
                      {paso.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div style={{ background: `${fw.color}08`, border: `1px solid ${fw.color}25`, borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: fw.color, margin: "0 0 12px", letterSpacing: "0.3px" }}>
              CHECKLIST ANTES DE PUBLICAR
            </p>
            {fw.checklist.map((item) => (
              <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{ color: fw.color, fontSize: 13, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 11, color: "#374151", lineHeight: 1.4 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTAs ── */}
      <section style={{ background: "#fff", borderRadius: 16, border: `1px solid ${P}18`, padding: 22 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1D1D1F", margin: "0 0 16px" }}>
          📣 Banco de CTAs por Objetivo
        </h2>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: "#F9FAFB" }}>
                {["Objetivo", "Feed / Reel", "Story", "Ads"].map((h) => (
                  <th key={h} style={{
                    padding: "10px 14px", textAlign: "left", fontWeight: 700,
                    color: "#6B7280", fontSize: 10, letterSpacing: "0.4px",
                    borderBottom: "1px solid #E5E7EB",
                  }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CTAS.map((row, i) => (
                <tr key={row.objetivo} style={{ background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                  <td style={{ padding: "12px 14px", fontWeight: 700, color: P, fontSize: 12, borderBottom: "1px solid #F3F4F6", whiteSpace: "nowrap" }}>
                    {row.objetivo}
                  </td>
                  {[row.feed, row.story, row.ads].map((ctaList, ci) => (
                    <td key={ci} style={{ padding: "12px 14px", borderBottom: "1px solid #F3F4F6", verticalAlign: "top" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {ctaList.map((cta) => (
                          <CopyTag key={cta} text={cta} />
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
