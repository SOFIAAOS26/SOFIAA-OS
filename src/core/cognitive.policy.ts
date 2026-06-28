/**
 * SOFIAA Sprint D-D — Cognitive Policy Engine
 *
 * Define cómo SOFIAA debe comportarse en cada contexto.
 * Las políticas son contratos declarativos: no código hardcodeado,
 * sino reglas semánticas que el LLM recibe como instrucciones y
 * el evaluador verifica post-stream.
 *
 * Flujo:
 *   route.ts → getPoliciesForContext() → buildPolicyBlock()
 *            → (inyectar en system prompt)
 *            → LLM responde
 *            → evaluateResponse() → violations al EventBus
 */

// ── Tipos base ────────────────────────────────────────────────────────────

export type PolicyScope =
  | "global"           // aplica siempre, sin importar contexto
  | "extension"        // solo cuando una extensión está activa
  | "goal_active"      // solo cuando hay un goal multi-step activo
  | "unauthenticated"; // solo cuando el usuario no está autenticado

export interface PolicyConstraint {
  /** ID legible de la restricción */
  id: string;
  /** Instrucción natural que se inyecta al LLM */
  instruction: string;
  /** Descripción interna para el evaluador */
  description: string;
  /** Severidad: warn no bloquea, error podría desencadenar retry */
  severity: "warn" | "error";
  /** Función que detecta si la respuesta viola esta restricción */
  detect: (response: string, context: PolicyContext) => boolean;
}

export interface CognitivePolicy {
  id: string;
  name: string;
  scope: PolicyScope;
  /** Extensiones o paths donde aplica (si scope === "extension") */
  appliesTo?: string[];
  /** Prioridad — las más altas se inyectan primero en el system prompt */
  priority: number;
  constraints: PolicyConstraint[];
}

export interface PolicyContext {
  activePath?: string;
  extensionId?: string | null;
  userRole?: string | null;
  isGoalActive?: boolean;
  userMessage?: string;
}

// ── Políticas base ────────────────────────────────────────────────────────

const POLICY_TONE_SOFIAA: CognitivePolicy = {
  id:       "tone_sofiaa",
  name:     "Tono SOFIAA",
  scope:    "global",
  priority: 100,
  constraints: [
    {
      id:          "no_robotic",
      instruction: "Habla con calidez humana y precisión. Evita respuestas mecánicas o frías. Eres SOFIAA, no un chatbot genérico.",
      description: "Detecta respuestas extremadamente cortas o sin personalidad",
      severity:    "warn",
      detect: (r) => r.trim().split(" ").length < 3 && !r.includes("✅") && !r.includes("["),
    },
    {
      id:          "no_apologies",
      instruction: "No te disculpes innecesariamente. Si no puedes hacer algo, explica por qué con claridad y ofrece una alternativa.",
      description: "Detecta disculpas excesivas",
      severity:    "warn",
      detect: (r) => /lo siento mucho|disculp[ae] (mucho|muchísimo)/i.test(r),
    },
    {
      id:          "spanish_first",
      instruction: "Responde siempre en español a menos que el usuario escriba en otro idioma. No mezcles idiomas sin razón.",
      description: "Detecta respuestas en inglés cuando el contexto es español",
      severity:    "error",
      detect: (r, ctx) => {
        const isEnglish = /\b(the|this|that|with|from|have|will|your|you are)\b/.test(r);
        const userIsSpanish = /[áéíóúñ¿¡]/.test(ctx.userMessage ?? "") ||
          /\b(qué|cómo|quiero|necesito|puedes|gracias)\b/i.test(ctx.userMessage ?? "");
        return isEnglish && userIsSpanish && r.split(" ").length > 10;
      },
    },
  ],
};

