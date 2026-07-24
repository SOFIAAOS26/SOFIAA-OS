/**
 * ATENA — Advanced Technology for Enterprise Nexus & Analytics
 * Scientific Intelligence Engine — Powered by SOFIAA
 *
 * Tipos base del ecosistema ATENA.
 * El motor estadístico es determinista: SOFIAA nunca calcula, solo interpreta.
 */

// ── Roles LSS ─────────────────────────────────────────────────────────────────

export type RolLSS =
  | "CHAMPION"
  | "MBB"         // Master Black Belt
  | "BB"          // Black Belt
  | "GB"          // Green Belt
  | "PROCESS_OWNER"
  | "TEAM_MEMBER";

export type NivelCompromiso =
  | "INCONSCIENTE"
  | "RESISTENTE"
  | "NEUTRAL"
  | "PARTICIPATIVO"
  | "LIDER";

export type MetodologiaLSS = "DMAIC" | "DMADV";

export type FaseDMAIC = "DEFINE" | "MEASURE" | "ANALYZE" | "IMPROVE" | "CONTROL";

export type EstadoProyecto = "activo" | "completado" | "pausado" | "cancelado";

// ── Stakeholder ───────────────────────────────────────────────────────────────

export interface Stakeholder {
  id:                string;
  nombre:            string;
  email?:            string;
  rolLSS:            RolLSS;
  nivelCompromiso:   NivelCompromiso;
  departamento?:     string;
  nivelInfluencia?:  number; // 1-5
}

// ── CTQ Variables (Critical to Quality) ──────────────────────────────────────

export interface CTQVariable {
  nombre:        string;
  unidad:        string;
  valorActual:   number;
  valorObjetivo: number;
  lsl?:          number; // Lower Spec Limit
  usl?:          number; // Upper Spec Limit
}

// ── Project Charter ───────────────────────────────────────────────────────────

export interface ProjectCharter {
  id:              string;
  nombre:          string;
  objetivoSMART:   string;
  alcance:         string;
  limites:         string;
  metodologia:     MetodologiaLSS;
  faseActual:      FaseDMAIC;
  avance:          number;        // 0-100
  estado:          EstadoProyecto;
  involucrados:    Stakeholder[];
  ctq:             CTQVariable[];
  area:            string;        // "Manufactura", "Servicios", etc.
  planta?:         string;
  fechaInicio:     number;        // timestamp
  fechaLimite:     number;        // timestamp
  createdAt:       number;
  updatedAt:       number;
}

// ── Mediciones del proceso ────────────────────────────────────────────────────

export interface ProcessMeasurement {
  id:         string;
  proyectoId: string;
  grupo:      string;  // "Línea A", "Turno 1", etc.
  valor:      number;
  unidad:     string;
  timestamp:  number;
  turno?:     "matutino" | "vespertino" | "nocturno";
  operador?:  string;
}

// ── ANOVA Result ──────────────────────────────────────────────────────────────

export interface MediaPorGrupo {
  grupo:  string;
  media:  number;
  n:      number;
  stdDev: number;
  min:    number;
  max:    number;
}

export interface AnovaResult {
  id:                           string;
  proyectoId:                   string;
  variableDependiente:          string;
  factores:                     string[];
  fStat:                        number;
  pValue:                       number;
  significativo:                boolean;  // pValue < 0.05
  gradosLibertadEntreGrupos:    number;
  gradosLibertadIntraGrupos:    number;
  mediasPorGrupo:               MediaPorGrupo[];
  interpretacion:               string;   // texto explicativo del motor
  nivelConfianza:               number;   // e.g. 0.95
  computedAt:                   number;
}

// ── SPC — Statistical Process Control ────────────────────────────────────────

export interface SPCPoint {
  index:          number;
  valor:          number;
  timestamp:      number;
  fueraDeControl: boolean;
  reglaViolada?:  string; // "Regla 1: punto a >3σ", etc.
  grupo?:         string;
}

export interface SPCData {
  id:                          string;
  proyectoId:                  string;
  variable:                    string;
  unidad:                      string;
  media:                       number;   // X̄ (línea central)
  stdDev:                      number;   // σ del proceso
  lcs:                         number;   // Límite de Control Superior (+3σ)
  lci:                         number;   // Límite de Control Inferior (-3σ)
  lcs2sigma:                   number;   // +2σ
  lci2sigma:                   number;   // -2σ
  lcs1sigma:                   number;   // +1σ
  lci1sigma:                   number;   // -1σ
  cp:                          number;   // Índice de capacidad
  cpk:                         number;   // Índice de capacidad centrado
  sigmaLevel:                  number;   // nivel sigma del proceso
  puntos:                      SPCPoint[];
  violacionesWesternElectric:  number;
  interpretacion:              string;
  computedAt:                  number;
}

