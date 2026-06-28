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
import { orchestrator } from "@/core/llm.orchestrator";
import type { LLMStreamChunk } from "@/core/llm.client";
import type { GoalState } from "@/core/goal.state";
import { buildGoalPromptBlock } from "@/core/goal.state";
import { getPoliciesForContext, buildPolicyBlock } from "@/core/cognitive.policy";
import { evaluateResponse, reportToEventPayload } from "@/core/policy.evaluator";

type Message = { role: "user" | "assistant"; content: string };

// ── Helper: convierte el graphContext serializado en bloque de prompt ─────
function buildGraphBlockFromPayload(
  ctx?:        { nodes: Record<string, { type: string; label: string; weight: number; hits: number }> } | null,
  activePath?: string
): string {
  if (!ctx?.nodes) return "";

  const nodes = Object.values(ctx.nodes);
  if (nodes.length === 0) return "";

  const topics = nodes
    .filter(n => n.type === "topic" && n.weight >= 0.15)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);

  const extensions = nodes
    .filter(n => n.type === "extension" && n.weight >= 0.15)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  const lines: string[] = [];

  if (topics.length > 0) {
    lines.push(`Áreas de mayor interés: ${topics.map(t => `${t.label} (×${t.hits})`).join(", ")}.`);
  }
  if (extensions.length > 0) {
    lines.push(`Extensiones frecuentes: ${extensions.map(e => e.label).join(", ")}.`);
  }

  // Afinidad con la extensión activa
  if (activePath) {
    const pathMap: Record<string, string> = {
      "/tec-bi": "ext:tec-bi",
      "/marketing-sofia": "ext:marketing-sofia",
      "/jp-memorial": "ext:jp-memorial",
    };
    const extNodeId = Object.entries(pathMap).find(([p]) => activePath.startsWith(p))?.[1];
    const extNode = extNodeId ? ctx.nodes[extNodeId] : null;
    if (extNode && extNode.weight >= 0.5) {
      lines.push(`Alta familiaridad con esta extensión (${(extNode.weight * 100).toFixed(0)}%).`);
    }
  }

  return lines.length > 0
    ? `\n\nCONTEXTO DE EXPERIENCIA DEL USUARIO:\n${lines.join("\n")}`
    : "";
}

