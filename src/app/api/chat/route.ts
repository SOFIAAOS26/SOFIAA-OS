/**
 * SOFIAA 1.1.4 — /api/chat route handler
 *
 * Escudo Operacional activo:
 * - traceId por request (observabilidad)
 * - Guardrails doble capa (cliente + servidor)
 * - Prompt modular via ExtensionRegistry (agnóstico)
 * - Function Calling para navegación y UI generativa (blindado)
 * - Event Bus asíncrono vía waitUntil (sin latencia extra)
 * - Capability Runtime Layer (Sprint E) — datos en tiempo real bajo demanda
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
import { capabilityGateway } from "@/core/capability.gateway";
import { capabilityRuntime } from "@/core/capability.runtime";
import type { CapabilityContext } from "@/core/capability.runtime";
import { buildCapabilityMenuBlock } from "@/core/capability.registry";
import { firestoreProvider } from "@/core/providers/firestore.provider";
import { mockProvider } from "@/core/providers/mock.provider";
import { AgentRuntime }  from "@/core/agent.runtime";
import { AGENT_TOOLS }   from "@/core/agent.tools";
import type { AgentContext } from "@/core/agent.types";
import { getNexoContext } from "@/lib/nexo/firestore";
import type { NexoContext } from "@/types/nexo";

// ── Registro de providers (módulo, se ejecuta una vez) ────────────────────
const _useMock = process.env.NEXT_PUBLIC_MOCK_CAPABILITIES === "true";
capabilityRuntime.registerProvider(_useMock ? mockProvider : firestoreProvider);
// ─────────────────────────────────────────────────────────────────────────

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

// ── Helper: formatea el contexto N.E.X.O. para el system prompt ──────────
const NEXO_CATEGORY_LABELS: Record<string, string> = {
  food: "comida", work: "trabajo", travel: "viaje", shopping: "compras",
  research: "investigación", social: "social", media: "media", other: "otro",
};

function buildNexoBlock(ctx: NexoContext | null): string {
  if (!ctx || ctx.topNodes.length === 0) return "";

  const lines = ctx.topNodes.map(n => {
    const cat    = NEXO_CATEGORY_LABELS[n.category] ?? n.category;
    const when   = n.daysAgo === 0 ? "hoy"
                 : n.daysAgo === 1 ? "ayer"
                 : `hace ${n.daysAgo} días`;
    const urlPart = n.url ? ` | url: ${n.url}` : "";
    return `• [${cat}] ${n.title} — ${n.summary} (${when}${urlPart})`;
  });

  const clusters = ctx.clusters.length > 0
    ? `\nIntereses detectados: ${ctx.clusters.map(c => NEXO_CATEGORY_LABELS[c] ?? c).join(", ")}.`
    : "";

  return (
    `\n\nMEMORIA N.E.X.O. — Capturas recientes del usuario (${ctx.totalNodes} nodos activos):\n` +
    lines.join("\n") +
    clusters +
    `\n(Usa esta información proactivamente cuando sea relevante. No menciones "N.E.X.O." al usuario.)`
  );
}

export async function POST(req: NextRequest) {
  // ── Tracer: genera traceId único para este request ────────────────────
  const tracer   = createTracer();
  const bus      = createEventBus(tracer.id, null, tracer);
  const encoder  = new TextEncoder();
  // ─────────────────────────────────────────────────────────────────────

  const {
    messages,
    longTermMemory,
    contextualMemory,
    detectedGoal,
    activePath,
    extensionData,
    userRole,
    activeGoal,
    graphContext,
    userId,
    agentMode,
  }: {
    messages:          Message[];
    longTermMemory?:   string;
    contextualMemory?: string;
    detectedGoal?:     GoalType;
    activePath?:       string | null;
    extensionData?:    string;
    userRole?:         string | null;
    activeGoal?:       GoalState | null;
    graphContext?:     { nodes: Record<string, { type: string; label: string; weight: number; hits: number }> } | null;
    userId?:           string | null;
    agentMode?:        boolean;
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

  // N.E.X.O. — Memoria de capturas del usuario (Sprint N-4)
  let nexoBlock = "";
  if (userId && userId !== "anonymous") {
    try {
      const nexoCtx = await getNexoContext(userId);
      nexoBlock = buildNexoBlock(nexoCtx);
    } catch {
      // N.E.X.O. nunca debe romper el chat — falla silenciosa
    }
  }

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

  // ── Capability Menu Block — Sprint E ─────────────────────────────────
  // Admin ve TODAS las capabilities desde cualquier ruta (fix Bug 1)
  // El resto solo ve las de su extensión activa
  const isAdmin = userRole === "admin";
  const capabilityMenuBlock = isAdmin
    ? buildCapabilityMenuBlock("*")          // "*" = todas las extensiones
    : activeExtId
      ? buildCapabilityMenuBlock(activeExtId)
      : "";
  // ─────────────────────────────────────────────────────────────────────

  // ── LLM Orchestrator — elige el mejor provider disponible ────────────
  const systemContent = `${systemPrompt}${memoryBlock}${contextualBlock}\n\n${authStatus}\n\n${firebaseStatus}${goalBlock}${goalStateBlock}${graphBlock}${nexoBlock}${policyBlock}${capabilityMenuBlock}`;

  // ── Sprint G: Agent Runtime — ReAct loop para tareas multi-paso ──────
  if (agentMode) {
    const agentCtx: AgentContext = {
      userId:        userId        ?? "anonymous",
      userRole:      userRole      ?? "guest",
      extensionId:   activeExtId  ?? "",
      activePath:    path,
      systemContent,
      messages: messages.map(({ role, content }) => ({ role, content })),
      traceId: tracer.id,
    };

    const goal    = lastUserMsg?.content ?? "";
    const runtime = new AgentRuntime(AGENT_TOOLS);

    const agentStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const result = await runtime.run(goal, agentCtx, controller, encoder);
          tracer.log("agent_done", "ok", "info", {
            iterations: result.iterations,
            totalMs:    result.totalMs,
            stopped:    result.stopped,
          });
          bus.dispatch("stream_finished", {
            response: result.finalAnswer,
            goal:     detectedGoal,
            ext:      activeExtId,
            traceMs:  tracer.elapsedMs,
            provider: "agent",
          });
          bus.flush().catch(() => {});
        } catch (err) {
          console.error("[SOFIAA][agent] fatal error:", err);
          tracer.log("agent_error", "failed", "error", { error: String(err) });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(agentStream, {
      headers: {
        "Content-Type":        "text/plain; charset=utf-8",
        "Transfer-Encoding":   "chunked",
        "x-sofiaa-trace":      tracer.id,
        "x-sofiaa-provider":   "agent",
        "x-sofiaa-tasktype":   "automation",
        "x-sofiaa-confidence": "1.00",
        "x-sofiaa-agent":      "react-v1",
      },
    });
  }
  // ─────────────────────────────────────────────────────────────────────

  const llmRequest = {
    messages: [
      {
        role: "system" as const,
        content: systemContent,
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
  let usedTaskType: string = "query";
  let usedConfidence: number = 1.0;

  try {
    const result  = await orchestrator.complete(llmRequest);
    llmStream     = result.stream;
    usedProvider  = result.provider;
    usedTaskType  = result.taskType;
    usedConfidence = result.confidence;
    tracer.log("orchestrator_selected", "ok", "info", { provider: usedProvider, taskType: usedTaskType });
  } catch (err) {
    tracer.log("orchestrator_failed", "failed", "error", { error: String(err) });
    await bus.flush();
    return new Response(JSON.stringify({ error: "No se pudo conectar con el motor de inteligencia" }), { status: 502 });
  }
  // ─────────────────────────────────────────────────────────────────────

  // Contexto de capability (Sprint E) — se resuelve aquí para usarse dentro del stream
  // extensionId base vacío — se sobreescribe con el de la capability al ejecutar (fix Bug 2)
  const capCtxBase: CapabilityContext = {
    userId:      userId ?? "anonymous",
    userRole:    userRole ?? "guest",
    extensionId: activeExtId ?? "",
    activePath:  path,
  };

  // ── Streaming con manejo de tool calls ───────────────────────────────
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

              // ── Capability Runtime (Sprint E) — re-run LLM con datos ──
              // Fix Bug 2: admin puede ejecutar capabilities de cualquier extensión
              // El gateway recibe el extensionId de la capability, no del path activo
              if (toolResults.capabilityRequest && (activeExtId || isAdmin)) {
                const { capability_id, params } = toolResults.capabilityRequest;
                const { resolveCapability } = await import("@/core/capability.registry");
                const capDef = resolveCapability(capability_id);
                const capCtx: CapabilityContext = {
                  ...capCtxBase,
                  extensionId: capDef?.extensionId ?? activeExtId ?? "",
                  params,
                };

                try {
                  tracer.log("capability_request", "ok", "info", { capability_id });
                  const { promptBlock } = await capabilityGateway.execute(capability_id, capCtx);

                  // Construir segundo turno con el resultado de la capability
                  const capMessages = [
                    { role: "system" as const, content: systemContent },
                    ...messages.map(({ role, content }) => ({ role, content })),
                    {
                      role: "user" as const,
                      content: `RESULTADO DE CAPABILITY (no menciones que consultaste una fuente — simplemente responde con los datos):\n${promptBlock}`,
                    },
                  ];

                  // Re-run sin tools para evitar loops
                  const capResult = await orchestrator.complete({
                    ...llmRequest,
                    messages:    capMessages,
                    tools:       undefined,
                    tool_choice: undefined,
                  });

                  const capReader = capResult.stream.getReader();
                  while (true) {
                    const { done: capDone, value: capChunk } = await capReader.read();
                    if (capDone) break;
                    if (capChunk.content) {
                      fullText += capChunk.content;
                      controller.enqueue(encoder.encode(capChunk.content));
                    }
                  }

                  bus.dispatch("capability_executed", {
                    capability_id,
                    extensionId: activeExtId,
                    userId: userId ?? "anonymous",
                  });
                  tracer.log("capability_done", "ok", "info", { capability_id });

                } catch (capErr) {
                  // Capability falló — notificar al usuario con gracia
                  const errMsg = "\n\nNo pude obtener los datos en este momento. Por favor intenta de nuevo o verifica tu conexión.";
                  fullText += errMsg;
                  controller.enqueue(encoder.encode(errMsg));
                  console.error("[SOFIAA][capability] error:", capErr);
                  tracer.log("capability_error", "failed", "error", { capability_id, error: String(capErr) });
                }

              } else {
                // Tool calls normales (show_ui, navigate)
                const serialized = serializeToolResults(toolResults);
                if (serialized) {
                  fullText += "\n" + serialized;
                  controller.enqueue(encoder.encode("\n" + serialized));
                }
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
      "Content-Type":         "text/plain; charset=utf-8",
      "Transfer-Encoding":    "chunked",
      "x-sofiaa-trace":       tracer.id,
      "x-sofiaa-provider":    usedProvider,
      "x-sofiaa-tasktype":    usedTaskType,
      "x-sofiaa-confidence":  usedConfidence.toFixed(2),
    },
  });
}
