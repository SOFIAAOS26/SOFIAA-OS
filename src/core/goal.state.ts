/**
 * SOFIAA Sprint D-A — Goal State Machine
 *
 * Transforma el GoalEngine de detección puntual a motor de estados persistente.
 * Un goal ya no muere al terminar el stream — vive hasta que se completa o cancela.
 *
 * Flujo:
 *   idle → active (usuario declara intención)
 *        → step avanza con cada intercambio
 *        → completed cuando todos los pasos se resuelven
 *        → failed / cancelled si el usuario cambia de tema o cancela
 */

import type { GoalType } from "@/core/intent.map";

// ── Tipos base ────────────────────────────────────────────────────────────

export type GoalStatus = "idle" | "active" | "paused" | "completed" | "failed" | "cancelled";

export interface GoalStep {
  /** Identificador semántico del paso */
  id: string;
  /** Instrucción para el LLM en este paso específico */
  instruction: string;
  /** Qué se espera recopilar en este paso */
  expects: string;
  /** true si el paso ya fue resuelto */
  resolved: boolean;
  /** Datos recopilados en este paso */
  data?: Record<string, unknown>;
}

export interface GoalState {
  /** ID único de la instancia del goal */
  id: string;
  /** Tipo de goal (viene del GoalEngine existente) */
  type: GoalType | string;
  /** Pasos del goal en orden */
  steps: GoalStep[];
  /** Índice del paso actual */
  currentStep: number;
  /** Estado del goal */
  status: GoalStatus;
  /** Contexto acumulado entre pasos (datos, decisiones previas) */
  context: Record<string, unknown>;
  /** Timestamp de creación */
  createdAt: number;
  /** Timestamp de última actualización */
  updatedAt: number;
  /** Extensión activa cuando se creó el goal */
  activeExtension?: string;
}

// ── Templates de goals multi-step ────────────────────────────────────────
// Define qué pasos tiene cada tipo de objetivo que requiere más de 1 turno

export const GOAL_TEMPLATES: Partial<Record<string, GoalStep[]>> = {

  // TEC BI — crear un brief de producción
  "crear_brief": [
    {
      id: "brief_info",
      instruction: "Recopila el nombre del proyecto, cliente y tipo de producción que necesita el usuario.",
      expects: "nombre, cliente, tipo",
      resolved: false,
    },
    {
      id: "brief_alcance",
      instruction: "Pregunta por el alcance: fechas clave, locaciones, número de personas involucradas.",
      expects: "fechas, locaciones, equipo",
      resolved: false,
    },
    {
      id: "brief_presupuesto",
      instruction: "Solicita el presupuesto estimado o rango aceptable para el proyecto.",
      expects: "presupuesto",
      resolved: false,
    },
    {
      id: "brief_confirmacion",
      instruction: "Resume todo lo recopilado y pide confirmación antes de guardar el brief en TEC BI.",
      expects: "confirmacion",
      resolved: false,
    },
  ],

  // JP Memorial — agendar una cita de atención
  "agendar_cita": [
    {
      id: "cita_servicio",
      instruction: "Pregunta qué tipo de servicio necesita el usuario (funerario, velación, traslado, etc.).",
      expects: "tipo_servicio",
      resolved: false,
    },
    {
      id: "cita_datos",
      instruction: "Solicita nombre del familiar, fecha tentativa y número de contacto.",
      expects: "nombre, fecha, contacto",
      resolved: false,
    },
    {
      id: "cita_confirmacion",
      instruction: "Confirma los datos y explica que un asesor de Jardines de Juan Pablo se comunicará a la brevedad.",
      expects: "confirmacion",
      resolved: false,
    },
  ],

  // Marketing Sofia — crear propuesta para cliente
  "crear_propuesta": [
    {
      id: "propuesta_cliente",
      instruction: "Pregunta el nombre del cliente y la industria o giro de su negocio.",
      expects: "cliente, industria",
      resolved: false,
    },
    {
      id: "propuesta_objetivo",
      instruction: "Pregunta cuál es el objetivo principal: awareness, ventas, engagement, o lanzamiento.",
      expects: "objetivo",
      resolved: false,
    },
    {
      id: "propuesta_presupuesto",
      instruction: "Solicita el presupuesto mensual disponible para la estrategia.",
      expects: "presupuesto",
      resolved: false,
    },
    {
      id: "propuesta_generacion",
      instruction: "Genera la propuesta completa con los datos recopilados y ofrece guardarla en Marketing Sofia.",
      expects: "aprobacion",
      resolved: false,
    },
  ],

  // Contratar — flujo de contacto/cotización
  "contratar": [
    {
      id: "contratar_tipo",
      instruction: "Pregunta qué tipo de producción o servicio necesita: video, fotografía, estrategia, IA, etc.",
      expects: "tipo_servicio",
      resolved: false,
    },
    {
      id: "contratar_contexto",
      instruction: "Solicita el contexto del proyecto: empresa, objetivo y fecha límite.",
      expects: "empresa, objetivo, fecha",
      resolved: false,
    },
    {
      id: "contratar_contacto",
      instruction: "Pide el correo o número de WhatsApp para que Abrahan pueda enviar la cotización.",
      expects: "contacto",
      resolved: false,
    },
  ],
};

