// SOFIAA — Intent Map
// Mapeo de patrones de lenguaje a objetivos del usuario

export type GoalType =
  | "informarse"   // quiere entender algo
  | "comparar"     // quiere evaluar opciones
  | "aprender"     // quiere adquirir conocimiento
  | "decidir"      // está en punto de decisión
  | "contactar"    // quiere conectar con Abrahan/equipo
  | "contratar"    // quiere iniciar un proyecto
  | "navegar"      // quiere ir a una sección
  | "general";     // sin objetivo claro detectado

export interface IntentPattern {
  goal: GoalType;
  patterns: RegExp[];
  weight: number; // prioridad si hay múltiples matches (mayor = más específico)
}

export const INTENT_PATTERNS: IntentPattern[] = [
  // ── Contratar (más específico — mayor peso) ───────────────────────────────
  {
    goal: "contratar",
    weight: 10,
    patterns: [
      /quiero (contratar|contratar|iniciar|empezar|arrancar) (un |el )?(proyecto|trabajo|producción|video|spot|campaña|servicio)/i,
      /cuánto (cuesta|cobra|vale|costaría)/i,
      /precio|tarifa|cotización|presupuesto|costo/i,
      /disponible para (trabajar|un proyecto|colaborar)/i,
      /necesito (un|una) (producción|video|campaña|fotografía|spot|consultoría)/i,
      /cuando (podemos|podría) empezar/i,
    ],
  },

  // ── Contactar ─────────────────────────────────────────────────────────────
  {
    goal: "contactar",
    weight: 9,
    patterns: [
      /cómo (puedo |me puedo )?(contactar|comunicar|llegar|escribir|hablar) (con|a) (abrahan|ustedes|el equipo)/i,
      /dónde (encuentro|puedo encontrar) (a abrahan|el contacto|las redes)/i,
      /instagram|linkedin|facebook|portfolio|redes (sociales)?/i,
      /quiero (hablar|escribirle|contactar)/i,
      /me puedes (dar|pasar) (el |su )?(contacto|correo|número|instagram|linkedin)/i,
    ],
  },

  // ── Decidir ───────────────────────────────────────────────────────────────
  {
    goal: "decidir",
    weight: 8,
    patterns: [
      /debería (elegir|escoger|contratar|usar)/i,
      /cuál (es mejor|me recomiendas|conviene)/i,
      /me (ayudas|ayuda) a (elegir|decidir|escoger)/i,
      /qué (opción|alternativa|servicio) (me recomiendas|es mejor para)/i,
      /no sé (si|qué|cuál)/i,
      /estoy (dudando|indeciso|pensando) (entre|si)/i,
      /vale la pena/i,
    ],
  },

  // ── Comparar ──────────────────────────────────────────────────────────────
  {
    goal: "comparar",
    weight: 7,
    patterns: [
      /diferencia (entre|de)/i,
      /comparar|comparación/i,
      /versus|vs\.?|contra/i,
      /(pascall|berryworks|sofiaa) (vs|versus|o|contra)/i,
      /cuál (es la diferencia|se diferencia)/i,
      /en qué se (diferencia|distingue)/i,
    ],
  },

  // ── Aprender ──────────────────────────────────────────────────────────────
  {
    goal: "aprender",
    weight: 6,
    patterns: [
      /cómo (funciona|trabajan|hacen|desarrollan)/i,
      /explícame|explica(me)? cómo/i,
      /qué es (un |el |la )?(ix-os|sofiaa|pascall|berryworks)/i,
      /qué significa/i,
      /enséñame|quiero aprender|quiero entender/i,
      /cuéntame (más |sobre |cómo )/i,
      /en qué consiste/i,
    ],
  },

  // ── Navegar ───────────────────────────────────────────────────────────────
  {
    goal: "navegar",
    weight: 8,
    patterns: [
      /llévame|muéstrame (la |el )?(página|sección)/i,
      /ir a|abre (la |el )?/i,
      /ver (los |las )?(servicios|proyectos|portafolio)/i,
      /quiero ver/i,
    ],
  },

  // ── Informarse (más general — menor peso) ─────────────────────────────────
  {
    goal: "informarse",
    weight: 5,
    patterns: [
      /qu[eé] (hace|es|ofrece|tiene|son)/i,
      /háblame de|dime (sobre|acerca de)/i,
      /quién es|quiénes son/i,
      /cuántos años|cuánta experiencia/i,
      /info(rmación)? (sobre|de|acerca)/i,
      /cuéntame sobre/i,
    ],
  },
];

/** Detecta el objetivo del usuario en un mensaje */
export function detectGoal(input: string): GoalType {
  let bestGoal: GoalType = "general";
  let bestWeight = -1;

  for (const { goal, patterns, weight } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        if (weight > bestWeight) {
          bestWeight = weight;
          bestGoal   = goal;
        }
        break; // ya encontramos match en este grupo
      }
    }
  }

  return bestGoal;
}
