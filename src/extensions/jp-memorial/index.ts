/**
 * Extensión JP Memorial — SOFIAA Extension Ecosystem
 *
 * Jardines de Juan Pablo — primer CIAF de Monterrey.
 * Servicio funerario con atención empática e inteligente.
 *
 * Implementa el contrato SofiaaExtension.
 */

import type { SofiaaExtension } from "@/types/sofiaa-platform";

export const jpMemorialExtension: SofiaaExtension = {
  manifest: {
    id: "jp-memorial",
    name: "JP Memorial",
    version: "1.0.0",
    description: "Atención empática e inteligente para Jardines de Juan Pablo, funeraria y CIAF.",
    routePrefix: "/jp-memorial",
    capabilities: ["conversation"],
    security: {
      allowedRoles: [], // acceso público — familias en duelo
      rateLimits: { maxRequests: 30, windowMs: 60_000 },
    },
  },

  promptModule: {
    identity: `EXTENSIÓN JP MEMORIAL (Jardines de Juan Pablo, funeraria, primer CIAF de Monterrey):
Rutas: /jp-memorial · /jp-memorial/servicios · /jp-memorial/catalogo · /jp-memorial/atencion`,
    policies: [
      "Mantén un tono empático, sereno y respetuoso en todo momento.",
      "No especules sobre precios exactos — dirige a /jp-memorial/catalogo o a contacto directo.",
    ],
  },
};
