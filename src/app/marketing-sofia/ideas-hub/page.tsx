"use client";

import { useState } from "react";

const P = "#7C3AED";

const PRIORIDAD_COLOR: Record<string, string> = {
  "🔥 Alta":  "#EF4444",
  "🟡 Media": "#F59E0B",
  "🟢 Baja":  "#10B981",
};

const IDEAS = [
  // Salud / Clínica
  { idea: "Antes y después de tratamiento facial",            industria: "Salud/Clínica",  formato: "Reel",     objetivo: "Awareness",     hook: "¿Cómo luce tu piel después de solo 1 sesión? 👀",               prioridad: "🔥 Alta" },
  { idea: "5 errores que dañan tu piel sin saberlo",          industria: "Salud/Clínica",  formato: "Carrusel", objetivo: "Educación",      hook: "El error #1 que cometes cada mañana con tu piel…",              prioridad: "🔥 Alta" },
  { idea: "Rutina de skincare en 60 segundos",                industria: "Salud/Clínica",  formato: "Reel",     objetivo: "Engagement",     hook: "Yo en la mañana vs. yo después de este tip 😂",                 prioridad: "🔥 Alta" },
  { idea: "Mitos y verdades sobre el acné",                   industria: "Salud/Clínica",  formato: "Carrusel", objetivo: "Educación",      hook: "Lo que nadie te dice sobre el acné en adultos...",              prioridad: "🟡 Media" },
  { idea: "Testimonial de paciente satisfecho",               industria: "Salud/Clínica",  formato: "Video",    objetivo: "Ventas",         hook: "Ella no creía que funcionaría. Mira lo que pasó.",             prioridad: "🔥 Alta" },
  { idea: "Tour por las instalaciones",                       industria: "Salud/Clínica",  formato: "Reel",     objetivo: "Confianza",      hook: "Por eso nuestros pacientes se sienten en casa 🏥",              prioridad: "🟡 Media" },
  { idea: "Ingrediente del mes: explicación derma",           industria: "Salud/Clínica",  formato: "Carrusel", objetivo: "Educación",      hook: "¿Sabes qué le hace el retinol a tu piel realmente?",           prioridad: "🟡 Media" },
  { idea: "Checklist de cuidado solar verano",                industria: "Salud/Clínica",  formato: "Carrusel", objetivo: "Utilidad",       hook: "El verano ya llegó. ¿Está tu piel lista?",                     prioridad: "🟡 Media" },
  // Restaurante
  { idea: "Making of de un platillo estrella",                industria: "Restaurante",    formato: "Reel",     objetivo: "Engagement",     hook: "Así nace nuestro plato más pedido. 🍽️",                        prioridad: "🔥 Alta" },
  { idea: "¿Qué pide el chef cuando nadie lo ve?",            industria: "Restaurante",    formato: "Reel",     objetivo: "Entretenimiento",hook: "El chef tiene un plato favorito y no es el que crees…",        prioridad: "🔥 Alta" },
  { idea: "Receta fácil en casa (versión simplificada)",      industria: "Restaurante",    formato: "Carrusel", objetivo: "Utilidad",       hook: "Aprende a hacer nuestra salsa secreta en 5 pasos",             prioridad: "🟡 Media" },
  { idea: "Detrás de cámaras: preparación del día",          industria: "Restaurante",    formato: "Reel",     objetivo: "Humanización",   hook: "Nadie te muestra esto a las 6am en una cocina…",               prioridad: "🔥 Alta" },
  { idea: "3 maridajes que no conocías de tu menú",           industria: "Restaurante",    formato: "Carrusel", objetivo: "Educación",      hook: "¿Qué vino va con esto? Spoiler: no es el que piensas",         prioridad: "🟡 Media" },
  { idea: "Reseña de cliente (video UGC)",                    industria: "Restaurante",    formato: "Video",    objetivo: "Confianza",      hook: "Él llegó por recomendación. Ahora viene cada semana.",         prioridad: "🔥 Alta" },
  { idea: "Menú del fin de semana — anticipo",                industria: "Restaurante",    formato: "Story",    objetivo: "Ventas",         hook: "Este finde tenemos algo especial. Te doy una pista…",          prioridad: "🟡 Media" },
  { idea: "El origen de tu ingrediente principal",            industria: "Restaurante",    formato: "Carrusel", objetivo: "Educación",      hook: "¿Sabes de dónde viene lo que comes?",                          prioridad: "🟢 Baja" },
  // Fitness
  { idea: "Transformación de 90 días de alumno",              industria: "Fitness",        formato: "Reel",     objetivo: "Inspiración",    hook: "90 días pueden cambiar todo. Aquí la prueba. 💪",               prioridad: "🔥 Alta" },
  { idea: "Ejercicio de la semana (tutorial)",                industria: "Fitness",        formato: "Reel",     objetivo: "Educación",      hook: "¿Haces mal este ejercicio? El 80% sí. Corrígelo.",             prioridad: "🔥 Alta" },
  { idea: "Plan de entrenamiento semanal gratuito",           industria: "Fitness",        formato: "Carrusel", objetivo: "Leads",          hook: "Te doy mi plan de 5 días. Solo guárdalo 👇",                   prioridad: "🔥 Alta" },
  { idea: "Mitos del gym que debes dejar de creer",           industria: "Fitness",        formato: "Carrusel", objetivo: "Educación",      hook: "¿Cardio en ayunas quema más grasa? La verdad te sorprende",    prioridad: "🟡 Media" },
  { idea: "Un día en la vida de un entrenador",               industria: "Fitness",        formato: "Reel",     objetivo: "Humanización",   hook: "¿Quieres saber cómo entrena un coach de fitness?",             prioridad: "🟡 Media" },
  { idea: "Receta fitness: comer rico sin culpa",             industria: "Fitness",        formato: "Carrusel", objetivo: "Utilidad",       hook: "Proteínas, sabor y 0 culpa. Esta receta te cambia la vida",    prioridad: "🟡 Media" },
  { idea: "Clase de prueba gratis (lead magnet)",             industria: "Fitness",        formato: "Story",    objetivo: "Ventas",         hook: "Primera clase GRATIS. ¿Te apuntas? Responde 'SÍ' 🔥",         prioridad: "🔥 Alta" },
  { idea: "Progreso de atleta: semana a semana",              industria: "Fitness",        formato: "Carrusel", objetivo: "Inspiración",    hook: "Semana 1 vs Semana 8. Los números hablan solos.",              prioridad: "🟡 Media" },
  // Moda / Boutique
  { idea: "Outfit del día con pieza de temporada",            industria: "Moda/Boutique",  formato: "Reel",     objetivo: "Inspiración",    hook: "Cómo usar una sola pieza de 5 formas diferentes 👗",           prioridad: "🔥 Alta" },
  { idea: "Haul de llegada de nueva colección",               industria: "Moda/Boutique",  formato: "Reel",     objetivo: "Awareness",      hook: "¡LLEGÓ! La colección que estaban esperando 🛍️",               prioridad: "🔥 Alta" },
  { idea: "Guía de tallas: cómo encontrar la tuya",           industria: "Moda/Boutique",  formato: "Carrusel", objetivo: "Utilidad",       hook: "Nunca más compres la talla equivocada. Guía completa.",        prioridad: "🟡 Media" },
  { idea: "Behind the scenes: cómo curamos el look",          industria: "Moda/Boutique",  formato: "Reel",     objetivo: "Humanización",   hook: "Así elegimos las piezas que llegan a tienda.",                 prioridad: "🟡 Media" },
  { idea: "3 outfits para 3 ocasiones diferentes",            industria: "Moda/Boutique",  formato: "Carrusel", objetivo: "Educación",      hook: "Un clóset pequeño puede hacer grandes outfits. Te enseño.",    prioridad: "🟡 Media" },
  { idea: "Reseña de clienta con look completo",              industria: "Moda/Boutique",  formato: "Video",    objetivo: "Confianza",      hook: "Ella escogió este look y literalmente no se lo quitó.",        prioridad: "🔥 Alta" },
  // Universal
  { idea: "FAQ de clientes más frecuentes",                   industria: "Universal",      formato: "Carrusel", objetivo: "Educación",      hook: "Me preguntan esto TODO el tiempo. Respuesta honesta:",         prioridad: "🟡 Media" },
  { idea: "Encuesta interactiva: ¿qué prefieres?",            industria: "Universal",      formato: "Story",    objetivo: "Engagement",     hook: "A vs B. ¿Tú cuál elegirías?",                                  prioridad: "🟡 Media" },
  { idea: "Colaboración con influencer local",                industria: "Universal",      formato: "Reel",     objetivo: "Awareness",      hook: "Le pedí a @influencer que lo probara sin filtros.",            prioridad: "🔥 Alta" },
  { idea: "Proceso de trabajo detrás de cámaras",             industria: "Universal",      formato: "Reel",     objetivo: "Confianza",      hook: "Lo que pasa antes de que llegue a tus manos.",                 prioridad: "🟡 Media" },
  { idea: "Tip de la semana en formato educativo",            industria: "Universal",      formato: "Carrusel", objetivo: "Educación",      hook: "Tip rápido: esto te ahorra tiempo/dinero/esfuerzo 💡",         prioridad: "🟡 Media" },
];

