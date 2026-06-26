/**
 * SOFIAA — Prompt Module Resolver
 *
 * Principio: URL = señal de activación.
 * Una extensión solo se monta si el usuario ya navegó a su ruta.
 * El kernel base corre solo (~525 tokens). Las extensiones se acoplan
 * únicamente cuando se necesitan — el resto permanece desensamblado.
 */

import type { ModuleKey } from "@/config/prompt.modules";

interface ResolverContext {
  activePath: string | null;  // pathname actual, e.g. '/tec-bi/proyectos'
  userMessage: string;        // mensaje del usuario (solo para abrahan lazy-load)
}

const ABRAHAN_RE = /abrahan|benjacob|creador|berryworks|pascall|quien te (creo|hizo|diseño)|tu creador|tu equipo/i;

export function resolveModules(ctx: ResolverContext): ModuleKey[] {
  const { activePath, userMessage } = ctx;
  const path = activePath ?? "";

  // ── Kernel base — siempre ─────────────────────────────────────────────────
  const modules: ModuleKey[] = ["base", "nav_core", "nav_external", "generative_ui"];

  // ── Abrahan: lazy — solo si el mensaje lo solicita ───────────────────────
  if (ABRAHAN_RE.test(userMessage)) modules.push("abrahan");

  // ── Extensión: solo por URL (la navegación ES la activación) ─────────────
  if (path.startsWith("/tec-bi"))              modules.push("tec_bi");
  else if (path.startsWith("/jp-memorial"))    modules.push("jp_memorial");
  else if (path.startsWith("/marketing-sofia")) modules.push("marketing");

  return modules;
}

/** String legible de módulos activos — para logs de servidor */
export function describeModules(modules: ModuleKey[]): string {
  return modules.join(" + ");
}
