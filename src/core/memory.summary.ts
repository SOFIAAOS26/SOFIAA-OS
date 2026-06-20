// SOFIAA — Memory Summary
// Extrae título, tags y metadata de una sesión para el timeline

interface Message {
  role: "user" | "assistant";
  content: string;
}

/**
 * Genera un título automático para la sesión basado en los primeros mensajes.
 * Usa el primer mensaje del usuario (truncado y limpio).
 */
export function generateSessionTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "Sesión sin título";

  const clean = firstUser.content
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 60);

  return clean.length < firstUser.content.trim().length
    ? `${clean}…`
    : clean;
}

/**
 * Extrae keywords temáticos de los mensajes del usuario.
 * Retorna hasta 4 tags representativos.
 */
export function extractTags(messages: Message[]): string[] {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content.toLowerCase())
    .join(" ");

  const topicMap: Record<string, string[]> = {
    "Producción": ["producción", "video", "filmación", "berryworks", "spot", "campaña", "fotografía", "edición"],
    "SOFIAA": ["sofiaa", "ix-os", "inteligencia artificial", "ia", "sistema"],
    "PASCALL": ["pascall", "consultoría", "estrategia", "marca"],
    "Abrahan": ["abrahan", "benjacob", "creador", "fundador", "experiencia"],
    "Servicios": ["servicio", "precio", "costo", "cotización", "tarifa", "contratar"],
    "Contacto": ["contacto", "linkedin", "instagram", "facebook", "portfolio", "redes"],
    "Aprendizaje": ["cómo", "funciona", "explica", "aprende", "enseña"],
    "Decisión": ["debería", "mejor", "elegir", "recomiendas", "decidir"],
  };

  const tags: string[] = [];
  for (const [tag, keywords] of Object.entries(topicMap)) {
    if (keywords.some((kw) => userText.includes(kw))) {
      tags.push(tag);
    }
    if (tags.length >= 4) break;
  }

  return tags.length > 0 ? tags : ["General"];
}

/**
 * Detecta el objetivo más frecuente en la sesión para el timeline.
 */
export function detectTopGoal(messages: Message[]): string | undefined {
  // Importar inline para evitar dependencia circular
  const goalCounts: Record<string, number> = {};

  const goalPatterns: Array<{ goal: string; pattern: RegExp }> = [
    { goal: "Contratar",  pattern: /precio|cotización|contratar|cuánto cuesta/i },
    { goal: "Contactar",  pattern: /contacto|linkedin|instagram|redes|portfolio/i },
    { goal: "Decidir",    pattern: /debería|recomiendas|mejor para|elegir/i },
    { goal: "Comparar",   pattern: /diferencia|versus|vs\.|comparar/i },
    { goal: "Aprender",   pattern: /cómo funciona|explica|qué es|enséñame/i },
    { goal: "Informarse", pattern: /qué hace|háblame|cuéntame|quién es/i },
  ];

  for (const m of messages.filter((m) => m.role === "user")) {
    for (const { goal, pattern } of goalPatterns) {
      if (pattern.test(m.content)) {
        goalCounts[goal] = (goalCounts[goal] ?? 0) + 1;
      }
    }
  }

  const sorted = Object.entries(goalCounts).sort(([, a], [, b]) => b - a);
  return sorted[0]?.[0];
}
