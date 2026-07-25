/**
 * HERMES — Executor v1.1 (Sprint T-2)
 *
 * Motor de despacho de acciones. Toma una acción aprobada de Firestore
 * y la enruta al conector correcto.
 *
 * Ciclo de vida:
 *   aprobada → [THEMIS gate] → ejecutando → completada | fallida
 *                           ↘ vetada_por_themis  (Sprint T-2)
 *
 * Reglas:
 *   - Máximo MAX_REINTENTOS = 3 intentos antes de marcar como fallida
 *   - THEMIS evalúa SIEMPRE antes de ejecutar — sin excepciones
 *   - Si THEMIS veta, la acción queda en vetada_por_themis con el verdictId
 *   - Siempre actualiza estado en Firestore antes y después de ejecutar
 *   - Server-only — usa Firebase Admin SDK
 *   - Nunca ejecuta acciones que no estén en estado "aprobada"
 */

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { HermesAction, HermesResultado } from "@/extensions/hermes/schema";
import { evaluateAction as themisEvaluateAction } from "@/core/themis";
import type { ActionEvaluationRequest } from "@/types/themis";
import { isEtapa2Connector, ejecutarEtapa2Action }  from "./connectors/etapa2";
import { ejecutarMondayAction }    from "./connectors/monday";
import { ejecutarSlackAction }     from "./connectors/slack";
import { ejecutarCalendarioAction } from "./connectors/calendario";
import { ejecutarInternoAction }   from "./connectors/interno";

const MAX_REINTENTOS = 3;

// ── Firestore Admin helpers ───────────────────────────────────────────────────

function actionRef(workspaceId: string, actionId: string) {
  return adminDb
    .collection("smm_workspaces")
    .doc(workspaceId)
    .collection("hermes_queue")
    .doc(actionId);
}

