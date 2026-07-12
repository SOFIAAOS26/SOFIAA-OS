/**
 * ATENA — Seed Script
 *
 * Carga los datos de simulación del demo ATENA en Firestore.
 *
 * Uso:
 *   node scripts/seed-atena.mjs
 *
 * Requiere: FIREBASE_SERVICE_ACCOUNT_BASE64 y ATENA_OWNER_UID en .env.local
 * O bien: pasar el UID como argumento: node scripts/seed-atena.mjs <uid>
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

// ── Cargar variables de entorno ───────────────────────────────────────────────
function loadEnv() {
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    console.warn("⚠️  No se encontró .env.local — usando variables de entorno del sistema");
  }
}

loadEnv();

// ── Firebase Admin ────────────────────────────────────────────────────────────
const { initializeApp, cert, getApps } = await import("firebase-admin/app");
const { getFirestore }                  = await import("firebase-admin/firestore");

const serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
if (!serviceAccountB64) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT_BASE64 no está definido");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(Buffer.from(serviceAccountB64, "base64").toString("utf-8"))),
  });
}

const db = getFirestore();

// ── UID del propietario ───────────────────────────────────────────────────────
const uid = process.argv[2] || process.env.MONDAY_OWNER_UID || process.env.ATENA_OWNER_UID;
if (!uid) {
  console.error("❌ UID no especificado. Usa: node scripts/seed-atena.mjs <uid>");
  console.error("   O define MONDAY_OWNER_UID / ATENA_OWNER_UID en .env.local");
  process.exit(1);
}

console.log(`🔬 ATENA Seed — uid: ${uid}`);
console.log("─".repeat(60));

// ── Helper de path ────────────────────────────────────────────────────────────
function atenaPath(col) {
  return `users/${uid}/atena_${col}`;
}

// ── Datos de simulación (hardcoded para que el script sea autocontenido) ──────

const NOW = Date.now();
const DAY = 86_400_000;

// Project Charter
const charter = {
  nombre:        "Reducción de Tiempo de Ciclo — Línea de Módulos Electrónicos",
  objetivoSMART: "Reducir el tiempo de ciclo promedio de ensamble de módulos electrónicos de 245 segundos a 180 segundos (reducción del 26.5%) en la Planta Campus Monterrey antes del 31 de diciembre de 2025, generando un ahorro anual de $2.3M MXN con un nivel de confianza estadístico del 95%.",
  alcance:       "Líneas de ensamble A, B y C del área de manufactura de módulos electrónicos. Incluye: proceso de colocación de componentes, soldadura por reflujo, inspección óptica automatizada (AOI) y prueba funcional.",
  limites:       "No incluye: diseño del producto, procesos de proveedores externos, ni áreas de empaque y logística.",
  metodologia:   "DMAIC",
  faseActual:    "ANALYZE",
  avance:        45,
  estado:        "activo",
  area:          "Manufactura Electrónica",
  planta:        "Campus Monterrey — Edificio CEDES",
  involucrados: [
    { id: "stk-001", nombre: "Dr. Roberto Garza Treviño",  email: "r.garza@tec.mx",      rolLSS: "CHAMPION",      nivelCompromiso: "LIDER",        departamento: "Dirección de Manufactura",  nivelInfluencia: 5 },
    { id: "stk-002", nombre: "Ing. Daniela Sánchez Mora",  email: "d.sanchez@tec.mx",    rolLSS: "BB",            nivelCompromiso: "LIDER",        departamento: "Ingeniería Industrial",     nivelInfluencia: 4 },
    { id: "stk-003", nombre: "Ing. Carlos Vega Montoya",   email: "c.vega@tec.mx",       rolLSS: "GB",            nivelCompromiso: "PARTICIPATIVO", departamento: "Producción",               nivelInfluencia: 3 },
    { id: "stk-004", nombre: "Lic. Ana González Ruiz",     email: "a.gonzalez@tec.mx",   rolLSS: "PROCESS_OWNER", nivelCompromiso: "PARTICIPATIVO", departamento: "Operaciones",              nivelInfluencia: 4 },
    { id: "stk-005", nombre: "Ing. Miguel Hernández Cruz", email: "m.hernandez@tec.mx",  rolLSS: "TEAM_MEMBER",   nivelCompromiso: "NEUTRAL",      departamento: "Calidad",                  nivelInfluencia: 2 },
  ],
  ctq: [
    { nombre: "Tiempo de Ciclo de Ensamble", unidad: "segundos",                           valorActual: 245,    valorObjetivo: 180,   lsl: 150, usl: 210 },
    { nombre: "Tasa de Defectos (DPMO)",      unidad: "defectos por millón de oportunidades", valorActual: 8420,   valorObjetivo: 3400  },
    { nombre: "Eficiencia OEE",               unidad: "%",                                  valorActual: 71.3,   valorObjetivo: 85.0  },
  ],
  fechaInicio: NOW - 60 * DAY,
  fechaLimite: NOW + 120 * DAY,
  createdAt:   NOW - 60 * DAY,
  updatedAt:   NOW - 2 * DAY,
};

// ANOVA Result
const analisis = {
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
  interpretacion: "El análisis ANOVA de una vía arroja un estadístico F = 8.43 con un p-value = 0.0012, inferior al nivel de significancia α = 0.05. Se rechaza la hipótesis nula: existe una diferencia estadísticamente significativa entre los tiempos de ciclo de las tres líneas de producción. La Línea C opera 32 segundos más rápido que la Línea A (diferencia del 12.3%). Las prácticas operativas de la Línea C representan la oportunidad de mejora prioritaria para estandarizar en todas las líneas.",
  computedAt: NOW - DAY,
};

// SPC Data
const spcRawValues = [
  231, 248, 242, 255, 261, 238, 244, 252, 229, 241,
  258, 236, 245, 263, 239, 328,
  241, 247, 233, 256, 244, 238, 251, 143,
  240, 246, 253, 237, 244, 261, 234, 249,
  242, 330,
  238, 244, 256, 229, 247, 251,
];

const media = 244.2, sigma = 25.1;
const spcPuntos = spcRawValues.map((valor, i) => {
  const fuera = valor > media + 3 * sigma || valor < media - 3 * sigma;
  return {
    index: i + 1,
    valor,
    timestamp: NOW - (spcRawValues.length - i) * 3600_000,
    fueraDeControl: fuera,
    reglaViolada: fuera
      ? valor > media + 3 * sigma
        ? "Regla 1 Western Electric: punto superior a +3σ (LCS)"
        : "Regla 1 Western Electric: punto inferior a -3σ (LCI)"
      : null,
  };
});

const spc = {
  variable: "Tiempo de Ciclo de Ensamble",
  unidad: "segundos",
  media, stdDev: sigma,
  lcs: 319.5, lci: 168.9,
  lcs2sigma: 294.4, lci2sigma: 194.0,
  lcs1sigma: 269.3, lci1sigma: 219.1,
  cp: 0.52, cpk: 0.34, sigmaLevel: 2.1,
  puntos: spcPuntos,
  violacionesWesternElectric: 3,
  interpretacion: "El proceso NO está bajo control estadístico. Se detectaron 3 puntos que violan la Regla 1 de Western Electric (puntos fuera de los límites ±3σ). El índice Cpk = 0.34 indica que el proceso es incapaz de cumplir las especificaciones del cliente (LSL=150s, USL=210s). El nivel sigma actual es 2.1σ, equivalente a ~80,000 DPMO. Se requieren acciones inmediatas para identificar y eliminar las causas especiales de variación.",
  computedAt: NOW - DAY,
};

// AMEF
const amefItems = [
  { numeracion: 1, pasoDelProceso: "Colocación de componentes SMD", modoDeFalla: "Desalineación de componente en PCB", efectoDelFallo: "Cortocircuito — falla funcional del módulo", causaRaiz: "Desgaste de boquillas de pick-and-place; vibración excesiva", controlesActuales: "Inspección visual cada 2 horas", severidad: 9, ocurrencia: 6, deteccion: 5, npr: 270, accionCorrectiva: "Implementar AOI inline + cambio preventivo de boquillas cada 500k ciclos", responsable: "Ing. Carlos Vega", estado: "en_proceso", critico: true },
  { numeracion: 2, pasoDelProceso: "Soldadura por reflujo", modoDeFalla: "Perfiles de temperatura fuera de especificación", efectoDelFallo: "Soldadura fría — uniones mecánicamente débiles", causaRaiz: "Variación en temperatura del horno por apertura frecuente de compuertas", controlesActuales: "Registro de temperatura cada turno", severidad: 8, ocurrencia: 5, deteccion: 6, npr: 240, accionCorrectiva: "Instalar sensor continuo de temperatura + alarma automática Andon", responsable: "Ing. Daniela Sánchez", estado: "abierto", critico: true },
  { numeracion: 3, pasoDelProceso: "Inspección AOI", modoDeFalla: "Falso rechazo de componente correcto", efectoDelFallo: "Tiempo de ciclo aumentado por re-inspección manual", causaRaiz: "Umbrales de detección demasiado estrictos; iluminación variable", controlesActuales: "Reporte diario de falsos positivos", severidad: 5, ocurrencia: 7, deteccion: 4, npr: 140, accionCorrectiva: "Calibrar umbrales AOI; instalar iluminación LED controlada", responsable: "Ing. Miguel Hernández", estado: "abierto", critico: false },
  { numeracion: 4, pasoDelProceso: "Prueba funcional", modoDeFalla: "Fixture de prueba no hace contacto correcto", efectoDelFallo: "Falsa lectura de falla — rechazo de producto bueno", causaRaiz: "Desgaste de pines del fixture; falta de PM preventivo", controlesActuales: "Inspección visual semanal del fixture", severidad: 6, ocurrencia: 4, deteccion: 4, npr: 96, accionCorrectiva: "Plan de mantenimiento preventivo mensual de fixtures", responsable: "Ing. Carlos Vega", estado: "implementado", critico: false, nprReducido: 36 },
  { numeracion: 5, pasoDelProceso: "Abastecimiento de materiales", modoDeFalla: "Escasez de componentes — línea parada", efectoDelFallo: "Paro no planeado de producción", causaRaiz: "Gestión reactiva de inventario; lead time variable de proveedores", controlesActuales: "Revisión semanal de inventario", severidad: 8, ocurrencia: 3, deteccion: 5, npr: 120, accionCorrectiva: "Implementar sistema Kanban con punto de reorden automático", responsable: "Lic. Ana González", estado: "en_proceso", critico: false },
  { numeracion: 6, pasoDelProceso: "Colocación de componentes SMD", modoDeFalla: "Falta de pasta de soldadura en pad", efectoDelFallo: "Componente sin unión mecánica — falla en campo", causaRaiz: "Obstrucción en stencil; viscosidad incorrecta de pasta", controlesActuales: "Inspección SPI (Solder Paste Inspection) por lote", severidad: 9, ocurrencia: 2, deteccion: 3, npr: 54, estado: "abierto", critico: false },
  { numeracion: 7, pasoDelProceso: "Prueba funcional", modoDeFalla: "Software de prueba con error de lectura", efectoDelFallo: "Resultado de prueba inconsistente", causaRaiz: "Bug en versión del software de prueba desplegado", controlesActuales: "Validación de versión de software al inicio de turno", severidad: 7, ocurrencia: 2, deteccion: 2, npr: 28, estado: "implementado", critico: false, nprReducido: 14 },
  { numeracion: 8, pasoDelProceso: "Soldadura por reflujo", modoDeFalla: "Contaminación de PCB por humedad", efectoDelFallo: "Corrosión temprana — falla en campo a largo plazo", causaRaiz: "Almacenamiento incorrecto de PCBs antes del proceso", controlesActuales: "Control de humedad en almacén", severidad: 7, ocurrencia: 2, deteccion: 4, npr: 56, estado: "abierto", critico: false },
];

// Financial Projection
const financiero = {
  costoActualAnual:      4_800_000,
  costoProyectadoAnual:  2_500_000,
  costoImplementacion:     890_000,
  ahorroBrutoAnual:      2_300_000,
  ahorroNetoAnual:       1_410_000,
  van:                   3_240_000,
  tir:                   0.34,
  periodoRetornoMeses:   5.3,
  tasaDescuento:         0.12,
  moneda:                "MXN",
  monteCarlo: { iteraciones: 10_000, p10: 4.1, p50: 5.3, p90: 7.8, mediaRetorno: 5.6, stdDevRetorno: 1.2 },
  flujoDeCaja: [
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
  ],
  computedAt: NOW - DAY,
};

// ── Seed ──────────────────────────────────────────────────────────────────────

async function seed() {
  // 1. Project Charter
  console.log("📋 Creando Project Charter...");
  const proyectoRef = await db.collection(atenaPath("proyectos")).add(charter);
  const proyectoId = proyectoRef.id;
  console.log(`   ✓ Proyecto creado: ${proyectoId}`);

  // 2. ANOVA
  console.log("📊 Cargando resultado ANOVA...");
  await db.collection(atenaPath("analisis")).add({ ...analisis, proyectoId });
  console.log("   ✓ ANOVA cargado (F=8.43, p=0.0012)");

  // 3. SPC
  console.log("📈 Cargando datos SPC...");
  await db.collection(atenaPath("spc")).add({ ...spc, proyectoId });
  console.log("   ✓ SPC cargado (3 violaciones Western Electric)");

  // 4. AMEF
  console.log("⚠️  Cargando matriz AMEF...");
  const amefBatch = db.batch();
  for (const item of amefItems) {
    const ref = db.collection(atenaPath("amef")).doc();
    amefBatch.set(ref, { ...item, proyectoId });
  }
  await amefBatch.commit();
  console.log(`   ✓ ${amefItems.length} modos de falla cargados (2 críticos NPR>200)`);

  // 5. Financiero
  console.log("💰 Cargando proyección financiera...");
  await db.collection(atenaPath("financiero")).add({ ...financiero, proyectoId });
  console.log("   ✓ Financiero cargado (VAN=$3.24M MXN, TIR=34%)");

  console.log("─".repeat(60));
  console.log("✅ ATENA seed completado exitosamente");
  console.log(`   Proyecto ID: ${proyectoId}`);
  console.log(`   Colecciones: atena_proyectos, atena_analisis, atena_spc, atena_amef, atena_financiero`);
}

seed().catch((err) => {
  console.error("❌ Error en seed:", err);
  process.exit(1);
});
