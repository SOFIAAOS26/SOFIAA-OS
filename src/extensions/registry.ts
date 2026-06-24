import { SofiaExtension } from "./types";
import { tecBiExtension }              from "./tec-bi/manifest";
import { jpMemorialExtension }         from "./jp-memorial/manifest";
import { marketingSofiaExtension }     from "./marketing-sofia/manifest";
// import { viakableIntelligenceExtension } from "./viakable-intelligence/manifest"; // PENDIENTE

/** Central registry — add future extensions here */
const extensions: SofiaExtension[] = [
  tecBiExtension,
  jpMemorialExtension,
  marketingSofiaExtension,
  // viakableIntelligenceExtension,  // activar en Sprint 0 de Viakable
];

/**
 * Returns the active extension for a given pathname, or null if none.
 * Detection is purely URL-based — no state, no localStorage.
 */
export function getActiveExtension(pathname: string): SofiaExtension | null {
  return extensions.find((ext) => pathname.startsWith(ext.baseRoute)) ?? null;
}

/** Returns all registered extensions */
export function getAllExtensions(): SofiaExtension[] {
  return extensions;
}
