/**
 * SOFIAA — Prompt Module Resolver v1.1.4
 *
 * El Core es completamente ciego a las extensiones concretas.
 * Delega la resolución al ExtensionRegistry — que lee contratos formales.
 *
 * Agregar una extensión nueva = registrarla en el Registry.
 * Zero if/else hardcoded. Zero cambios aquí al escalar.
 */

import type { ModuleKey } from "@/config/prompt.modules";
import { extensionRegistry } from "@/core/extension.registry";

interface ResolverContext {
  activePath: string | null;
  userMessage: string;
}

const ABRAHAN_RE = /abrahan|benjacob|creador|berryworks|pascall|quien te (creo|hizo|diseño)|tu creador|tu equipo/i;

export function resolveModules(ctx: ResolverContext): ModuleKey[] {
  const { activePath, userMessage } = ctx;
  const path = activePath ?? "";

  // ── Kernel base — siempre ─────────────────────────────────────────────────
  const modules: ModuleKey[] = ["base", "nav_core", "nav_external", "generative_ui", "nexo_cards"];

  // ── Abrahan: lazy — solo si el mensaje lo solicita ───────────────────────
  if (ABRAHAN_RE.test(userMessage)) modules.push("abrahan");

  // ── Extensión: el Registry decide — Core agnóstico ───────────────────────
  // No hay if/else. No hay strings hardcoded de rutas.
  // La extensión activa se determina por contrato formal.
  const resolved = extensionRegistry.resolve(path);
  if (resolved) {
    // Guardamos el promptText en el contexto para que route.ts lo use
    // como extensionData ya ensamblado por el Registry.
    // Los módulos base son suficientes — extensionData se inyecta aparte.
    // (ver assemblePrompt en route.ts)
    (ctx as ResolverContext & { _resolvedPrompt?: string })._resolvedPrompt =
      resolved.promptText;
  }

  return modules;
}

/**
 * Resuelve el texto de prompt de la extensión activa para una ruta.
 * Retorna null si no hay extensión activa.
 * Usado por route.ts como extensionData en assemblePrompt().
 */
export function resolveExtensionPrompt(pathname: string): string | null {
  const resolved = extensionRegistry.resolve(pathname);
  return resolved ? resolved.promptText : null;
}

/** String legible de módulos activos — para logs de servidor */
export function describeModules(modules: ModuleKey[]): string {
  return modules.join(" + ");
}
