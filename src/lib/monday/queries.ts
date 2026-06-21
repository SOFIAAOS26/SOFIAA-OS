/**
 * Monday.com — Queries de lectura para TEC BI
 *
 * Todas las funciones retornan null si MONDAY_ENABLED=false.
 */

import { mondayQuery } from "./client";
import type { MondayBoard, MondayItem, MondayUser } from "./types";

/* ── Boards ─────────────────────────────────────────────────────── */

/** Lista todos los boards activos del workspace */
export async function getBoards(): Promise<MondayBoard[] | null> {
  const data = await mondayQuery<{ boards: MondayBoard[] }>(`
    query {
      boards(state: active, limit: 50) {
        id
        name
        description
        state
        board_kind
        items_count
        columns {
          id
          title
          type
          settings_str
        }
      }
    }
  `);
  return data?.boards ?? null;
}

/** Obtiene un board por ID con sus columnas */
export async function getBoard(boardId: string): Promise<MondayBoard | null> {
  const data = await mondayQuery<{ boards: MondayBoard[] }>(
    `query($ids: [ID!]) {
      boards(ids: $ids) {
        id name description state items_count
        columns { id title type settings_str }
      }
    }`,
    { ids: [boardId] }
  );
  return data?.boards?.[0] ?? null;
}

/* ── Items ──────────────────────────────────────────────────────── */

/** Obtiene los primeros N items de un board con sus valores de columna */
export async function getBoardItems(
  boardId: string,
  limit = 100
): Promise<MondayItem[] | null> {
  const data = await mondayQuery<{ boards: { items_page: { items: MondayItem[] } }[] }>(
    `query($ids: [ID!], $limit: Int) {
      boards(ids: $ids) {
        items_page(limit: $limit) {
          items {
            id name state created_at updated_at
            board { id name }
            group { id title }
            creator { id name email }
            column_values {
              id
              column { title type }
              value
              text
            }
          }
        }
      }
    }`,
    { ids: [boardId], limit }
  );
  return data?.boards?.[0]?.items_page?.items ?? null;
}

/** Obtiene un item por ID */
export async function getItem(itemId: string): Promise<MondayItem | null> {
  const data = await mondayQuery<{ items: MondayItem[] }>(
    `query($ids: [ID!]) {
      items(ids: $ids) {
        id name state created_at updated_at
        board { id name }
        group { id title }
        creator { id name email }
        column_values {
          id
          column { title type }
          value
          text
        }
      }
    }`,
    { ids: [itemId] }
  );
  return data?.items?.[0] ?? null;
}

/* ── Usuarios ───────────────────────────────────────────────────── */

/** Lista todos los usuarios del account */
export async function getUsers(): Promise<MondayUser[] | null> {
  const data = await mondayQuery<{ users: MondayUser[] }>(`
    query {
      users(limit: 200) {
        id name email title photo_thumb_small
        teams { id name }
      }
    }
  `);
  return data?.users ?? null;
}

/** Obtiene el usuario autenticado (dueño del token) */
export async function getMe(): Promise<MondayUser | null> {
  const data = await mondayQuery<{ me: MondayUser }>(`
    query { me { id name email title photo_thumb_small } }
  `);
  return data?.me ?? null;
}
