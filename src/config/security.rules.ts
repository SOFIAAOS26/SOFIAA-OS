// SOFIAA — Security Rules
// Catálogo de patrones de amenaza para el motor de guardrails

export type ThreatType =
  | "prompt_injection"
  | "secret_extraction"
  | "context_leak"
  | "jailbreak"
  | "abuse_pattern"
  | "none";

export interface SecurityRule {
  type: ThreatType;
  patterns: RegExp[];
  severity: "low" | "medium" | "high";
}

export const SECURITY_RULES: SecurityRule[] = [
  // ── Prompt Injection ─────────────────────────────────────────────────────
  {
    type: "prompt_injection",
    severity: "high",
    patterns: [
      /ignora\s+(todas?\s+)?(las?\s+)?(instrucciones?|reglas?|restricciones?)/i,
      /ignore\s+(all\s+)?(previous\s+)?(instructions?|rules?|constraints?)/i,
      /olvida\s+(todo\s+lo\s+que|tus?\s+instrucciones?)/i,
      /forget\s+(everything|your\s+instructions?|all\s+previous)/i,
      /act\s+as\s+if\s+you\s+(have\s+no|don't\s+have)\s+(rules?|restrictions?)/i,
      /actúa\s+como\s+si\s+no\s+tuvieras?\s+(reglas?|restricciones?)/i,
      /nuevo\s+(prompt|sistema|rol|personaje|instrucción)\s*:/i,
      /new\s+(prompt|system|role|character|instruction)\s*:/i,
      /\[system\]/i,
      /<\s*system\s*>/i,
    ],
  },

  // ── Extracción de secretos ────────────────────────────────────────────────
  {
    type: "secret_extraction",
    severity: "high",
    patterns: [
      /dime\s+(tu\s+)?(palabra\s+(secreta?|de\s+autorización)|contraseña|clave|api\s+key)/i,
      /cu[aá]l\s+es\s+(la\s+)?(palabra\s+(secreta?|de\s+autorización)|contraseña|clave)/i,
      /what\s+is\s+(the\s+)?(secret\s+word|password|auth\s+word|api\s+key)/i,
      /tell\s+me\s+(the\s+)?(secret|password|auth\s+word|api\s+key)/i,
      /reveal\s+(your\s+)?(secret|password|instructions?|system\s+prompt)/i,
      /muéstrame\s+(el\s+)?(system\s+prompt|prompt\s+del\s+sistema|tus?\s+instrucciones?)/i,
      /show\s+me\s+(your\s+)?(system\s+prompt|instructions?|rules?)/i,
      /repite\s+(textualmente\s+)?(tus?\s+instrucciones?|el\s+system\s+prompt)/i,
      /repeat\s+(verbatim\s+)?(your\s+instructions?|the\s+system\s+prompt)/i,
      /freepotamo/i,  // la auth word nunca debe ser revelada ni disparada por el usuario así
    ],
  },

  // ── Fuga de contexto ──────────────────────────────────────────────────────
  {
    type: "context_leak",
    severity: "medium",
    patterns: [
      /qu[eé]\s+(modelo|llm|ia|inteligencia\s+artificial)\s+(eres?|usas?|corres?)/i,
      /what\s+(model|llm|ai)\s+(are\s+you|do\s+you\s+use|are\s+you\s+running)/i,
      /cu[aá]l\s+es\s+tu\s+(modelo|versión|temperatura|max_tokens)/i,
      /what\s+is\s+your\s+(model|version|temperature|max_tokens)/i,
      /groq/i,
      /gpt.oss/i,
      /llama\s*\d/i,
    ],
  },

  // ── Jailbreak ─────────────────────────────────────────────────────────────
  {
    type: "jailbreak",
    severity: "high",
    patterns: [
      /\bdan\b.{0,20}(mode|modo)/i,
      /do\s+anything\s+now/i,
      /jailbreak/i,
      /modo\s+(sin\s+filtros?|sin\s+restricciones?|libre|dios)/i,
      /pretend\s+(you\s+)?(are|have\s+no)\s+(an?\s+)?(uncensored|unrestricted|evil)/i,
      /imagina\s+que\s+(eres?|no\s+tienes?)\s+(sin\s+restricciones?|malvad)/i,
      /roleplay\s+as\s+(an?\s+)?(ai\s+with\s+no|evil|unrestricted)/i,
      /bypass\s+(your\s+)?(safety|filter|guardrail|restriction)/i,
      /saltarte?\s+(los?\s+)?(filtros?|restricciones?|guardrails?)/i,
    ],
  },

  // ── Patrones de abuso ─────────────────────────────────────────────────────
  {
    type: "abuse_pattern",
    severity: "low",
    patterns: [
      /(.)\1{15,}/,  // caracteres repetidos excesivamente (spam)
      /^.{0,3}$/,    // mensajes vacíos o de 1-3 caracteres (no aplica a saludos normales — revisar en engine)
    ],
  },
];
