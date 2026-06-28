/**
 * SOFIAA Sprint D — Gemini Provider
 *
 * Implementación del contrato LLMProvider para Google Gemini.
 * Óptimo para: razonamiento complejo, contexto largo, fallback ante Groq 429.
 * Modelo: gemini-1.5-flash (velocidad) / gemini-1.5-pro (razonamiento)
 *
 * NOTA: Gemini no tiene streaming nativo en el mismo formato SSE que Groq.
 * Usamos la API REST con stream:false y simulamos el stream en un solo chunk.
 * En producción se puede migrar a la SDK oficial de Google AI.
 */

import type { LLMProvider, LLMRequest, LLMStreamChunk, LLMMessage } from "@/core/llm.client";
import { markRateLimited, isRateLimited } from "@/core/llm.client";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL    = "gemini-1.5-flash";

export class GeminiProvider implements LLMProvider {
  readonly name     = "gemini";
  readonly priority = "reasoning" as const;

  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY ?? "";
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    if (isRateLimited(this.name)) return false;
    return true;
  }

  async complete(req: LLMRequest): Promise<ReadableStream<LLMStreamChunk>> {
    // Convertir el formato OpenAI a Gemini
    const contents = this.convertMessages(req.messages);
    const systemInstruction = req.messages.find(m => m.role === "system")?.content;

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature:     req.temperature ?? 0.7,
        maxOutputTokens: req.max_tokens  ?? 1024,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });

    if (response.status === 429) {
      markRateLimited(this.name, 60);
      throw new Error("GEMINI_RATE_LIMITED:60");
    }

    if (!response.ok) {
      throw new Error(`GEMINI_ERROR:${response.status}`);
    }

    const json = await response.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Emitir como stream de un solo chunk (compatible con el contrato)
    return new ReadableStream<LLMStreamChunk>({
      start(controller) {
        if (text) controller.enqueue({ content: text });
        controller.close();
      },
    });
  }

  /** Convierte mensajes OpenAI → formato Gemini (omite system, va como systemInstruction) */
  private convertMessages(messages: LLMMessage[]): unknown[] {
    return messages
      .filter(m => m.role !== "system")
      .map(m => ({
        role:  m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
  }
}
