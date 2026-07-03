/**
 * SOFIAA Sprint F-1 — LLM Orchestrator
 * Smart Task Classifier + Policy Router
 *
 * Mejoras sobre Sprint D:
 *   - TaskType classifier: 5 tipos de tarea con señales semánticas reales
 *   - Score function ponderada por latencia, costo y capacidad por tarea
 *   - Routing dinámico: cada request elige el modelo óptimo, no solo speed/reasoning
 *   - TaskType exportado para uso en cache TTL (F-2) y Pipeline Observer (F-3)
 */

import type { LLMProvider, LLMRequest, LLMStreamChunk } from "@/core/llm.client";
import { GroqProvider }   from "@/core/providers/groq.provider";
import { GeminiProvider } from "@/core/providers/gemini.provider";

// ── TaskType — Sprint F-1 ─────────────────────────────────────────────────

/**
 * Clasificación semántica del tipo de tarea.
 * Reemplaza el binario speed/reasoning por 5 categorías con routing diferenciado.
 *
 * query      → respuesta directa, factual o corta        → modelo rápido
 * extraction → extraer datos estructurados de un texto   → modelo rápido + preciso
 * analysis   → análisis, comparación, evaluación         → modelo de razonamiento
 * generation → redactar, crear, generar contenido largo  → modelo de razonamiento
 * automation → multi-paso, planificación, workflows      → modelo de razonamiento + contexto amplio
 */
export type TaskType =
  | "query"
  | "extraction"
  | "analysis"
  | "generation"
  | "automation";

// ── Señales semánticas por TaskType ──────────────────────────────────────

const TASK_SIGNALS: Record<TaskType, string[]> = {
  query: [
    "qué es", "quién es", "cuándo", "dónde", "cuánto cuesta", "precio",
    "horario", "contacto", "cómo se llama", "qué significa", "define",
    "what is", "who is", "when", "where", "how much",
  ],
  extraction: [
    "extrae", "lista", "dame los", "enumera", "identifica", "encuentra",
    "busca en", "filtra", "resume en puntos", "cuáles son los",
    "extract", "list", "find", "identify", "enumerate",
  ],
  analysis: [
    "analiza", "compara", "evalúa", "diferencia entre", "pros y contras",
    "ventajas", "desventajas", "por qué", "cómo funciona", "explica",
    "qué tan bueno", "revisar", "auditar", "diagnóstica",
    "analyze", "compare", "evaluate", "why", "how does",
  ],
  generation: [
    "escribe", "redacta", "crea", "genera", "propón", "diseña",
    "draft", "haz un", "elabora", "formula", "construye", "desarrolla",
    "write", "create", "generate", "draft", "compose", "build",
    "reporte", "documento", "correo", "propuesta", "copy", "script",
  ],
  automation: [
    "implementa", "paso a paso", "plan", "estrategia", "workflow",
    "automatiza", "configura", "despliega", "integra", "conecta",
    "multi-paso", "proceso", "flujo", "pipeline",
    "implement", "step by step", "plan", "strategy", "automate",
  ],
};

// ── Clasificador de tarea ─────────────────────────────────────────────────

interface TaskClassification {
  type: TaskType;
  confidence: number; // 0–1
  scores: Record<TaskType, number>;
}

/**
 * Clasifica el mensaje en uno de los 5 TaskTypes usando matching semántico.
 * Devuelve el tipo dominante con su score de confianza.
 */
export function classifyTask(userMessage: string): TaskClassification {
  const lc = userMessage.toLowerCase();
  const msgLen = userMessage.length;

  // Score base por señales semánticas
  const scores: Record<TaskType, number> = {
    query:      0,
    extraction: 0,
    analysis:   0,
    generation: 0,
    automation: 0,
  };

  for (const [type, signals] of Object.entries(TASK_SIGNALS) as [TaskType, string[]][]) {
    for (const signal of signals) {
      if (lc.includes(signal)) {
        scores[type] += 1;
      }
    }
  }

  // Ajustes por longitud del mensaje
  if (msgLen > 300) {
    // Mensajes largos → más probable que sean analysis o generation
    scores.analysis   += 1.5;
    scores.generation += 1;
  } else if (msgLen < 60) {
    // Mensajes cortos → más probable que sean query o extraction
    scores.query      += 1.5;
    scores.extraction += 0.5;
  }

  // Si no hay señales claras → default a query (respuesta directa)
  const totalSignals = Object.values(scores).reduce((a, b) => a + b, 0);
  if (totalSignals === 0) {
    scores.query = 1;
  }

  // Encontrar el tipo dominante
  const dominant = (Object.keys(scores) as TaskType[]).reduce((a, b) =>
    scores[a] >= scores[b] ? a : b
  );

  const maxScore = scores[dominant];
  const confidence = Math.min(maxScore / (totalSignals || 1), 1);

  return { type: dominant, confidence, scores };
}

// ── Provider Profile — capacidades declaradas ─────────────────────────────

interface ProviderProfile {
  provider: LLMProvider;
  /** Qué tan bueno es en cada TaskType (0–1) */
  capabilities: Record<TaskType, number>;
  /** Latencia relativa (menor = más rápido): 0.1–1.0 */
  latencyScore: number;
  /** Eficiencia de costo (mayor = más barato): 0.1–1.0 */
  costScore: number;
}

/**
 * Perfiles declarados de los providers disponibles.
 * Groq → ultra-rápido, ideal para query/extraction.
 * Gemini → razonamiento profundo, ideal para analysis/generation/automation.
 */
