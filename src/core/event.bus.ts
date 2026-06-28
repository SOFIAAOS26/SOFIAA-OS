/**
 * SOFIAA 1.1.4 — Async Event Bus v2
 *
 * Sprint C3: Lifecycle hooks por extensión.
 * El Bus ahora puede ejecutar hooks registrados por la extensión activa
 * (onGoalDetected, onStreamFinished) además de los handlers base del Core.
 *
 * Principio: el usuario nunca paga latencia por logs, memoria o webhooks.
 * Todo corre después del stream via waitUntil() o fire-and-forget.
 */

import type { Tracer } from "@/core/tracer";
import type { ExtensionHooks, ExtensionContext } from "@/types/sofiaa-platform";

// ── Tipos de eventos ──────────────────────────────────────────────────────────

export type SofiaaEventType =
  | "stream_finished"      // el LLM terminó de responder
  | "goal_detected"        // el Goal Engine clasificó una intención
  | "action_executed"      // un tool handler ejecutó una acción
  | "memory_updated"       // la memoria long-term fue actualizada
  | "nav_triggered"        // el usuario va a navegar
  | "guardrail_triggered"  // un guardrail bloqueó el mensaje
  | "cpe_violation"        // el CPE detectó una violación de política
  | "capability_executed"; // Sprint E: una capability fue ejecutada exitosamente

export interface SofiaaEvent {
  type: SofiaaEventType;
  traceId: string;
  extensionId: string | null;
  timestamp: number;
  payload: Record<string, unknown>;
}

// ── Handler type ──────────────────────────────────────────────────────────────

type EventHandler = (event: SofiaaEvent) => Promise<void>;

// ── Handlers base del Core ────────────────────────────────────────────────────
// Siempre activos — independientes de la extensión montada.

const BASE_HANDLERS: Partial<Record<SofiaaEventType, EventHandler[]>> = {
  stream_finished: [
    async (event) => {
      try {
        const { addTimelineEntry } = await import("@/core/memory.timeline");
        const response = event.payload.response as string;
        if (response && response.length > 50) {
          void addTimelineEntry({
            sessionId: event.traceId,
            timestamp: event.timestamp,
            title: "Respuesta SOFIAA",
            summary: response.slice(0, 200),
            messageCount: 1,
            topGoal: (event.payload.goal as string) ?? "general",
            tags: [],
          });
        }
      } catch { /* no crítico */ }
    },
  ],
};

// ── EventBus ──────────────────────────────────────────────────────────────────

export class EventBus {
  private queue: SofiaaEvent[] = [];
  private traceId: string;
  private extensionId: string | null;
  private tracer?: Tracer;

  /** Hooks de la extensión activa — se inyectan al crear el bus */
  private extensionHooks?: ExtensionHooks;

  /** Contexto de ejecución para los hooks — se inyecta desde route.ts */
  private extensionContext?: ExtensionContext;

  constructor(traceId: string, extensionId: string | null, tracer?: Tracer) {
    this.traceId = traceId;
    this.extensionId = extensionId;
    this.tracer = tracer;
  }

  /**
   * Registra los hooks de la extensión activa y el contexto de ejecución.
   * Llamar desde route.ts después de resolver la extensión.
   *
   * @param hooks   - ExtensionHooks del SofiaaExtension resuelto (puede ser undefined)
   * @param context - ExtensionContext con traceId, userId, activePath, etc.
   */
  registerExtensionHooks(hooks: ExtensionHooks | undefined, context: ExtensionContext): void {
    this.extensionHooks = hooks;
    this.extensionContext = context;
  }

  /** Encola un evento para procesamiento asíncrono */
  dispatch(type: SofiaaEventType, payload: Record<string, unknown> = {}): void {
    this.queue.push({
      type,
      traceId: this.traceId,
      extensionId: this.extensionId,
      timestamp: Date.now(),
      payload,
    });
  }

  /**
   * Ejecuta todos los handlers en segundo plano.
   * Soporta waitUntil (Vercel Edge) o fire-and-forget (Node.js).
   */
  async flush(waitUntilFn?: (p: Promise<unknown>) => void): Promise<void> {
    if (this.queue.length === 0) return;

    const work = this.processQueue();

    if (waitUntilFn) {
      waitUntilFn(work);
    } else {
      work.catch((err) =>
        console.error("[SOFIAA][EVENT_BUS] flush error:", err)
      );
    }
  }

  private async processQueue(): Promise<void> {
    for (const event of this.queue) {
      // 1. Handlers base del Core
      const baseHandlers = BASE_HANDLERS[event.type] ?? [];
      await Promise.allSettled(baseHandlers.map((h) => h(event)));

      // 2. Lifecycle hooks de la extensión activa (Sprint C3)
      await this.runExtensionHooks(event);

      this.tracer?.log(`event:${event.type}`, "ok", "info");
    }

    // Flush tracer logs a Firestore al final de todo
    await this.tracer?.flush();
  }

  /**
   * Ejecuta el hook correspondiente de la extensión activa si existe.
   * Falla silenciosamente — nunca propaga errores de hooks al Core.
   */
  private async runExtensionHooks(event: SofiaaEvent): Promise<void> {
    if (!this.extensionHooks || !this.extensionContext) return;

    const hooks = this.extensionHooks;
    const ctx = this.extensionContext;

    try {
      switch (event.type) {
        case "stream_finished": {
          if (hooks.onStreamFinished) {
            const response = (event.payload.response as string) ?? "";
            await hooks.onStreamFinished(response, ctx);
            this.tracer?.log("ext_hook:onStreamFinished", "ok", "info", {
              extId: this.extensionId,
            });
          }
          break;
        }
        case "goal_detected": {
          if (hooks.onGoalDetected) {
            const goal = (event.payload.goal as string) ?? "general";
            await hooks.onGoalDetected(goal, ctx);
            this.tracer?.log("ext_hook:onGoalDetected", "ok", "info", {
              extId: this.extensionId,
              goal,
            });
          }
          break;
        }
        // onInitialize se llama desde route.ts al inicio del request, no aquí
      }
    } catch (err) {
      // Los hooks de extensión nunca rompen el Core
      console.error(
        `[SOFIAA][EVENT_BUS] extension hook error (${event.type}):`,
        err
      );
      this.tracer?.log(`ext_hook:${event.type}`, "failed", "warn", {
        extId: this.extensionId,
      });
    }
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createEventBus(
  traceId: string,
  extensionId: string | null,
  tracer?: Tracer
): EventBus {
  return new EventBus(traceId, extensionId, tracer);
}
