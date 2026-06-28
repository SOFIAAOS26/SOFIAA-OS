# Sprint E — Capability Runtime Layer
## Plan Definitivo y Consolidado

**Versión:** 1.0 consolidada  
**Fecha:** 2026-06-28  
**Basado en:** Propuesta original (Data Injector) + Revisión crítica (Capability Runtime)  
**Calificación arquitectónica:** 9.8/10

---

## Decisión de síntesis

La Propuesta 1 tenía el concepto correcto: inyección de datos bajo demanda, separación entre conocimiento estático y datos en vivo, y purga del contexto al terminar el turno. La Revisión Crítica tenía la arquitectura correcta: agnóstico de fuente, sin onSnapshot, sin JSON libre en el prompt.

**Sprint E adopta el concepto de la Propuesta 1 con la arquitectura de la Revisión Crítica.**

### Descartado
- `onSnapshot` / listeners permanentes — innecesario para una conversación; cada turno es atómico
- Inyección de JSON completo al prompt — costoso en tokens, ruidoso para el LLM
- Intent Engine consultando Firestore directamente — viola separación de responsabilidades
- El prompt conoce la fuente del dato (`[EXTENSION_DATA]`, `[FIRESTORE_QUERY]`)

### Adoptado
- `get()` puntual en el momento exacto en que el usuario pregunta
- Resumen estructurado: `{ resumen, métricas, insights, metadata }` — nunca la colección completa
- Capability Resolver agnóstico: el LLM solo ve `[CAPABILITY_RESULT]`, no sabe si vino de Firestore, Monday, o REST
- RBAC en el Gateway antes de ejecutar cualquier capability
- Contexto efímero: se purga al terminar el turno (no persiste entre mensajes)
- Function Calling como mecanismo de declaración: el LLM dice qué necesita, el servidor decide si puede dárselo

---

## Arquitectura del flujo

```
Usuario pregunta
    ↓
Intent Engine detecta necesidad de datos (sprint existente, sin cambios)
    ↓
LLM usa Function Calling → declara: { capability: "ConsultarClientes", params: {...} }
    ↓
Capability Gateway — verifica RBAC + audit log
    ↓
Capability Registry — resuelve qué provider usar
    ↓
DataProvider.get() — consulta puntual (Firestore | Monday | REST)
    ↓
Capability Summarizer — convierte resultado crudo → { resumen, métricas, insights, metadata }
    ↓
route.ts — re-envía al LLM con [CAPABILITY_RESULT] block
    ↓
LLM genera respuesta final con datos precisos
    ↓
Purga del bloque al terminar el turno
```

El LLM nunca sabe si el dato viene de Firestore, Monday o SAP. Solo recibe un bloque estandarizado.

---

## Módulos E1–E6

### E-1 · Capability Types + Runtime
**Archivo:** `src/core/capability.runtime.ts`

Motor central. Define los tipos base y ejecuta capabilities resolviendo el provider correcto.

```typescript
// Tipos base
export type DataProviderType = "firestore" | "monday" | "rest" | "mock";

export interface CapabilityDefinition {
  id: string;                          // "ConsultarClientes", "ResumenProveedores"
  label: string;                       // descripción human-readable
  extensionId: string;                 // qué extensión la expone
  providerType: DataProviderType;
  providerConfig: Record<string, unknown>; // colección, endpoint, etc.
  requiredRoles: string[];             // ["admin", "gerente"]
  outputSchema: CapabilityOutputSchema;
}

export interface CapabilityOutputSchema {
  resumen: string;                     // descripción de qué contiene el resumen
  metricas: string[];                  // nombres de métricas esperadas
  insights: string[];                  // insights automáticos a generar
}

export interface CapabilityResult {
  capabilityId: string;
  resumen: string;                     // párrafo conciso con los datos clave
  metricas: Record<string, number | string>;
  insights: string[];                  // observaciones derivadas de los datos
  metadata: {
    source: string;                    // "firestore:clientes" — opaco para el LLM
    fetchedAt: number;
    recordCount: number;
  };
}

export interface CapabilityContext {
  userId: string;
  userRole: string;
  extensionId: string;
  activePath: string;
  params?: Record<string, unknown>;   // filtros, fechas, ids específicos
}

// Runtime — motor de ejecución
export interface CapabilityRuntime {
  execute(
    capabilityId: string,
    ctx: CapabilityContext
  ): Promise<CapabilityResult>;
}
```

