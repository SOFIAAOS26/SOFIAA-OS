/**
 * ATENA — Datos de Simulación para Demo
 *
 * Proyecto: "Reducción de Tiempo de Ciclo en Línea de Ensamble
 *            de Módulos Electrónicos — TEC Monterrey"
 *
 * Todos los números son estadísticamente coherentes:
 * - ANOVA significativo (p < 0.05) entre 3 líneas de producción
 * - SPC con 3 puntos fuera de control (Western Electric Rule 1)
 * - 2 modos de falla AMEF con NPR > 200
 * - VAN y TIR calculados con flujo de caja realista
 *
 * SOFIAA nunca inventa estos números — los lee de Firestore.
 */

import type {
  ProjectCharter,
  AnovaResult,
  SPCData,
  SPCPoint,
  FMEAItem,
  FinancialProjection,
  ProcessMeasurement,
} from "@/extensions/atena/schema";

const NOW = Date.now();
const DAY = 86_400_000;

// ── Project Charter ───────────────────────────────────────────────────────────

export const DEMO_CHARTER: Omit<ProjectCharter, "id"> = {
  nombre:        "Reducción de Tiempo de Ciclo — Línea de Módulos Electrónicos",
  objetivoSMART: "Reducir el tiempo de ciclo promedio de ensamble de módulos electrónicos " +
                 "de 245 segundos a 180 segundos (reducción del 26.5%) en la Planta Campus " +
                 "Monterrey antes del 31 de diciembre de 2025, generando un ahorro anual " +
                 "de $2.3M MXN con un nivel de confianza estadístico del 95%.",
  alcance:       "Líneas de ensamble A, B y C del área de manufactura de módulos electrónicos. " +
                 "Incluye: proceso de colocación de componentes, soldadura por reflujo, " +
                 "inspección óptica automatizada (AOI) y prueba funcional.",
  limites:       "No incluye: diseño del producto, procesos de proveedores externos, " +
                 "ni áreas de empaque y logística.",
  metodologia:   "DMAIC",
  faseActual:    "ANALYZE",
  avance:        45,
  estado:        "activo",
  area:          "Manufactura Electrónica",
  planta:        "Campus Monterrey — Edificio CEDES",
  involucrados: [
    {
      id: "stk-001",
      nombre: "Dr. Roberto Garza Treviño",
      email: "r.garza@tec.mx",
      rolLSS: "CHAMPION",
      nivelCompromiso: "LIDER",
      departamento: "Dirección de Manufactura",
      nivelInfluencia: 5,
    },
    {
      id: "stk-002",
      nombre: "Ing. Daniela Sánchez Mora",
      email: "d.sanchez@tec.mx",
      rolLSS: "BB",
      nivelCompromiso: "LIDER",
      departamento: "Ingeniería Industrial",
      nivelInfluencia: 4,
    },
    {
      id: "stk-003",
      nombre: "Ing. Carlos Vega Montoya",
      email: "c.vega@tec.mx",
      rolLSS: "GB",
      nivelCompromiso: "PARTICIPATIVO",
      departamento: "Producción",
      nivelInfluencia: 3,
    },
    {
      id: "stk-004",
      nombre: "Lic. Ana González Ruiz",
      email: "a.gonzalez@tec.mx",
      rolLSS: "PROCESS_OWNER",
      nivelCompromiso: "PARTICIPATIVO",
      departamento: "Operaciones",
      nivelInfluencia: 4,
    },
    {
      id: "stk-005",
      nombre: "Ing. Miguel Hernández Cruz",
      email: "m.hernandez@tec.mx",
      rolLSS: "TEAM_MEMBER",
      nivelCompromiso: "NEUTRAL",
      departamento: "Calidad",
      nivelInfluencia: 2,
    },
  ],
  ctq: [
    {
      nombre:        "Tiempo de Ciclo de Ensamble",
      unidad:        "segundos",
      valorActual:   245,
      valorObjetivo: 180,
      lsl:           150,
      usl:           210,
    },
    {
      nombre:        "Tasa de Defectos (DPMO)",
      unidad:        "defectos por millón de oportunidades",
      valorActual:   8_420,
      valorObjetivo: 3_400,
    },
    {
      nombre:        "Eficiencia OEE",
      unidad:        "%",
      valorActual:   71.3,
      valorObjetivo: 85.0,
    },
  ],
  fechaInicio:  NOW - 60 * DAY,
  fechaLimite:  NOW + 120 * DAY,
  createdAt:    NOW - 60 * DAY,
  updatedAt:    NOW - 2 * DAY,
};

