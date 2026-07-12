/**
 * TEC Bii — Cognitive Schema (RUMBO A TIER 4)
 *
 * Evolución de TEC BI v1. Cada entidad es un ciudadano del
 * Experience Graph: tiene embedding, importancia dinámica,
 * hipótesis cruzadas y nodos NEXO vinculados.
 *
 * Colección Firestore: users/{uid}/tec_bii/{module}/{docId}
 * Versión: 2.0.0
 */

// ── Núcleo cognitivo ──────────────────────────────────────────────────────────

/**
 * Huella cognitiva que todo documento de TEC Bii lleva.
 * Permite al Experience Graph razonar sobre estas entidades.
 */
export interface CognitiveFootprint {
  /** ID del nodo en el grafo NEXO (users/{uid}/nexo_nodes/{id}) */
  nexoNodeId?: string;
  /** Importancia calculada heurísticamente — 0.0 a 1.0 */
  importance: number;
  /** Nivel de riesgo detectado por SOFIAA */
  riskLevel?: RiskLevel;
  /** Score de riesgo numérico 0.0-1.0 */
  riskScore?: number;
  /** Tags semánticos auto-generados */
  tags: string[];
  /** Resumen en lenguaje natural generado por Gemini Flash */
  aiSummary?: string;
  /** IDs de nodos NEXO capturados relacionados por embedding */
  linkedNexoNodes: string[];
  /** Hipótesis generadas por razonamiento cruzado */
  hypotheses: Hypothesis[];
  /** Timestamp del último sync con el grafo cognitivo */
  lastCognitiveSync: number;
}

export type RiskLevel = "bajo" | "medio" | "alto" | "crítico";

/**
 * Inferencia generada por SOFIAA al cruzar dominios.
 * Ejemplo: NEXO captura "Sony FX3" + TEC Bii tiene "Proyecto Sony"
 * → Hypothesis: "Probablemente preparando una producción audiovisual con Sony"
 */
export interface Hypothesis {
  id: string;
  text: string;
  confidence: number;          // 0.0-1.0
  sources: string[];           // IDs de nodos/entidades que generaron la inferencia
  generatedAt: number;
  validatedAt?: number;        // timestamp si el usuario la confirmó
  validated?: boolean;
  dismissed?: boolean;
}

// Footprint vacío para entidades nuevas
export const EMPTY_FOOTPRINT: CognitiveFootprint = {
  importance:       0.5,
  tags:             [],
  linkedNexoNodes:  [],
  hypotheses:       [],
  lastCognitiveSync: 0,
};

// ── Tipos compartidos ─────────────────────────────────────────────────────────

export type TipoServicio =
  | "Animación 3D"
  | "Edición y Post-producción"
  | "Motion Graphics"
  | "Fotografía"
  | "Producción de Audio"
  | "Diseño Gráfico"
  | "Transmisión en Vivo"
  | "Renta de Equipo"
  | "Otro";

export type TipoCampus    = "Nacional" | "Campus" | "Ambos";
export type TipoAlcance   = "Nacional" | "Campus";
export type TipoAsignacion = "Interno" | "Externo";

export type EstadoProyecto =
  | "Pendiente"
  | "En producción"
  | "En revisión"
  | "Entregado"
  | "Cancelado";

export type EstadoBrief =
  | "Recibido"
  | "En revisión"
  | "Aprobado"
  | "En producción"
  | "Entregado"
  | "Cancelado";

export type TipoProyecto =
  | "Spot Publicitario"
  | "Cápsula Educativa"
  | "Diseño Gráfico"
  | "Evento en Vivo"
  | "Fotografía"
  | "Motion Graphics"
  | "Podcast / Audio"
  | "Reel / Short"
  | "Otro";

export type TipoEvaluacion    = "Interno" | "Externo";
export type CumplimientoTiempo = "A tiempo" | "Tarde" | "Temprano";

// ── Entidades con huella cognitiva ────────────────────────────────────────────

export interface EmpleadoV2 extends CognitiveFootprint {
  id?: string;
  nombre:          string;
  puesto:          string;
  departamento:    string;
  tarifaHora:      number;       // MXN/hora normal
  salarioMensual:  number;       // MXN bruto
  activo:          boolean;
  createdAt:       number;       // ms timestamp (en v2 usamos number, no Date)
  updatedAt:       number;

  // Métricas acumuladas (computed)
  proyectosTotales?:  number;
  horasHombreTotal?:  number;
  calidadPromedio?:   number;    // 1.0-5.0
  cargaActual?:       number;    // 0.0-1.0 (horas activas / capacidad)

