/**
 * SOFIAA Sprint D — LLM Client Interface
 *
 * Contrato unificado para cualquier proveedor de LLM.
 * Ninguna otra parte del sistema sabe qué modelo está respondiendo.
 * El Orchestrator decide, los Providers ejecutan.
 */

// ── Tipos de request ──────────────────────────────────────────────────────

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMRequest {
  messages: LLMMessage[];
  tools?: LLMTool[];
  tool_choice?: "auto" | "none";
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

// ── Tipos de respuesta ────────────────────────────────────────────────────

export interface LLMStreamChunk {
  content?: string;
  tool_calls?: Array<{
    index: number;
    function?: { name?: string; arguments?: string };
  }>;
  finish_reason?: string | null;
}

// ── Prioridad del provider ────────────────────────────────────────────────

export type LLMPriority = "speed" | "reasoning" | "cost";

// ── Contrato del Provider ─────────────────────────────────────────────────

export interface LLMProvider {
  /** Nombre identificador del provider (ej. "groq", "gemini") */
  name: string;

  /** Para qué tipo de tarea es óptimo este provider */
  priority: LLMPriority;

  /**
   * Verifica si el provider está disponible en este momento.
   * Devuelve false si hay rate limit activo, key no configurada, etc.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Ejecuta el request y devuelve un stream de chunks.
   * El stream emite LLMStreamChunk uno a uno hasta el fin.
   */
  complete(req: LLMRequest): Promise<ReadableStream<LLMStreamChunk>>;
}

// ── Estado del rate limit (compartido entre providers) ────────────────────

const rateLimitState: Record<string, { until: number }> = {};

/**
 * Marca un provider como en rate limit por N segundos.
 * El Orchestrator lo consultará antes de elegir.
 */
export function markRateLimited(providerName: string, retryAfterSeconds = 60): void {
  rateLimitState[providerName] = { until: Date.now() + retryAfterSeconds * 1000 };
  console.warn(`[SOFIAA][LLM] ${providerName} rate limited — retry in ${retryAfterSeconds}s`);
}

/**
 * Consulta si un provider está actualmente en rate limit.
 */
export function isRateLimited(providerName: string): boolean {
  const state = rateLimitState[providerName];
  if (!state) return false;
  if (Date.now() > state.until) {
    delete rateLimitState[providerName];
    return false;
  }
  return true;
}

/**
 * Devuelve cuántos segundos quedan de rate limit (0 si no hay).
 */
export function rateLimitRemainingSeconds(providerName: string): number {
  const state = rateLimitState[providerName];
  if (!state) return 0;
  return Math.max(0, Math.ceil((state.until - Date.now()) / 1000));
}
