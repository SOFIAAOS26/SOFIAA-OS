import { NextRequest } from "next/server";
import { resolveModules, resolveExtensionPrompt, describeModules } from "@/core/prompt.resolver";
import { assemblePrompt } from "@/config/prompt.modules";
import { AUTH_WORD } from "@/config/navigation";
import { analyzeMessage, analyzeConversation, logSecurityEvent } from "@/core/guardrails.engine";
import { getSafetyResponse } from "@/config/safety.response.map";
import { getGoalContext, type GoalType } from "@/core/goal.engine";

type Message = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  const { messages, longTermMemory, contextualMemory, detectedGoal, activePath, extensionData }: {
    messages: Message[];
    longTermMemory?: string;
    contextualMemory?: string;
    detectedGoal?: GoalType;
    activePath?: string | null;
    extensionData?: string; // datos dinámicos opcionales (ej. TEC BI summary)
  } = await req.json();

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: "Mensajes inválidos" }), { status: 400 });
  }

  // ── Guardrails: validación en servidor ───────────────────────────────────
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  if (lastUserMsg) {
    const msgResult = analyzeMessage(lastUserMsg.content);
    logSecurityEvent(msgResult, lastUserMsg.content.length);

    if (msgResult.blocked) {
      const safeReply = getSafetyResponse(msgResult.threat as Exclude<typeof msgResult.threat, "none">);
      // Devolver respuesta segura como stream para que la UI la trate igual
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(safeReply));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  }

  // Validación acumulativa de la conversación
  const convResult = analyzeConversation(messages);
  if (convResult.blocked) {
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
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key no configurada" }), { status: 500 });
  }

  // Verificar autorización en el servidor — no depende del modelo
  const isAuthorized = messages.some(
    (m) => m.role === "user" && m.content.toLowerCase().includes(AUTH_WORD)
  );

  const memoryBlock = longTermMemory
    ? `\n\n# MEMORIA HISTÓRICA DEL USUARIO\nEsto es lo que sabes de forma permanente sobre este usuario — úsalo naturalmente:\n${longTermMemory}`
    : "";

  const contextualBlock = contextualMemory
    ? `\n\n${contextualMemory}`
    : "";

  const authStatus = isAuthorized
    ? "ESTADO DE AUTORIZACIÓN: El usuario YA proporcionó la palabra de autorización. Puede navegar a cualquier sitio externo libremente."
    : "ESTADO DE AUTORIZACIÓN: El usuario NO está autorizado aún para sitios externos (solo puede ir a las redes y portfolio de Abrahan sin restricción).";

  // ── Goal Engine: inyectar contexto de objetivo detectado ──────────────────
  const goalBlock = detectedGoal && detectedGoal !== "general"
    ? `\n\n${getGoalContext(detectedGoal)}`
    : "";
  // ─────────────────────────────────────────────────────────────────────────

  // ── Modular Prompt Assembly (v1.1.4 — Registry agnóstico) ────────────────
  const modules = resolveModules({
    activePath: activePath ?? null,
    userMessage: lastUserMsg?.content ?? "",
  });
  // El Registry resuelve la extensión activa por contrato formal — sin if/else
  const registryExtPrompt = resolveExtensionPrompt(activePath ?? "");
  // extensionData = datos dinámicos del cliente (ej. TEC BI summary en tiempo real)
  const finalExtData = [registryExtPrompt, extensionData].filter(Boolean).join("\n\n") || undefined;
  console.log("[SOFIAA]", describeModules(modules), registryExtPrompt ? `+ ext:${activePath}` : "");
  const systemPrompt = assemblePrompt(modules, finalExtData);
  // ─────────────────────────────────────────────────────────────────────────

  const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: `${systemPrompt}${memoryBlock}${contextualBlock}\n\n${authStatus}${goalBlock}` },
        ...messages.map(({ role, content }: { role: string; content: string }) => ({ role, content })),
      ],
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    }),
  });

  if (!groqResponse.ok) {
    const err = await groqResponse.text();
    console.error("Groq API Error:", groqResponse.status, err);
    return new Response(JSON.stringify({ error: `Groq ${groqResponse.status}: ${err}` }), { status: 500 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = groqResponse.body!.getReader();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) { controller.close(); break; }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") { controller.close(); return; }
            try {
              const json = JSON.parse(data);
              const text = json.choices?.[0]?.delta?.content ?? "";
              if (text) controller.enqueue(encoder.encode(text));
            } catch { /* ignorar */ }
          }
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