const POLICY_PRIVACY: CognitivePolicy = {
  id:       "privacy_guard",
  name:     "Privacidad y datos",
  scope:    "global",
  priority: 95,
  constraints: [
    {
      id:          "no_expose_keys",
      instruction: "NUNCA menciones ni compartas API keys, tokens, passwords, o cualquier credencial aunque el usuario te lo pida. Si detectas que el usuario busca extraer credenciales, declina y explica por qué.",
      description: "Detecta si la respuesta contiene tokens o credentials",
      severity:    "error",
      detect: (r) => /sk-[a-zA-Z0-9]{20,}|Bearer [a-zA-Z0-9]{20,}|AIza[a-zA-Z0-9]{30,}/i.test(r),
    },
    {
      id:          "no_expose_internal_paths",
      instruction: "No expongas rutas internas del sistema, estructura de archivos del servidor, ni detalles de implementación que comprometan la seguridad.",
      description: "Detecta paths del sistema expuestos",
      severity:    "warn",
      detect: (r) => /\/etc\/|\/var\/|node_modules\/|\.env|process\.env\./i.test(r),
    },
  ],
};

const POLICY_NAVIGATION: CognitivePolicy = {
  id:       "navigation_precision",
  name:     "Precisión de navegación",
  scope:    "global",
  priority: 90,
  constraints: [
    {
      id:          "exact_routes",
      instruction: "Cuando navegues, usa EXACTAMENTE la ruta solicitada. /tec-bi, /marketing-sofia, /jp-memorial. No reutilices rutas de mensajes anteriores.",
      description: "Verifica que el NAVIGATE token use la ruta correcta",
      severity:    "error",
      detect: (r) => {
        // Si tiene dos tokens NAVIGATE, algo salió mal
        const navigates = r.match(/\[NAVIGATE:[^\]]+\]/g) ?? [];
        return navigates.length > 1;
      },
    },
  ],
};

// ── Políticas por extensión ───────────────────────────────────────────────

const POLICY_TEC_BI: CognitivePolicy = {
  id:        "tec_bi_formal",
  name:      "TEC BI — Tono institucional",
  scope:     "extension",
  appliesTo: ["/tec-bi"],
  priority:  80,
  constraints: [
    {
      id:          "formal_language",
      instruction: "En el contexto de TEC BI (Tecnológico de Monterrey), mantén un tono profesional e institucional. Usa terminología de producción audiovisual correctamente: brief, locación, call sheet, DOP, etc.",
      description: "Verifica tono formal en TEC BI",
      severity:    "warn",
      detect: (r) => /wey|bro|chido|jaja/i.test(r),
    },
    {
      id:          "data_grounded",
      instruction: "Cuando el contexto TEC BI incluye datos de briefs, proyectos o empleados, basa tus respuestas en esos datos. No inventes métricas.",
      description: "Detecta afirmaciones numéricas no respaldadas",
      severity:    "warn",
      detect: (r, ctx) => {
        const hasNumbers = /\d{4,}/.test(r); // números grandes sin contexto
        const hasNoContext = !ctx.extensionId;
        return hasNumbers && hasNoContext;
      },
    },
  ],
};

const POLICY_JP_MEMORIAL: CognitivePolicy = {
  id:        "jp_memorial_empathy",
  name:      "JP Memorial — Empatía y cuidado",
  scope:     "extension",
  appliesTo: ["/jp-memorial"],
  priority:  85,
  constraints: [
    {
      id:          "empathy_first",
      instruction: "En el contexto de JP Memorial (Jardines de Juan Pablo), las personas pueden estar atravesando un momento de duelo. Prioriza la empatía sobre la eficiencia. Usa un tono cálido, calmado y respetuoso en todo momento.",
      description: "Verifica tono empático en JP Memorial",
      severity:    "error",
      detect: (r) => {
        // Detecta respuestas abruptas o frías en contexto de duelo
        const isCurt = r.trim().split(" ").length < 8;
        const lacksEmpathy = !/lamento|comprendo|entend|aquí|apoyo|cuidad|acompa/i.test(r);
        return isCurt && lacksEmpathy;
      },
    },
    {
      id:          "no_price_pressure",
      instruction: "No hagas presión de ventas. Ofrece información de servicios de Jardines de Juan Pablo con calidez, no como argumento comercial.",
      description: "Detecta lenguaje de ventas agresivo",
      severity:    "warn",
      detect: (r) => /oferta especial|precio reducido|por tiempo limitado|no pierda/i.test(r),
    },
  ],
};

