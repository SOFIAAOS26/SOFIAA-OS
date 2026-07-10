import { SofiaExtension } from "./types";
// TEC BI v1 → BETA (desconectada del registry, ruta /tec-bi sigue accesible pero no activa en el sistema cognitivo)
// import { tecBiExtension }           from "./tec-bi/manifest";
import { tecBiiExtension }             from "./tec-bii/manifest";       // v2 — RUMBO A TIER 4
import { jpMemorialExtension }         from "./jp-memorial/manifest";
import { marketingSofiaExtension }     from "./marketing-sofia/manifest";
import { nexoExtension }               from "./nexo/manifest";
// import { viakableIntelligenceExtension } from "./viakable-intelligence/manifest"; // PENDIENTE

/** Central registry — add future extensions here */
const extensions: SofiaExtension[] = [
  tecBiiExtension,           // TEC Bii v2 — Cognitiva (RUMBO A TIER 4)
  // tecBiExtension,         // TEC BI v1 — BETA (desconectada)
  jpMemorialExtension,
  marketingSofiaExtension,
  nexoExtension,
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
