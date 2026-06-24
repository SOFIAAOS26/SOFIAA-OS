/**
 * JP Memorial — Capa de datos
 * Firestore collections:
 *   - jpm_servicios   → servicios/ceremonias activos
 *   - jpm_capillas    → disponibilidad de capillas
 *   - jpm_catalogo    → paquetes y precios
 *   - jpm_atencion    → registros de consultas y seguimiento
 *
 * Sprint 1: implementar helpers CRUD para cada collection.
 */

export const JPM_COLLECTIONS = {
  servicios: "jpm_servicios",
  capillas:  "jpm_capillas",
  catalogo:  "jpm_catalogo",
  atencion:  "jpm_atencion",
} as const;
