/**
 * HERMES — Conector Monday.com (Etapa 1)
 *
 * Reutiliza el cliente GraphQL existente en src/lib/monday/.
 * Requiere: MONDAY_API_TOKEN + MONDAY_ENABLED=true en .env.local
 *
 * Acciones soportadas:
 *   monday_crear_tarea         → createItem()
 *   monday_actualizar_tarea    → changeMultipleColumnValues()
 *   monday_mover_grupo         → moveItemToGroup()
 */

import { createItem, changeMultipleColumnValues } from "@/lib/monday/mutations";
import { mondayQuery } from "@/lib/monday/client";
import type { HermesAction, HermesResultado } from "@/extensions/hermes/schema";

// ── Mover item a otro grupo ───────────────────────────────────────────────────

async function moveItemToGroup(itemId: string, groupId: string): Promise<{ move_item_to_group?: { id: string } } | null> {
  return mondayQuery<{ move_item_to_group: { id: string } }>(
    `mutation($itemId: ID!, $groupId: String!) {
      move_item_to_group(item_id: $itemId, group_id: $groupId) { id }
    }`,
    { itemId, groupId }
  );
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function ejecutarMondayAction(accion: HermesAction): Promise<HermesResultado> {
  const p = accion.payload;

  if (!process.env.MONDAY_ENABLED || process.env.MONDAY_ENABLED !== "true") {
    return {
      exito:    false,
      mensaje:  "Monday.com no está habilitado. Agrega MONDAY_ENABLED=true y MONDAY_API_TOKEN en .env.local",
      errorCode: "CONNECTOR_NOT_CONFIGURED",
    };
  }

  try {
    switch (accion.tipo) {
      case "monday_crear_tarea": {
        const boardId  = String(p.board_id ?? process.env.MONDAY_BOARD_ID_DEFAULT ?? "");
        const groupId  = String(p.group_id ?? "topics");
        const nombre   = String(p.nombre ?? "Nueva tarea desde HERMES");
        const columnas = (p.columnas as Record<string, string>) ?? {};

        if (!boardId) {
          return { exito: false, mensaje: "board_id no especificado y MONDAY_BOARD_ID_DEFAULT no está configurado", errorCode: "MISSING_PARAM" };
        }

        const result = await createItem(boardId, groupId, nombre, columnas);
        if (result.success) {
          return {
            exito:      true,
            mensaje:    `Tarea "${nombre}" creada en Monday.com`,
            datos:      { item_id: result.mondayItemId },
            linkAccion: `https://monday.com/boards/${boardId}/pulses/${result.mondayItemId}`,
          };
        }
        return { exito: false, mensaje: result.error ?? "Error al crear tarea", errorCode: "MONDAY_ERROR" };
      }

      case "monday_actualizar_tarea": {
        const itemId   = String(p.item_id ?? "");
        const boardId  = String(p.board_id ?? process.env.MONDAY_BOARD_ID_DEFAULT ?? "");
        const columnas = (p.columnas as Record<string, string>) ?? {};

        if (!itemId) return { exito: false, mensaje: "item_id requerido", errorCode: "MISSING_PARAM" };

        const result = await changeMultipleColumnValues(boardId, itemId, columnas);
        return result.success
          ? { exito: true, mensaje: `Item ${itemId} actualizado en Monday.com`, datos: { item_id: itemId } }
          : { exito: false, mensaje: result.error ?? "Error al actualizar", errorCode: "MONDAY_ERROR" };
      }

      case "monday_mover_grupo": {
        const itemId  = String(p.item_id ?? "");
        const groupId = String(p.group_id ?? "");
        if (!itemId || !groupId) return { exito: false, mensaje: "item_id y group_id requeridos", errorCode: "MISSING_PARAM" };

        const result = await moveItemToGroup(itemId, groupId);
        return result?.move_item_to_group?.id
          ? { exito: true, mensaje: `Item ${itemId} movido al grupo ${groupId}` }
          : { exito: false, mensaje: "Error al mover item", errorCode: "MONDAY_ERROR" };
      }

      default:
        return { exito: false, mensaje: `Tipo de acción no soportado: ${accion.tipo}`, errorCode: "UNSUPPORTED_ACTION" };
    }
  } catch (err) {
    return {
      exito:     false,
      mensaje:   `Error en conector Monday: ${String(err)}`,
      errorCode: "CONNECTOR_ERROR",
    };
  }
}
