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
 * Sprint O-2:
 *   PROMETEO scanner (BrandGoal deviation + fatiga creativa)
 *   NEXO scanner (hypotheses de alto confidence sin validar)
 *   HERMES scanner (veto ratio en los últimos 30 días)
 *   THEMIS scanner (error-severity verdicts en 48h)
 */

import { adminDb }    from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { evaluateResponse } from "@/core/themis";

import type { FMEAItem, SPCData }                    from "@/extensions/atena/schema";
import type { ProyectoV2, ProveedorV2, Hypothesis }  from "@/extensions/tec-bii/schema";
import type { BrandGoal, CreativeMemory }            from "@/extensions/prometeo/schema";
import type { HermesAction }                         from "@/extensions/hermes/schema";
import type { ThemisVerdict }                        from "@/types/themis";

import type {
  OracleSignal,
  OraclePrediction,
  OracleRecommendation,
  OracleConfig,
  OracleCategory,
  OracleSeverity,
  OracleHorizon,
  OracleForecast,
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

// ── PROMETEO Scanner ──────────────────────────────────────────────────────────

async function scanPrometeo(
  uid:    string,
  config: OracleConfig,
): Promise<OracleSignal[]> {
  if (!config.enginesEnabled.prometeo) return [];

  const signals:           OracleSignal[] = [];
  const deviationThreshold = config.thresholds.goalDeviationPct; // 0.2
  const now                = Date.now();

  try {
    const wsSnap = await adminDb.collection("smm_workspaces").get();

    for (const wsDoc of wsSnap.docs) {
      const wid = wsDoc.id;

      // ── BrandGoals: objetivos activos con desviación bajo el target ──────────
      try {
        const goalsSnap = await adminDb
          .collection(`smm_workspaces/${wid}/prometeo_goals`)
          .where("estado", "==", "activo")
          .get();

        for (const gDoc of goalsSnap.docs) {
          const goal = { id: gDoc.id, ...gDoc.data() } as BrandGoal;
          if (goal.valorObjetivo <= 0) continue;

          const deviation = 1 - goal.valorActual / goal.valorObjetivo;
          if (deviation < deviationThreshold) continue;

          const isCritical = deviation >= 0.4;
          signals.push({
            id:           genId(),
            sourceEngine: "prometeo",
            signalType:   "goal_at_risk",
            severity:     isCritical ? "critical" : "warning",
            entityId:     goal.id,
            entityLabel:  `${goal.clienteNombre} — ${goal.titulo}`,
            category:     "marketing_risk",
            payload: {
              workspaceId:   wid,
              clienteId:     goal.clienteId,
              clienteNombre: goal.clienteNombre,
              titulo:        goal.titulo,
              metaKPI:       goal.metaKPI,
              valorActual:   goal.valorActual,
              valorObjetivo: goal.valorObjetivo,
              unidad:        goal.unidad,
              desviacionPct: deviation,
              fechaLimite:   goal.fechaLimite,
              canal:         goal.canal,
            },
            capturedAt: now,
            userId:     uid,
          });
        }
      } catch (err) {
        console.warn(`[ORÁCULO][prometeo] Error goals workspace ${wid}:`, err);
      }

      // ── Creative Memory: creativos con performanceScore bajo ─────────────────
      try {
        const memSnap = await adminDb
          .collection(`smm_workspaces/${wid}/prometeo_creative_memory`)
          .where("usarDeNuevo", "==", false)
          .get();

        const badCreatives = memSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as CreativeMemory))
          .filter((m) => m.performanceScore < 30);

        if (badCreatives.length >= 3) {
          const avg = badCreatives.reduce((s, m) => s + m.performanceScore, 0) / badCreatives.length;
          signals.push({
            id:           genId(),
            sourceEngine: "prometeo",
            signalType:   "creative_fatigue",
            severity:     "warning",
            entityId:     `${wid}_fatiga`,
            entityLabel:  `Workspace ${wid} — ${badCreatives.length} creativos de bajo rendimiento`,
            category:     "marketing_risk",
            payload: {
              workspaceId:       wid,
              badCreativesCount: badCreatives.length,
              avgPerformance:    avg,
            },
            capturedAt: now,
            userId:     uid,
          });
        }
      } catch (err) {
        console.warn(`[ORÁCULO][prometeo] Error creative memory workspace ${wid}:`, err);
      }
    }
  } catch (err) {
    console.warn("[ORÁCULO][prometeo] Error obteniendo workspaces:", err);
  }

  return signals;
}