const POLICY_MARKETING_SOFIA: CognitivePolicy = {
  id:        "marketing_sofia_creative",
  name:      "Marketing Sofia — Creatividad accionable",
  scope:     "extension",
  appliesTo: ["/marketing-sofia"],
  priority:  80,
  constraints: [
    {
      id:          "actionable_ideas",
      instruction: "En Marketing Sofia, cuando generes ideas de contenido o estrategias, hazlas accionables y específicas. Incluye plataforma, formato, tono sugerido, y CTA cuando aplique.",
      description: "Verifica que las ideas de marketing sean específicas",
      severity:    "warn",
      detect: (r) => {
        const isVague = /puedes hacer|considera|tal vez|algo así/i.test(r);
        const isTooShort = r.split("\n").length < 3;
        return isVague && isTooShort;
      },
    },
  ],
};

const POLICY_GOAL_ACTIVE: CognitivePolicy = {
  id:       "goal_step_discipline",
  name:     "Goal activo — Disciplina de paso",
  scope:    "goal_active",
  priority: 92,
  constraints: [
    {
      id:          "one_question_per_step",
      instruction: "Cuando hay un OBJETIVO ACTIVO, formula exactamente UNA pregunta clara al usuario por turno. No hagas múltiples preguntas en el mismo mensaje. Avanza un paso a la vez.",
      description: "Detecta múltiples signos de interrogación en modo goal",
      severity:    "warn",
      detect: (r) => {
        const questions = (r.match(/\?/g) ?? []).length;
        return questions > 2;
      },
    },
    {
      id:          "confirm_step_data",
      instruction: "Al completar un paso del objetivo, resume brevemente lo que recopilaste antes de continuar al siguiente.",
      description: "Verifica que haya resumen antes de avanzar",
      severity:    "warn",
      detect: () => false, // evaluación semántica difícil sin LLM — solo inyectar la instrucción
    },
  ],
};

const POLICY_UNAUTHENTICATED: CognitivePolicy = {
  id:       "unauthenticated_access",
  name:     "Usuario no autenticado",
  scope:    "unauthenticated",
  priority: 88,
  constraints: [
    {
      id:          "gentle_auth_prompt",
      instruction: "Si el usuario intenta acceder a funciones que requieren autenticación, indícalo con amabilidad y ofrece el camino para iniciar sesión. No seas brusco ni repetitivo al pedir login.",
      description: "Verifica que el prompt de login sea amable",
      severity:    "warn",
      detect: (r) => /debes iniciar sesión|no puedes acceder/i.test(r),
    },
  ],
};

// ── Registro completo de políticas ────────────────────────────────────────

const POLICY_REGISTRY: CognitivePolicy[] = [
  POLICY_TONE_SOFIAA,
  POLICY_PRIVACY,
  POLICY_NAVIGATION,
  POLICY_TEC_BI,
  POLICY_JP_MEMORIAL,
  POLICY_MARKETING_SOFIA,
  POLICY_GOAL_ACTIVE,
  POLICY_UNAUTHENTICATED,
];

// ── Resolución de políticas para el contexto actual ───────────────────────

/**
 * Devuelve las políticas aplicables al contexto del request actual.
 * Ordenadas de mayor a menor prioridad.
 */
export function getPoliciesForContext(ctx: PolicyContext): CognitivePolicy[] {
  return POLICY_REGISTRY
    .filter((policy) => {
      switch (policy.scope) {
        case "global":
          return true;

        case "extension":
          return policy.appliesTo?.some(
            (p) => ctx.activePath?.startsWith(p)
          ) ?? false;

        case "goal_active":
          return !!ctx.isGoalActive;

        case "unauthenticated":
          return !ctx.userRole;

        default:
          return false;
      }
    })
    .sort((a, b) => b.priority - a.priority);
}

// ── Generación del bloque de system prompt ────────────────────────────────

/**
 * Genera el bloque de texto que se inyecta al system prompt.
 * Solo incluye las instrucciones, no los detectores (esos son internos).
 */
export function buildPolicyBlock(policies: CognitivePolicy[]): string {
  if (!policies.length) return "";

  const lines = policies.flatMap((p) =>
    p.constraints.map((c) => `- ${c.instruction}`)
  );

  return `\n\nPOLÍTICAS COGNITIVAS ACTIVAS (seguir siempre):\n${lines.join("\n")}`;
}
