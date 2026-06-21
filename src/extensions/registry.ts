import { SofiaExtension } from "./types";
import { tecBiExtension } from "./tec-bi/manifest";

/** Central registry — add future extensions here */
const extensions: SofiaExtension[] = [tecBiExtension];

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
