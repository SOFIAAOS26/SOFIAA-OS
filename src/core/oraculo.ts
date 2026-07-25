/**
 * ORÁCULO — Predictive Intelligence Engine
 * Generación 2 · El Olimpo SOFIAA OS
 *
 * Motor determinista de predicciones. Sin LLM en el hot path.
 * Sintetiza señales de todos los dioses del Olimpo y genera
 * predicciones accionables antes de que el usuario pregunte.
 *
 * Sprint O-1:
 *   scanAllEngines()       → ATENA (SPC + AMEF) + TEC Bii (urgency + alertaRiesgo)
 *   generatePredictions()  → motor de reglas, THEMIS gate, persistencia Firestore
 *
 * Sprint O-2 (pendiente):
 *   PROMETEO scanner (BrandGoal deviation + fatiga creativa)
 *   NEXO scanner (hypotheses de alto confidence)
 *   HERMES scanner (veto ratio)
 *   THEMIS scanner (violations recurrentes)
 */

import { adminDb }    from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { evaluateResponse } from "@/core/themis";

import type { FMEAItem, SPCData }               from "@/extensions/atena/schema";
import type { ProyectoV2, ProveedorV2 }          from "@/extensions/tec-bii/schema";

import type {
  OracleSignal,
  OraclePrediction,
  OracleRecommendation,
  OracleConfig,
  OracleCategory,
  OracleSeverity,
  OracleHorizon,
  DEFAULT_ORACLE_CONFIG,
} from "@/types/oraculo";
import { DEFAULT_ORACLE_CONFIG as DEFAULT_CONFIG } from "@/types/oraculo";

// ── ID generator ──────────────────────────────────────────────────────────────

function genId(): string {
  return crypto.randomUUID();
}

// ── Firestore path helpers ────────────────────────────────────────────────────

const atenaCol = (uid: string, col: string) =>
  adminDb.collection(`users/${uid}/atena_${col}`);

const tecBiiCol = (uid: string, col: string) =>
  adminDb.collection(`users/${uid}/tec_bii_${col}`);

const predictionsCol = (uid: string) =>
  adminDb.collection(`users/${uid}/oracle_predictions`);

const signalsCol = (uid: string) =>
  adminDb.collection(`users/${uid}/oracle_signals`);

// ── Config loader ─────────────────────────────────────────────────────────────

let _configCache:   OracleConfig | null = null;
let _configCacheAt: number = 0;
const CONFIG_TTL = 120_000; // 2 min

async function getConfig(): Promise<OracleConfig> {
  const now = Date.now();
  if (_configCache !== null && now - _configCacheAt < CONFIG_TTL) return _configCache;
  try {
    const snap = await adminDb.collection("system").doc("oraculo").get();
    if (snap.exists) {
      _configCache   = snap.data() as OracleConfig;
      _configCacheAt = now;
      return _configCache;
    }
  } catch {
    // Silencioso — usa default
  }
  _configCache   = DEFAULT_CONFIG;
  _configCacheAt = now;
  return DEFAULT_CONFIG;
}

// ── Deduplication: ¿ya existe predicción activa de este tipo + entidad? ───────

async function isDuplicate(
  uid:        string,
  sourceEngine: string,
  signalType: string,
  entityId:   string,
): Promise<boolean> {
  try {
    const snap = await predictionsCol(uid)
      .where("status", "==", "active")
      .limit(50)
      .get();

    return snap.docs.some((d) => {
      const p = d.data() as OraclePrediction;
      return p.signals.some(
        (s) => s.sourceEngine === sourceEngine &&
               s.signalType  === signalType    &&
               s.entityId    === entityId
      );
    });
  } catch {
    return false;
  }
}

// ── ══════════════════════════════════════════════════════════════════════════ ──
//    SCANNERS POR ENGINE
// ── ══════════════════════════════════════════════════════════════════════════ ──

// ── ATENA Scanner ─────────────────────────────────────────────────────────────

