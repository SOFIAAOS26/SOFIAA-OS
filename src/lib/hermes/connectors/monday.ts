/**
 * HERMES — Conector Monday.com (Etapa 1)
 *
 * Hace las llamadas GraphQL directamente con el token resuelto.
 * Prioridad del token: env var MONDAY_API_TOKEN → Firestore secrets (H-6)
 *
 * Acciones soportadas:
 *   monday_crear_tarea         → createItem
 *   monday_actualizar_tarea    → changeMultipleColumnValues
 *   monday_mover_grupo         → moveItemToGroup
 */

import type { HermesAction, HermesResultado } from "@/extensions/hermes/schema";
import { resolveMondayToken }                   from "@/lib/hermes/connector-secrets";

const MONDAY_API = "https://api.monday.com/v2";

// ── Cliente interno con token explícito ───────────────────────────────────────

async function gql<T = unknown>(
  apiToken: string,
  query:    string,
  vars?:    Record<string, unknown>,
): Promise<T> {
  const res = await fetch(MONDAY_API, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": apiToken,
      "API-Version": "2024-10",
    },
    body: JSON.stringify({ query, variables: vars }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Monday HTTP ${res.status}: ${text}`);
  }

  const json = await res.json() as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(`Monday GQL: ${json.errors[0].message}`);
  return json.data as T;
}

// ── Operaciones ───────────────────────────────────────────────────────────────

async function createItem(
  token:    string,
  boardId:  string,
  groupId:  string,
  nombre:   string,
  columnas: Record<string, string>,
) {
  const data = await gql<{ create_item?: { id: string } }>(token,
    `mutation($boardId: ID!, $groupId: String!, $name: String!, $cols: JSON) {
      create_item(board_id: $boardId, group_id: $groupId, item_name: $name, column_values: $cols) { id }
    }`,
    { boardId, groupId, name: nombre, cols: JSON.stringify(columnas) }
  );
  return data.create_item?.id ?? null;
}

async function updateItem(
  token:    string,
  boardId:  string,
  itemId:   string,
  columnas: Record<string, string>,
) {
  const data = await gql<{ change_multiple_column_values?: { id: string } }>(token,
    `mutation($boardId: ID!, $itemId: ID!, $cols: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $cols) { id }
    }`,
    { boardId, itemId, cols: JSON.stringify(columnas) }
  );
  return data.change_multiple_column_values?.id ?? null;
}

async function moveItem(token: string, itemId: string, groupId: string) {
  const data = await gql<{ move_item_to_group?: { id: string } }>(token,
    `mutation($itemId: ID!, $groupId: String!) {
      move_item_to_group(item_id: $itemId, group_id: $groupId) { id }
    }`,
    { itemId, groupId }
  );
  return data.move_item_to_group?.id ?? null;
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function ejecutarMondayAction(accion: HermesAction): Promise<HermesResultado> {
  const p           = accion.payload;
  const workspaceId = accion.workspaceId;

  // Resolver token: env var tiene prioridad, luego Firestore secrets
  const apiToken = await resolveMondayToken(workspaceId).catch(() => null);

  if (!apiToken) {
    return {
      exito:     false,
      mensaje:   "Monday.com no está configurado. Ve a HERMES → Conectores y agrega el API token.",
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
          return { exito: false, mensaje: "board_id no especificado", errorCode: "MISSING_PARAM" };
        }

        const itemId = await createItem(apiToken, boardId, groupId, nombre, columnas);
        return itemId
          ? { exito: true, mensaje: `Tarea "${nombre}" creada en Monday.com`, datos: { item_id: itemId }, linkAccion: `https://monday.com/boards/${boardId}/pulses/${itemId}` }
          : { exito: false, mensaje: "No se recibió ID del item creado", errorCode: "MONDAY_ERROR" };
      }

      case "monday_actualizar_tarea": {
        const itemId   = String(p.item_id ?? "");
        const boardId  = String(p.board_id ?? process.env.MONDAY_BOARD_ID_DEFAULT ?? "");
        const columnas = (p.columnas as Record<string, string>) ?? {};

        if (!itemId) return { exito: false, mensaje: "item_id requerido", errorCode: "MISSING_PARAM" };

        const updId = await updateItem(apiToken, boardId, itemId, columnas);
        return updId
          ? { exito: true, mensaje: `Item ${itemId} actualizado en Monday.com`, datos: { item_id: itemId } }
          : { exito: false, mensaje: "Error al actualizar item", errorCode: "MONDAY_ERROR" };
      }

      case "monday_mover_grupo": {
        const itemId  = String(p.item_id ?? "");
        const groupId = String(p.group_id ?? "");
        if (!itemId || !groupId) return { exito: false, mensaje: "item_id y group_id requeridos", errorCode: "MISSING_PARAM" };

        const movedId = await moveItem(apiToken, itemId, groupId);
        return movedId
          ? { exito: true, mensaje: `Item ${itemId} movido al grupo ${groupId}` }
          : { exito: false, mensaje: "Error al mover item", errorCode: "MONDAY_ERROR" };
      }

      default:
        return { exito: false, mensaje: `Tipo no soportado: ${accion.tipo}`, errorCode: "UNSUPPORTED_ACTION" };
    }
  } catch (err) {
    return {
      exito:     false,
      mensaje:   `Error en conector Monday: ${String(err)}`,
      errorCode: "CONNECTOR_ERROR",
    };
  }
}