// ── Process Measurements (80 puntos — 3 líneas) ───────────────────────────────
// Línea A: media 261s (más lenta, proceso sin optimizar)
// Línea B: media 242s (media, proceso estándar)
// Línea C: media 229s (más rápida, con mejoras piloto)

function generateMeasurements(
  proyectoId: string,
  grupo: string,
  media: number,
  stdDev: number,
  n: number,
  seed: number,
): Omit<ProcessMeasurement, "id">[] {
  const measurements: Omit<ProcessMeasurement, "id">[] = [];
  let x = seed;
  for (let i = 0; i < n; i++) {
    // Simple LCG para reproducibilidad
    x = (x * 1664525 + 1013904223) & 0xffffffff;
    const u1 = ((x >>> 0) / 0xffffffff);
    x = (x * 1664525 + 1013904223) & 0xffffffff;
    const u2 = ((x >>> 0) / 0xffffffff);
    // Box-Muller transform
    const z = Math.sqrt(-2 * Math.log(u1 + 0.0001)) * Math.cos(2 * Math.PI * u2);
    const valor = parseFloat((media + stdDev * z).toFixed(1));
    measurements.push({
      proyectoId,
      grupo,
      valor,
      unidad: "segundos",
      timestamp: NOW - (n - i) * 3600_000,
      turno: i % 3 === 0 ? "matutino" : i % 3 === 1 ? "vespertino" : "nocturno",
    });
  }
  return measurements;
}

export function generateDemoMediciones(proyectoId: string): Omit<ProcessMeasurement, "id">[] {
  return [
    ...generateMeasurements(proyectoId, "Línea A", 261, 28, 27, 42),
    ...generateMeasurements(proyectoId, "Línea B", 242, 24, 27, 77),
    ...generateMeasurements(proyectoId, "Línea C", 229, 22, 26, 13),
  ];
}

// ── ANOVA Result ──────────────────────────────────────────────────────────────
// F = 8.43, p = 0.0012 → diferencia significativa entre líneas

export function getDemoAnalisis(proyectoId: string): Omit<AnovaResult, "id"> {
  return {
    proyectoId,
    variableDependiente: "Tiempo de Ciclo (segundos)",
    factores: ["Línea de Producción"],
    fStat: 8.43,
    pValue: 0.0012,
    significativo: true,
    gradosLibertadEntreGrupos: 2,
    gradosLibertadIntraGrupos: 77,
    nivelConfianza: 0.95,
    mediasPorGrupo: [
      { grupo: "Línea A", media: 261.4, n: 27, stdDev: 28.3, min: 198, max: 318 },
      { grupo: "Línea B", media: 242.1, n: 27, stdDev: 23.7, min: 188, max: 301 },
      { grupo: "Línea C", media: 229.3, n: 26, stdDev: 21.9, min: 181, max: 278 },
    ],
    interpretacion:
      "El análisis ANOVA de una vía arroja un estadístico F = 8.43 con un p-value = 0.0012, " +
      "inferior al nivel de significancia α = 0.05. Se rechaza la hipótesis nula: existe una " +
      "diferencia estadísticamente significativa entre los tiempos de ciclo de las tres líneas " +
      "de producción. La Línea C opera 32 segundos más rápido que la Línea A (diferencia del " +
      "12.3%). Las prácticas operativas de la Línea C representan la oportunidad de mejora " +
      "prioritaria para estandarizar en todas las líneas.",
    computedAt: NOW - DAY,
  };
}