async function scanAtena(
  uid:    string,
  config: OracleConfig,
): Promise<OracleSignal[]> {
  if (!config.enginesEnabled.atena) return [];

  const signals: OracleSignal[] = [];
  const threshold = config.thresholds.nprCritico; // default 100
  const now       = Date.now();

  // ── AMEF: items con NPR alto o crítico, estado abierto/en_proceso ──────────
  try {
    const snap = await atenaCol(uid, "amef")
      .where("estado", "in", ["abierto", "en_proceso"])
      .get();

    for (const doc of snap.docs) {
      const item = { id: doc.id, ...doc.data() } as FMEAItem;
      if (item.npr < threshold) continue;

      const isCritical = item.npr >= 200;
      signals.push({
        id:           genId(),
        sourceEngine: "atena",
        signalType:   "amef_npm_alto",
        severity:     isCritical ? "critical" : "warning",
        entityId:     item.id,
        entityLabel:  `${item.pasoDelProceso} — NPR ${item.npr}`,
        category:     "operational_risk",
        payload: {
          proyectoId:       item.proyectoId,
          pasoDelProceso:   item.pasoDelProceso,
          modoDeFalla:      item.modoDeFalla,
          efectoDelFallo:   item.efectoDelFallo,
          causaRaiz:        item.causaRaiz,
          npr:              item.npr,
          severidad:        item.severidad,
          ocurrencia:       item.ocurrencia,
          deteccion:        item.deteccion,
          estado:           item.estado,
          critico:          isCritical,
          accionCorrectiva: item.accionCorrectiva ?? null,
        },
        capturedAt: now,
        userId:     uid,
      });
    }
  } catch (err) {
    console.warn("[ORÁCULO][atena] Error escaneando AMEF:", err);
  }

  // ── SPC: violaciones Western Electric en cartas de control ─────────────────
  try {
    const snap = await atenaCol(uid, "spc").get();
    const spcThreshold = config.thresholds.spcViolationCount; // default 3

    for (const doc of snap.docs) {
      const spc = { id: doc.id, ...doc.data() } as SPCData;
      if (spc.violacionesWesternElectric <= 0) continue;

      const isCritical = spc.violacionesWesternElectric >= spcThreshold;
      const puntosFC   = (spc.puntos ?? []).filter((p) => p.fueraDeControl);
      const reglas     = [...new Set(puntosFC.map((p) => p.reglaViolada).filter(Boolean))].join(", ");

      signals.push({
        id:           genId(),
        sourceEngine: "atena",
        signalType:   "spc_violation",
        severity:     isCritical ? "critical" : "warning",
        entityId:     spc.id,
        entityLabel:  `SPC — ${spc.variable} (${spc.violacionesWesternElectric} violaciones)`,
        category:     "operational_risk",
        payload: {
          proyectoId:                  spc.proyectoId,
          variable:                    spc.variable,
          unidad:                      spc.unidad,
          violacionesWesternElectric:  spc.violacionesWesternElectric,
          cpk:                         spc.cpk,
          reglas,
          interpretacion:              spc.interpretacion,
        },
        capturedAt: now,
        userId:     uid,
      });
    }
  } catch (err) {
    console.warn("[ORÁCULO][atena] Error escaneando SPC:", err);
  }

  return signals;
}

// ── TEC Bii Scanner ───────────────────────────────────────────────────────────

