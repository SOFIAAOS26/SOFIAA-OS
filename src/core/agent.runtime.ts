/**
 * SOFIAA Sprint G-1 — Cognitive Agent Runtime
 *
 * Motor ReAct (Reason + Act) para tareas complejas multi-paso.
 * Reemplaza el single-round de tool calling por un loop con razonamiento
 * entre cada herramienta.
 *
 * Arquitectura:
 *   Goal → [think → act → observe] × N → synthesize → stream
 *
 * Límites Edge-safe:
 *   - Máx 3 iteraciones (cada una ~3-5s → total <20s)
 *   - Cada tool call tiene timeout de 8s
 *   - Si el agente no converge: devuelve best-effort
 */

import type { LLMRequest, LLMStreamChunk } from "./llm.client";
import { orchestrator }                    from "./llm.orchestrator";
import type {
  AgentContext,
  AgentResult,
  AgentState,
  AgentStep,
  AgentTool,
} from "./agent.types";

// ── Constantes ─────────────────────────────────────────────────────────────

const MAX_ITERATIONS   = 3;
const TOOL_TIMEOUT_MS  = 8_000;
const STEP_PREFIX      = "\u{1F9E0} "; // 🧠 prefijo visual para pasos intermedios

// ── Helpers ────────────────────────────────────────────────────────────────

function makeStepId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function makeStep(
  type: AgentStep["type"],
  output: string,
  durationMs: number,
  extra?: Partial<AgentStep>
): AgentStep {
  return {
    id:   makeStepId(),
    type,
    output,
    durationMs,
    timestamp: Date.now(),
    ...extra,
  };
}

/** Ejecuta un tool con timeout hard para no bloquear el Edge */
async function executeWithTimeout(
  tool: AgentTool,
  params: Record<string, unknown>,
  ctx: AgentContext
): Promise<string> {
  const timeout = new Promise<string>((_, reject) =>
    setTimeout(() => reject(new Error("TOOL_TIMEOUT")), TOOL_TIMEOUT_MS)
  );
  return Promise.race([tool.execute(params, ctx), timeout]);
}

/** Lee un stream del LLM y acumula texto + tool calls */
async function consumeStream(stream: ReadableStream<LLMStreamChunk>): Promise<{
  text: string;
  toolCalls: Array<{ name: string; args: string }>;
}> {
  const reader = stream.getReader();
  let text = "";
  const accumulators: Record<number, { name: string; args: string }> = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value.content) text += value.content;
    if (value.tool_calls) {
      for (const tc of value.tool_calls) {
        const idx = tc.index ?? 0;
        if (!accumulators[idx]) accumulators[idx] = { name: "", args: "" };
        if (tc.function?.name)      accumulators[idx].name += tc.function.name;
        if (tc.function?.arguments) accumulators[idx].args += tc.function.arguments;
      }
    }
  }

  const toolCalls = Object.values(accumulators).filter(t => t.name);
  return { text, toolCalls };
}

// ── Generador del system prompt del agente ─────────────────────────────────

function buildAgentSystemPrompt(
  baseSystem: string,
  state: AgentState,
  tools: AgentTool[]
): string {
  const toolList = tools.map(t => `- ${t.name}: ${t.description}`).join("\n");
  const observations = state.observations.length > 0
    ? `\n\nOBSERVACIONES ACUMULADAS:\n${state.observations.map((o, i) => `[${i + 1}] ${o}`).join("\n")}`
    : "";

  return `${baseSystem}

--- MODO AGENTE ACTIVO ---
Estás ejecutando un plan de múltiples pasos para completar: "${state.goal}"
Iteración actual: ${state.iteration + 1} de ${state.maxIterations}

TOOLS DISPONIBLES:
${toolList}
${observations}

INSTRUCCIONES:
- Si necesitas más datos para responder correctamente, llama al tool apropiado.
- Si ya tienes toda la información necesaria, responde directamente SIN llamar tools.
- Sé conciso en cada paso — la síntesis final es lo que el usuario verá.
- Máximo ${state.maxIterations - state.iteration} iteración(es) restante(s).`;
}

// ── Agent Runtime ──────────────────────────────────────────────────────────

export class AgentRuntime {
  private tools: Map<string, AgentTool>;

  constructor(tools: AgentTool[]) {
    this.tools = new Map(tools.map(t => [t.name, t]));
  }