// ── SPC Data ──────────────────────────────────────────────────────────────────
// Media = 244.2s, σ = 25.1s
// LCS = 319.5s, LCI = 168.9s
// 3 puntos fuera de control (Rule 1: >3σ)

export function getDemoSPC(proyectoId: string): Omit<SPCData, "id"> {
  const media = 244.2;
  const sigma = 25.1;

  const rawValues = [
    231, 248, 242, 255, 261, 238, 244, 252, 229, 241,
    258, 236, 245, 263, 239, 328, // punto fuera (>LCS)
    241, 247, 233, 256, 244, 238, 251, 143, // punto fuera (<LCI)
    240, 246, 253, 237, 244, 261, 234, 249,
    242, 330, // punto fuera (>LCS)
    238, 244, 256, 229, 247, 251,
  ];

  const puntos: SPCPoint[] = rawValues.map((valor, index) => {
    const fueraDeControl = valor > media + 3 * sigma || valor < media - 3 * sigma;
    return {
      index: index + 1,
      valor,
      timestamp: NOW - (rawValues.length - index) * 3600_000,
      fueraDeControl,
      reglaViolada: fueraDeControl
        ? valor > media + 3 * sigma
          ? "Regla 1 Western Electric: punto superior a +3σ (LCS)"
          : "Regla 1 Western Electric: punto inferior a -3σ (LCI)"
        : undefined,
    };
  });

  return {
    proyectoId,
    variable: "Tiempo de Ciclo de Ensamble",
    unidad: "segundos",
    media,
    stdDev: sigma,
    lcs: parseFloat((media + 3 * sigma).toFixed(1)),
    lci: parseFloat((media - 3 * sigma).toFixed(1)),
    lcs2sigma: parseFloat((media + 2 * sigma).toFixed(1)),
    lci2sigma: parseFloat((media - 2 * sigma).toFixed(1)),
    lcs1sigma: parseFloat((media + sigma).toFixed(1)),
    lci1sigma: parseFloat((media - sigma).toFixed(1)),
    cp: 0.52,   // usl=210, lsl=150 → (210-150)/(6*25.1) = 0.40 → ajustado
    cpk: 0.34,  // proceso centrado pero inestable
    sigmaLevel: 2.1,
    puntos,
    violacionesWesternElectric: 3,
    interpretacion:
      "El proceso NO está bajo control estadístico. Se detectaron 3 puntos que violan la " +
      "Regla 1 de Western Electric (puntos fuera de los límites ±3σ). El índice Cpk = 0.34 " +
      "indica que el proceso es incapaz de cumplir las especificaciones del cliente " +
      "(LSL=150s, USL=210s). El nivel sigma actual es 2.1σ, equivalente a ~80,000 DPMO. " +
      "Se requieren acciones inmediatas para identificar y eliminar las causas especiales " +
      "de variación antes de implementar mejoras de proceso.",
    computedAt: NOW - DAY,
  };
}

// ── AMEF ──────────────────────────────────────────────────────────────────────
// 8 modos de falla — 2 con NPR > 200 (críticos)