const PROVIDER_PROFILES: ProviderProfile[] = [
  {
    provider: new GroqProvider(),
    capabilities: {
      query:      0.95,
      extraction: 0.90,
      analysis:   0.70,
      generation: 0.75,
      automation: 0.65,
    },
    latencyScore: 0.95,  // Groq es ultra-rápido (inference en chip dedicado)
    costScore:    0.90,  // Muy barato por token
  },
  {
    provider: new GeminiProvider(),
    capabilities: {
      query:      0.80,
      extraction: 0.85,
      analysis:   0.95,
      generation: 0.92,
      automation: 0.95,
    },
    latencyScore: 0.60,  // Más lento que Groq
    costScore:    0.75,  // Precio intermedio
  },
];

// ── Pesos de scoring por TaskType ─────────────────────────────────────────

/**
 * Cada TaskType tiene pesos diferentes para latencia, costo y capacidad.
 * Un query no necesita el mejor modelo — necesita el más rápido.
 * Un análisis complejo necesita capacidad aunque sea más caro.
 */
const TASK_WEIGHTS: Record<TaskType, { capability: number; latency: number; cost: number }> = {
  query:      { capability: 0.30, latency: 0.50, cost: 0.20 },
  extraction: { capability: 0.45, latency: 0.40, cost: 0.15 },
  analysis:   { capability: 0.65, latency: 0.20, cost: 0.15 },
  generation: { capability: 0.55, latency: 0.30, cost: 0.15 },
  automation: { capability: 0.70, latency: 0.15, cost: 0.15 },
};

/**
 * Calcula el score final de un provider para un TaskType dado.
 * Score más alto → mejor opción para esa tarea.
 */
function scoreProvider(profile: ProviderProfile, task: TaskType): number {
  const weights = TASK_WEIGHTS[task];
  return (
    profile.capabilities[task] * weights.capability +
    profile.latencyScore       * weights.latency    +
    profile.costScore          * weights.cost
  );
}

// ── Orchestrator principal ────────────────────────────────────────────────

export class LLMOrchestrator {
  /**
   * Clasifica la tarea, selecciona el provider óptimo por scoring,
   * y ejecuta con fallback automático al siguiente si falla.
   *
   * @param req       - El request LLM normalizado
   * @param taskHint  - Forzar un TaskType (opcional)
   */
  async complete(
    req: LLMRequest,
    taskHint?: TaskType
  ): Promise<{
    stream: ReadableStream<LLMStreamChunk>;
    provider: string;
    taskType: TaskType;
    confidence: number;
  }> {
    const userMessage = req.messages.findLast(m => m.role === "user")?.content ?? "";

    // Clasificar la tarea
    const classification = taskHint
      ? { type: taskHint, confidence: 1.0, scores: {} as Record<TaskType, number> }
      : classifyTask(userMessage);

    const task = classification.type;

    // Ordenar providers por score para esta tarea (mayor score = primero)
    const ranked = PROVIDER_PROFILES
      .map(profile => ({ profile, score: scoreProvider(profile, task) }))
      .sort((a, b) => b.score - a.score);

    console.info(
      `[SOFIAA][F-1] task=${task} confidence=${classification.confidence.toFixed(2)} ` +
      `| ranking: ${ranked.map(r => `${r.profile.provider.name}(${r.score.toFixed(2)})`).join(" > ")}`
    );

    let lastError: Error | null = null;

    for (const { profile } of ranked) {
      const available = await profile.provider.isAvailable();
      if (!available) {
        console.info(`[SOFIAA][F-1] ${profile.provider.name} no disponible — siguiente`);
        continue;
      }

      try {
        console.info(`[SOFIAA][F-1] ejecutando con ${profile.provider.name}`);
        const stream = await profile.provider.complete(req);
        return {
          stream,
          provider: profile.provider.name,
          taskType: task,
          confidence: classification.confidence,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[SOFIAA][F-1] ${profile.provider.name} falló: ${lastError.message} — siguiente`);
      }
    }

    console.error("[SOFIAA][F-1] todos los providers fallaron:", lastError?.message);
    return {
      stream:     this.errorStream(lastError),
      provider:   "none",
      taskType:   task,
      confidence: classification.confidence,
    };
  }

  /** Estado actual de los providers (admin / telemetría) */
  async status(): Promise<Array<{
    name: string;
    available: boolean;
    capabilities: Record<TaskType, number>;
    latencyScore: number;
    costScore: number;
  }>> {
    return Promise.all(
      PROVIDER_PROFILES.map(async ({ provider, capabilities, latencyScore, costScore }) => ({
        name:         provider.name,
        available:    await provider.isAvailable(),
        capabilities,
        latencyScore,
        costScore,
      }))
    );
  }

  private errorStream(err: Error | null): ReadableStream<LLMStreamChunk> {
    const isRateLimit = err?.message?.includes("RATE_LIMITED");
    const message = isRateLimit
      ? "El sistema está experimentando alta demanda en este momento. Por favor intenta en unos segundos — estoy en proceso de recuperación automática."
      : "Hubo un problema conectando con el motor de inteligencia. Por favor intenta de nuevo.";

    return new ReadableStream<LLMStreamChunk>({
      start(controller) {
        controller.enqueue({ content: message });
        controller.close();
      },
    });
  }
}

// ── Singleton exportado ───────────────────────────────────────────────────

export const orchestrator = new LLMOrchestrator();