  // Cognitivo v2
  skillProfile?:   SkillProfile; // generado por SOFIAA desde historial
  momentum?:       number;       // actividad reciente 0.0-1.0

  // Predictivo — calculado automáticamente al guardar evaluaciones
  cumplimientoRate?:    number;  // 0.0-1.0 — % de proyectos entregados a tiempo o antes
  totalEvaluaciones?:   number;  // número de evaluaciones recibidas
  tendenciaCalidad?:    "mejorando" | "estable" | "bajando";
  alertaRiesgo?:        boolean; // true si calidadPromedio < 3.0 o cumplimientoRate < 0.6
  ultimaEvaluacionAt?:  number;  // timestamp de la última evaluación recibida
}

/** Perfil de habilidades generado automáticamente desde evaluaciones históricas */
export interface SkillProfile {
  topSkills:        string[];    // ["Edición", "Color grading", "Motion"]
  strengths:        string[];    // frases en lenguaje natural
  growthAreas?:     string[];
  lastAnalyzedAt:   number;
}

export interface ProveedorV2 extends CognitiveFootprint {
  id?: string;
  nombre:        string;
  tipoServicio:  TipoServicio;
  email:         string;
  telefono:      string;
  activo:        boolean;
  createdAt:     number;
  updatedAt:     number;

  // Métricas acumuladas
  proyectosTotales?:     number;
  costoPromedio?:        number;
  rentabilidadPromedio?: number;
  calidadPromedio?:      number;

  // Cognitivo v2
  reliabilityScore?:     number;   // 0.0-1.0 confiabilidad histórica
  costPrediction?:       CostPrediction;

  // Predictivo — calculado automáticamente al guardar evaluaciones
  cumplimientoRate?:    number;  // 0.0-1.0 — % de proyectos entregados a tiempo o antes
  totalEvaluaciones?:   number;
  tendenciaCalidad?:    "mejorando" | "estable" | "bajando";
  alertaRiesgo?:        boolean; // true si calidadPromedio < 3.0 o cumplimientoRate < 0.6
  ultimaEvaluacionAt?:  number;
  variacionCosto?:      number;  // % promedio de variación cotizado vs final (+ = exceso)
}

export interface CostPrediction {
  minMXN:      number;
  maxMXN:      number;
  confidence:  number;           // 0.0-1.0
  basedOn:     number;           // número de proyectos analizados
}

export interface ClienteInternoV2 extends CognitiveFootprint {
  id?: string;
  departamento:         string;
  campusONacional:      TipoCampus;
  nombreResponsable:    string;
  emailResponsable:     string;
  activo:               boolean;
  createdAt:            number;
  updatedAt:            number;

  briefsTotales?:          number;
  proyectosCompletados?:   number;
  satisfaccionPromedio?:   number;   // calculado de feedbacks
}

export interface BriefAssets {
  logoVectorial:       boolean;
  guionTexto:          boolean;
  fotosRef:            boolean;
  locacionConfirmada:  boolean;
  talentConfirmado:    boolean;
  editableFile:        boolean;
}

export interface BriefV2 extends CognitiveFootprint {
  id?: string;
  clienteId:     string;
  tipoProyecto:  TipoProyecto;
  titulo:        string;
  descripcion:   string;
  entregables:   string[];
  requisitosTecnicos: string;
  referencias:   string;
  fechaSolicitud: number;
  fechaLimite:    number;
  estado:         EstadoBrief;
  createdAt:      number;
  updatedAt:      number;

  // Brief Canvas
  objetivo?:            string;
  audiencia?:           string;
  plataforma?:          string;
  duracionSeg?:         number;
  contactoSolicitante?: string;
  emailSolicitante?:    string;
  assets?:              BriefAssets;
  briefScore?:          number;        // 0-100
  mondayItemId?:        string;

  // Cognitivo v2
  aiGeneratedFrom?:  string;           // "conversación" si fue generado por SOFIAA
  urgencyScore?:     number;           // 0.0-1.0 calculado por deadline
  suggestedTags?:    string[];         // sugeridos por Gemini al crear
}

export interface ProyectoV2 extends CognitiveFootprint {
  id?: string;
  briefId:         string;
  titulo:          string;
  tipoAlcance:     TipoAlcance;
  tipoAsignacion:  TipoAsignacion;
  asignadoId:      string;
  estado:          EstadoProyecto;
  valorEstimado:   number;
  linkEntregables: string;
  notas:           string;
  createdAt:       number;
  updatedAt:       number;
  mondayItemId?:   string;

