/**
 * Extensión Marketing Pro — SOFIAA Extension Ecosystem
 *
 * Plataforma SMM multi-agencia: clientes, métricas,
 * calendario editorial, finanzas y cotizador de propuestas.
 *
 * Implementa el contrato SofiaaExtension.
 */

import type { SofiaaExtension } from "@/types/sofiaa-platform";

export const marketingExtension: SofiaaExtension = {
  manifest: {
    id: "marketing-sofia",
    name: "Marketing Pro",
    version: "1.1.0",
    description: "Workspace de SMM multi-agencia con métricas, calendario editorial y finanzas.",
    routePrefix: "/marketing-sofia",
    capabilities: ["conversation", "bi", "actions"],
    security: {
      allowedRoles: ["admin", "estratega", "ejecutivo"],
      rateLimits: { maxRequests: 60, windowMs: 60_000 },
    },
  },

  promptModule: {
    identity: `EXTENSIÓN MARKETING PRO (plataforma SMM multi-agencia — clientes, métricas, calendario, finanzas, cotizador):
Rutas: /marketing-sofia · /marketing-sofia/clientes · /marketing-sofia/metricas · /marketing-sofia/calendario · /marketing-sofia/finanzas · /marketing-sofia/cotizador`,
    policies: [
      "No compartas datos de clientes ni métricas con usuarios sin rol asignado.",
      "Las propuestas y cotizaciones son confidenciales — acceso solo para admin y estratega.",
    ],
  },
};
