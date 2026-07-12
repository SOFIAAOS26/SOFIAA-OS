/**
 * SOFIAA — ExtensionRegistry v2
 *
 * Novedades Sprint C1:
 * - Soporte multi-versión: el mismo id puede coexistir en varias versiones
 * - Resolución por semver: sin pin → la versión más alta activa
 * - pinVersion(id, version) → fija una versión (staging, A/B, rollback)
 * - rollback(id) → vuelve a la versión anterior
 * - listVersions(id) → introspección desde el panel de admin
 *
 * El Core sigue sin saber nada de extensiones concretas.
 * La URL sigue siendo la única señal de activación.
 */

import type {
  SofiaaExtension,
  ResolvedExtension,
  ExtensionVersion,
} from "@/types/sofiaa-platform";

// ── Imports de extensiones registradas ───────────────────────────────────────
import { tecBiExtension }          from "@/extensions/tec-bi";
import { tecBiiCoreExtension }     from "@/extensions/tec-bii";      // v2 — con tools v2
import { jpMemorialExtension }     from "@/extensions/jp-memorial";
import { marketingExtension }      from "@/extensions/marketing-sofia";
import { atenaExtension }          from "@/extensions/atena";         // ATENA Scientific Engine

// ── Registro centralizado ─────────────────────────────────────────────────────
// Agregar nuevas versiones de una extensión = añadir otra entrada aquí.
// El Registry elige la más alta automáticamente (o la pinada).
const REGISTRY: SofiaaExtension[] = [
  tecBiExtension,
  tecBiiCoreExtension,   // TEC Bii v2 — /tec-bii con tools cognitivas
  jpMemorialExtension,
  marketingExtension,
  atenaExtension,        // ATENA Scientific Intelligence Engine — /atena
];

// ── Semver utils ──────────────────────────────────────────────────────────────

/** Parsea "1.2.3" → [1, 2, 3] */
function parseSemver(v: ExtensionVersion): [number, number, number] {
  const [major, minor, patch] = v.split(".").map(Number);
  return [major, minor, patch];
}

/**
 * Compara dos versiones semánticas.
 * @returns -1 si a < b, 0 si iguales, 1 si a > b
 */
function compareSemver(a: ExtensionVersion, b: ExtensionVersion): number {
  const [aMaj, aMin, aPatch] = parseSemver(a);
  const [bMaj, bMin, bPatch] = parseSemver(b);

  if (aMaj !== bMaj) return aMaj > bMaj ? 1 : -1;
  if (aMin !== bMin) return aMin > bMin ? 1 : -1;
  if (aPatch !== bPatch) return aPatch > bPatch ? 1 : -1;
  return 0;
}

// ── ExtensionRegistry ─────────────────────────────────────────────────────────

export class ExtensionRegistry {
  private extensions: SofiaaExtension[];

  /** Versión actualmente pinada por extensión id. null = usar la más alta */
  private pins: Map<string, ExtensionVersion> = new Map();

  /** Historial de pins para rollback (guarda el pin anterior) */
  private pinHistory: Map<string, ExtensionVersion | null> = new Map();

  constructor(extensions: SofiaaExtension[] = REGISTRY) {
    this.extensions = extensions;
  }

  // ── Resolución ──────────────────────────────────────────────────────────────

  /**
   * Resuelve la extensión activa para un pathname.
   * La URL es la señal de activación — principio central de SOFIAA 1.1.4.
   *
   * Si hay múltiples versiones del mismo id registradas, elige:
   *   1. La versión pinada (via pinVersion()), o
   *   2. La versión semánticamente más alta.
   *
   * @param pathname - e.g. "/tec-bi/proyectos"
   */
  resolve(pathname: string): ResolvedExtension {
    // Filtrar todas las extensiones que coinciden con el prefijo
    const candidates = this.extensions.filter((e) =>
      pathname.startsWith(e.manifest.routePrefix)
    );

    if (candidates.length === 0) return null;

    // Si solo hay una, evitar la lógica de versiones
    const ext =
      candidates.length === 1
        ? candidates[0]
        : this.selectVersion(candidates);

    return { extension: ext, promptText: this.assemblePromptText(ext) };
  }

