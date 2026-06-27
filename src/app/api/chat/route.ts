/**
 * SOFIAA 1.1.4 — /api/chat route handler
 *
 * Escudo Operacional activo:
 * - traceId por request (observabilidad)
 * - Guardrails doble capa (cliente + servidor)
 * - Prompt modular via ExtensionRegistry (agnóstico)
 * - Function Calling para navegación y UI generativa (blindado)
 * - Event Bus asíncrono vía waitUntil (sin latencia extra)
 */

import { NextRequest } from "next/server";
import { resolveModules, resolveExtensionPrompt, describeModules } from "@/core/prompt.resolver";
import { extensionRegistry } from "@/core/extension.registry";
import { assemblePrompt } from "@/config/prompt.modules";
import { AUTH_WORD } from "@/config/navigation";
import { analyzeMessage, analyzeConversation, logSecurityEvent } from "@/core/guardrails.engine";
import { getSafetyResponse } from "@/config/safety.response.map";
import { getGoalContext, type GoalType } from "@/core/goal.engine";
import { createTracer } from "@/core/tracer";
import { createEventBus } from "@/core/event.bus";
import { SOFIAA_TOOLS, parseToolCalls, serializeToolResults } from "@/core/sofiaa.tools";

type Message = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  // ── Tracer: genera traceId único para este request ────────────────────
  const tracer = createTracer();
  const bus    = createEventBus(tracer.id, null, tracer);
  // ─────────────────────────────────────────────────────────────────────

  const { messages, longTermMemory, contextualMemory, detectedGoal, activePath, extensionData }: {
    messages: Message[];
    longTermMemory?: string;
    contextualMemory?: string;
    detectedGoal?: GoalType;
    activePath?: string | null;
    extensionData?: string;
  } = await req.json();

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: "Mensajes inválidos" }), { status: 400 });
  }

  // ── Guardrails capa servidor ──────────────────────────────────────────
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");

  if (lastUserMsg) {
    const msgResult = analyzeMessage(lastUserMsg.content);
    logSecurityEvent(msgResult, lastUserMsg.content.length);

    if (msgResult.blocked) {
      tracer.log("guardrails_msg", "blocked", "blocked", { threat: msgResult.threat });
      bus.dispatch("guardrail_triggered", { threat: msgResult.threat });
      await bus.flush();

      const safeReply = getSafetyResponse(msgResult.threat as Exclude<typeof msgResult.threat, "none">);
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(safeReply));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "x-sofiaa-trace": tracer.id,
        },
      });
    }
  }

  const convResult = analyzeConversation(messages);
  if (convResult.blocked) {
    tracer.log("guardrails_conv", "blocked", "blocked");
    bus.dispatch("guardrail_triggered", { threat: "abuse_pattern" });
    await bus.flush();

    logSecurityEvent(convResult, 0);
    const safeReply = getSafetyResponse("abuse_pattern");
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(safeReply));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "x-sofiaa-trace": tracer.id,
      },
    });
  }
  // ─────────────────────────────────────────────────────────────────────

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key no configurada" }), { status: 500 });
  }

  const isAuthorized = messages.some(
    (m) => m.role === "user" && m.content.toLowerCase().includes(AUTH_WORD)
  );

  const memoryBlock = longTermMemory
    ? `\n\n# MEMORIA HISTÓRICA DEL USUARIO\n${longTermMemory}`
    : "";

  const contextualBlock = contextualMemory ? `\n\n${contextualMemory}` : "";

  const authStatus = isAuthorized
    ? "ESTADO DE AUTORIZACIÓN: El usuario YA proporcionó la palabra de autorización."
    : "ESTADO DE AUTORIZACIÓN: El usuario NO está autorizado para sitios externos aún.";

  const goalBlock = detectedGoal && detectedGoal !== "general"
    ? `\n\n${getGoalContext(detectedGoal)}`
    : "";

  // ── Modular Prompt Assembly — Registry agnóstico ──────────────────────
  const path = activePath ?? "";
  const modules = resolveModules({ activePath: path, userMessage: lastUserMsg?.content ?? "" });
  const registryExtPrompt = resolveExtensionPrompt(path);
  const finalExtData = [registryExtPrompt, extensionData].filter(Boolean).join("\n\n") || undefined;

  const resolvedExt = registryExtPrompt
    ? extensionRegistry.resolve(path)
    : null;
  const activeExtId = resolvedExt?.extension.manifest.id ?? null;

  tracer.log("prompt_assembly", "ok", "info", {
    modules: describeModules(modules),
    ext: activeExtId,
  });

  // Registrar hooks de la extensión activa en el EventBus (Sprint C3)
  if (resolvedExt?.extension.hooks) {
    const extCtx = {
      traceId: tracer.id,
      extensionId: activeExtId ?? "",
      activePath: path,
      userMessage: lastUserMsg?.content ?? "",
      timestamp: Date.now(),
    };
    bus.registerExtensionHooks(resolvedExt.extension.hooks, extCtx);

    // onInitialize: fire-and-forget al inicio del request
    if (resolvedExt.extension.hooks.onInitialize) {
      resolvedExt.extension.hooks.onInitialize(extCtx).catch(() => {});
    }
  }

  const systemPrompt = assemblePrompt(modules, finalExtData);
  // ─────────────────────────────────────────────────────────────────────

  // ── Groq API — con Function Calling ──────────────────────────────────
  let groqResponse: Response;
  try {
    groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `${systemPrompt}${memoryBlock}${contextualBlock}\n\n${authStatus}${goalBlock}`,
          },
          ...messages.map(({ role, content }) => ({ role, content })),
        ],
        tools: SOFIAA_TOOLS,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 1024,
        stream: true,
      }),
    });
  } catch (fetchErr) {
    tracer.log("groq_fetch", "failed", "error", { error: String(fetchErr) });
    await bus.flush();
    return new Response(JSON.stringify({ error: "No se pudo conectar con Groq" }), { status: 502 });
  }

  if (!groqResponse.ok) {
    const err = await groqResponse.text();
    tracer.log("groq_response", "failed", "error", { status: groqResponse.status });
    await bus.flush();
    console.error("Groq API Error:", groqResponse.status, err);
    return new Response(JSON.stringify({ error: `Groq ${groqResponse.status}: ${err}` }), { status: 500 });
  }

  tracer.log("groq_stream_start", "ok", "info");
  // ─────────────────────────────────────────────────────────────────────

  // ── Streaming SSE con manejo de tool calls ────────────────────────────
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = groqResponse.body!.getReader();
      let buffer = "";
      let fullText = "";

      // Acumuladores para tool calls (llegan en deltas)
      const toolCallAccumulators: Record<number, { name: string; args: string }> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            // ── Procesar tool calls acumulados ──────────────────────────
            const toolCallList = Object.values(toolCallAccumulators).map((tc) => ({
              function: { name: tc.name, arguments: tc.args },
            }));

            if (toolCallList.length > 0) {
              const toolResults = parseToolCalls(toolCallList);
              const serialized = serializeToolResults(toolResults);
              if (serialized) {
                fullText += "\n" + serialized;
                controller.enqueue(encoder.encode("\n" + serialized));
              }
            }

            // ── Event Bus: despachar stream_finished ────────────────────
            bus.dispatch("stream_finished", {
              response: fullText,
              goal: detectedGoal,
              ext: activeExtId,
              traceMs: tracer.elapsedMs,
            });
            // fire-and-forget — el cliente ya tiene todo
            bus.flush().catch(() => {});

            controller.close();
            return;
          }

          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta;

            // Texto normal → enviar al cliente inmediatamente
            if (delta?.content) {
              fullText += delta.content;
              controller.enqueue(encoder.encode(delta.content));
            }

            // Tool call delta → acumular (pueden llegar en múltiples chunks)
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx: number = tc.index ?? 0;
                if (!toolCallAccumulators[idx]) {
                  toolCallAccumulators[idx] = { name: "", args: "" };
                }
                if (tc.function?.name) {
                  toolCallAccumulators[idx].name += tc.function.name;
                }
                if (tc.function?.arguments) {
                  toolCallAccumulators[idx].args += tc.function.arguments;
                }
              }
            }
          } catch { /* chunk malformado — ignorar */ }
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "x-sofiaa-trace": tracer.id,
    },
  });
}
