/**
 * SOFIAA 1.1.4 — ARCHIVO LEGACY ELIMINADO
 *
 * El sistema de prompt monolítico fue reemplazado completamente por:
 *   - src/config/prompt.modules.ts  → módulos independientes
 *   - src/core/prompt.resolver.ts   → resolución por URL
 *   - src/core/extension.registry.ts → contrato formal SofiaaExtension
 *
 * Este archivo puede borrarse del repositorio con seguridad.
 * @deprecated desde v1.1.4 — no importar
 */

// No exporta nada. El código que dependía de buildSystemPrompt
// fue migrado a assemblePrompt() en prompt.modules.ts.
export {};
