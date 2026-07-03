/**
 * SOFIAA Sprint G — Cognitive Agent Runtime
 * Tipos base del sistema agéntico ReAct (Reason + Act)
 *
 * Patrón: think → act → observe → decide (continuar | sintetizar)
 * Máx iteraciones: 3 (Edge-safe, <30s total)
 */

// ── Pasos del loop ─────────────────────────────────────────────────────────

export type AgentStepType =
  | "think"      // El agente razona sobre el estado actual
  | "act"        // Llama a un tool
  | "observe"    // Procesa el resultado del tool
  | "synthesize" // Produce la respuesta final

export interface AgentStep {
  id:         string;
  type:       AgentStepType;
  /** Tool invocado (solo en "act") */
  tool?:      string;
  /** Input enviado al tool */
  input?:     Record<string, unknown>;
  /** Output del tool o del LLM */
  output:     string;
  durationMs: number;
  timestamp:  number;
}

// ── Estado del agente ──────────────────────────────────────────────────────

export interface AgentState {
  goal:          string;
  steps:         AgentStep[];
  observations:  string[];   // resultados de tools acumulados
  iteration:     number;
  maxIterations: number;
  isComplete:    boolean;
  finalAnswer?:  string;
}

// ── Contexto compartido entre runtime y tools ──────────────────────────────

export interface AgentContext {
  userId:       string;
  userRole:     string;
  extensionId:  string;
  activePath:   string;
  systemContent: string;
  messages:     Array<{ role: "system" | "user" | "assistant"; content: string }>;
  traceId:      string;
}

// ── Contrato de un Agent Tool ──────────────────────────────────────────────

export interface AgentTool {
  /** Nombre usado por el LLM en function calling */
  name:        string;
  description: string;
  parameters:  {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
  /**
   * Ejecuta el tool y devuelve un string con el resultado.
   * El string se inyecta como "observación" en el siguiente turno del LLM.
   */
  execute(params: Record<string, unknown>, ctx: AgentContext): Promise<string>;
}

// ── Output del runtime ─────────────────────────────────────────────────────

export interface AgentResult {
  finalAnswer: string;
  steps:       AgentStep[];
  iterations:  number;
  totalMs:     number;
  stopped:     "completed" | "max_iterations" | "error";
}

// ── Evento de streaming del agente ─────────────────────────────────────────

/**
 * El AgentRuntime emite chunks de texto al stream del cliente.
 * Los pasos intermedios se muestran con prefijos reconocibles.
 */
export interface AgentStreamEvent {
  type:    "step" | "chunk" | "done";
  content: string;
}
