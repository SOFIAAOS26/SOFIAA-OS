/**
 * HERMES — Executor v1.0
 *
 * Motor de despacho de acciones. Toma una acción aprobada de Firestore
 * y la enruta al conector correcto.
 *
 * Ciclo de vida:
 *   aprobada → ejecutando → completada | fallida
 *
 * Reglas:
 *   - Máximo MAX_REINTENTOS = 3 intentos antes de marcar como fallida
 *   - Siempre actualiza estado en Firestore antes y después de ejecutar
 *   - Server-only — usa Firebase Admin SDK
 *   - Nunca ejecuta acciones que no estén en estado "aprobada"
 */

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { HermesAction, HermesResultado } from "@/extensions/hermes/schema";
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
 * 3. Marca como "ejecutando"
 * 4. Despacha al conector correcto
 * 5. Marca como "completada" o "fallida" con reintento si aplica
 *
 * @returns HermesResultado con el resultado de la ejecución
 */
export async function executeAction(
  workspaceId: string,
  actionId:    string
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