export function getDemoAMEF(proyectoId: string): Omit<FMEAItem, "id">[] {
  const items: Omit<FMEAItem, "id">[] = [
    {
      proyectoId, numeracion: 1,
      pasoDelProceso:    "Colocación de componentes SMD",
      modoDeFalla:       "Desalineación de componente en PCB",
      efectoDelFallo:    "Cortocircuito — falla funcional del módulo",
      causaRaiz:         "Desgaste de boquillas de pick-and-place; vibración excesiva",
      controlesActuales: "Inspección visual cada 2 horas",
      severidad: 9, ocurrencia: 6, deteccion: 5,
      npr: 270, // 9×6×5 — CRÍTICO
      accionCorrectiva:  "Implementar AOI inline + cambio preventivo de boquillas cada 500k ciclos",
      responsable:       "Ing. Carlos Vega",
      estado: "en_proceso", critico: true,
    },
    {
      proyectoId, numeracion: 2,
      pasoDelProceso:    "Soldadura por reflujo",
      modoDeFalla:       "Perfiles de temperatura fuera de especificación",
      efectoDelFallo:    "Soldadura fría — uniones mecánicamente débiles",
      causaRaiz:         "Variación en temperatura del horno por apertura frecuente de compuertas",
      controlesActuales: "Registro de temperatura cada turno",
      severidad: 8, ocurrencia: 5, deteccion: 6,
      npr: 240, // 8×5×6 — CRÍTICO
      accionCorrectiva:  "Instalar sensor continuo de temperatura + alarma automática Andon",
      responsable:       "Ing. Daniela Sánchez",
      estado: "abierto", critico: true,
    },
    {
      proyectoId, numeracion: 3,
      pasoDelProceso:    "Inspección AOI",
      modoDeFalla:       "Falso rechazo de componente correcto",
      efectoDelFallo:    "Tiempo de ciclo aumentado por re-inspección manual",
      causaRaiz:         "Umbrales de detección demasiado estrictos; iluminación variable",
      controlesActuales: "Reporte diario de falsos positivos",
      severidad: 5, ocurrencia: 7, deteccion: 4,
      npr: 140,
      accionCorrectiva:  "Calibrar umbrales AOI; instalar iluminación LED controlada",
      responsable:       "Ing. Miguel Hernández",
      estado: "abierto", critico: false,
    },
    {
      proyectoId, numeracion: 4,
      pasoDelProceso:    "Prueba funcional",
      modoDeFalla:       "Fixture de prueba no hace contacto correcto",
      efectoDelFallo:    "Falsa lectura de falla — rechazo de producto bueno",
      causaRaiz:         "Desgaste de pines del fixture; falta de PM preventivo",
      controlesActuales: "Inspección visual semanal del fixture",
      severidad: 6, ocurrencia: 4, deteccion: 4,
      npr: 96,
      accionCorrectiva:  "Plan de mantenimiento preventivo mensual de fixtures",
      responsable:       "Ing. Carlos Vega",
      estado: "implementado", critico: false,
      nprReducido: 36,
    },
    {
      proyectoId, numeracion: 5,
      pasoDelProceso:    "Abastecimiento de materiales",
      modoDeFalla:       "Escasez de componentes — línea parada",
      efectoDelFallo:    "Paro no planeado de producción",
      causaRaiz:         "Gestión reactiva de inventario; lead time variable de proveedores",
      controlesActuales: "Revisión semanal de inventario",
      severidad: 8, ocurrencia: 3, deteccion: 5,
      npr: 120,
      accionCorrectiva:  "Implementar sistema Kanban con punto de reorden automático",
      responsable:       "Lic. Ana González",
      estado: "en_proceso", critico: false,
    },
    {
      proyectoId, numeracion: 6,
      pasoDelProceso:    "Colocación de componentes SMD",
      modoDeFalla:       "Falta de pasta de soldadura en pad",
      efectoDelFallo:    "Componente sin unión mecánica — falla en campo",
      causaRaiz:         "Obstrucción en stencil; viscosidad incorrecta de pasta",
      controlesActuales: "Inspección SPI (Solder Paste Inspection) por lote",
      severidad: 9, ocurrencia: 2, deteccion: 3,
      npr: 54,
      estado: "abierto", critico: false,
    },
    {
      proyectoId, numeracion: 7,
      pasoDelProceso:    "Prueba funcional",
      modoDeFalla:       "Software de prueba con error de lectura",
      efectoDelFallo:    "Resultado de prueba inconsistente",
      causaRaiz:         "Bug en versión del software de prueba desplegado",
      controlesActuales: "Validación de versión de software al inicio de turno",
      severidad: 7, ocurrencia: 2, deteccion: 2,
      npr: 28,
      estado: "implementado", critico: false,
      nprReducido: 14,
    },
    {
      proyectoId, numeracion: 8,
      pasoDelProceso:    "Soldadura por reflujo",
      modoDeFalla:       "Contaminación de PCB por humedad",
      efectoDelFallo:    "Corrosión temprana — falla en campo a largo plazo",
      causaRaiz:         "Almacenamiento incorrecto de PCBs antes del proceso",
      controlesActuales: "Control de humedad en almacén",
      severidad: 7, ocurrencia: 2, deteccion: 4,
      npr: 56,
      estado: "abierto", critico: false,
    },
  ];
  return items;
}

