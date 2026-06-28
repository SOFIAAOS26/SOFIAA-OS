/**
 * SOFIAA Sprint D — LLM Orchestrator
 *
 * Decide qué proveedor usar según:
 *   1. Tipo de tarea (speed / reasoning / cost)
 *   2. Disponibilidad en tiempo real (rate limits, API key)
 *   3. Fallback automático si el provider principal falla
 *
 * Ninguna otra parte del sistema toca los providers directamente.
 */

import type { LLMProvider, LLMRequest, LLMStreamChunk } from "@/core/llm.client";
import { GroqProvider }   from "@/core/providers/groq.provider";
import { GeminiProvider } from "@/core/providers/gemini.provider";

// ── Registro de providers ─────────────────────────────────────────────────

const PROVIDERS: LLMProvider[] = [
  new GroqProvider(),
  new GeminiProvider(),
];

// ── Heurística de routing ─────────────────────────────────────────────────

/**
 * Determina la prioridad óptima basándose en el mensaje del usuario.
 *
 * - "speed":     navegación, respuestas cortas, confirmaciones
 * - "reasoning": análisis, código, comparativas, preguntas complejas
 * - "cost":      futuro — modelo local cuando esté disponible
 */
function detectPriority(userMessage: string): "speed" | "reasoning" {
  const lc = userMessage.toLowerCase();

  const reasoningSignals = [
    "analiza", "compara", "explica", "cómo funciona", "por qué",
    "código", "script", "implementa", "diferencia entre",
    "resume", "genera un reporte", "calcula", "estrategia",
    "pros y contras", "evalúa", "propuesta",
  ];

  const hasReasoningSignal = reasoningSignals.some(s => lc.includes(s));
  const isLongMessage = userMessage.length > 200;

  return (hasReasoningSignal || isLongMessage) ? "reasoning" : "speed";
}

// ── Orchestrator principal ────────────────────────────────────────────────

export class LLMOrchestrator {
  /**
   * Selecciona el mejor provider disponible y ejecuta el request.
   * Si el provider principal falla (429, error), hace fallback automático.
   *
   * @param req      - El request LLM normalizado
   * @param hint     - Forzar prioridad (opcional — si no se pasa, se detecta automático)
   */
  async complete(
    req: LLMRequest,
    hint?: "speed" | "reasoning"
  ): Promise<{ stream: ReadableStream<LLMStreamChunk>; provider: string }> {

    const userMessage = req.messages.findLast(m => m.role === "user")?.content ?? "";
    const priority = hint ?? detectPriority(userMessage);

    // Ordenar providers: primero el que coincide con la prioridad, luego el resto
    const ordered = [
      ...PROVIDERS.filter(p => p.priority === priority),
      ...PROVIDERS.filter(p => p.priority !== priority),
    ];

    let lastError: Error | null = null;

    for (const provider of ordered) {
      const available = await provider.isAvailable();
      if (!available) {
        console.info(`[SOFIAA][Orchestrator] ${provider.name} no disponible — siguiente`);
        continue;
      }

      try {
        console.info(`[SOFIAA][Orchestrator] usando ${provider.name} (${priority})`);
        const stream = await provider.complete(req);
        return { stream, provider: provider.name };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[SOFIAA][Orchestrator] ${provider.name} falló: ${lastError.message} — intentando siguiente`);
        // Continuar al siguiente provider
      }
    }

    // Todos los providers fallaron → stream de error amigable
    console.error("[SOFIAA][Orchestrator] todos los providers fallaron:", lastError?.message);
    return {
      stream: this.errorStream(lastError),
      provider: "none",
    };
  }

  /** Devuelve el estado actual de los providers (para telemetría/admin) */
  async status(): Promise<Array<{ name: string; priority: string; available: boolean }>> {
    return Promise.all(
      PROVIDERS.map(async p => ({
        name:      p.name,
        priority:  p.priority,
        available: await p.isAvailable(),
      }))
    );
  }

  /** Stream de un solo chunk con mensaje de error amigable */
  private errorStream(err: Error | null): ReadableStream<LLMStreamChunk> {
    const isRateLimit = err?.message?.includes("RATE_LIMITED");
    const message = isRateLimit
      ? "El sistema está experimentando alta demanda en este momento. Por favor intenta en unos segundos — estoy en proceso de recuperación automática."
      : "Hubo un problema conectando con el motor de inteligencia. Por favor intenta de nuevo.";

    return new ReadableStream<LLMStreamChunk>({
      start(controller) {
        controller.enqueue({ content: message });
        controller.close();
      },
    });
  }
}

// ── Singleton exportado ───────────────────────────────────────────────────

export const orchestrator = new LLMOrchestrator();