  // Cognitivo v2 — el diferenciador real
  urgencyScore:    number;         // 0.0-1.0 urgencia dinámica
  momentum:        number;         // 0.0-1.0 actividad reciente
  deadlineDays?:   number;         // días restantes hasta fechaLimite del brief
  assigneeLoad?:   number;         // 0.0-1.0 carga actual del asignado
  valueScore?:     number;         // importancia estratégica 0.0-1.0

  // Predictivo — propagado desde el historial del asignado
  assigneeRisk?:         boolean;  // true si el asignado tiene alertaRiesgo
  assigneeCalidad?:      number;   // calidadPromedio histórico del asignado
  assigneeCumplimiento?: number;   // cumplimientoRate histórico del asignado
}

// ── Evaluaciones (sin cambios estructurales, añade footprint) ─────────────────

export interface MetricasCualitativas {
  calidadGeneral:      number;     // 1-5
  creatividad:         number;
  ejecucionTecnica:    number;
  alineacionBrief:     number;
}

export interface EvaluacionInterna {
  horasNormales: number;
  horasExtra:    number;
  costoTotal?:   number;
}

export interface EvaluacionExterna {
  costoCotizado:               number;
  costoFinal:                  number;
  horasEsfuerzoEstimadas:      number;
  calificacionComunicacion:    number;
  calificacionCalidadPrecio:   number;
}

export interface EvaluacionV2 extends CognitiveFootprint {
  id?: string;
  proyectoId:        string;
  tipo:              TipoEvaluacion;
  datosInternos?:    EvaluacionInterna;
  datosExternos?:    EvaluacionExterna;
  metricas:          MetricasCualitativas;
  valorProyecto:     number;
  unidadesProducidas: number;
  cumplimientoTiempo: CumplimientoTiempo;
  numeroDVersiones:  number;
  feedback:          string;
  fecha:             number;
  createdAt:         number;
}

// ── Knowledge Node (entidad publicada al grafo compartido) ────────────────────

/**
 * Representación de una entidad TEC Bii en el Experience Graph.
 * Formato compatible con NexoNode para el motor semántico.
 */
export interface TecBiiKnowledgeNode {
  id:          string;           // "tec-bii:{type}:{entityId}"
  title:       string;
  summary:     string;           // generado por Gemini Flash
  embedding?:  number[];         // 3072 dims (gemini-embedding-001)
  weight:      number;           // importance del entity
  category:    "trabajo";        // siempre trabajo para entidades TEC
  source:      "TEC_BII";
  entityType:  TecBiiEntityType;
  entityId:    string;
  linkedNexoNodes: string[];
  capturedAt:  number;
  lastReinforced: number;
}

export type TecBiiEntityType =
  | "proyecto"
  | "brief"
  | "empleado"
  | "proveedor"
  | "cliente"
  | "evaluacion";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Calcula urgencia de un proyecto basado en deadline y carga */
export function calcularUrgencia(deadlineDays: number, assigneeLoad = 0.5): number {
  const deadlineScore = deadlineDays <= 0  ? 1.0
    : deadlineDays <= 3   ? 0.95
    : deadlineDays <= 7   ? 0.80
    : deadlineDays <= 14  ? 0.60
    : deadlineDays <= 30  ? 0.35
    : 0.15;
  return Math.min(1, deadlineScore * 0.7 + assigneeLoad * 0.3);
}

/** Calcula importancia de un proyecto para el grafo cognitivo */
export function calcularImportancia(p: Partial<ProyectoV2>): number {
  const estadoW: Record<string, number> = {
    "En producción": 0.9, "En revisión": 0.8, "Pendiente": 0.6,
    "Entregado": 0.2, "Cancelado": 0.05,
  };
  const estadoScore = estadoW[p.estado ?? "Pendiente"] ?? 0.5;
  const urgency     = p.urgencyScore ?? 0.5;
  const valor       = p.valorEstimado ? Math.min(1, p.valorEstimado / 100_000) : 0.3;
  return Math.min(1, estadoScore * 0.4 + urgency * 0.4 + valor * 0.2);
}

export function calcularCostoInterno(horasNormales: number, horasExtra: number, tarifaHora: number): number {
  return horasNormales * tarifaHora + horasExtra * tarifaHora * 1.5;
}

export function calcularRentabilidad(valorProyecto: number, costoFinal: number): number {
  if (valorProyecto === 0) return 0;
  return ((valorProyecto - costoFinal) / valorProyecto) * 100;
}

export function promedioMetricasV2(e: EvaluacionV2): number {
  const m = e.metricas;
  return (m.calidadGeneral + m.creatividad + m.ejecucionTecnica + m.alineacionBrief) / 4;
}