async function scanTecBii(
  uid:    string,
  config: OracleConfig,
): Promise<OracleSignal[]> {
  if (!config.enginesEnabled.tec_bii) return [];

  const signals:   OracleSignal[] = [];
  const urgThresh  = config.thresholds.urgencyScoreCritico; // default 0.75
  const now        = Date.now();

  // ── Proyectos: urgencyScore alto ────────────────────────────────────────────
  try {
    const snap = await tecBiiCol(uid, "proyectos").get();

    for (const doc of snap.docs) {
      const p = { id: doc.id, ...doc.data() } as ProyectoV2;
      const urgency = p.urgencyScore ?? 0;
      if (urgency < urgThresh) continue;

      const isCritical = urgency >= 0.9;
      signals.push({
        id:           genId(),
        sourceEngine: "tec_bii",
        signalType:   "high_urgency_project",
        severity:     isCritical ? "critical" : "warning",
        entityId:     p.id ?? doc.id,
        entityLabel:  p.titulo ?? "Proyecto sin nombre",
        category:     "delivery_risk",
        payload: {
          titulo:              p.titulo,
          estado:              p.estado,
          urgencyScore:        urgency,
          deadlineDays:        p.deadlineDays ?? null,
          briefId:             p.briefId ?? null,
          asignadoId:          p.asignadoId ?? null,
          assigneeCalidad:     p.assigneeCalidad ?? null,
          assigneeCumplimiento: p.assigneeCumplimiento ?? null,
        },
        capturedAt: now,
        userId:     uid,
      });
    }
  } catch (err) {
    console.warn("[ORÁCULO][tec_bii] Error escaneando proyectos:", err);
  }

  // ── Proveedores: alertaRiesgo activa ────────────────────────────────────────
  try {
    const snap = await tecBiiCol(uid, "proveedores")
      .where("alertaRiesgo", "==", true)
      .get();

    for (const doc of snap.docs) {
      const prov = { id: doc.id, ...doc.data() } as ProveedorV2;

      signals.push({
        id:           genId(),
        sourceEngine: "tec_bii",
        signalType:   "proveedor_riesgo",
        severity:     "warning",
        entityId:     prov.id ?? doc.id,
        entityLabel:  prov.nombre ?? "Proveedor sin nombre",
        category:     "resource_risk",
        payload: {
          nombre:            prov.nombre,
          calidadPromedio:   prov.calidadPromedio ?? null,
          cumplimientoRate:  prov.cumplimientoRate ?? null,
          tendenciaCalidad:  prov.tendenciaCalidad ?? null,
          alertaRiesgo:      true,
        },
        capturedAt: now,
        userId:     uid,
      });
    }
  } catch (err) {
    console.warn("[ORÁCULO][tec_bii] Error escaneando proveedores:", err);
  }

  return signals;
}

// ── ══════════════════════════════════════════════════════════════════════════ ──
//    SCAN PRINCIPAL
// ── ══════════════════════════════════════════════════════════════════════════ ──

/**
 * Consulta todos los engines habilitados en paralelo.
 * Devuelve señales crudas sin persistir.
 * Determinista — sin LLM — target < 500 ms.
 */
export async function scanAllEngines(
  userId:    string,
  config?:   OracleConfig,
): Promise<OracleSignal[]> {
  const cfg = config ?? await getConfig();

  const [atenaSignals, tecBiiSignals] = await Promise.all([
    scanAtena(userId, cfg),
    scanTecBii(userId, cfg),
    // Sprint O-2: scanPrometeo, scanNexo, scanHermes, scanThemis
  ]);

  return [...atenaSignals, ...tecBiiSignals];
}

// ── ══════════════════════════════════════════════════════════════════════════ ──
//    MOTOR DE REGLAS → PREDICCIONES
// ── ══════════════════════════════════════════════════════════════════════════ ──

// ── Horizon según señal ──────────────────────────────────────────────────────

function computeHorizon(signal: OracleSignal): OracleHorizon {
  if (signal.signalType === "high_urgency_project") {
    const urgency = (signal.payload.urgencyScore as number) ?? 0;
    return urgency >= 0.9 ? "24h" : "7d";
  }
  if (signal.signalType === "amef_npm_alto") {
    const critico = signal.payload.critico as boolean;
    return critico ? "7d" : "30d";
  }
  if (signal.signalType === "spc_violation") {
    const count = (signal.payload.violacionesWesternElectric as number) ?? 0;
    return count >= 5 ? "24h" : "7d";
  }
  if (signal.signalType === "proveedor_riesgo") return "30d";
  return "7d";
}

// ── Confidence según número y severidad de señales ──────────────────────────

function computeConfidence(signals: OracleSignal[]): number {
  const criticals = signals.filter((s) => s.severity === "critical").length;
  const warnings  = signals.filter((s) => s.severity === "warning").length;

  if (criticals >= 2) return 0.95;
  if (criticals === 1 && warnings >= 1) return 0.85;
  if (criticals === 1) return 0.75;
  if (warnings >= 3) return 0.80;
  if (warnings >= 2) return 0.70;
  return 0.55;
}

// ── Severity del grupo ───────────────────────────────────────────────────────

function groupSeverity(signals: OracleSignal[]): OracleSeverity {
  if (signals.some((s) => s.severity === "critical")) return "critical";
  if (signals.some((s) => s.severity === "warning"))  return "warning";
  return "info";
}

// ── Horizon del grupo ────────────────────────────────────────────────────────

function groupHorizon(signals: OracleSignal[]): OracleHorizon {
  const ORDER: OracleHorizon[] = ["24h", "7d", "30d", "90d"];
  const horizons = signals.map(computeHorizon);
  return horizons.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))[0];
}

