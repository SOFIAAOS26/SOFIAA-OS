/**
 * SOFIAA Sprint D-B — Intent Engine
 *
 * Dado un UIIntent declarado por el LLM, resuelve qué componente renderizar.
 * El LLM declara intenciones semánticas. El engine decide el componente.
 * Cero acoplamiento entre el modelo y el frontend.
 */

import type { UIIntent, IntentType } from "@/types/intent";

// ── Tipos de componentes resueltos ────────────────────────────────────────

export type ResolvedComponent =
  | { type: "quick_actions"; props: { actions: { label: string; msg: string; icon?: string }[] } }
  | { type: "compare_table"; props: { title?: string; rows: Array<{ label: string; values: string[] }> } }
  | { type: "info_card";     props: { icon?: string; title: string; text: string; variant?: string } }
  | { type: "confirm_card";  props: { title: string; description: string; actions: { label: string; msg: string; style?: string }[] } }
  | { type: "goal_progress"; props: { current: number; total: number; stepName: string } }
  | { type: "extension_card";props: { icon?: string; name: string; desc: string; path: string } }
  | { type: "success_card";  props: { title: string; message: string } }
  | { type: "data_list";     props: { title?: string; items: string[] } }
  | { type: "none" };

/**
 * Resuelve un UIIntent al componente concreto.
 * Confidence < 0.55 → "none" (fallback seguro, solo texto).
 */
export function resolveIntent(intent: UIIntent): ResolvedComponent {
  if (intent.confidence < 0.55) return { type: "none" };

  switch (intent.intent as IntentType) {

    case "quick_actions":
      return {
        type: "quick_actions",
        props: {
          actions: intent.actions.map(a => ({
            label: a.label,
            msg:   a.msg,
            icon:  a.icon,
          })),
        },
      };

    case "compare_options": {
      const rows = Array.isArray(intent.data)
        ? (intent.data as Array<{ label: string; values: string[] }>)
        : [];
      return {
        type: "compare_table",
        props: { title: intent.title, rows },
      };
    }

    case "show_summary":
    case "info_card":
      return {
        type: "info_card",
        props: {
          icon:    intent.icon ?? "ℹ️",
          title:   intent.title ?? "Resumen",
          text:    typeof intent.data === "string"
            ? intent.data
            : JSON.stringify(intent.entities),
          variant: "default",
        },
      };

    case "request_input":
    case "confirm_action":
      return {
        type: "confirm_card",
        props: {
          title:       intent.title ?? "Confirmación",
          description: typeof intent.data === "string" ? intent.data : "",
          actions:     intent.actions.map(a => ({
            label: a.label,
            msg:   a.msg,
            style: a.style,
          })),
        },
      };

    case "goal_progress": {
      const e = intent.entities as Record<string, unknown>;
      return {
        type: "goal_progress",
        props: {
          current:  Number(e.current ?? 1),
          total:    Number(e.total   ?? 1),
          stepName: String(e.stepName ?? ""),
        },
      };
    }

    case "extension_card": {
      const e = intent.entities as Record<string, unknown>;
      return {
        type: "extension_card",
        props: {
          icon: intent.icon,
          name: String(e.name ?? ""),
          desc: String(e.desc ?? ""),
          path: String(e.path ?? "/"),
        },
      };
    }

    case "success":
      return {
        type: "success_card",
        props: {
          title:   intent.title ?? "¡Listo!",
          message: typeof intent.data === "string" ? intent.data : "",
        },
      };

    case "display_data": {
      const items = Array.isArray(intent.data)
        ? (intent.data as string[])
        : [];
      return {
        type: "data_list",
        props: { title: intent.title, items },
      };
    }

    default:
      return { type: "none" };
  }
}

// ── Detección implícita desde texto libre ─────────────────────────────────
// Fallback: si el LLM no emitió [INTENT:] pero el texto sugiere un intent

const IMPLICIT_PATTERNS: Array<{
  pattern: RegExp;
  intent: IntentType;
  confidence: number;
}> = [
  { pattern: /¿.*quieres.*continuar|¿.*confirmas|¿.*procedemos/i, intent: "confirm_action",  confidence: 0.72 },
  { pattern: /opciones.*disponibles|tienes.*opciones|puedes elegir/i, intent: "quick_actions",  confidence: 0.68 },
  { pattern: /comparando|diferencias entre|ventajas.*desventajas/i,   intent: "compare_options", confidence: 0.70 },
  { pattern: /resumen.*hasta ahora|lo que tenemos|recopilé/i,         intent: "show_summary",    confidence: 0.75 },
];

export function detectImplicitIntent(llmResponse: string): UIIntent | null {
  for (const { pattern, intent, confidence } of IMPLICIT_PATTERNS) {
    if (pattern.test(llmResponse)) {
      return {
        intent,
        confidence,
        entities: {},
        actions:  [],
      };
    }
  }
  return null;
}