// ── NEXO Scanner ──────────────────────────────────────────────────────────────

async function scanNexo(
  uid:    string,
  config: OracleConfig,
): Promise<OracleSignal[]> {
  if (!config.enginesEnabled.nexo) return [];

  const signals:       OracleSignal[] = [];
  const CONF_MIN       = 0.7;
  const now            = Date.now();

  const entityCols: Array<{ col: string; labelField: string }> = [
    { col: "tec_bii_proyectos",  labelField: "titulo" },
    { col: "tec_bii_proveedores", labelField: "nombre" },
    { col: "tec_bii_empleados",   labelField: "nombre" },
  ];

  for (const { col, labelField } of entityCols) {
    try {
      const snap = await adminDb.collection(`users/${uid}/${col}`).get();

      for (const doc of snap.docs) {
        const entity     = { id: doc.id, ...doc.data() } as Record<string, unknown>;
        const hypotheses = (entity.hypotheses ?? []) as Hypothesis[];

        const pending = hypotheses.filter(
          (h) => h.confidence >= CONF_MIN && h.validated !== true && h.dismissed !== true,
        );
        if (pending.length === 0) continue;

        const best = pending.sort((a, b) => b.confidence - a.confidence)[0];
        signals.push({
          id:           genId(),
          sourceEngine: "nexo",
          signalType:   "hypothesis_pending",
          severity:     best.confidence >= 0.9 ? "critical" : "warning",
          entityId:     doc.id,
          entityLabel:  String(entity[labelField] ?? doc.id),
          category:     "strategic_opportunity",
          payload: {
            collection:     col,
            pendingCount:   pending.length,
            bestHypothesis: best.text,
            bestConfidence: best.confidence,
            bestSources:    best.sources,
          },
          capturedAt: now,
          userId:     uid,
        });
      }
    } catch (err) {
      console.warn(`[ORÁCULO][nexo] Error escaneando ${col}:`, err);
    }
  }

  return signals;
}

// ── HERMES Scanner ────────────────────────────────────────────────────────────

async function scanHermes(
  uid:    string,
  config: OracleConfig,
): Promise<OracleSignal[]> {
  if (!config.enginesEnabled.hermes) return [];

  const signals:      OracleSignal[] = [];
  const now           = Date.now();
  const cutoff30d     = now - 30 * 24 * 60 * 60 * 1000;
  const vetoThreshold = config.thresholds.hermesVetoRatio; // 0.1

  try {
    const wsSnap = await adminDb.collection("smm_workspaces").get();

    for (const wsDoc of wsSnap.docs) {
      const wid = wsDoc.id;
      try {
        const qSnap = await adminDb
          .collection(`smm_workspaces/${wid}/hermes_queue`)
          .where("createdAt", ">=", cutoff30d)
          .get();

        const total  = qSnap.size;
        if (total === 0) continue;

        const vetoed = qSnap.docs.filter(
          (d) => (d.data() as HermesAction).estado === "vetada_por_themis",
        ).length;

        const ratio = vetoed / total;
        if (ratio < vetoThreshold) continue;

        const isCritical = ratio >= 0.25;
        signals.push({
          id:           genId(),
          sourceEngine: "hermes",
          signalType:   "hermes_veto_ratio",
          severity:     isCritical ? "critical" : "warning",
          entityId:     wid,
          entityLabel:  `HERMES Workspace ${wid}`,
          category:     "compliance_risk",
          payload: {
            workspaceId: wid,
            total,
            vetoed,
            ratio,
            cutoffDays:  30,
          },
          capturedAt: now,
          userId:     uid,
        });
      } catch (err) {
        console.warn(`[ORÁCULO][hermes] Error workspace ${wid}:`, err);
      }
    }
  } catch (err) {
    console.warn("[ORÁCULO][hermes] Error obteniendo workspaces:", err);
  }

  return signals;
}

