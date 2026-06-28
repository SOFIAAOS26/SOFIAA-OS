/**
 * SOFIAA Sprint D-B — Intent Types
 *
 * Contrato para el Intent-Driven UI Engine.
 * La IA declara intenciones, el cliente decide qué renderizar.
 *
 * Diferencia con Generative UI anterior:
 * - Antes: LLM devolvía nombre del componente → frágil
 * - Ahora: LLM devuelve intent semántico → IntentEngine elige el componente
 */

// ── Intents disponibles ────────────────────────────────────────────────────

export type IntentType =
  | "quick_actions"      // acciones rápidas (botones de respuesta)
  | "compare_options"    // comparativa entre 2 o más opciones
  | "show_summary"       // resumen de información recopilada
  | "request_input"      // solicitar un dato específico al usuario
  | "confirm_action"     // confirmación antes de ejecutar algo
  | "display_data"       // tabla o lista de datos estructurados
  | "extension_card"     // tarjeta de acceso a una extensión
  | "info_card"          // tarjeta informativa
  | "goal_progress"      // progreso del goal activo
  | "success"            // confirmación de éxito
  | "error";             // mensaje de error amigable

// ── Estructura del intent ─────────────────────────────────────────────────

export interface IntentAction {
  label: string;
  msg:   string;
  style?: "primary" | "secondary" | "ghost" | "danger";
  icon?:  string;
}

export interface UIIntent {
  /** Tipo de intención — el IntentEngine decide el componente */
  intent: IntentType;

  /** Confianza del LLM (0-1) — si < 0.6, usar fallback */
  confidence: number;

  /** Entidades extraídas del contexto */
  entities: Record<string, unknown>;

  /** Acciones disponibles para el usuario */
  actions: IntentAction[];

  /** Datos adicionales según el intent (tabla, comparativa, etc.) */
  data?: unknown;

  /** Título opcional */
  title?: string;

  /** Ícono opcional */
  icon?: string;
}

// ── Token de texto que el LLM emite ──────────────────────────────────────
// Formato: [INTENT:tipo:json_base64]
// Se parsea en page.tsx igual que [NAVIGATE:] y [UI:]

export const INTENT_TOKEN_REGEX = /\[INTENT:([a-z_]+):([A-Za-z0-9+/=]+)\]/;

/**
 * Serializa un UIIntent al token de texto que el LLM puede emitir.
 */
export function serializeIntent(intent: UIIntent): string {
  const json = JSON.stringify(intent);
  const b64  = Buffer.from(json).toString("base64");
  return `[INTENT:${intent.intent}:${b64}]`;
}

/**
 * Parsea un token [INTENT:...] desde el stream del LLM.
 */
export function parseIntentToken(raw: string): UIIntent | null {
  const match = raw.match(INTENT_TOKEN_REGEX);
  if (!match) return null;
  try {
    const json = Buffer.from(match[2], "base64").toString("utf-8");
    return JSON.parse(json) as UIIntent;
  } catch {
    return null;
  }
}
