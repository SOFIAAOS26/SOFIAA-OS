/**
 * HERMES × ATENA Bridge — Sprint H-4
 *
 * Escanea los datos científicos de ATENA en busca de condiciones críticas
 * y las convierte en HermesActions para revisión y aprobación del usuario.
 *
 * Condiciones detectadas:
 *   AMEF — NPR > 200, estado "abierto"   → monday_crear_tarea  · urgencia CRITICA
 *   AMEF — NPR > 100, estado "abierto"   → monday_crear_tarea  · urgencia ALTA
 *   SPC  — violaciones Western Electric  → slack_notificar_urgente · urgencia ALTA
 *   SPC  — Cpk < 1.0 (proceso incapaz)  → slack_notificar        · urgencia MEDIA
 *
 * Nota de identidad:
 *   ATENA usa   users/{uid}/atena_{col}           (user-based)
 *   HERMES usa  smm_workspaces/{wid}/hermes_queue (workspace-based)
 *   El uid viene del token Firebase verificado en el endpoint.
 *
 * Server-only — usa Firebase Admin SDK.
 */

import { adminDb }    from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { FMEAItem, SPCData }                             from "@/extensions/atena/schema";
import type { HermesAction, HermesActionType, HermesConnectorType, HermesUrgencia } from "@/extensions/hermes/schema";

// ── Umbrales ──────────────────────────────────────────────────────────────────

const NPR_CRITICO  = 200;   // NPR ≥ esto → CRITICA
const NPR_ALTO     = 100;   // NPR ≥ esto → ALTA
const CPK_MINIMO   = 1.0;   // Cpk < esto → proceso incapaz

// ── Path helpers ──────────────────────────────────────────────────────────────

function atenaCol(uid: string, col: string) {
  return adminDb.collection(`users/${uid}/atena_${col}`);
}

function hermesQueue(workspaceId: string) {
  return adminDb
    .collection("smm_workspaces")
    .doc(workspaceId)
    .collection("hermes_queue");
}

// ── Builders de acciones ──────────────────────────────────────────────────────

function buildAmefAction(
  item:        FMEAItem,
  workspaceId: string,
  uid:         string,
): Omit<HermesAction, "id"> {
  const esCritico  = item.npr >= NPR_CRITICO;
  const urgencia: HermesUrgencia = esCritico ? "CRITICA" : "ALTA";

  return {
    workspaceId,
    sourceEngine:  "atena",
    sourceGoalId:  item.proyectoId,
    tipo:          "monday_crear_tarea" as HermesActionType,
    connectorTipo: "monday_cloud" as HermesConnectorType,
    payload: {
      nombre:   `[AMEF ${esCritico ? "CRÍTICO" : "ALTO"}] ${item.pasoDelProceso} — NPR ${item.npr}`,
      columnas: {
        status:  esCritico ? "Stuck" : "Working on it",
        text:    `Falla: ${item.modoDeFalla} | Causa: ${item.causaRaiz} | Acción: ${item.accionCorrectiva ?? "Pendiente definir"}`,
      },
    },
    titulo:       `${esCritico ? "🚨 AMEF Crítico" : "⚠️ AMEF Alto"}: NPR ${item.npr} — ${item.pasoDelProceso}`,
    descripcion:  `${item.modoDeFalla}. Efecto: ${item.efectoDelFallo}. Causa raíz: ${item.causaRaiz}.`,
    justificacion: `ATENA detectó un item en AMEF con NPR ${item.npr} (${esCritico ? "≥ 200, CRÍTICO" : "≥ 100, ALTO"}) ` +
                   `en el paso "${item.pasoDelProceso}" del proyecto ${item.proyectoId}. ` +
                   `Estado actual: ${item.estado}. Requiere acción correctiva inmediata.`,
    urgencia,
    estado:        "pendiente_aprobacion",
    reintentos:    0,
    createdAt:     Date.now(),
  };
}

function buildSpcViolationAction(
  spc:         SPCData,
  workspaceId: string,
): Omit<HermesAction, "id"> {
  const puntosFC = spc.puntos.filter((p) => p.fueraDeControl);
  const reglas   = [...new Set(puntosFC.map((p) => p.reglaViolada).filter(Boolean))].join(", ");

  return {
    workspaceId,
    sourceEngine:  "atena",
    sourceGoalId:  spc.proyectoId,
    tipo:          "slack_notificar_urgente" as HermesActionType,
    connectorTipo: "slack" as HermesConnectorType,
    payload: {
      mensaje: `🚨 [ATENA SPC] Variable "${spc.variable}" — ${spc.violacionesWesternElectric} violación(es) Western Electric detectadas. ` +
               `Reglas: ${reglas || "múltiples"}. Cpk=${spc.cpk.toFixed(2)}, Nivel σ=${spc.sigmaLevel.toFixed(1)}.`,
    },
    titulo:       `🚨 Alerta SPC: ${spc.variable} — ${spc.violacionesWesternElectric} violación(es)`,
    descripcion:  `${spc.violacionesWesternElectric} violación(es) Western Electric en "${spc.variable}". ${spc.interpretacion}`,
    justificacion: `ATENA detectó ${spc.violacionesWesternElectric} violación(es) de las reglas Western Electric ` +
                   `en la carta de control de "${spc.variable}" (proyecto ${spc.proyectoId}). ` +
                   `Cpk=${spc.cpk.toFixed(2)}, Nivel sigma=${spc.sigmaLevel.toFixed(1)}σ. ` +
                   `El proceso muestra signos de estar fuera de control estadístico.`,
    urgencia:     "ALTA",
    estado:       "pendiente_aprobacion",
    reintentos:   0,
    createdAt:    Date.now(),
  };
}

