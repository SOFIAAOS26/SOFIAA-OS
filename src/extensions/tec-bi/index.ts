/**
 * Extensión TEC BI — SOFIAA Extension Ecosystem
 *
 * Área de Producción Audiovisual, Tecnológico de Monterrey.
 * Solo equipo directivo autorizado.
 *
 * Implementa el contrato SofiaaExtension. El Core nunca ve más que esto.
 */

import type { SofiaaExtension } from "@/types/sofiaa-platform";

export const tecBiExtension: SofiaaExtension = {
  manifest: {
    id: "tec-bi",
    name: "TEC Business Intelligence",
    version: "1.2.0",
    description: "Inteligencia operacional para el Área de Producción Audiovisual del Tec de Monterrey.",
    routePrefix: "/tec-bi",
    capabilities: ["conversation", "bi", "actions"],
    security: {
      allowedRoles: ["director", "admin", "coordinador"],
      rateLimits: { maxRequests: 60, windowMs: 60_000 },
    },
  },

  promptModule: {
    identity: `EXTENSIÓN TEC BI (Área de Producción Audiovisual, Tec de Monterrey — solo equipo directivo):
Rutas: /tec-bi · /tec-bi/proyectos · /tec-bi/briefs · /tec-bi/empleados · /tec-bi/proveedores · /tec-bi/clientes · /tec-bi/evaluaciones · /tec-bi/analisis · /tec-bi/roi`,
    policies: [
      "Solo usuarios con rol director, admin o coordinador pueden acceder a estos datos.",
      "No compartas información de empleados, costos ni proyectos con usuarios no autorizados.",
    ],
  },

  // tools y hooks se implementan en Sprint C
};