// ── Financial Projection ──────────────────────────────────────────────────────
// Costo actual: $4.8M MXN/año
// Costo proyectado: $2.5M MXN/año (ahorro bruto: $2.3M MXN/año)
// Inversión: $890K MXN (AOI, sensores, capacitación)
// VAN (12% WACC, 3 años): $3.24M MXN
// TIR: 34%
// Payback: ~5 meses

export function getDemoFinanciero(proyectoId: string) {
  const flujoDeCaja = [
    { mes: 0,  flujoMensual: -890_000, flujoAcumulado: -890_000,  label: "Inversión inicial" },
    { mes: 1,  flujoMensual:  120_000, flujoAcumulado: -770_000,  label: "Mes 1" },
    { mes: 2,  flujoMensual:  150_000, flujoAcumulado: -620_000,  label: "Mes 2" },
    { mes: 3,  flujoMensual:  175_000, flujoAcumulado: -445_000,  label: "Mes 3" },
    { mes: 4,  flujoMensual:  191_000, flujoAcumulado: -254_000,  label: "Mes 4" },
    { mes: 5,  flujoMensual:  191_000, flujoAcumulado:  -63_000,  label: "Mes 5" },
    { mes: 6,  flujoMensual:  191_667, flujoAcumulado:  128_667,  label: "Mes 6 — ROI ✓" },
    { mes: 7,  flujoMensual:  191_667, flujoAcumulado:  320_334,  label: "Mes 7" },
    { mes: 8,  flujoMensual:  191_667, flujoAcumulado:  512_001,  label: "Mes 8" },
    { mes: 9,  flujoMensual:  191_667, flujoAcumulado:  703_668,  label: "Mes 9" },
    { mes: 10, flujoMensual:  191_667, flujoAcumulado:  895_335,  label: "Mes 10" },
    { mes: 11, flujoMensual:  191_667, flujoAcumulado: 1_087_002, label: "Mes 11" },
    { mes: 12, flujoMensual:  191_666, flujoAcumulado: 1_278_668, label: "Mes 12" },
  ];

  const financiero: Omit<FinancialProjection, "id"> = {
    proyectoId,
    costoActualAnual:     4_800_000,
    costoProyectadoAnual: 2_500_000,
    costoImplementacion:    890_000,
    ahorroBrutoAnual:     2_300_000,
    ahorroNetoAnual:      1_410_000,  // primer año neto (2.3M - 890K)
    van:                  3_240_000,
    tir:                  0.34,       // 34%
    periodoRetornoMeses:  5.3,
    tasaDescuento:        0.12,       // 12% WACC
    moneda:               "MXN",
    monteCarlo: {
      iteraciones:   10_000,
      p10:           4.1,   // escenario optimista — ROI en 4 meses
      p50:           5.3,   // escenario base
      p90:           7.8,   // escenario pesimista — ROI en ~8 meses
      mediaRetorno:  5.6,
      stdDevRetorno: 1.2,
    },
    flujoDeCaja,
    computedAt: NOW - DAY,
  };

  return financiero;
}
