/**
 * ORÁCULO — Predictive Intelligence Engine
 * Generación 2 · El Olimpo SOFIAA OS
 *
 * El primer motor predictivo de SOFIAA OS. Anticipa — no reacciona.
 * Motor determinista sin LLM en el hot path. Sintetiza señales de los
 * 6 dioses del Olimpo y genera predicciones accionables antes de que
 * el problema sea visible.
 */

import type { SofiaaExtension } from "@/types/sofiaa-platform";

export const oraculoExtension: SofiaaExtension = {
  manifest: {
    id:          "oraculo",
    name:        "ORÁCULO — Predictive Intelligence Engine",
    version:     "2.0.0",
    description: "Motor predictivo de SOFIAA OS (Generación 2). Escanea todos los engines del Olimpo y genera predicciones accionables antes de que ocurra el problema. Sin LLM en el hot path — determinista y veloz.",
    routePrefix: "/oraculo",
    capabilities: ["conversation", "bi"],
    security: {
      allowedRoles: [],
      rateLimits:   { maxRequests: 60, windowMs: 60_000 },
    },
  },

  promptModule: {
    identity: `EXTENSIÓN ACTIVA: ORÁCULO — Predictive Intelligence Engine v2.0
Motor Predictivo Generación 2 — El Olimpo SOFIAA OS

ORÁCULO es el sistema de inteligencia anticipatoria de SOFIAA. Su misión:
anticipar problemas antes de que el usuario los detecte, sintetizando señales
de ATENA, TEC Bii, PROMETEO, NEXO, HERMES y THEMIS en predicciones accionables.

Principio fundamental: ORÁCULO no genera — anticipa.
Motor determinista. Sin LLM en el hot path. Target < 500 ms por scan.

Rutas disponibles:
  • /oraculo              → Centro de Mando (KPIs + scan manual)
  • /oraculo/predicciones → Lista de predicciones con filtros y acciones
  • /oraculo/forecasts    → Pronósticos de series de tiempo por engine

Engines monitorizados:
  • ATENA    → SPC out-of-control, NPR crítico en AMEF
  • TEC Bii  → urgencyScore alto, proveedores con alertaRiesgo
  • PROMETEO → BrandGoals con desviación >20%, fatiga creativa
  • NEXO     → hypotheses de alta confianza sin validar
  • HERMES   → veto ratio de THEMIS en acciones (últimos 30 días)
  • THEMIS   → error-severity verdicts en las últimas 48 horas`,

    policies: [
      "Cuando el usuario pregunte sobre predicciones, riesgos, alertas o el estado del sistema, referirlo a /oraculo.",
      "ORÁCULO no reemplaza el análisis humano — proporciona señales tempranas para que el usuario tome mejores decisiones.",
      "Los pronósticos son proyecciones estadísticas, no certezas. Siempre comunica el nivel de confianza.",
      "Si el usuario quiere ejecutar un scan manual, puede ir a /oraculo y usar el botón 'Escanear Ahora'.",
    ],
  },
};