// ── AMEF — Análisis de Modo y Efecto de Falla ─────────────────────────────────

export type EstadoAMEF = "abierto" | "en_proceso" | "implementado";

export interface FMEAItem {
  id:                  string;
  proyectoId:          string;
  numeracion:          number;
  pasoDelProceso:      string;
  modoDeFalla:         string;
  efectoDelFallo:      string;
  causaRaiz:           string;
  controlesActuales:   string;
  severidad:           number;   // 1-10
  ocurrencia:          number;   // 1-10
  deteccion:           number;   // 1-10
  npr:                 number;   // = severidad × ocurrencia × deteccion
  accionCorrectiva?:   string;
  responsable?:        string;
  fechaImplementacion?: number;
  nprReducido?:        number;   // NPR después de acción correctiva
  estado:              EstadoAMEF;
  critico:             boolean;  // true si npr > 200
}

// ── Proyección Financiera ─────────────────────────────────────────────────────

export interface CashFlowPeriod {
  mes:             number;   // 1, 2, 3...
  flujoMensual:    number;   // puede ser negativo en implementación
  flujoAcumulado:  number;
  label:           string;   // "Mes 1", "Mes 6", etc.
}

export interface MonteCarloResult {
  iteraciones:   number;    // 10,000
  p10:           number;    // meses (escenario pesimista)
  p50:           number;    // meses (escenario base)
  p90:           number;    // meses (escenario optimista)
  mediaRetorno:  number;    // promedio de iteraciones
  stdDevRetorno: number;
}

export interface FinancialProjection {
  id:                  string;
  proyectoId:          string;
  costoActualAnual:    number;   // MXN
  costoProyectadoAnual: number;
  costoImplementacion: number;
  ahorroBrutoAnual:    number;
  ahorroNetoAnual:     number;
  van:                 number;   // Valor Actual Neto
  tir:                 number;   // Tasa Interna de Retorno (decimal, e.g. 0.34)
  periodoRetornoMeses: number;
  tasaDescuento:       number;   // WACC, e.g. 0.12
  monteCarlo:          MonteCarloResult;
  flujoDeCaja:         CashFlowPeriod[];
  moneda:              "MXN" | "USD";
  computedAt:          number;
}

// ── Hito / Milestone ─────────────────────────────────────────────────────────

export type TipoHito = "PUERTA" | "ENTREGABLE" | "REVISION" | "KAIZEN";

export interface Hito {
  id:          string;
  proyectoId:  string;
  fase:        FaseDMAIC;
  nombre:      string;
  descripcion: string;
  entregable:  string;   // entregable concreto del hito
  semana:      number;   // semana del proyecto (1, 2, 3…)
  tipo:        TipoHito;
  completado:  boolean;
}

// ── Riesgo del Proyecto ───────────────────────────────────────────────────────

export type NivelRiesgo = "ALTA" | "MEDIA" | "BAJA";
export type TipoRiesgo  = "TECNICO" | "HUMANO" | "PROCESO" | "EXTERNO";

export interface RiesgoProyecto {
  id:           string;
  proyectoId:   string;
  descripcion:  string;
  probabilidad: NivelRiesgo;
  impacto:      NivelRiesgo;
  tipo:         TipoRiesgo;
  mitigacion:   string;
  pokayoke?:    string;   // mecanismo a prueba de error
  responsable?: string;
}

// ── Kaizen Event ──────────────────────────────────────────────────────────────

export interface KaizenEvent {
  id:              string;
  proyectoId:      string;
  nombre:          string;
  fase:            FaseDMAIC;
  descripcion:     string;
  duracionDias:    number;
  metricaObjetivo: string;
  completado:      boolean;
}

// ── Proyecto Generado (output de la IA) ──────────────────────────────────────

export interface ProyectoGenerado {
  charter: {
    objetivoSMART: string;
    alcance:       string;
    limites:       string;
    ctq:           CTQVariable[];
  };
  hitos:        Omit<Hito,          "id" | "proyectoId" | "completado">[];
  riesgos:      Omit<RiesgoProyecto, "id" | "proyectoId">[];
  amefInicial:  Omit<FMEAItem,      "id" | "proyectoId" | "estado" | "critico" | "numeracion" | "npr">[];
  kaizenEvents: Omit<KaizenEvent,   "id" | "proyectoId" | "completado">[];
}

// ── Colecciones Firestore ─────────────────────────────────────────────────────
// Patrón: users/{uid}/atena_{col}

export type AtenaCollection =
  | "proyectos"
  | "mediciones"
  | "analisis"
  | "spc"
  | "amef"
  | "financiero"
  | "hitos"
  | "riesgos"
  | "kaizen";

/** Helper de path — igual que tecBiiPath */
export function atenaPath(uid: string, col: AtenaCollection): string {
  return `users/${uid}/atena_${col}`;
}
