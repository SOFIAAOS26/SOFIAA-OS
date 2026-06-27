/**
 * SOFIAA 1.1.4 — Groq Function Calling definitions
 *
 * navigate: INTENCIONALMENTE excluido de Function Calling.
 * La navegación usa tokens de texto [NAVIGATE:url] — mecanismo probado
 * que funciona con el sistema de confirmación en page.tsx (pendingNav).
 * Function Calling para navigate se activará en Sprint D (Client-Side FC).
 *
 * show_ui: usa Function Calling nativo — el LLM devuelve JSON estructurado
 * para UI generativa sin riesgo de corchetes malformados.
 */

// ── Definiciones de tools para Groq ──────────────────────────────────────

export const SOFIAA_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "show_ui",
      description:
        "Muestra un componente visual al final de la respuesta. " +
        "Usar con moderación — máximo 1 por respuesta. " +
        "No usar en errores, temas de seguridad ni respuestas muy cortas.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["quick_actions", "info_card", "extension_card"],
            description: "Tipo de componente a renderizar",
          },
          payload: {
            type: "object",
            description:
              "quick_actions: {actions:[{label,msg,icon}]} | " +
              "info_card: {icon,title,text,variant} | " +
              "extension_card: {icon,name,desc,path}",
          },
        },
        required: ["type", "payload"],
      },
    },
  },
] as const;

// ── Tipos de respuesta ────────────────────────────────────────────────────

export interface ToolCallResult {
  navigate?: {
    destination: string;
    isExternal: boolean;
  };
  showUI?: {
    type: "quick_actions" | "info_card" | "extension_card";
    payload: Record<string, unknown>;
  };
}

// ── Parser de tool calls desde la respuesta de Groq ──────────────────────

export function parseToolCalls(
  toolCalls: Array<{ function: { name: string; arguments: string } }>
): ToolCallResult {
  const result: ToolCallResult = {};

  for (const call of toolCalls) {
    try {
      const args = JSON.parse(call.function.arguments);

      if (call.function.name === "navigate") {
        result.navigate = {
          destination: args.destination as string,
          isExternal: Boolean(args.isExternal),
        };
      }

      if (call.function.name === "show_ui") {
        result.showUI = {
          type: args.type as NonNullable<ToolCallResult["showUI"]>["type"],
          payload: args.payload as Record<string, unknown>,
        };
      }
    } catch {
      // JSON malformado del LLM → ignorar este tool call, no romper nada
      console.warn("[SOFIAA][TOOLS] tool call parse failed:", call.function.name);
    }
  }

  return result;
}

// ── Formato de respuesta para el cliente ──────────────────────────────────

/**
 * Serializa el resultado de tool calls al formato que el cliente ya entiende.
 * Mantiene compatibilidad con el sistema actual de [NAVIGATE] y [UI].
 * En Sprint C se puede migrar el cliente a consumir tool calls directamente.
 */
export function serializeToolResults(result: ToolCallResult): string {
  const parts: string[] = [];

  if (result.navigate) {
    parts.push(`[NAVIGATE:${result.navigate.destination}]`);
  }

  if (result.showUI) {
    try {
      parts.push(
        `[UI:${result.showUI.type}:${JSON.stringify(result.showUI.payload)}]`
      );
    } catch { /* no serializable — ignorar */ }
  }

  return parts.join("\n");
}
