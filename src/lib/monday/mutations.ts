/**
 * Monday.com — Mutations de escritura para TEC BI
 *
 * Todas las funciones retornan null si MONDAY_ENABLED=false.
 *
 * USO FUTURO:
 *   Al crear un Proyecto en TEC BI → createItem() crea el item en Monday
 *   Al cambiar estado en TEC BI    → changeColumnValue() actualiza Monday
 *   Al recibir webhook de Monday   → estas mutations NO se usan (es push de Monday)
 */

import { mondayQuery } from "./client";
import type { MondayItem, SyncResult } from "./types";

/* ── Crear item ─────────────────────────────────────────────────── */

/**
 * Crea un nuevo item en un board de Monday.
 * @param boardId   ID del board destino
 * @param groupId   ID del grupo (columna kanban) donde se crea
 * @param itemName  Nombre del item (título del proyecto/brief)
 * @param columnValues  Objeto con { columnId: valor } para prellenar columnas
 */
export async function createItem(
  boardId: string,
  groupId: string,
  itemName: string,
  columnValues: Record<string, string> = {}
): Promise<SyncResult> {
  try {
    const data = await mondayQuery<{ create_item: { id: string } }>(
      `mutation($boardId: ID!, $groupId: String!, $name: String!, $cols: JSON) {
        create_item(
          board_id: $boardId
          group_id: $groupId
          item_name: $name
          column_values: $cols
        ) { id }
      }`,
      {
        boardId,
        groupId,
        name: itemName,
        cols: JSON.stringify(columnValues),
      }
    );
    const id = data?.create_item?.id;
    return id ? { success: true, mondayItemId: id } : { success: false, error: "No se recibió ID" };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/* ── Actualizar columna ─────────────────────────────────────────── */

/**
 * Actualiza el valor de una columna en un item existente.
 * @param boardId   ID del board
 * @param itemId    ID del item a actualizar
 * @param columnId  ID de la columna a cambiar
 * @param value     Nuevo valor (formato JSON de Monday, ej: '"texto"' o '{"label":"En progreso"}')
 */
export async function changeColumnValue(
  boardId: string,
  itemId: string,
  columnId: string,
  value: string
): Promise<SyncResult> {
  try {
    const data = await mondayQuery<{ change_column_value: { id: string } }>(
      `mutation($boardId: ID!, $itemId: ID!, $colId: String!, $val: JSON!) {
        change_column_value(
          board_id: $boardId
          item_id: $itemId
          column_id: $colId
          value: $val
        ) { id }
      }`,
      { boardId, itemId, colId: columnId, val: value }
    );
    return data?.change_column_value?.id
      ? { success: true, mondayItemId: itemId }
      : { success: false, error: "Sin respuesta" };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/* ── Actualizar múltiples columnas ─────────────────────────────── */

/**
 * Actualiza varias columnas de un item en una sola llamada.
 * @param columnValues  Objeto { columnId: valorJSON }
 */
export async function changeMultipleColumnValues(
  boardId: string,
  itemId: string,
  columnValues: Record<string, string>
): Promise<SyncResult> {
  try {
    const data = await mondayQuery<{ change_multiple_column_values: { id: string } }>(
      `mutation($boardId: ID!, $itemId: ID!, $cols: JSON!) {
        change_multiple_column_values(
          board_id: $boardId
          item_id: $itemId
          column_values: $cols
        ) { id }
      }`,
      { boardId, itemId, cols: JSON.stringify(columnValues) }
    );
    return data?.change_multiple_column_values?.id
      ? { success: true, mondayItemId: itemId }
      : { success: false, error: "Sin respuesta" };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/* ── Archivar item ──────────────────────────────────────────────── */

export async function archiveItem(itemId: string): Promise<SyncResult> {
  try {
    const data = await mondayQuery<{ archive_item: MondayItem }>(
      `mutation($id: ID!) { archive_item(item_id: $id) { id } }`,
      { id: itemId }
    );
    return data?.archive_item?.id
      ? { success: true }
      : { success: false, error: "Sin respuesta" };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/* ── Postear comentario/update ──────────────────────────────────── */

/**
 * Agrega un comentario interno a un item.
 * Útil para registrar acciones hechas desde TEC BI.
 */
export async function postUpdate(itemId: string, body: string): Promise<SyncResult> {
  try {
    const data = await mondayQuery<{ create_update: { id: string } }>(
      `mutation($itemId: ID!, $body: String!) {
        create_update(item_id: $itemId, body: $body) { id }
      }`,
      { itemId, body }
    );
    return data?.create_update?.id
      ? { success: true }
      : { success: false, error: "Sin respuesta" };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
