/**
 * Monday.com Adapter — TEC BI
 * Barrel de exportaciones. Importa desde aquí en el resto del proyecto.
 *
 * Estado: PREPARADO / DESACTIVADO
 * Para activar: MONDAY_ENABLED=true en .env.local
 */

export * from "./types";
export * from "./client";
export * from "./queries";
export * from "./mutations";

/** Retorna true si el adaptador está activo */
export function isMondayEnabled(): boolean {
  return process.env.MONDAY_ENABLED === "true";
}
