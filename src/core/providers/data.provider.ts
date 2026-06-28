/**
 * SOFIAA Sprint E — DataProvider interface
 *
 * Contrato que implementa cualquier fuente de datos.
 * El Runtime habla SOLO con esta interfaz.
 */

import type { DataProviderType } from "@/core/capability.runtime";

export interface DataProvider {
  readonly type: DataProviderType;
  get(
    config:  Record<string, unknown>,
    params?: Record<string, unknown>
  ): Promise<unknown[]>;
}