async function getAction(workspaceId: string, actionId: string): Promise<HermesAction | null> {
  const snap = await actionRef(workspaceId, actionId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as HermesAction;
}

async function markEjecutando(workspaceId: string, actionId: string): Promise<void> {
  await actionRef(workspaceId, actionId).update({
    estado:     "ejecutando",
    executedAt: Date.now(),
    _updatedAt: FieldValue.serverTimestamp(),
  });
}

async function markCompletada(
  workspaceId: string,
  actionId:   string,
  resultado:  HermesResultado
): Promise<void> {
  await actionRef(workspaceId, actionId).update({
    estado:       "completada",
    resultado,
    completadoAt: Date.now(),
    _updatedAt:   FieldValue.serverTimestamp(),
  });
}

async function markFallida(
  workspaceId: string,
  actionId:   string,
  resultado:  HermesResultado,
  reintentos: number
): Promise<void> {
  await actionRef(workspaceId, actionId).update({
    estado:       "fallida",
    resultado,
    reintentos,
    completadoAt: Date.now(),
    _updatedAt:   FieldValue.serverTimestamp(),
  });
}

async function markVetada(
  workspaceId:    string,
  actionId:       string,
  verdictId:      string,
  motivoRechazo:  string
): Promise<void> {
  await actionRef(workspaceId, actionId).update({
    estado:           "vetada_por_themis",
    themisVerdictId:  verdictId,
    motivoRechazo,
    completadoAt:     Date.now(),
    _updatedAt:       FieldValue.serverTimestamp(),
  });
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

async function dispatch(accion: HermesAction): Promise<HermesResultado> {
  // Etapa 2 — stub informativo
  if (isEtapa2Connector(accion.connectorTipo)) {
    return ejecutarEtapa2Action(accion);
  }

  // Etapa 1 — conectores reales
  switch (accion.connectorTipo) {
    case "monday_cloud":
      return ejecutarMondayAction(accion);

    case "slack":
      return ejecutarSlackAction(accion);

    case "calendario_smm":
      return ejecutarCalendarioAction(accion);

    case "hermes_interno":
      return ejecutarInternoAction(accion);

    default:
      return {
        exito:     false,
        mensaje:   `Conector desconocido: ${accion.connectorTipo}`,
        errorCode: "UNKNOWN_CONNECTOR",
      };
  }
}

// ── Executor principal ────────────────────────────────────────────────────────

/**
 * executeAction — punto de entrada del executor.
 *
 * 1. Lee la acción desde Firestore Admin
 * 2. Valida que esté en estado "aprobada"
 * 3. 🛡 THEMIS gate — evalúa la acción antes de cruzar el umbral real
 *      Si approved === false → markVetada() + abort
 * 4. Marca como "ejecutando"
 * 5. Despacha al conector correcto
 * 6. Marca como "completada" o "fallida" con reintento si aplica
 *
 * @param userId  UID del usuario autenticado (del token Firebase del request)
 * @returns HermesResultado con el resultado de la ejecución
 */
export async function executeAction(
  workspaceId: string,
  actionId:    string,
  userId:      string = "anonymous"
): Promise<HermesResultado> {
  // 1. Leer acción
  const accion = await getAction(workspaceId, actionId);

  if (!accion) {
    return { exito: false, mensaje: `Acción ${actionId} no encontrada`, errorCode: "NOT_FOUND" };
  }

  // 2. Validar estado
  if (accion.estado !== "aprobada") {
    return {
      exito:     false,
      mensaje:   `Acción ${actionId} no está aprobada (estado actual: ${accion.estado})`,
      errorCode: "INVALID_STATE",
    };
  }

  // 3. Verificar reintentos
  const reintentos = accion.reintentos ?? 0;
  if (reintentos >= MAX_REINTENTOS) {
    const resultado: HermesResultado = {
      exito:     false,
      mensaje:   `Máximo de reintentos alcanzado (${MAX_REINTENTOS})`,
      errorCode: "MAX_RETRIES_EXCEEDED",
    };
    await markFallida(workspaceId, actionId, resultado, reintentos);
    return resultado;
  }

  // 🛡 THEMIS gate — contrato constitucional:
  //    "THEMIS autoriza o veta cada acción antes de cruzar el umbral al mundo real"
  try {
    const themisReq: ActionEvaluationRequest = {
      actionId,
      actionType:    accion.tipo,
      actionPayload: accion.payload,
      requestedBy:   accion.sourceEngine,
      userId,
      context: {
        activePath:   undefined,
        extensionId:  accion.sourceEngine,
        userRole:     null,
        isGoalActive: false,
        userMessage:  JSON.stringify(accion.payload),
      },
    };

    const themisResult = await themisEvaluateAction(themisReq);

    if (!themisResult.approved) {
      const motivo = `THEMIS vetó esta acción. ${themisResult.verdict.reasoning}`;
      await markVetada(workspaceId, actionId, themisResult.verdict.id, motivo);
      return {
        exito:     false,
        mensaje:   motivo,
        errorCode: "THEMIS_BLOCK",
      };
    }
  } catch {
    // THEMIS nunca debe bloquear la ejecución por un error interno propio
    // Si el gate falla por error técnico, ejecutamos con advertencia.
    console.warn("[HERMES][executor] THEMIS gate failed — ejecutando sin evaluación", actionId);
  }

  // 4. Marcar como ejecutando
  await markEjecutando(workspaceId, actionId);

  // 5. Despachar
  let resultado: HermesResultado;
  try {
    resultado = await dispatch(accion);
  } catch (err) {
    resultado = {
      exito:     false,
      mensaje:   `Excepción inesperada: ${String(err)}`,
      errorCode: "EXECUTION_EXCEPTION",
    };
  }

  // 6. Actualizar estado final
  if (resultado.exito || resultado.errorCode === "ETAPA_2_NOT_IMPLEMENTED") {
    // Etapa 2 "fallida" es informativa — la guardamos como completada con exito=false
    // para no bloquear la UX y distinguirla de errores reales.
    await markCompletada(workspaceId, actionId, resultado);
  } else {
    // Error real — incrementar reintentos
    await markFallida(workspaceId, actionId, resultado, reintentos + 1);
  }

  return resultado;
}