function buildSpcCapacidadAction(
  spc:         SPCData,
  workspaceId: string,
): Omit<HermesAction, "id"> {
  return {
    workspaceId,
    sourceEngine:  "atena",
    sourceGoalId:  spc.proyectoId,
    tipo:          "slack_notificar" as HermesActionType,
    connectorTipo: "slack" as HermesConnectorType,
    payload: {
      mensaje: `⚠️ [ATENA SPC] Proceso incapaz — "${spc.variable}" tiene Cpk=${spc.cpk.toFixed(2)} (< ${CPK_MINIMO}). ` +
               `Nivel sigma=${spc.sigmaLevel.toFixed(1)}σ. Proyecto: ${spc.proyectoId}.`,
    },
    titulo:       `⚠️ Proceso incapaz: ${spc.variable} (Cpk=${spc.cpk.toFixed(2)})`,
    descripcion:  `Cpk=${spc.cpk.toFixed(2)} indica que el proceso no cumple especificaciones. ${spc.interpretacion}`,
    justificacion: `ATENA calculó Cpk=${spc.cpk.toFixed(2)} para la variable "${spc.variable}", ` +
                   `por debajo del mínimo aceptable de ${CPK_MINIMO}. ` +
                   `El proceso está produciendo fuera de especificación. Nivel sigma: ${spc.sigmaLevel.toFixed(1)}σ.`,
    urgencia:     "MEDIA",
    estado:       "pendiente_aprobacion",
    reintentos:   0,
    createdAt:    Date.now(),
  };
}

// ── Función principal ─────────────────────────────────────────────────────────

export interface AtenasScanResult {
  accionesEncoladas:  number;
  amefCriticos:       number;
  amefAltos:          number;
  spcViolaciones:     number;
  spcIncapaces:       number;
}

/**
 * scanAtenaAlerts
 *
 * Lee AMEF y SPC de ATENA para un usuario dado y encola HermesActions
 * en batch atómico para las condiciones críticas encontradas.
 *
 * @param uid          Firebase Auth uid del usuario (fuente: verifyIdToken)
 * @param workspaceId  workspace de HERMES donde encolar las acciones
 * @returns AtenasScanResult con conteos por tipo de alerta
 */
export async function scanAtenaAlerts(
  uid:         string,
  workspaceId: string,
): Promise<AtenasScanResult> {
  const col   = hermesQueue(workspaceId);
  const batch = adminDb.batch();
  let   count = 0;

  const result: AtenasScanResult = {
    accionesEncoladas: 0,
    amefCriticos:      0,
    amefAltos:         0,
    spcViolaciones:    0,
    spcIncapaces:      0,
  };

  // ── Escanear AMEF ─────────────────────────────────────────────────────────
  try {
    const amefSnap = await atenaCol(uid, "amef")
      .where("estado", "in", ["abierto", "en_proceso"])
      .get();

    const items = amefSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FMEAItem));

    for (const item of items) {
      if (item.npr >= NPR_CRITICO) {
        batch.set(col.doc(), {
          ...buildAmefAction(item, workspaceId, uid),
          _serverTs: FieldValue.serverTimestamp(),
        });
        result.amefCriticos++;
        count++;
      } else if (item.npr >= NPR_ALTO) {
        batch.set(col.doc(), {
          ...buildAmefAction(item, workspaceId, uid),
          _serverTs: FieldValue.serverTimestamp(),
        });
        result.amefAltos++;
        count++;
      }
    }
  } catch (err) {
    console.error("[ATENA bridge] Error leyendo AMEF:", err);
  }

  // ── Escanear SPC ──────────────────────────────────────────────────────────
  try {
    const spcSnap = await atenaCol(uid, "spc").get();
    const spcs    = spcSnap.docs.map((d) => ({ id: d.id, ...d.data() } as SPCData));

    for (const spc of spcs) {
      // Violaciones Western Electric
      if (spc.violacionesWesternElectric > 0) {
        batch.set(col.doc(), {
          ...buildSpcViolationAction(spc, workspaceId),
          _serverTs: FieldValue.serverTimestamp(),
        });
        result.spcViolaciones++;
        count++;
      }

      // Proceso incapaz (Cpk < 1.0) — solo si no ya reportado por violaciones
      if (spc.cpk < CPK_MINIMO && spc.violacionesWesternElectric === 0) {
        batch.set(col.doc(), {
          ...buildSpcCapacidadAction(spc, workspaceId),
          _serverTs: FieldValue.serverTimestamp(),
        });
        result.spcIncapaces++;
        count++;
      }
    }
  } catch (err) {
    console.error("[ATENA bridge] Error leyendo SPC:", err);
  }

  if (count > 0) await batch.commit();
  result.accionesEncoladas = count;
  return result;
}