// ── Detección de goals multi-step ─────────────────────────────────────────

/** Keywords que disparan un goal multi-step */
const MULTI_STEP_TRIGGERS: Record<string, RegExp[]> = {
  crear_brief:    [/crear (un |el )?brief/i, /nuevo brief/i, /brief de producción/i],
  agendar_cita:  [/agendar (una |mi )?cita/i, /quiero una cita/i, /hablar con (un |el )?asesor/i],
  crear_propuesta:[/crear (una |la )?propuesta/i, /propuesta para/i, /nueva propuesta/i],
  contratar:     [/quiero contratar/i, /necesito (un|una) producción/i, /cuánto cuesta/i, /cotización/i],
};

/**
 * Detecta si el mensaje del usuario debería iniciar un goal multi-step.
 * Devuelve el templateId si hay match, null si no.
 */
export function detectMultiStepGoal(userMessage: string): string | null {
  for (const [templateId, patterns] of Object.entries(MULTI_STEP_TRIGGERS)) {
    if (patterns.some(p => p.test(userMessage))) return templateId;
  }
  return null;
}

// ── Factory de GoalState ──────────────────────────────────────────────────

export function createGoalState(
  templateId: string,
  activeExtension?: string
): GoalState | null {
  const template = GOAL_TEMPLATES[templateId];
  if (!template) return null;

  return {
    id:             `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type:           templateId,
    steps:          template.map(s => ({ ...s })), // copia para no mutar el template
    currentStep:    0,
    status:         "active",
    context:        {},
    createdAt:      Date.now(),
    updatedAt:      Date.now(),
    activeExtension,
  };
}

// ── Transitions ───────────────────────────────────────────────────────────

export function advanceGoal(goal: GoalState, stepData?: Record<string, unknown>): GoalState {
  const updated = { ...goal, steps: goal.steps.map(s => ({ ...s })), updatedAt: Date.now() };

  // Marcar el paso actual como resuelto
  if (updated.steps[updated.currentStep]) {
    updated.steps[updated.currentStep].resolved = true;
    if (stepData) {
      updated.steps[updated.currentStep].data = stepData;
      updated.context = { ...updated.context, ...stepData };
    }
  }

  // Avanzar al siguiente paso
  const nextStep = updated.currentStep + 1;
  if (nextStep >= updated.steps.length) {
    updated.status = "completed";
  } else {
    updated.currentStep = nextStep;
  }

  return updated;
}

export function cancelGoal(goal: GoalState): GoalState {
  return { ...goal, status: "cancelled", updatedAt: Date.now() };
}

export function pauseGoal(goal: GoalState): GoalState {
  return { ...goal, status: "paused", updatedAt: Date.now() };
}

// ── Serialización para el system prompt ──────────────────────────────────

/**
 * Genera el bloque de contexto del goal activo para inyectar en el system prompt.
 * El LLM sabe exactamente en qué paso está y qué necesita recopilar.
 */
export function buildGoalPromptBlock(goal: GoalState): string {
  if (goal.status !== "active") return "";

  const currentStep = goal.steps[goal.currentStep];
  if (!currentStep) return "";

  const totalSteps  = goal.steps.length;
  const stepNum     = goal.currentStep + 1;
  const contextStr  = Object.keys(goal.context).length > 0
    ? `Datos recopilados: ${JSON.stringify(goal.context)}`
    : "Sin datos recopilados aún.";

  return `
OBJETIVO ACTIVO (${goal.type}) — Paso ${stepNum} de ${totalSteps}:
${currentStep.instruction}
Se espera recopilar: ${currentStep.expects}
${contextStr}
IMPORTANTE: No saltes al siguiente paso hasta tener la información de este. Cuando completes este paso, resume brevemente lo que recopilaste.
`.trim();
}
