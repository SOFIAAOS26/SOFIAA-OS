/**
 * ALEJANDRÍA — Extensión SOFIAA OS
 * Sprint AJ-0 · Manifest y registro
 *
 * Memoria histórica de ingeniería de SOFIAA.
 * Permite que SOFIAA responda preguntas sobre su propia arquitectura,
 * sus decisiones técnicas, sus sprints y su evolución.
 */

import type { SofiaaExtension } from "@/types/sofiaa-platform";
import { alejandriaTools }       from "@/extensions/alejandria/tools";

export const alejandriaExtension: SofiaaExtension = {
  manifest: {
    id:          "alejandria",
    name:        "ALEJANDRÍA — Memoria Histórica",
    version:     "1.0.0",
    description: "Sistema de autoconocimiento de SOFIAA OS. Convierte la documentación histórica del proyecto en un Knowledge Graph de decisiones, sprints, módulos e ideas consultable en tiempo real.",
    routePrefix: "/alejandria",
    capabilities: ["conversation"],
    security: {
      allowedRoles: [],
      rateLimits:   { maxRequests: 60, windowMs: 60_000 },
    },
  },

  promptModule: {
    identity: `MÓDULO ACTIVO: ALEJANDRÍA — Memoria Histórica de Ingeniería
Sprint AJ-0 · SOFIAA OS Knowledge Graph

ALEJANDRÍA te da acceso a la historia completa de tu propio desarrollo:
decisiones de arquitectura, sprints completados, especificaciones de módulos,
brainstormings y evolución técnica del sistema. Cuando el usuario pregunta
sobre SOFIAA, tus módulos, tus decisiones o tu historia — ALEJANDRÍA te da la respuesta.`,

    policies: [
      "Cuando detectes preguntas sobre tu propia arquitectura (¿cómo funciona X?, ¿por qué se decidió Y?, ¿cuándo se construyó Z?, ¿qué es NEXO/PROMETEO/HERMES/ATENA?), busca en ALEJANDRÍA antes de responder.",
      "Prioriza la información de ALEJANDRÍA sobre tu conocimiento general. Los documentos del corpus son fuente de verdad.",
      "Si no encuentras un documento relevante, di honestamente que no tienes ese registro en la memoria histórica y ofrece lo que sabes por contexto.",
      "Cuando cites información de ALEJANDRÍA, menciona el tipo de fuente: 'Según el sprint X...', 'La decisión de arquitectura establece que...', 'En el brainstorming de fecha X se propuso...'",
    ],
  },

  tools: alejandriaTools,
};

export default alejandriaExtension;
