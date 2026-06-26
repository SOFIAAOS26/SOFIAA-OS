/**
 * SOFIAA Platform — Contrato formal del SDK
 *
 * Este archivo es el contrato que hace al Core completamente agnóstico.
 * El Kernel solo entiende SofiaaExtension — nunca conoce a TEC BI, JP Memorial
 * ni ninguna extensión concreta. Si el contrato se cumple, funciona.
 *
 * Filosofía: Core aburrido y predecible. Extensiones interesantes y salvajes.
 */

// ── Tipos base ────────────────────────────────────────────────────────────────

/** Capacidades declaradas por la extensión */
export type CapabilityType =
  | "conversation"  // Chat estándar con contexto
  | "rag"           // Retrieval-Augmented Generation (documentos, embeddings)
  | "bi"            // Business Intelligence (dashboards, reportes, métricas)
  | "voice"         // Interacción por voz
  | "actions";      // Agente ejecutor (webhooks, APIs externas, CRUD)

/** Versión semántica — garantiza rollback sin deploy */
export type ExtensionVersion = `${number}.${number}.${number}`;

// ── Manifiesto ────────────────────────────────────────────────────────────────

/**
 * El manifiesto es el contrato mínimo que el Registry lee para saber
 * si puede servir una extensión. Se persiste como sofiaa.manifest.json.
 */
export interface ExtensionManifest {
  /** Identificador único de la extensión — nunca cambia entre versiones */
  id: string;
  /** Nombre legible para humanos */
  name: string;
  /** Versión semántica — permite coexistencia de versiones en paralelo */
  version: ExtensionVersion;
  /** Descripción breve para el panel de admin */
  description: string;
  /** Prefijo de ruta que activa esta extensión. ej: "/tec-bi" */
  routePrefix: string;
  /** Capacidades declaradas — el Core solo activa lo que aquí está */
  capabilities: CapabilityType[];
  /** Seguridad declarada en el manifiesto — validada en Edge Middleware */
  security: {
    /** Roles que tienen acceso. Vacío = acceso público */
    allowedRoles: string[];
    /** Límites de rate por extensión */
    rateLimits: {
      maxRequests: number;
      windowMs: number;
    };
  };
}

// ── Módulo de Prompt ──────────────────────────────────────────────────────────

/**
 * El bloque de contexto que se inyecta al sistema de prompt modular.
 * Debe ser mínimo y preciso — entre 50 y 120 tokens.
 */
export interface ExtensionPromptModule {
  /** Identidad y rutas de la extensión (~60-80 tokens) */
  identity: string;
  /** Reglas de negocio duras — límites, restricciones, políticas */
  policies: string[];
}

// ── Tool Calling ──────────────────────────────────────────────────────────────

/**
 * Definición de una herramienta ejecutable por SOFIAA.
 * El LLM decide cuándo llamarla — la extensión define qué hace.
 */
export interface ExtensionTool {
  name: string;
  description: string;
  /** Esquema JSON Schema de los parámetros que espera la herramienta */
  parameters: Record<string, unknown>;
}

export interface ExtensionToolRegistry {
  tools: ExtensionTool[];
  /** Función que ejecuta la herramienta cuando el LLM la invoca */
  handler: (
    toolName: string,
    args: Record<string, unknown>,
    context: ExtensionContext
  ) => Promise<unknown>;
}

// ── Contexto de ejecución ─────────────────────────────────────────────────────

/** Contexto que el Core pasa a los hooks y handlers de la extensión */
export interface ExtensionContext {
  traceId: string;
  extensionId: string;
  userId?: string;
  userRole?: string;
  activePath: string;
  userMessage: string;
  timestamp: number;
}

// ── Lifecycle Hooks ───────────────────────────────────────────────────────────

/**
 * Ganchos opcionales del ciclo de vida.
 * El Core los ejecuta en momentos específicos — la extensión decide qué hacer.
 * Todos son asíncronos y se disparan con waitUntil() — nunca bloquean el stream.
 */
export interface ExtensionHooks {
  /** Se dispara cuando el request es aceptado y el contexto está listo */
  onInitialize?: (context: ExtensionContext) => Promise<void>;
  /** Se dispara cuando el Goal Engine detecta un objetivo en el mensaje */
  onGoalDetected?: (goal: string, context: ExtensionContext) => Promise<void>;
  /** Se dispara cuando el stream SSE termina completamente */
  onStreamFinished?: (fullResponse: string, context: ExtensionContext) => Promise<void>;
}

// ── Contrato principal ────────────────────────────────────────────────────────

/**
 * SofiaaExtension — el contrato completo que toda extensión debe implementar.
 *
 * El Core solo conoce este tipo. Nunca importa código específico de extensiones.
 * Si el manifiesto está deshabilitado, el Core sigue intacto.
 */
export interface SofiaaExtension {
  manifest: ExtensionManifest;
  promptModule: ExtensionPromptModule;
  tools?: ExtensionToolRegistry;
  hooks?: ExtensionHooks;
}

// ── Resultado del Registry ────────────────────────────────────────────────────

/**
 * Lo que el Core recibe al resolver una ruta.
 * Si no hay extensión activa para esa ruta → null.
 */
export type ResolvedExtension = {
  extension: SofiaaExtension;
  promptText: string;  // identity + policies ya ensamblados como string
} | null;
