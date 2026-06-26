/**
 * SOFIAA 1.1.4 — Async Event Bus
 *
 * El stream SSE llega al usuario sin esperar por ningún side effect.
 * Al terminar el stream, dispatch() encola las tareas asíncronas
 * y las ejecuta en segundo plano via waitUntil().
 *
 * Principio: el usuario nunca paga latencia por logs, memoria o Monday sync.
 *
 * Uso en route.ts:
 *   const bus = createEventBus(traceId, extensionId);
 *   // ... stream terminado ...
 *   bus.dispatch("stream_finished", { response: fullResponse });
 *   await bus.flush(waitUntil); // o bus.flushBackground() sin waitUntil
 */

import type { Tracer } from "@/core/tracer";

// ── Tipos de eventos ──────────────────────────────────────────────────────

export type SofiaaEventType =
  | "stream_finished"     // el LLM terminó de responder
  | "goal_detected"       // el Goal Engine clasificó una intención
  | "action_executed"     // un tool handler ejecutó una acción
  | "memory_updated"      // la memoria long-term fue actualizada
  | "nav_triggered"       // el usuario va a navegar
  | "guardrail_triggered";// un guardrail bloqueó el mensaje

export interface SofiaaEvent {
  type: SofiaaEventType;
  traceId: string;
  extensionId: string | null;
  timestamp: number;
  payload: Record<string, unknown>;
}

// ── Handler type ──────────────────────────────────────────────────────────

type EventHandler = (event: SofiaaEvent) => Promise<void>;

// ── Handlers registrados por evento ──────────────────────────────────────
// Cada extensión puede registrar sus propios handlers en Sprint C (lifecycle hooks).
// El Core registra los handlers base aquí.

const BASE_HANDLERS: Partial<Record<SofiaaEventType, EventHandler[]>> = {
  stream_finished: [
    // Actualizar memoria contextual tras cada respuesta
    async (event) => {
      try {
        const { addTimelineEntry } = await import("@/core/memory.timeline");
        // Solo persiste si hay suficiente contenido
        const response = event.payload.response as string;
        if (response && response.length > 50) {
          // Timeline entry ligera — sin bloquear
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

// ── EventBus ─────────────────────────────────────────────────────────────

export class EventBus {
  private queue: SofiaaEvent[] = [];
  private traceId: string;
  private extensionId: string | null;
  private tracer?: Tracer;

  constructor(traceId: string, extensionId: string | null, tracer?: Tracer) {
    this.traceId = traceId;
    this.extensionId = extensionId;
    this.tracer = tracer;
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
   * Si el entorno soporta waitUntil (Vercel Edge), úsalo.
   * Si no, fire-and-forget con Promise.allSettled.
   */
  async flush(waitUntilFn?: (p: Promise<unknown>) => void): Promise<void> {
    if (this.queue.length === 0) return;

    const work = this.processQueue();

    if (waitUntilFn) {
      // Vercel Edge: el runtime mantiene viva la función hasta que termine
      waitUntilFn(work);
    } else {
      // Node.js serverless: fire-and-forget
      work.catch((err) =>
        console.error("[SOFIAA][EVENT_BUS] flush error:", err)
      );
    }
  }

  private async processQueue(): Promise<void> {
    for (const event of this.queue) {
      const handlers = BASE_HANDLERS[event.type] ?? [];
      await Promise.allSettled(handlers.map((h) => h(event)));
      this.tracer?.log(`event:${event.type}`, "ok", "info");
    }
    // Flush tracer logs a Firestore al final de todo
    await this.tracer?.flush();
  }
}

// ── Factory ───────────────────────────────────────────────────────────────

export function createEventBus(
  traceId: string,
  extensionId: string | null,
  tracer?: Tracer
): EventBus {
  return new EventBus(traceId, extensionId, tracer);
}
