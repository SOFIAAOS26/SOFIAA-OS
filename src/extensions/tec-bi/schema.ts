/**
 * TEC BI — Firestore Data Schemas
 * TypeScript types for all collections.
 * Firestore document IDs are auto-generated strings.
 */

// ── Empleados ─────────────────────────────────────────────────────────────────

export interface Empleado {
  id?: string;
  nombre: string;
  puesto: string;
  departamento: string;
  tarifaHora: number;          // MXN por hora normal
  salarioMensual: number;      // MXN bruto mensual
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Acumulados (calculados, no editables manualmente)
  proyectosTotales?: number;
  horasHombreTotal?: number;
  calidadPromedio?: number;    // 1-5
}

// ── Proveedores ───────────────────────────────────────────────────────────────

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

export interface Proveedor {
  id?: string;
  nombre: string;
  tipoServicio: TipoServicio;
  email: string;
  telefono: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Acumulados
  proyectosTotales?: number;
  costoPromedio?: number;
  rentabilidadPromedio?: number;  // (valorProyecto - costoFinal) / valorProyecto
  calidadPromedio?: number;        // 1-5
}

// ── Clientes Internos ─────────────────────────────────────────────────────────

export type TipoCampus = "Nacional" | "Campus" | "Ambos";

export interface ClienteInterno {
  id?: string;
  departamento: string;          // ej. "Dirección de Marketing", "Rectoría"
  campusONacional: TipoCampus;
  nombreResponsable: string;
  emailResponsable: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Acumulados
  briefsTotales?: number;
  proyectosCompletados?: number;
}

// ── Briefs ────────────────────────────────────────────────────────────────────

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

export type EstadoBrief =
  | "Recibido"
  | "En revisión"
  | "Aprobado"
  | "En producción"
  | "Entregado"
  | "Cancelado";

export interface BriefAssets {
  logoVectorial:      boolean;
  guionTexto:         boolean;
  fotosRef:           boolean;
  locacionConfirmada: boolean;
  talentConfirmado:   boolean;
  editableFile:       boolean;
}

export interface Brief {
  id?: string;
  clienteId: string;             // ref → clientes_internos
  tipoProyecto: TipoProyecto;
  titulo: string;
  descripcion: string;
  entregables: string[];         // lista editable
  requisitosTecnicos: string;
  referencias: string;           // links o descripción
  fechaSolicitud: Date;
  fechaLimite: Date;
  estado: EstadoBrief;
  createdAt: Date;
  updatedAt: Date;
  // Calculado
  margenDias?: number;           // fechaLimite - fechaSolicitud en días hábiles
  // ── Brief Canvas v1.1 ──────────────────────────────────────────────
  objetivo?:             string;       // ¿Qué quieres lograr?
  audiencia?:            string;       // ¿A quién va dirigido?
  plataforma?:           string;       // YouTube, Instagram, Pantallas campus…
  duracionSeg?:          number;       // Duración estimada (video)
  contactoSolicitante?:  string;
  emailSolicitante?:     string;
  assets?:               BriefAssets;
  briefScore?:           number;       // 0-100 calculado al guardar
  mondayItemId?:         string;       // ID del item en Monday.com (sync bidireccional)
}

// ── Proyectos ─────────────────────────────────────────────────────────────────

export type TipoAlcance = "Nacional" | "Campus";
export type TipoAsignacion = "Interno" | "Externo";
export type EstadoProyecto =
  | "Pendiente"
  | "En producción"
  | "En revisión"
  | "Entregado"
  | "Cancelado";

export interface Proyecto {
  id?: string;
  briefId: string;               // ref → briefs
  titulo: string;
  tipoAlcance: TipoAlcance;
  tipoAsignacion: TipoAsignacion;
  asignadoId: string;            // ref → empleados o proveedores según tipo
  estado: EstadoProyecto;
  valorEstimado: number;         // MXN — valor del proyecto para el TEC
  linkEntregables: string;       // Drive, Dropbox, etc.
  notas: string;
  createdAt: Date;
  updatedAt: Date;
  mondayItemId?:   string;       // ID del item en Monday.com (sync bidireccional)
}

// ── Evaluaciones ──────────────────────────────────────────────────────────────

export type TipoEvaluacion = "Interno" | "Externo";
export type CumplimientoTiempo = "A tiempo" | "Tarde" | "Temprano";

export interface MetricasCualitativas {
  calidadGeneral: number;        // 1-5
  creatividad: number;           // 1-5
  ejecucionTecnica: number;      // 1-5
  alineacionBrief: number;       // 1-5
}

export interface EvaluacionInterna {
  horasNormales: number;
  horasExtra: number;
  // Calculado: costoTotal = (horasNormales × tarifa) + (horasExtra × tarifa × 1.5)
  costoTotal?: number;
}

export interface EvaluacionExterna {
  costoCotizado: number;
  costoFinal: number;
  horasEsfuerzoEstimadas: number;
  calificacionComunicacion: number;   // 1-5
  calificacionCalidadPrecio: number;  // 1-5
}

export interface Evaluacion {
  id?: string;
  proyectoId: string;             // ref → proyectos
  tipo: TipoEvaluacion;
  // Solo uno de estos dos aplica según el tipo
  datosInternos?: EvaluacionInterna;
  datosExternos?: EvaluacionExterna;
  // Compartido
  metricas: MetricasCualitativas;
  valorProyecto: number;          // MXN — valor real entregado
  unidadesProducidas: number;
  cumplimientoTiempo: CumplimientoTiempo;
  numeroDVersiones: number;
  feedback: string;
  fecha: Date;
  createdAt: Date;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Calcula el costo de un empleado en un proyecto */
export function calcularCostoInterno(
  horasNormales: number,
  horasExtra: number,
  tarifaHora: number
): number {
  return horasNormales * tarifaHora + horasExtra * tarifaHora * 1.5;
}

/** Calcula rentabilidad de un proveedor en un proyecto */
export function calcularRentabilidad(
  valorProyecto: number,
  costoFinal: number
): number {
  if (valorProyecto === 0) return 0;
  return ((valorProyecto - costoFinal) / valorProyecto) * 100;
}
