/**
 * TEC Bii — Extensión SOFIAA v2.0.0 (Sprint Q-2)
 *
 * Registra TEC Bii v2 en el Core Registry (core/extension.registry.ts).
 * Esto permite que chat/route.ts resuelva la extensión cuando el usuario
 * está en /tec-bii y le inyecte el contexto + las tools al LLM.
 *
 * Diferencias vs tec-bi (v1):
 *   - routePrefix: /tec-bii
 *   - Colecciones v2 en los handlers (users/{uid}/tec_bii_*)
 *   - 5 herramientas activas (vs 3 de v1)
 *   - Security sin restricción de rol (solo sesión — PageGuard v2)
 */

import type { SofiaaExtension } from "@/types/sofiaa-platform";
import { tecBiiTools }          from "./tools";

export const tecBiiCoreExtension: SofiaaExtension = {
  manifest: {
    id:          "tec-bii",
    name:        "TEC Bii — Inteligencia Cognitiva",
    version:     "2.0.0",
    description: "Inteligencia operacional cognitiva para el Área de Producción Audiovisual TEC Monterrey.",
    routePrefix: "/tec-bii",
    capabilities: ["conversation", "bi", "actions"],
    security: {
      allowedRoles: [],  // Cualquier usuario autenticado — PageGuard v2 solo verifica sesión
      rateLimits:   { maxRequests: 60, windowMs: 60_000 },
    },
  },

  promptModule: {
    identity: `EXTENSIÓN ACTIVA: TEC Bii v2 (Producción Audiovisual, Tec de Monterrey):
Rutas: /tec-bii · /tec-bii/proyectos · /tec-bii/briefs · /tec-bii/equipo · /tec-bii/proveedores · /tec-bii/clientes · /tec-bii/evaluaciones · /tec-bii/analisis · /tec-bii/roi · /tec-bii/inteligencia`,
    policies: [
      "Tienes 5 herramientas activas — úsalas cuando el usuario lo solicite explícitamente:\n" +
      "  • crear_brief: registra un nuevo brief/proyecto (solicitar título, tipo, responsable)\n" +
      "  • actualizar_proyecto: cambia estado o avance de un proyecto (necesitas el proyectoId)\n" +
      "  • listar_proyectos: muestra proyectos con urgencia y riesgo (opcionalmente filtrar por estado)\n" +
      "  • consultar_riesgo: alerta de empleados, proveedores y proyectos en riesgo predictivo\n" +
      "  • generar_analisis: genera métricas del área para diagnóstico operacional",
      "CRÍTICO: En TEC Bii v2 NUNCA uses request_capability. Las capabilities del sistema son del módulo v1 y sus rutas de datos están deprecadas. SOLO usa las 5 herramientas de extensión listadas arriba para acceder a datos de TEC Bii.",
      "Para navegar usa [NAVIGATE:/tec-bii/proyectos] y similares. Para volver al chat: [NAVIGATE:/]",
      "El sistema es cognitivo: cada entidad publicada genera un nodo en el grafo NEXO. " +
      "Puedes razonar sobre conexiones entre capturas de memoria y proyectos activos.",
    ],
  },

  tools: tecBiiTools,
};
