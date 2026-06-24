import { SofiaExtension } from "../types";

/**
 * Viakable Intelligence — EXTENSIÓN EN PREPARACIÓN
 * Estado: SCAFFOLD / SIN ACTIVAR
 *
 * Activar cuando el cliente autorice el inicio del Sprint 0.
 */
export const viakableIntelligenceExtension: SofiaExtension = {
  id: "viakable-intelligence",
  name: "Viakable Intelligence",
  description: "Business Intelligence y operaciones para Viakable",
  baseRoute: "/viakable",

  routes: [
    { path: "/viakable", label: "Dashboard", icon: "🚀" },
    // Módulos por definir en Sprint 0
  ],

  contextBlock: `
# EXTENSIÓN: Viakable Intelligence (EN PREPARACIÓN)

Esta extensión está en fase de diseño. Los módulos se definirán en el Sprint 0.
`,

  theme: {
    backgroundGradient: "linear-gradient(145deg, #EFF6FF 0%, #F0F9FF 55%, #EEF4FF 100%)",
    accentColor: "rgba(59, 130, 246, 0.6)",
    badgeLabel: "Viakable",
    badgeColor: "#3B82F6",
  },

  activationPhrases: [
    "abre viakable", "viakable intelligence", "modo viakable",
  ],
};
