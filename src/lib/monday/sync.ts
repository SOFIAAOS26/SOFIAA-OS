/**
 * Monday Sync — TEC BI v1.1
 *
 * Sincronización bidireccional TEC BI ↔ Monday.com
 *
 * Variables de entorno requeridas (en .env.local):
 *   MONDAY_ENABLED=true
 *   MONDAY_API_TOKEN=tu_token
 *   MONDAY_BOARD_ID=1234567890        ← ID del board (número en la URL)
 *   MONDAY_GROUP_ID=topics            ← ID del grupo destino (usa /api/monday/discover)
 *   MONDAY_COL_ESTADO=status          ← ID de columna de estado (opcional)
 *   MONDAY_COL_FECHA=date4            ← ID de columna de fecha límite (opcional)
 *   MONDAY_COL_TIPO=text0             ← ID de columna de tipo de proyecto (opcional)
 *
 * Para encontrar los IDs: GET /api/monday/discover
 */

import { createItem, changeColumnValue, postUpdate } from "./mutations";
import type { SyncResult } from "./types";

// ── Config desde env ──────────────────────────────────────────────────────────
function cfg() {
  return {
    boardId:  process.env.MONDAY_BOARD_ID  ?? "",
    groupId:  process.env.MONDAY_GROUP_ID  ?? "topics",
    colEstado: process.env.MONDAY_COL_ESTADO ?? "",
    colFecha:  process.env.MONDAY_COL_FECHA  ?? "",
    colTipo:   process.env.MONDAY_COL_TIPO   ?? "",
  };
}

/** Mapeo de estados TEC BI → etiquetas Monday */
const ESTADO_LABEL: Record<string, string> = {
  "Recibido":      "En espera",
  "En revisión":   "En revisión",
  "Aprobado":      "Aprobado",
  "En producción": "En progreso",
  "Entregado":     "Listo",
  "Cancelado":     "Cancelado",
  "Pendiente":     "En espera",
};

// ── Push Brief → Monday ────────────────────────────────────────────────────────
export async function pushBriefToMonday(brief: {
  titulo: string;
  estado: string;
  tipoProyecto: string;
  fechaLimite?: Date | string;
}): Promise<SyncResult> {
  const { boardId, groupId, colEstado, colFecha, colTipo } = cfg();
  if (!boardId) return { success: false, error: "MONDAY_BOARD_ID no configurado" };

  const columnValues: Record<string, string> = {};

  if (colEstado) {
    columnValues[colEstado] = JSON.stringify({ label: ESTADO_LABEL[brief.estado] ?? brief.estado });
  }
  if (colFecha && brief.fechaLimite) {
    const d = brief.fechaLimite instanceof Date ? brief.fechaLimite : new Date(brief.fechaLimite);
    columnValues[colFecha] = JSON.stringify({ date: d.toISOString().split("T")[0] });
  }
  if (colTipo) {
    columnValues[colTipo] = brief.tipoProyecto;
  }

  return createItem(boardId, groupId, `📋 ${brief.titulo}`, columnValues);
}

// ── Push Proyecto → Monday ────────────────────────────────────────────────────
export async function pushProyectoToMonday(proyecto: {
  titulo: string;
  estado: string;
  valorEstimado?: number;
}): Promise<SyncResult> {
  const { boardId, groupId, colEstado } = cfg();
  if (!boardId) return { success: false, error: "MONDAY_BOARD_ID no configurado" };

  const columnValues: Record<string, string> = {};
  if (colEstado) {
    columnValues[colEstado] = JSON.stringify({ label: ESTADO_LABEL[proyecto.estado] ?? proyecto.estado });
  }

  return createItem(boardId, groupId, `🎬 ${proyecto.titulo}`, columnValues);
}

// ── Actualizar estado en Monday ───────────────────────────────────────────────
export async function syncEstadoToMonday(
  mondayItemId: string,
  nuevoEstado: string
): Promise<SyncResult> {
  const { boardId, colEstado } = cfg();
  if (!boardId || !colEstado || !mondayItemId) {
    return { success: false, error: "Configuración incompleta para sync de estado" };
  }
  return changeColumnValue(
    boardId,
    mondayItemId,
    colEstado,
    JSON.stringify({ label: ESTADO_LABEL[nuevoEstado] ?? nuevoEstado })
  );
}

// ── Postear log en Monday ─────────────────────────────────────────────────────
export async function logToMonday(mondayItemId: string, mensaje: string): Promise<SyncResult> {
  return postUpdate(mondayItemId, `[SOFIAA TEC BI] ${mensaje}`);
}
