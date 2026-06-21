/**
 * Monday.com — Tipos TypeScript para TEC BI
 * Refleja la estructura de la API GraphQL v2
 */

export interface MondayBoard {
  id: string;
  name: string;
  description: string | null;
  state: "active" | "archived" | "deleted";
  board_kind: "public" | "private" | "share";
  items_count: number;
  columns: MondayColumn[];
}

export interface MondayColumn {
  id: string;
  title: string;
  type: string; // "text" | "status" | "date" | "person" | "numbers" | "timeline" | "file" | ...
  settings_str: string; // JSON con opciones del tipo
}

export interface MondayItem {
  id: string;
  name: string;
  state: "active" | "archived" | "deleted";
  board: { id: string; name: string };
  group: { id: string; title: string };
  column_values: MondayColumnValue[];
  created_at: string;
  updated_at: string;
  creator: { id: string; name: string; email: string } | null;
}

export interface MondayColumnValue {
  id: string;
  column: { title: string; type: string };
  value: string | null;       // JSON raw
  text: string | null;        // Representación legible
}

export interface MondayUser {
  id: string;
  name: string;
  email: string;
  title: string | null;
  photo_thumb_small: string | null;
  teams: { id: string; name: string }[];
}

export interface MondayWebhookEvent {
  event: {
    type: string;             // "create_item" | "change_column_value" | "create_update" | ...
    boardId: number;
    itemId?: number;
    columnId?: string;
    columnTitle?: string;
    previousValue?: { label?: string; index?: number };
    value?: { label?: string; index?: number };
    userId: number;
    triggerTime: string;
  };
}

/** Mapa de columnas TEC BI ↔ Monday (se configura al acoplar) */
export interface MondayColumnMap {
  /** ID de la columna Monday que corresponde al título del proyecto/brief */
  titulo?: string;
  /** ID de la columna Monday para el estado */
  estado?: string;
  /** ID de la columna Monday para la fecha de entrega */
  fechaEntrega?: string;
  /** ID de la columna Monday para el responsable */
  responsable?: string;
  /** ID de la columna Monday para el costo */
  costo?: string;
}

/** Resultado de sincronización */
export interface SyncResult {
  success: boolean;
  mondayItemId?: string;
  error?: string;
}