// ── Título determinista por signalType ───────────────────────────────────────

function buildTitle(signals: OracleSignal[]): string {
  const types = [...new Set(signals.map((s) => s.signalType))];
  const primary = signals[0];

  if (types.includes("amef_npm_alto") && signals.length === 1) {
    const npr = primary.payload.npr as number;
    return `Falla crítica detectada: ${primary.entityLabel}`;
  }
  if (types.includes("spc_violation") && signals.length === 1) {
    const v = primary.payload.violacionesWesternElectric as number;
    return `Proceso fuera de control: ${primary.payload.variable} (${v} violaciones)`;
  }
  if (types.includes("high_urgency_project") && signals.length === 1) {
    return `Proyecto en riesgo de entrega: ${primary.entityLabel}`;
  }
  if (types.includes("proveedor_riesgo") && signals.length === 1) {
    return `Proveedor con alerta de riesgo: ${primary.entityLabel}`;
  }

  // Múltiples señales del mismo tipo
  const engine = primary.sourceEngine.toUpperCase().replace("_", " ");
  const count  = signals.length;
  const sev    = groupSeverity(signals);
  const label  = sev === "critical" ? "críticos" : "en riesgo";
  return `${engine}: ${count} elemento(s) ${label} detectado(s)`;
}

// ── Summary determinista ─────────────────────────────────────────────────────

function buildSummary(signals: OracleSignal[], title: string): string {
  const primary = signals[0];
  const horizon = groupHorizon(signals);

  if (primary.signalType === "amef_npm_alto") {
    const npr  = primary.payload.npr as number;
    const falla = primary.payload.modoDeFalla as string;
    const causa = primary.payload.causaRaiz as string;
    return `ATENA detectó un modo de falla con NPR ${npr} en el proceso "${primary.payload.pasoDelProceso}". ` +
           `Falla: ${falla}. Causa raíz: ${causa}. Se requiere acción correctiva en los próximos ${horizon}.`;
  }

  if (primary.signalType === "spc_violation") {
    const v      = primary.payload.violacionesWesternElectric as number;
    const variable = primary.payload.variable as string;
    const reglas = (primary.payload.reglas as string) || "reglas Western Electric";
    return `La variable "${variable}" presenta ${v} violación(es) de control estadístico (${reglas}). ` +
           `El proceso requiere revisión inmediata para restablecer la capacidad.`;
  }

  if (primary.signalType === "high_urgency_project") {
    const score      = ((primary.payload.urgencyScore as number) * 100).toFixed(0);
    const deadline   = primary.payload.deadlineDays as number | null;
    const deadlineStr = deadline != null ? ` (${deadline} días restantes)` : "";
    return `El proyecto "${primary.entityLabel}" tiene urgencia ${score}% calculada por deadline${deadlineStr}. ` +
           `Riesgo de incumplimiento de entrega detectado en los próximos ${horizon}.`;
  }

  if (primary.signalType === "proveedor_riesgo") {
    const calidad = primary.payload.calidadPromedio as number | null;
    const cumpl   = primary.payload.cumplimientoRate as number | null;
    const tendencia = primary.payload.tendenciaCalidad as string | null;
    return `El proveedor "${primary.entityLabel}" tiene alerta de riesgo activa. ` +
           [
             calidad != null  ? `Calidad promedio: ${calidad.toFixed(1)}/5.0.` : null,
             cumpl != null    ? `Cumplimiento: ${(cumpl * 100).toFixed(0)}%.`  : null,
             tendencia        ? `Tendencia: ${tendencia}.`                     : null,
           ].filter(Boolean).join(" ");
  }

  // Fallback multi-señal
  return `${title}. ${signals.length} señal(es) detectada(s) requieren atención en los próximos ${horizon}.`;
}

// ── Recomendaciones por signalType ───────────────────────────────────────────