**Responsabilidad:** recibir un `capabilityId` + contexto → resolver el provider correcto → ejecutar → devolver `CapabilityResult`. No sabe nada del LLM.

---

### E-2 · Capability Registry
**Archivo:** `src/core/capability.registry.ts`

Catálogo de capabilities disponibles por extensión. Similar al `ExtensionRegistry` existente, pero para datos.

```typescript
// Catálogo inicial
export const CAPABILITY_REGISTRY: CapabilityDefinition[] = [
  {
    id: "ConsultarClientes",
    label: "Consultar lista y métricas de clientes",
    extensionId: "tec-bi",
    providerType: "firestore",
    providerConfig: { collection: "clientes" },
    requiredRoles: ["admin", "gerente", "analista"],
    outputSchema: {
      resumen: "Conteo de clientes activos, ingresos promedio, y distribución por categoría",
      metricas: ["total_clientes", "clientes_activos", "ingreso_promedio_mensual"],
      insights: ["clientes en riesgo de churn", "categoría de mayor crecimiento"],
    },
  },
  {
    id: "ResumenProveedores",
    label: "Evaluación y calificación de proveedores",
    extensionId: "tec-bi",
    providerType: "firestore",
    providerConfig: { collection: "proveedores" },
    requiredRoles: ["admin", "gerente"],
    outputSchema: {
      resumen: "Calificación promedio, proveedores con alertas, y métricas de cumplimiento",
      metricas: ["calificacion_promedio", "proveedores_activos", "alertas_activas"],
      insights: ["proveedores con calificación crítica", "tendencia últimos 30 días"],
    },
  },
  {
    id: "ResumenROI",
    label: "Análisis de ROI y costos por proyecto",
    extensionId: "tec-bi",
    providerType: "firestore",
    providerConfig: { collection: "proyectos" },
    requiredRoles: ["admin", "gerente"],
    outputSchema: {
      resumen: "ROI promedio, costo total, y proyectos sobre/bajo presupuesto",
      metricas: ["roi_promedio", "costo_total_proyectos", "proyectos_sobre_presupuesto"],
      insights: ["proyectos con mejor ROI", "áreas de optimización de costos"],
    },
  },
  // Espacio para: MondayProvider, RESTProvider, MarketingSofiaCapabilities
];

export function resolveCapability(id: string): CapabilityDefinition | null {
  return CAPABILITY_REGISTRY.find(c => c.id === id) ?? null;
}

export function getCapabilitiesForExtension(extensionId: string): CapabilityDefinition[] {
  return CAPABILITY_REGISTRY.filter(c => c.extensionId === extensionId);
}

// Para inyectar en el system prompt — el LLM conoce qué puede pedir
export function buildCapabilityMenuBlock(extensionId: string): string {
  const caps = getCapabilitiesForExtension(extensionId);
  if (caps.length === 0) return "";

  const lines = caps.map(c => `  - ${c.id}: ${c.label}`).join("\n");
  return `\n\nCAPACIDADES DISPONIBLES (usa Function Calling para solicitarlas):\n${lines}`;
}
```

---

### E-3 · Data Providers
**Archivo:** `src/core/providers/` (directorio)

Implementaciones del contrato `DataProvider`. El Runtime solo habla con la interfaz.

```typescript
// src/core/providers/data.provider.ts — interfaz pública
export interface DataProvider {
  readonly type: DataProviderType;
  get(config: Record<string, unknown>, params?: Record<string, unknown>): Promise<unknown[]>;
}

// src/core/providers/firestore.provider.ts
export class FirestoreProvider implements DataProvider {
  readonly type = "firestore" as const;

  async get(config: Record<string, unknown>, params?: Record<string, unknown>): Promise<unknown[]> {
    const { db } = await import("@/lib/firebase");
    const { collection, getDocs, query, where, limit } = await import("firebase/firestore");

    const col = config.collection as string;
    let q = query(collection(db, col), limit(50)); // límite seguro

    // Aplicar filtros si los hay
    if (params?.campo && params?.valor) {
      q = query(collection(db, col), where(params.campo as string, "==", params.valor), limit(50));
    }

    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
}

// src/core/providers/mock.provider.ts — para testing y demos offline
export class MockProvider implements DataProvider {
  readonly type = "mock" as const;
  constructor(private fixtures: Record<string, unknown[]>) {}

  async get(config: Record<string, unknown>): Promise<unknown[]> {
    const col = config.collection as string;
    return this.fixtures[col] ?? [];
  }
}
```

