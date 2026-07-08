/**
 * SOFIAA Sprint D — Groq Provider
 *
 * Implementación del contrato LLMProvider para Groq.
 * Óptimo para: velocidad, streaming nativo, respuestas cortas.
 * Modelo: llama-3.3-70b-versatile
 */

import type { LLMProvider, LLMRequest, LLMStreamChunk } from "@/core/llm.client";
import { markRateLimited, isRateLimited } from "@/core/llm.client";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL   = "llama-3.3-70b-versatile";

export class GroqProvider implements LLMProvider {
  readonly name     = "groq";
  readonly priority = "speed" as const;

  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY ?? "";
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    if (isRateLimited(this.name)) return false;
    return true;
  }

  async complete(req: LLMRequest): Promise<ReadableStream<LLMStreamChunk>> {
    // Timeout de 9s — si Groq no responde, el Orchestrator hace fallback a Gemini
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 9000);

    let response: Response;
    try {
      response = await fetch(GROQ_API_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model:        GROQ_MODEL,
          messages:     req.messages,
          tools:        req.tools,
          tool_choice:  req.tool_choice ?? "auto",
          temperature:  req.temperature ?? 0.7,
          max_tokens:   req.max_tokens ?? 1024,
          stream:       true,
        }),
      });
    } catch (err) {
      clearTimeout(timeout);
      const msg = err instanceof Error ? err.message : String(err);
      // Timeout o error de red → fallback inmediato
      markRateLimited(this.name, 30);
      throw new Error(`GROQ_TIMEOUT_OR_NETWORK: ${msg}`);
    }
    clearTimeout(timeout);

    // Rate limit detectado → marcar y lanzar error para que el Orchestrator haga fallback
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("retry-after") ?? "60", 10);
      markRateLimited(this.name, retryAfter);
      throw new Error(`GROQ_RATE_LIMITED:${retryAfter}`);
    }

    // Otros errores HTTP → fallback
    if (!response.ok) {
      markRateLimited(this.name, 30);
      throw new Error(`GROQ_ERROR:${response.status}`);
    }

    // Verificar si el body ya contiene un error JSON (algunos 200 de Groq son errores)
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/event-stream")) {
      const body = await response.text().catch(() => "");
      if (body.includes('"error"')) {
        markRateLimited(this.name, 30);
        throw new Error(`GROQ_JSON_ERROR: ${body.slice(0, 200)}`);
      }
    }

    // Transformar el SSE de Groq al formato LLMStreamChunk
    return this.transformStream(response.body!);
  }

  private transformStream(raw: ReadableStream<Uint8Array>): ReadableStream<LLMStreamChunk> {
    const decoder = new TextDecoder();
    let buffer = "";

    return new ReadableStream<LLMStreamChunk>({
      async start(controller) {
        const reader = raw.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (data === "[DONE]") { controller.close(); return; }

              try {
                const json  = JSON.parse(data);
                const delta = json.choices?.[0]?.delta;
                const finish = json.choices?.[0]?.finish_reason ?? null;

                const chunk: LLMStreamChunk = {};
                if (delta?.content)    chunk.content    = delta.content;
                if (delta?.tool_calls) chunk.tool_calls = delta.tool_calls;
                if (finish)            chunk.finish_reason = finish;

                if (chunk.content || chunk.tool_calls) {
                  controller.enqueue(chunk);
                }
              } catch { /* chunk malformado — ignorar */ }
            }
          }
        } catch (err) {
          controller.error(err);
        }
      },
    });
  }
}
