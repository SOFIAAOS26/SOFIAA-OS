/**
 * SOFIAA Sprint E — Capability Runtime
 *
 * Motor central del Capability Layer.
 * Define los tipos base y el contrato de ejecución.
 *
 * Principio: el LLM nunca sabe si el dato viene de Firestore, Monday, REST o Mock.
 * Solo recibe un [CAPABILITY_RESULT] estandarizado.
 */

// ── Tipos base ─────────────────────────────────────────────────────────────

export type DataProviderType = "firestore" | "monday" | "rest" | "mock";

export interface CapabilityOutputSchema {
  /** Descripción de qué contiene el resumen */
  resumen: string;
  /** Nombres de métricas esperadas */
  metricas: string[];
  /** Insights automáticos a detectar */
  insights: string[];
}

export interface CapabilityDefinition {
  /** Identificador único — el LLM lo usa en Function Calling */
  id: string;
  /** Descripción legible para el system prompt */
  label: string;
  /** Extensión que expone esta capability */
  extensionId: string;
  /** Qué tipo de provider usa */
  providerType: DataProviderType;
  /** Configuración específica del provider (colección, endpoint, etc.) */
  providerConfig: Record<string, unknown>;
  /** Roles que pueden ejecutar esta capability */
  requiredRoles: string[];
  /** Schema de output esperado — guía al Summarizer */
  outputSchema: CapabilityOutputSchema;
}

export interface CapabilityContext {
  userId: string;
  userRole: string;
  extensionId: string;
  activePath: string;
  /** Filtros opcionales declarados por el LLM */
  params?: Record<string, unknown>;
}

export interface CapabilityResult {
  capabilityId: string;
  /** Párrafo conciso con los datos más relevantes (2-3 oraciones) */
  resumen: string;
  /** Métricas numéricas o textuales clave */
  metricas: Record<string, number | string>;
  /** Observaciones derivadas automáticamente */
  insights: string[];
  metadata: {
    /** Opaco para el LLM — solo para audit */
    source: string;
    fetchedAt: number;
    recordCount: number;
  };
}

// ── DataProvider interface ─────────────────────────────────────────────────

/**
 * Contrato que debe implementar cualquier fuente de datos.
 * El Runtime habla solo con esta interfaz — nunca con Firestore directamente.
 */
export interface DataProvider {
  readonly type: DataProviderType;
  get(
    config:  Record<string, unknown>,
    params?: Record<string, unknown>
  ): Promise<unknown[]>;
}

// ── CapabilityRuntime ─────────────────────────────────────────────────────

/**
 * Motor de ejecución de capabilities.
 * Recibe un capabilityId + contexto → resuelve el provider → ejecuta → devuelve resultado.
 */
export class CapabilityRuntime {
  private providers = new Map<DataProviderType, DataProvider>();

  registerProvider(provider: DataProvider): this {
    this.providers.set(provider.type, provider);
    return this;
  }

  getProvider(type: DataProviderType): DataProvider | null {
    return this.providers.get(type) ?? null;
  }

  async fetchRaw(
    definition: CapabilityDefinition,
    ctx:        CapabilityContext
  ): Promise<unknown[]> {
    const provider = this.getProvider(definition.providerType);
    if (!provider) {
      throw new Error(`[CapabilityRuntime] No hay provider registrado para "${definition.providerType}"`);
    }
    // Permitir que params.collection sobreescriba la colección base
    // Esto habilita BuscarRegistro y queries cross-collection para admin
    const config = ctx.params?.collection
      ? { ...definition.providerConfig, collection: ctx.params.collection }
      : definition.providerConfig;
    return provider.get(config, ctx.params);
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────

export const capabilityRuntime = new CapabilityRuntime();