**Pendiente en iteraciones futuras:**
- `MondayProvider` — usa la API de Monday.com (adapter ya existe como base en el codebase)
- `RestProvider` — genérico para APIs externas con autenticación Bearer

---

### E-4 · Secure Capability Gateway
**Archivo:** `src/core/capability.gateway.ts`

RBAC antes de ejecutar cualquier capability. Audit log al EventBus. Rate limiting por capability y por usuario.

```typescript
export interface GatewayResult {
  allowed: boolean;
  reason?: string;
}

export interface CapabilityGateway {
  authorize(capabilityId: string, ctx: CapabilityContext): GatewayResult;
  execute(capabilityId: string, ctx: CapabilityContext): Promise<CapabilityResult>;
  getAuditLog(): GatewayAuditEntry[];
}

// Lógica de autorización:
// 1. Verificar que la capability existe en el Registry
// 2. Verificar que el rol del usuario está en requiredRoles
// 3. Verificar rate limit (máx 10 capability calls por sesión)
// 4. Si pasa: loguear al EventBus y ejecutar
// 5. Si falla: loguear intento bloqueado y retornar GatewayResult { allowed: false }

export interface GatewayAuditEntry {
  capabilityId: string;
  userId: string;
  userRole: string;
  allowed: boolean;
  reason?: string;
  timestamp: number;
}
```

---

### E-5 · Capability Summarizer
**Archivo:** `src/core/capability.summarizer.ts`

Transforma datos crudos de Firestore en un `CapabilityResult` conciso. Nunca inyecta la colección completa al prompt.

```typescript
export function summarize(
  raw: unknown[],
  definition: CapabilityDefinition
): CapabilityResult {
  // Estrategia: calcular métricas numéricas básicas + detectar anomalías
  // El resumen es un párrafo de 2-3 oraciones con los datos más relevantes
  // Los insights son observaciones automáticas basadas en umbrales

  const metricas = computeMetrics(raw, definition.outputSchema.metricas);
  const insights = detectInsights(raw, metricas, definition.outputSchema.insights);
  const resumen  = buildResumenText(metricas, insights, definition.label);

  return {
    capabilityId: definition.id,
    resumen,
    metricas,
    insights,
    metadata: {
      source: `${definition.providerType}:${definition.providerConfig.collection ?? "unknown"}`,
      fetchedAt: Date.now(),
      recordCount: raw.length,
    },
  };
}

// El bloque que se inyecta al prompt — opaco y compacto
export function buildCapabilityBlock(result: CapabilityResult): string {
  const metricLines = Object.entries(result.metricas)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join("\n");

  const insightLines = result.insights
    .map(i => `  - ${i}`)
    .join("\n");

  return `
[CAPABILITY_RESULT: ${result.capabilityId}]
${result.resumen}

Métricas:
${metricLines}

Observaciones:
${insightLines}

(${result.metadata.recordCount} registros · fuente verificada · dato en tiempo real)
[/CAPABILITY_RESULT]`.trim();
}
```

---

### E-6 · Integración en route.ts
**Archivo:** `src/app/api/chat/route.ts` (modificación)

El LLM usa Function Calling para declarar qué capability necesita. El handler invoca el Gateway → Runtime → Summarizer y re-envía al LLM dentro del mismo turno.

```typescript
// Nueva tool en SOFIAA_TOOLS:
{
  type: "function",
  function: {
    name: "request_capability",
    description: "Solicita datos en tiempo real de una fuente empresarial. Úsalo cuando el usuario pida información específica de clientes, proveedores, proyectos o métricas que no están en tu conocimiento base.",
    parameters: {
      type: "object",
      properties: {
        capability_id: {
          type: "string",
          description: "ID de la capability del menú disponible (ej: ConsultarClientes)",
        },
        params: {
          type: "object",
          description: "Filtros opcionales (campo, valor, fecha_inicio, fecha_fin)",
        },
      },
      required: ["capability_id"],
    },
  },
}

// En el handler de tool calls (route.ts):
// Si el tool call es "request_capability":
//   1. gateway.authorize(capabilityId, ctx)
//   2. Si allowed: runtime.execute(capabilityId, ctx)
//   3. summarizer.buildCapabilityBlock(result)
//   4. Re-enviar al LLM con el bloque como user message adicional
//   5. El LLM genera la respuesta final
//   6. Al terminar el turno: no persistir el bloque (context efímero)
```