// ── THEMIS Scanner ────────────────────────────────────────────────────────────

async function scanThemis(
  uid:    string,
  config: OracleConfig,
): Promise<OracleSignal[]> {
  if (!config.enginesEnabled.themis) return [];

  const signals  = [] as OracleSignal[];
  const now      = Date.now();
  // THEMIS verdicts usan campo `date` (YYYY-MM-DD) para queries por fecha
  const cutoff   = new Date(now - 48 * 60 * 60 * 1000);
  const cutoffDate = cutoff.toISOString().slice(0, 10); // "YYYY-MM-DD"

  try {
    const snap = await adminDb
      .collection(`users/${uid}/themis_verdicts`)
      .where("severity", "==", "error")
      .where("date", ">=", cutoffDate)
      .orderBy("date", "desc")
      .get();

    const count = snap.size;
    if (count <= 3) return signals;

    // Agregar políticas únicas afectadas
    const policiesSet = new Set<string>();
    for (const doc of snap.docs) {
      const verdict = doc.data() as ThemisVerdict;
      verdict.violations?.forEach((v) => policiesSet.add(v.policyName));
    }

    const isCritical = count >= 8;
    signals.push({
      id:           genId(),
      sourceEngine: "themis",
      signalType:   "themis_violations",
      severity:     isCritical ? "critical" : "warning",
      entityId:     `${uid}_themis_errors`,
      entityLabel:  `THEMIS — ${count} violaciones críticas (48h)`,
      category:     "compliance_risk",
      payload: {
        errorCount:     count,
        uniquePolicies: policiesSet.size,
        topPolicies:    [...policiesSet].slice(0, 3).join(", "),
        windowHours:    48,
      },
      capturedAt: now,
      userId:     uid,
    });
  } catch (err) {
    console.warn("[ORÁCULO][themis] Error escaneando themis_verdicts:", err);
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

  const [
    atenaSignals,
    tecBiiSignals,
    prometeoSignals,
    nexoSignals,
    hermesSignals,
    themisSignals,
  ] = await Promise.all([
    scanAtena(userId, cfg),
    scanTecBii(userId, cfg),
    scanPrometeo(userId, cfg),
    scanNexo(userId, cfg),
    scanHermes(userId, cfg),
    scanThemis(userId, cfg),
  ]);

  return [
    ...atenaSignals,
    ...tecBiiSignals,
    ...prometeoSignals,
    ...nexoSignals,
    ...hermesSignals,
    ...themisSignals,
  ];
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
  if (signal.signalType === "goal_at_risk") {
    const dev = signal.payload.desviacionPct as number;
    return dev >= 0.4 ? "7d" : "30d";
  }
  if (signal.signalType === "creative_fatigue")   return "30d";
  if (signal.signalType === "hypothesis_pending") {
    const conf = signal.payload.bestConfidence as number;
    return conf >= 0.9 ? "7d" : "30d";
  }
  if (signal.signalType === "hermes_veto_ratio")  return "30d";
  if (signal.signalType === "themis_violations")  return "7d";
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

  if (types.includes("goal_at_risk") && signals.length === 1) {
    const dev = ((primary.payload.desviacionPct as number) * 100).toFixed(0);
    return `Objetivo PROMETEO en riesgo: ${primary.entityLabel} (−${dev}% del objetivo)`;
  }
  if (types.includes("creative_fatigue") && signals.length === 1) {
    const count = primary.payload.badCreativesCount as number;
    return `Fatiga creativa: ${count} creativos de bajo rendimiento detectados`;
  }
  if (types.includes("hypothesis_pending") && signals.length === 1) {
    return `Hipótesis NEXO sin validar: ${primary.entityLabel}`;
  }
  if (types.includes("hermes_veto_ratio") && signals.length === 1) {
    const pct = ((primary.payload.ratio as number) * 100).toFixed(0);
    return `HERMES: ${pct}% de acciones vetadas por THEMIS (30 días)`;
  }
  if (types.includes("themis_violations") && signals.length === 1) {
    const count = primary.payload.errorCount as number;
    return `THEMIS: ${count} violaciones críticas en las últimas 48 horas`;
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

  if (primary.signalType === "goal_at_risk") {
    const dev   = ((primary.payload.desviacionPct as number) * 100).toFixed(0);
    const val   = primary.payload.valorActual    as number;
    const obj   = primary.payload.valorObjetivo  as number;
    const unid  = primary.payload.unidad         as string;
    return `El objetivo "${primary.payload.titulo}" de ${primary.payload.clienteNombre} está ${dev}% por debajo del target ` +
           `(${val} vs ${obj} ${unid}). Se requiere ajuste de estrategia o presupuesto en los próximos ${horizon}.`;
  }

  if (primary.signalType === "creative_fatigue") {
    const count = primary.payload.badCreativesCount as number;
    const avg   = (primary.payload.avgPerformance  as number).toFixed(0);
    return `${count} creativos con performance promedio de ${avg}/100 detectados en PROMETEO. ` +
           `Señal de agotamiento creativo en el workspace. Rotar creativos o generar nuevas variantes con Creative Lab.`;
  }

  if (primary.signalType === "hypothesis_pending") {
    const conf  = ((primary.payload.bestConfidence as number) * 100).toFixed(0);
    const count = primary.payload.pendingCount as number;
    return `NEXO identificó ${count} hipótesis de alta confianza sin validar en "${primary.entityLabel}". ` +
           `Hipótesis principal (${conf}% confianza): "${primary.payload.bestHypothesis}". ` +
           `Valida o descarta para mantener el grafo cognitivo limpio.`;
  }

  if (primary.signalType === "hermes_veto_ratio") {
    const pct    = ((primary.payload.ratio  as number) * 100).toFixed(0);
    const vetoed = primary.payload.vetoed   as number;
    const total  = primary.payload.total    as number;
    return `HERMES registró ${vetoed} de ${total} acciones vetadas por THEMIS en los últimos 30 días (${pct}%). ` +
           `Un ratio alto indica políticas mal calibradas o intenciones fuera del marco ético definido. ` +
           `Revisar las políticas THEMIS activas.`;
  }

  if (primary.signalType === "themis_violations") {
    const count    = primary.payload.errorCount   as number;
    const policies = primary.payload.topPolicies  as string;
    return `THEMIS registró ${count} veredictos de error en las últimas 48 horas. ` +
           `Políticas más afectadas: ${policies}. ` +
           `Revisar los policy overrides y el comportamiento de los engines para contener las violaciones.`;
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

  if (primary.signalType === "goal_at_risk") {
    recs.push({
      id:         genId(),
      text:       `Revisar la estrategia del objetivo "${primary.payload.titulo}" en PROMETEO y ajustar el plan de medios.`,
      actionType: "review",
      priority:   primary.severity === "critical" ? "high" : "medium",
    });
    recs.push({
      id:         genId(),
      text:       `Generar un nuevo Director Brief para "${primary.payload.clienteNombre}" con enfoque en recuperación del objetivo.`,
      actionType: "user_decision",
      priority:   "high",
    });
  }

  if (primary.signalType === "creative_fatigue") {
    recs.push({
      id:         genId(),
      text:       `Abrir Creative Lab de PROMETEO y generar nuevas variantes creativas para romper la fatiga.`,
      actionType: "review",
      priority:   "medium",
    });
    recs.push({
      id:         genId(),
      text:       `Revisar los creativos de bajo rendimiento en Creative Memory y marcar los que deben archivarse.`,
      actionType: "user_decision",
      priority:   "low",
    });
  }

  if (primary.signalType === "hypothesis_pending") {
    recs.push({
      id:         genId(),
      text:       `Revisar y validar la hipótesis "${primary.payload.bestHypothesis}" en "${primary.entityLabel}" en TEC Bii.`,
      actionType: "user_decision",
      priority:   primary.severity === "critical" ? "high" : "medium",
    });
  }

  if (primary.signalType === "hermes_veto_ratio") {
    recs.push({
      id:         genId(),
      text:       `Revisar el Policy Override Dashboard de THEMIS y recalibrar las políticas que generan más vetos.`,
      actionType: "review",
      priority:   "high",
    });
    recs.push({
      id:         genId(),
      text:       `Auditar las acciones vetadas en HERMES Historial para identificar patrones y ajustar las intenciones.`,
      actionType: "review",
      priority:   "medium",
    });
  }

  if (primary.signalType === "themis_violations") {
    recs.push({
      id:         genId(),
      text:       `Revisar los veredictos de THEMIS en las últimas 48 horas e identificar el engine causante de más violaciones.`,
      actionType: "review",
      priority:   "high",
    });
    recs.push({
      id:         genId(),
      text:       `Considerar activar un policy override temporal en THEMIS si las violaciones son falsos positivos.`,
      actionType: "user_decision",
      priority:   "medium",
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
 * Genera pronósticos de series de tiempo para métricas clave de cada engine.
 * Motor determinista: linear regression sobre los últimos N puntos.
 * Persiste en users/{uid}/oracle_forecasts/{id}.
 *
 * Métricas cubierta en O-2:
 *   - spc_violations   (ATENA)   → violaciones por proyecto
 *   - urgency_score    (TEC Bii) → urgencyScore promedio de proyectos activos
 *   - goal_deviation   (PROMETEO)→ desviación promedio de objetivos activos
 */
export async function generateForecasts(
  userId: string,
): Promise<OracleForecast[]> {
  const forecasts: OracleForecast[] = [];
  const now = Date.now();

  // ── Helper: proyectar valor con regresión lineal simple ───────────────────
  function linearProject(
    points:   Array<{ timestamp: number; value: number }>,
    horizonMs: number,
  ): { projectedValue: number; confidence: number } {
    if (points.length < 2) return { projectedValue: points[0]?.value ?? 0, confidence: 0.4 };

    const n = points.length;
    const xs = points.map((p) => p.timestamp);
    const ys = points.map((p) => p.value);
    const xMean = xs.reduce((s, x) => s + x, 0) / n;
    const yMean = ys.reduce((s, y) => s + y, 0) / n;

    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - xMean) * (ys[i] - yMean);
      den += (xs[i] - xMean) ** 2;
    }

    const slope     = den !== 0 ? num / den : 0;
    const intercept = yMean - slope * xMean;
    const targetX   = now + horizonMs;
    const projected = slope * targetX + intercept;
    const conf      = Math.min(0.9, 0.5 + (n - 2) * 0.05);

    return { projectedValue: projected, confidence: conf };
  }

  // ── Forecast 1: violaciones SPC (ATENA) ───────────────────────────────────
  try {
    const spcSnap = await adminDb.collection(`users/${userId}/atena_spc`).get();
    if (spcSnap.size >= 2) {
      const points = spcSnap.docs.map((d) => {
        const data = d.data() as { violacionesWesternElectric?: number; _serverTs?: { toMillis?: () => number } };
        return {
          timestamp: data._serverTs?.toMillis?.() ?? now,
          value:     data.violacionesWesternElectric ?? 0,
        };
      }).sort((a, b) => a.timestamp - b.timestamp);

      const horizon7d = 7 * 24 * 60 * 60 * 1000;
      const { projectedValue, confidence } = linearProject(points, horizon7d);
      const current = points[points.length - 1].value;

      const ref = adminDb.collection(`users/${userId}/oracle_forecasts`).doc();
      const forecast: OracleForecast = {
        id:             ref.id,
        userId,
        metric:         "spc_violations",
        engine:         "atena",
        currentValue:   current,
        projectedValue: Math.max(0, Math.round(projectedValue)),
        projectionDate: now + horizon7d,
        confidence,
        methodology:    "linear_regression",
        dataPoints:     points,
        createdAt:      now,
      };
      await ref.set({ ...forecast, _serverTs: FieldValue.serverTimestamp() });
      forecasts.push(forecast);
    }
  } catch (err) {
    console.warn("[ORÁCULO][forecasts] Error forecast SPC:", err);
  }

  // ── Forecast 2: urgencyScore promedio (TEC Bii) ───────────────────────────
  try {
    const projSnap = await adminDb.collection(`users/${userId}/tec_bii_proyectos`).get();
    if (projSnap.size >= 2) {
      // Cada documento es un punto; usamos updatedAt como timestamp
      const points = projSnap.docs
        .map((d) => {
          const data = d.data() as { urgencyScore?: number; updatedAt?: number };
          return {
            timestamp: data.updatedAt ?? now,
            value:     data.urgencyScore ?? 0,
          };
        })
        .filter((p) => p.value > 0)
        .sort((a, b) => a.timestamp - b.timestamp);

      if (points.length >= 2) {
        const horizon30d    = 30 * 24 * 60 * 60 * 1000;
        const { projectedValue, confidence } = linearProject(points, horizon30d);
        const current = points.reduce((s, p) => s + p.value, 0) / points.length;

        const ref = adminDb.collection(`users/${userId}/oracle_forecasts`).doc();
        const forecast: OracleForecast = {
          id:             ref.id,
          userId,
          metric:         "urgency_score_avg",
          engine:         "tec_bii",
          currentValue:   parseFloat(current.toFixed(3)),
          projectedValue: parseFloat(Math.min(1, Math.max(0, projectedValue)).toFixed(3)),
          projectionDate: now + horizon30d,
          confidence,
          methodology:    "linear_regression",
          dataPoints:     points,
          createdAt:      now,
        };
        await ref.set({ ...forecast, _serverTs: FieldValue.serverTimestamp() });
        forecasts.push(forecast);
      }
    }
  } catch (err) {
    console.warn("[ORÁCULO][forecasts] Error forecast urgency:", err);
  }

  // ── Forecast 3: desviación promedio de goals PROMETEO ─────────────────────
  try {
    const wsSnap = await adminDb.collection("smm_workspaces").get();
    const deviations: Array<{ timestamp: number; value: number }> = [];

    for (const wsDoc of wsSnap.docs) {
      const wid = wsDoc.id;
      try {
        const goalsSnap = await adminDb
          .collection(`smm_workspaces/${wid}/prometeo_goals`)
          .where("estado", "==", "activo")
          .get();

        for (const gDoc of goalsSnap.docs) {
          const g = gDoc.data() as { valorActual?: number; valorObjetivo?: number; updatedAt?: number };
          if (!g.valorObjetivo || g.valorObjetivo <= 0) continue;
          const dev = 1 - (g.valorActual ?? 0) / g.valorObjetivo;
          deviations.push({ timestamp: g.updatedAt ?? now, value: dev });
        }
      } catch { /* skip workspace */ }
    }

    if (deviations.length >= 2) {
      const sorted  = deviations.sort((a, b) => a.timestamp - b.timestamp);
      const horizon30d = 30 * 24 * 60 * 60 * 1000;
      const { projectedValue, confidence } = linearProject(sorted, horizon30d);
      const current = sorted.reduce((s, p) => s + p.value, 0) / sorted.length;

      const ref = adminDb.collection(`users/${userId}/oracle_forecasts`).doc();
      const forecast: OracleForecast = {
        id:             ref.id,
        userId,
        metric:         "goal_deviation_avg",
        engine:         "prometeo",
        currentValue:   parseFloat(current.toFixed(3)),
        projectedValue: parseFloat(Math.max(0, projectedValue).toFixed(3)),
        projectionDate: now + horizon30d,
        confidence,
        methodology:    "linear_regression",
        dataPoints:     sorted,
        createdAt:      now,
      };
      await ref.set({ ...forecast, _serverTs: FieldValue.serverTimestamp() });
      forecasts.push(forecast);
    }
  } catch (err) {
    console.warn("[ORÁCULO][forecasts] Error forecast PROMETEO:", err);
  }

  return forecasts;
}

/**
 * Invalida el cache de configuración (llamar si se actualiza system/oraculo).
 */
export function invalidateConfigCache(): void {
  _configCache   = null;
  _configCacheAt = 0;
}