const INDUSTRIAS  = ["Todas", "Salud/Clínica", "Restaurante", "Fitness", "Moda/Boutique", "Universal"];
const FORMATOS    = ["Todos", "Reel", "Carrusel", "Video", "Story"];
const OBJETIVOS   = ["Todos", "Awareness", "Educación", "Engagement", "Ventas", "Confianza", "Humanización", "Utilidad", "Inspiración", "Leads", "Entretenimiento"];

const IND_EMOJI: Record<string, string> = {
  "Salud/Clínica": "🏥", "Restaurante": "🍽️", "Fitness": "💪", "Moda/Boutique": "👗", "Universal": "🌐",
};
const FMT_EMOJI: Record<string, string> = {
  "Reel": "🎬", "Carrusel": "📱", "Video": "📹", "Story": "⭕",
};

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      style={{
        background: done ? "#D1FAE5" : "transparent", border: "none",
        color: done ? "#065F46" : "#9CA3AF", fontSize: 11, cursor: "pointer",
        padding: "2px 6px", borderRadius: 4, transition: "all 0.15s", flexShrink: 0,
      }} title="Copiar hook">
      {done ? "✓" : "📋"}
    </button>
  );
}

export default function IdeasHubPage() {
  const [industria, setIndustria] = useState("Todas");
  const [formato,   setFormato]   = useState("Todos");
  const [objetivo,  setObjetivo]  = useState("Todos");
  const [prioridad, setPrioridad] = useState("Todas");
  const [search,    setSearch]    = useState("");

  const filtered = IDEAS.filter((i) => {
    if (industria !== "Todas" && i.industria !== industria) return false;
    if (formato   !== "Todos" && i.formato   !== formato)   return false;
    if (objetivo  !== "Todos" && i.objetivo  !== objetivo)  return false;
    if (prioridad !== "Todas" && i.prioridad !== prioridad) return false;
    if (search && !i.idea.toLowerCase().includes(search.toLowerCase()) &&
                  !i.hook.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const alta  = filtered.filter((i) => i.prioridad === "🔥 Alta").length;
  const media = filtered.filter((i) => i.prioridad === "🟡 Media").length;
  const baja  = filtered.filter((i) => i.prioridad === "🟢 Baja").length;

  return (
    <div className="tbi-page-enter" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1D1D1F", margin: "0 0 4px" }}>
            💡 Ideas Hub
          </h1>
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>
            Banco de contenido organizado — {filtered.length} ideas
            {alta > 0 && <span style={{ color: "#EF4444", fontWeight: 600 }}> · 🔥 {alta} alta</span>}
            {media > 0 && <span style={{ color: "#F59E0B", fontWeight: 600 }}> · 🟡 {media} media</span>}
            {baja > 0 && <span style={{ color: "#10B981", fontWeight: 600 }}> · 🟢 {baja} baja</span>}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${P}18`, padding: 18,
        display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Search */}
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Buscar idea o hook…"
          style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10,
            padding: "9px 14px", fontSize: 13, outline: "none", color: "#1D1D1F",
            boxSizing: "border-box" }} />

        {/* Chips row */}
        {([
          { label: "Industria", opts: INDUSTRIAS, val: industria, set: setIndustria },
          { label: "Formato",   opts: FORMATOS,   val: formato,   set: setFormato   },
          { label: "Objetivo",  opts: OBJETIVOS,  val: objetivo,  set: setObjetivo  },
          { label: "Prioridad", opts: ["Todas", "🔥 Alta", "🟡 Media", "🟢 Baja"], val: prioridad, set: setPrioridad },
        ] as const).map(({ label, opts, val, set }) => (
          <div key={label}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", margin: "0 0 6px", letterSpacing: "0.4px" }}>
              {label.toUpperCase()}
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {opts.map((o) => (
                <button key={o} onClick={() => set(o as never)} style={{
                  padding: "4px 10px", borderRadius: 99, fontSize: 10, fontWeight: 600,
                  border: `1.5px solid ${val === o ? P : "#E5E7EB"}`,
                  background: val === o ? `${P}12` : "transparent",
                  color: val === o ? P : "#6B7280", cursor: "pointer", whiteSpace: "nowrap",
                }}>{o}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Ideas grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#9CA3AF", fontSize: 14 }}>
          Sin resultados. Ajusta los filtros.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 12 }}>
          {filtered.map((item, idx) => (
            <div key={idx} style={{
              background: "#fff", borderRadius: 14, border: `1px solid ${P}14`,
              padding: 16, display: "flex", flexDirection: "column", gap: 10,
              transition: "box-shadow 0.15s",
            }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1D1D1F", lineHeight: 1.4, flex: 1 }}>
                  {item.idea}
                </p>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: PRIORIDAD_COLOR[item.prioridad] ?? "#9CA3AF",
                  background: `${PRIORIDAD_COLOR[item.prioridad]}18`, borderRadius: 99,
                  padding: "2px 7px", flexShrink: 0,
                }}>{item.prioridad}</span>
              </div>

              {/* Tags */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, background: "#F3F4F6", color: "#374151",
                  borderRadius: 99, padding: "2px 7px" }}>
                  {IND_EMOJI[item.industria]} {item.industria}
                </span>
                <span style={{ fontSize: 10, background: "#EDE9FE", color: P,
                  borderRadius: 99, padding: "2px 7px", fontWeight: 600 }}>
                  {FMT_EMOJI[item.formato]} {item.formato}
                </span>
                <span style={{ fontSize: 10, background: "#F0FDF4", color: "#15803D",
                  borderRadius: 99, padding: "2px 7px" }}>
                  {item.objetivo}
                </span>
              </div>

              {/* Hook */}
              <div style={{ background: "#FAFAFA", border: "1px solid #E5E7EB", borderRadius: 8,
                padding: "8px 10px", display: "flex", alignItems: "flex-start", gap: 6 }}>
                <p style={{ margin: 0, fontSize: 11, color: "#374151", fontStyle: "italic",
                  lineHeight: 1.5, flex: 1 }}>
                  {item.hook}
                </p>
                <CopyBtn text={item.hook} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