  /**
   * Ejecuta el loop agéntico y escribe chunks al ReadableStream controller.
   * El cliente ve los pasos intermedios en tiempo real.
   */
  async run(
    goal: string,
    ctx: AgentContext,
    controller: ReadableStreamDefaultController<Uint8Array>,
    encoder: TextEncoder
  ): Promise<AgentResult> {
    const startMs = Date.now();
    const state: AgentState = {
      goal,
      steps:        [],
      observations: [],
      iteration:    0,
      maxIterations: MAX_ITERATIONS,
      isComplete:   false,
    };

    const toolDefs = Array.from(this.tools.values()).map(t => ({
      type: "function" as const,
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));

    console.info(`[SOFIAA][Agent] iniciando loop — goal="${goal.slice(0, 60)}"`);

    // ── Loop ReAct ─────────────────────────────────────────────────────
    while (state.iteration < MAX_ITERATIONS && !state.isComplete) {
      const iterStart = Date.now();
      state.iteration++;

      console.info(`[SOFIAA][Agent] iteración ${state.iteration}/${MAX_ITERATIONS}`);

      // Construir mensajes para este turno
      const agentSystem = buildAgentSystemPrompt(ctx.systemContent, state, Array.from(this.tools.values()));
      const messages: LLMRequest["messages"] = [
        { role: "system",    content: agentSystem },
        ...ctx.messages,
      ];

      // Si hay observaciones previas, añadirlas como contexto del asistente
      if (state.observations.length > 0) {
        messages.push({
          role: "assistant",
          content: `He recopilado los siguientes datos:\n${state.observations.join("\n\n")}`,
        });
        messages.push({
          role: "user",
          content: "Continúa con el análisis o responde si ya tienes todo lo necesario.",
        });
      }

      const llmRequest: LLMRequest = {
        messages,
        tools:       toolDefs as unknown as LLMRequest["tools"],
        tool_choice: "auto",
        temperature: 0.4, // más determinístico en modo agente
        max_tokens:  800,
        stream:      true,
      };

      let llmResult: { text: string; toolCalls: Array<{ name: string; args: string }> };
      try {
        const { stream } = await orchestrator.complete(llmRequest, "analysis");
        llmResult = await consumeStream(stream);
      } catch (err) {
        console.error("[SOFIAA][Agent] LLM error en iteración", state.iteration, err);
        const errStep = makeStep("observe", "Error al conectar con el modelo.", Date.now() - iterStart);
        state.steps.push(errStep);
        break;
      }

      // ── Sin tool calls → el LLM decidió responder directamente ────────
      if (llmResult.toolCalls.length === 0) {
        const synthStep = makeStep("synthesize", llmResult.text, Date.now() - iterStart);
        state.steps.push(synthStep);
        state.isComplete  = true;
        state.finalAnswer = llmResult.text;

        // Stream la respuesta final al cliente
        controller.enqueue(encoder.encode(llmResult.text));
        console.info(`[SOFIAA][Agent] completado en ${state.iteration} iteración(es)`);
        break;
      }

      // ── Con tool calls → ejecutar y observar ──────────────────────────
      for (const tc of llmResult.toolCalls) {
        const tool = this.tools.get(tc.name);
        if (!tool) {
          console.warn("[SOFIAA][Agent] tool desconocido:", tc.name);
          continue;
        }

        let params: Record<string, unknown> = {};
        try { params = JSON.parse(tc.args || "{}"); } catch { /* args vacíos */ }

        // Mostrar al cliente que SOFIAA está trabajando
        const thinkMsg = `${STEP_PREFIX}Consultando ${tc.name}...\n`;
        controller.enqueue(encoder.encode(thinkMsg));

        const actStep = makeStep("act", `tool: ${tc.name}`, Date.now() - iterStart, {
          tool:  tc.name,
          input: params,
        });
        state.steps.push(actStep);

        // Ejecutar el tool
        const toolStart = Date.now();
        let observation: string;
        try {
          observation = await executeWithTimeout(tool, params, ctx);
          console.info(`[SOFIAA][Agent] ${tc.name} ejecutado en ${Date.now() - toolStart}ms`);
        } catch (err) {
          observation = `Error al ejecutar ${tc.name}: ${err instanceof Error ? err.message : String(err)}`;
          console.error("[SOFIAA][Agent] tool error:", tc.name, err);
        }

        const observeStep = makeStep("observe", observation, Date.now() - toolStart);
        state.steps.push(observeStep);
        state.observations.push(`[${tc.name}] ${observation}`);
      }
    }

    // ── Si agotamos iteraciones sin sintetizar ─────────────────────────
    if (!state.isComplete) {
      const fallback = state.observations.length > 0
        ? `Basándome en los datos recopilados:\n\n${state.observations.join("\n\n")}`
        : "No pude completar el análisis en el tiempo disponible. Por favor reformula tu pregunta.";

      state.finalAnswer = fallback;
      controller.enqueue(encoder.encode(fallback));
      console.warn("[SOFIAA][Agent] max iteraciones alcanzadas — respuesta best-effort");
    }

    return {
      finalAnswer: state.finalAnswer ?? "",
      steps:       state.steps,
      iterations:  state.iteration,
      totalMs:     Date.now() - startMs,
      stopped:     state.isComplete ? "completed" : "max_iterations",
    };
  }
}