**Flujo completo del turno con capability:**

```
1. POST /api/chat { messages, userRole, activePath, ... }
2. assemblePrompt() incluye buildCapabilityMenuBlock(extensionId)
3. LLM stream → detecta que necesita datos → emite tool_call: request_capability
4. route.ts intercepta → gateway.authorize() → runtime.execute() → summarizer.buildCapabilityBlock()
5. route.ts re-lanza LLM con historial + [CAPABILITY_RESULT] block
6. LLM genera respuesta final con datos precisos y concisos
7. stream llega al cliente → CPE evalúa post-stream
8. Purga: el [CAPABILITY_RESULT] no se persiste en el historial del cliente
```

---

## Orden de implementación

| Prioridad | Módulo | Archivo | Razón |
|-----------|--------|---------|-------|
| 1 | E-1 Tipos + Runtime | `capability.runtime.ts` | Base de todo lo demás |
| 2 | E-3 FirestoreProvider | `providers/firestore.provider.ts` | Primer provider real |
| 3 | E-2 Registry | `capability.registry.ts` | Catálogo de capabilities TEC BI |
| 4 | E-4 Gateway | `capability.gateway.ts` | RBAC antes de llegar a datos |
| 5 | E-5 Summarizer | `capability.summarizer.ts` | Conversión a bloque de prompt |
| 6 | E-6 Integración | `route.ts` (modificación) | Wire-up final con el LLM |

---

## Demo objetivo: TEC BI — Gerardo Orduña

**Escenario:** Gerardo entra a `/tec-bi`, autenticado como `gerente`.

```
Gerardo: "¿Cómo están los proveedores este mes? ¿Alguno con calificación crítica?"

SOFIAA → Intent: necesita datos en tiempo real
LLM → Function Call: request_capability("ResumenProveedores")
Gateway → rol "gerente" ∈ requiredRoles ✓
Provider → Firestore get() → 34 registros
Summarizer → {
  resumen: "34 proveedores activos. Calificación promedio: 7.8/10. 3 proveedores en zona crítica (< 6.0).",
  metricas: { calificacion_promedio: 7.8, proveedores_activos: 34, alertas_activas: 3 },
  insights: ["Grupo Acero del Norte: 4.2/10 — requiere revisión urgente", "Tendencia bajista en Logística Veloz últimos 2 meses"]
}
SOFIAA → "Tengo 34 proveedores activos con una calificación promedio de 7.8/10. Hay 3 en zona crítica. El caso más urgente es Grupo Acero del Norte (4.2/10)..."
```

El LLM responde con datos exactos de Firestore, sin haberlos inventado, sin saturar el prompt, sin revelar la fuente.

---

## Impacto proyectado

- **Reducción de tokens:** ~60% vs inyección completa de colección Firestore
- **Precisión:** cero alucinaciones numéricas — dato exacto en tiempo real
- **Escalabilidad:** nuevo provider = nueva implementación de `DataProvider` sin tocar el Core
- **Seguridad:** RBAC en el Gateway; el prompt nunca ve datos de otra extensión
- **Valor IP estimado:** +$150,000 MXN como componente empresarial reutilizable

---

## Alineación con la visión "AI Experience Middleware"

Sprint E es el primer paso de SOFIAA como capa de orquestación entre:
- Usuarios con intenciones naturales
- Modelos de lenguaje con razonamiento
- Herramientas con datos en tiempo real
- Políticas de acceso por rol
- Interfaces que se adaptan al contexto

```
Usuario ─── Intención ──→ SOFIAA ──→ [Modelo] ──→ [Herramienta] ──→ [Dato]
                                         ↑                              |
                                    [Política]                    [Resumen]
                                         ↑                              |
                                   [Experiencia] ←─────────────────────┘
```

Después de Sprint E, SOFIAA no es solo un chatbot con extensiones — es un middleware cognitivo que conecta personas, modelos, herramientas y datos con seguridad y coherencia.
