/**
 * TEC Bii — Colecciones Firestore (Sprint T2-1)
 * Compartido entre cliente (firestore.ts) y servidor (cognitive-publisher.ts).
 */

import type { TecBiiEntityType } from "@/extensions/tec-bii/schema";

/** Pluraliza el tipo de entidad para la colección Firestore */
const TYPE_COL: Record<TecBiiEntityType, string> = {
  proyecto:   "proyectos",
  brief:      "briefs",
  empleado:   "empleados",
  proveedor:  "proveedores",
  cliente:    "clientes",
  evaluacion: "evaluaciones",
};

/**
 * Ruta de colección para una entidad TEC Bii.
 * Formato: users/{uid}/tec_bii/{type_plural}
 */
export const tecBiiPath = (uid: string, type: TecBiiEntityType): string =>
  `users/${uid}/tec_bii/${TYPE_COL[type]}`;