function buildRecommendations(signals: OracleSignal[]): OracleRecommendation[] {
  const recs: OracleRecommendation[] = [];
  const primary = signals[0];

  if (primary.signalType === "amef_npm_alto") {
    const proyId = primary.payload.proyectoId as string;
    recs.push({
      id:         genId(),
      text:       `Revisar y actualizar la acción correctiva del AMEF en ATENA para "${primary.entityLabel}".`,
      actionType: "review",
      priority:   "high",
    });
    if (primary.severity === "critical") {
      recs.push({
        id:         genId(),
        text:       `Crear tarea urgente en Monday.com para asignar responsable del AMEF crítico.`,
        actionType: "hermes_action",
        hermesPayload: {
          tipo:        "monday_crear_tarea",
          sourceEngine: "oraculo",
          payload: {
            nombre:   `[ORÁCULO] AMEF Crítico: ${primary.entityLabel}`,
            columnas: { status: "Stuck", text: `NPR: ${primary.payload.npr}. Proyecto: ${proyId}` },
          },
        },
        priority: "high",
      });
    }
  }

  if (primary.signalType === "spc_violation") {
    recs.push({
      id:         genId(),
      text:       `Revisar la carta de control de "${primary.payload.variable}" en ATENA y verificar causas especiales.`,
      actionType: "review",
      priority:   "high",
    });
    recs.push({
      id:         genId(),
      text:       `Notificar al equipo de operaciones sobre el proceso fuera de control.`,
      actionType: "hermes_action",
      hermesPayload: {
        tipo:        "slack_notificar_urgente",
        sourceEngine: "oraculo",
        payload: {
          mensaje: `🚨 ORÁCULO | SPC fuera de control: ${primary.payload.variable} — ${primary.payload.violacionesWesternElectric} violaciones WE.`,
        },
      },
      priority: "high",
    });
  }

  if (primary.signalType === "high_urgency_project") {
    const score      = ((primary.payload.urgencyScore as number) * 100).toFixed(0);
    recs.push({
      id:         genId(),
      text:       `Revisar el avance del proyecto "${primary.entityLabel}" en TEC Bii y reasignar recursos si es necesario.`,
      actionType: "review",
      priority:   primary.severity === "critical" ? "high" : "medium",
    });
    recs.push({
      id:         genId(),
      text:       `Escalar urgencia del proyecto (${score}%) con el equipo en Monday.com.`,
      actionType: "hermes_action",
      hermesPayload: {
        tipo:        "monday_crear_tarea",
        sourceEngine: "oraculo",
        payload: {
          nombre:   `[ORÁCULO] Proyecto en riesgo: ${primary.entityLabel}`,
          columnas: { status: "Working on it", text: `Urgencia: ${score}%` },
        },
      },
      priority: "medium",
    });
  }

  if (primary.signalType === "proveedor_riesgo") {
    recs.push({
      id:         genId(),
      text:       `Evaluar al proveedor "${primary.entityLabel}" con una evaluación de calidad actualizada en TEC Bii.`,
      actionType: "user_decision",
      priority:   "medium",
    });
    recs.push({
      id:         genId(),
      text:       `Considerar proveedor de respaldo mientras se resuelve el riesgo.`,
      actionType: "user_decision",
      priority:   "low",
    });
  }

  // Mínimo una recomendación de revisión
  if (recs.length === 0) {
    recs.push({
      id:         genId(),
      text:       `Revisar la situación detectada por ORÁCULO y tomar acción preventiva.`,
      actionType: "review",
      priority:   "medium",
    });
  }

  return recs;
}

// ── THEMIS gate ───────────────────────────────────────────────────────────────

async function applyThemisGate(
  prediction: OraclePrediction,
  userId:     string,
): Promise<{ approved: boolean; verdictId?: string }> {
  try {
    const text = `${prediction.title}. ${prediction.summary}`;
    const verdict = await evaluateResponse(
      text,
      {
        activePath:   "/oraculo",
        extensionId:  "oraculo",
        userRole:     null,
        isGoalActive: false,
        userMessage:  text,
      },
      userId,
      prediction.id,
    );

    return { approved: verdict.approved, verdictId: verdict.id };
  } catch {
    // THEMIS nunca debe bloquear por error técnico — aprobación silenciosa
    return { approved: true };
  }
}

// ── ══════════════════════════════════════════════════════════════════════════ ──
//    generatePredictions — motor de reglas principal
// ── ══════════════════════════════════════════════════════════════════════════ ──

/**
 * Transforma señales crudas en predicciones persistidas en Firestore.
 * Cada predicción pasa por el gate de THEMIS antes de guardarse.
 *
 * Reglas de agrupación:
 *   - Señales del mismo engine + signalType + entityId → 1 predicción
 *   - Deduplicación: no crea si ya existe predicción activa del mismo tipo
 */