export async function POST(req: NextRequest) {
  // ── Tracer: genera traceId único para este request ────────────────────
  const tracer = createTracer();
  const bus    = createEventBus(tracer.id, null, tracer);
  // ─────────────────────────────────────────────────────────────────────

  const { messages, longTermMemory, contextualMemory, detectedGoal, activePath, extensionData, userRole, activeGoal, graphContext }: {
    messages: Message[];
    longTermMemory?: string;
    contextualMemory?: string;
    detectedGoal?: GoalType;
    activePath?: string | null;
    extensionData?: string;
    userRole?: string | null;
    activeGoal?: GoalState | null;
    graphContext?: { nodes: Record<string, { type: string; label: string; weight: number; hits: number }> } | null;
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

  // Estado de sesión Firebase — determina si puede acceder a extensiones protegidas
  const firebaseStatus = userRole
    ? `SESIÓN FIREBASE: Usuario autenticado con rol "${userRole}". PUEDE navegar a extensiones protegidas (/tec-bi, /marketing-sofia, /jp-memorial) directamente. NO le pidas que inicie sesión.`
    : `SESIÓN FIREBASE: Sin sesión activa. Las extensiones protegidas (/tec-bi, /marketing-sofia) requieren login antes de navegar.`;

  const goalBlock = detectedGoal && detectedGoal !== "general"
    ? `\n\n${getGoalContext(detectedGoal)}`
    : "";

  // Goal State Machine — contexto del paso activo (Sprint D-A)
  const goalStateBlock = activeGoal?.status === "active"
    ? `\n\n${buildGoalPromptBlock(activeGoal)}`
    : "";

  // Experience Graph — contexto estructurado del usuario (Sprint D-E)
  const graphBlock = buildGraphBlockFromPayload(graphContext, activePath ?? "");

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

  // ── Cognitive Policy Engine — Sprint D-D ─────────────────────────────
  const policyCtx = {
    activePath:    path || undefined,
    extensionId:   activeExtId,
    userRole:      userRole ?? null,
    isGoalActive:  activeGoal?.status === "active",
    userMessage:   lastUserMsg?.content ?? "",
  };
  const activePolicies = getPoliciesForContext(policyCtx);
  const policyBlock    = buildPolicyBlock(activePolicies);
  tracer.log("cpe_policies", "ok", "info", { count: activePolicies.length });
  // ─────────────────────────────────────────────────────────────────────

  // ── LLM Orchestrator — elige el mejor provider disponible ────────────
  const llmRequest = {
    messages: [
      {
        role: "system" as const,
        content: `${systemPrompt}${memoryBlock}${contextualBlock}\n\n${authStatus}\n\n${firebaseStatus}${goalBlock}${goalStateBlock}${graphBlock}${policyBlock}`,
      },
      ...messages.map(({ role, content }) => ({ role, content })),
    ],
    tools: SOFIAA_TOOLS as unknown as import("@/core/llm.client").LLMTool[],
    tool_choice: "auto" as const,
    temperature: 0.7,
    max_tokens: 1024,
    stream: true,
  };

  let llmStream: ReadableStream<LLMStreamChunk>;
  let usedProvider: string;

  try {
    const result = await orchestrator.complete(llmRequest);
    llmStream    = result.stream;
    usedProvider = result.provider;
    tracer.log("orchestrator_selected", "ok", "info", { provider: usedProvider });
  } catch (err) {
    tracer.log("orchestrator_failed", "failed", "error", { error: String(err) });
    await bus.flush();
    return new Response(JSON.stringify({ error: "No se pudo conectar con el motor de inteligencia" }), { status: 502 });
  }
  // ─────────────────────────────────────────────────────────────────────

  // ── Streaming con manejo de tool calls ───────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = llmStream.getReader();
      let fullText = "";

      // Acumuladores para tool calls (llegan en deltas desde Groq)
      const toolCallAccumulators: Record<number, { name: string; args: string }> = {};

      try {
        while (true) {
          const { done, value: chunk } = await reader.read();

          if (done) {
            // ── Procesar tool calls acumulados ──────────────────────────
            const toolCallList = Object.values(toolCallAccumulators).map((tc) => ({
              function: { name: tc.name, arguments: tc.args },
            }));

            if (toolCallList.length > 0) {
              const toolResults = parseToolCalls(toolCallList);
              const serialized  = serializeToolResults(toolResults);
              if (serialized) {
                fullText += "\n" + serialized;
                controller.enqueue(encoder.encode("\n" + serialized));
              }
            }

            // ── Event Bus: despachar stream_finished ────────────────────
            bus.dispatch("stream_finished", {
              response: fullText,
              goal:     detectedGoal,
              ext:      activeExtId,
              traceMs:  tracer.elapsedMs,
              provider: usedProvider,
            });

            // ── CPE: evaluar respuesta post-stream (fire-and-forget) ────
            try {
              const report = evaluateResponse(fullText, activePolicies, policyCtx);
              if (report.violations.length > 0) {
                bus.dispatch("cpe_violation", reportToEventPayload(
                  report, tracer.id, usedProvider, activeExtId
                ));
                tracer.log("cpe_eval", "ok", report.hasErrors ? "error" : "warn", {
                  score: report.score,
                  summary: report.summary,
                });
              }
            } catch { /* evaluación nunca debe romper el stream */ }

            bus.flush().catch(() => {});

            controller.close();
            return;
          }

          // Texto normal → enviar al cliente
          if (chunk.content) {
            fullText += chunk.content;
            controller.enqueue(encoder.encode(chunk.content));
          }

          // Tool call deltas → acumular
          if (chunk.tool_calls) {
            for (const tc of chunk.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCallAccumulators[idx]) {
                toolCallAccumulators[idx] = { name: "", args: "" };
              }
              if (tc.function?.name)      toolCallAccumulators[idx].name += tc.function.name;
              if (tc.function?.arguments) toolCallAccumulators[idx].args += tc.function.arguments;
            }
          }
        }
      } catch (err) {
        console.error("[SOFIAA][stream] error leyendo chunks:", err);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "x-sofiaa-trace":    tracer.id,
      "x-sofiaa-provider": usedProvider,
    },
  });
}