  /**
   * Selecciona la versión correcta entre candidatos con el mismo routePrefix.
   * Agrupa por id, luego aplica pin o elige la más alta.
   */
  private selectVersion(candidates: SofiaaExtension[]): SofiaaExtension {
    // Agrupar por id (puede haber extensiones diferentes con el mismo prefijo en casos edge)
    const byId = new Map<string, SofiaaExtension[]>();
    for (const ext of candidates) {
      const group = byId.get(ext.manifest.id) ?? [];
      group.push(ext);
      byId.set(ext.manifest.id, group);
    }

    // Si hay un solo grupo de id, resolver versión dentro de él
    if (byId.size === 1) {
      const [id, group] = [...byId.entries()][0];
      return this.resolveFromGroup(id, group);
    }

    // Múltiples ids con mismo prefijo (raro) → usar la más alta de todas
    const all = candidates.sort((a, b) =>
      compareSemver(b.manifest.version, a.manifest.version)
    );
    return all[0];
  }

  private resolveFromGroup(id: string, group: SofiaaExtension[]): SofiaaExtension {
    const pinned = this.pins.get(id);

    if (pinned) {
      const match = group.find((e) => e.manifest.version === pinned);
      if (match) return match;
      // Pin inválido (versión no encontrada) → fallback a la más alta, no romper
      console.warn(`[SOFIAA][REGISTRY] pin ${id}@${pinned} not found — usando la más alta`);
    }

    // Sin pin → la más alta
    return group.sort((a, b) =>
      compareSemver(b.manifest.version, a.manifest.version)
    )[0];
  }

  // ── Control de versiones ────────────────────────────────────────────────────

  /**
   * Fija una versión específica para una extensión.
   * Útil para: staging, A/B testing, rollback manual.
   *
   * @param id      - "tec-bi", "jp-memorial", etc.
   * @param version - "1.2.0"
   */
  pinVersion(id: string, version: ExtensionVersion): void {
    const current = this.pins.get(id) ?? null;
    this.pinHistory.set(id, current);
    this.pins.set(id, version);
    console.log(`[SOFIAA][REGISTRY] pin: ${id}@${version} (era: ${current ?? "latest"})`);
  }

  /**
   * Vuelve al pin anterior (o a "latest" si no había pin antes).
   * Un solo nivel de rollback — suficiente para recuperación de emergencia.
   */
  rollback(id: string): void {
    const previous = this.pinHistory.get(id);
    if (previous === undefined) {
      console.warn(`[SOFIAA][REGISTRY] rollback: no hay historial para ${id}`);
      return;
    }
    if (previous === null) {
      this.pins.delete(id);
    } else {
      this.pins.set(id, previous);
    }
    this.pinHistory.delete(id);
    console.log(`[SOFIAA][REGISTRY] rollback: ${id} → ${previous ?? "latest"}`);
  }

  /**
   * Elimina el pin — vuelve a la resolución automática (versión más alta).
   */
  clearPin(id: string): void {
    this.pins.delete(id);
    this.pinHistory.delete(id);
  }

  // ── Introspección ───────────────────────────────────────────────────────────

  /** Lista todos los ids registrados */
  listIds(): string[] {
    return [...new Set(this.extensions.map((e) => e.manifest.id))];
  }

  /**
   * Lista todas las versiones registradas para un id dado.
   * Ordena de mayor a menor. Incluye el pin activo si lo hay.
   */
  listVersions(id: string): {
    version: ExtensionVersion;
    active: boolean;
    pinned: boolean;
  }[] {
    const all = this.extensions
      .filter((e) => e.manifest.id === id)
      .sort((a, b) => compareSemver(b.manifest.version, a.manifest.version));

    const pin = this.pins.get(id);
    const activeVersion = pin ?? all[0]?.manifest.version;

    return all.map((e) => ({
      version: e.manifest.version,
      active: e.manifest.version === activeVersion,
      pinned: e.manifest.version === pin,
    }));
  }

  /**
   * Verifica si un rol tiene acceso a la extensión activa en una ruta.
   * Usado por el Edge Middleware (Sprint B) para bloquear en el edge.
   */
  checkAccess(pathname: string, userRole?: string): boolean {
    const resolved = this.resolve(pathname);
    if (!resolved) return true;

    const { allowedRoles } = resolved.extension.manifest.security;
    if (allowedRoles.length === 0) return true;

    return userRole ? allowedRoles.includes(userRole) : false;
  }

  // ── Helpers privados ────────────────────────────────────────────────────────

  private assemblePromptText(ext: SofiaaExtension): string {
    const { identity, policies } = ext.promptModule;
    const parts = [identity];
    if (policies.length > 0) parts.push(...policies);
    return parts.join("\n");
  }
}

// ── Instancia singleton para uso en route.ts ──────────────────────────────────
export const extensionRegistry = new ExtensionRegistry();