export async function generatePredictions(
  signals: OracleSignal[],
  userId:  string,
): Promise<OraclePrediction[]> {
  if (signals.length === 0) return [];

  // ── Agrupar señales por engine + signalType + entityId ─────────────────────
  const groups = new Map<string, OracleSignal[]>();
  for (const signal of signals) {
    const key = `${signal.sourceEngine}:${signal.signalType}:${signal.entityId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(signal);
  }

  const predictions: OraclePrediction[] = [];

  for (const [key, groupSignals] of groups.entries()) {
    const primary = groupSignals[0];

    // ── Deduplicación ─────────────────────────────────────────────────────────
    const dup = await isDuplicate(
      userId,
      primary.sourceEngine,
      primary.signalType,
      primary.entityId,
    );
    if (dup) continue;

    // ── Construir predicción ──────────────────────────────────────────────────
    const now        = Date.now();
    const id         = genId();
    const title      = buildTitle(groupSignals);
    const summary    = buildSummary(groupSignals, title);
    const confidence = computeConfidence(groupSignals);
    const horizon    = groupHorizon(groupSignals);
    const severity   = groupSeverity(groupSignals);
    const category   = primary.category;
    const recs       = buildRecommendations(groupSignals);

    const prediction: OraclePrediction = {
      id,
      userId,
      title,
      summary,
      category,
      confidence,
      horizon,
      signals:         groupSignals,
      recommendations: recs,
      severity,
      status:          "active",
      themisApproved:  false,
      createdAt:       now,
      updatedAt:       now,
    };

    // ── THEMIS gate ───────────────────────────────────────────────────────────
    const { approved, verdictId } = await applyThemisGate(prediction, userId);
    if (!approved) {
      console.warn(`[ORÁCULO] THEMIS bloqueó predicción ${id} — no se persiste`);
      continue;
    }

    prediction.themisApproved  = true;
    prediction.themisVerdictId = verdictId;

    // ── Persistir señales + predicción ────────────────────────────────────────
    try {
      // Señales (fire-and-forget batch)
      const batch = adminDb.batch();
      for (const signal of groupSignals) {
        const signalRef = signalsCol(userId).doc(signal.id);
        batch.set(signalRef, { ...signal, _serverTs: FieldValue.serverTimestamp() });
      }
      // Predicción
      const predRef = predictionsCol(userId).doc(id);
      batch.set(predRef, { ...prediction, _serverTs: FieldValue.serverTimestamp() });
      await batch.commit();

      predictions.push(prediction);
    } catch (err) {
      console.error("[ORÁCULO] Error persistiendo predicción:", err);
    }
  }

  return predictions;
}

// ── ══════════════════════════════════════════════════════════════════════════ ──
//    EXPORTS PÚBLICOS
// ── ══════════════════════════════════════════════════════════════════════════ ──

/**
 * Actualiza el estado de una predicción (acknowledge, dismiss, resolve).
 */
export async function updatePredictionStatus(
  userId:       string,
  predictionId: string,
  status:       "acknowledged" | "dismissed" | "resolved",
  note?:        string,
): Promise<void> {
  const now  = Date.now();
  const data: Record<string, unknown> = {
    status,
    updatedAt:   now,
    _serverTs:   FieldValue.serverTimestamp(),
  };
  if (note)                    data.userNote        = note;
  if (status === "acknowledged") data.acknowledgedAt = now;
  if (status === "resolved")     data.resolvedAt     = now;

  await predictionsCol(userId).doc(predictionId).update(data);
}

/**
 * Persiste una señal ingestada por otro engine (motor-a-motor).
 * Dispara generatePredictions() con la señal recibida.
 */
export async function ingestSignal(
  signal: OracleSignal,
): Promise<{ signalId: string; predictionsTriggered: number }> {
  // Persistir señal
  await signalsCol(signal.userId).doc(signal.id).set({
    ...signal,
    _serverTs: FieldValue.serverTimestamp(),
  });

  // Intentar generar predicción con esta señal
  const preds = await generatePredictions([signal], signal.userId);
  return { signalId: signal.id, predictionsTriggered: preds.length };
}

/**
 * Invalida el cache de configuración (llamar si se actualiza system/oraculo).
 */
export function invalidateConfigCache(): void {
  _configCache   = null;
  _configCacheAt = 0;
}
