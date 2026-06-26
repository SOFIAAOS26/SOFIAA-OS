/**
 * SOFIAA — ExtensionRegistry
 *
 * El Core llama a registry.resolve(pathname) y recibe el módulo listo.
 * El Core no sabe nada de TEC BI, JP Memorial ni Marketing — solo sabe
 * que hay una extensión que cumple el contrato SofiaaExtension.
 *
 * Agregar una extensión nueva = registrarla aquí. Zero cambios en el Kernel.
 * Deshabilitar una extensión = comentar su import. Core sigue intacto.
 */

import type { SofiaaExtension, ResolvedExtension } from "@/types/sofiaa-platform";

// ── Imports de extensiones registradas ───────────────────────────────────────
// Cada extensión es un módulo aislado que exporta un objeto SofiaaExtension.
// El Core nunca importa nada más de estos módulos.
import { tecBiExtension }     from "@/extensions/tec-bi";
import { jpMemorialExtension } from "@/extensions/jp-memorial";
import { marketingExtension }  from "@/extensions/marketing-sofia";

// ── Registro centralizado ─────────────────────────────────────────────────────
const REGISTRY: SofiaaExtension[] = [
  tecBiExtension,
  jpMemorialExtension,
  marketingExtension,
];

// ── ExtensionRegistry ─────────────────────────────────────────────────────────

export class ExtensionRegistry {
  private extensions: SofiaaExtension[];

  constructor(extensions: SofiaaExtension[] = REGISTRY) {
    this.extensions = extensions;
  }

  /**
   * Resuelve la extensión activa para un pathname dado.
   * La URL es la señal de activación — principio central de SOFIAA 1.1.4.
   *
   * @param pathname - e.g. "/tec-bi/proyectos"
   * @returns ResolvedExtension con el promptText listo, o null si no hay match.
   */
  resolve(pathname: string): ResolvedExtension {
    const ext = this.extensions.find((e) =>
      pathname.startsWith(e.manifest.routePrefix)
    );

    if (!ext) return null;

    const promptText = this.assemblePromptText(ext);
    return { extension: ext, promptText };
  }

  /**
   * Verifica si un rol tiene acceso a la extensión activa en una ruta.
   * Usado por el Edge Middleware (Sprint B) para bloquear en el edge.
   *
   * @returns true si acceso permitido (incluyendo extensiones públicas)
   */
  checkAccess(pathname: string, userRole?: string): boolean {
    const resolved = this.resolve(pathname);
    if (!resolved) return true; // sin extensión = acceso público

    const { allowedRoles } = resolved.extension.manifest.security;
    if (allowedRoles.length === 0) return true; // extensión pública

    return userRole ? allowedRoles.includes(userRole) : false;
  }

  /**
   * Lista todos los IDs registrados — para logs y panel de admin.
   */
  listIds(): string[] {
    return this.extensions.map((e) => e.manifest.id);
  }

  /**
   * Ensambla el bloque de texto del prompt a partir del promptModule.
   * identity + cada policy en líneas separadas.
   */
  private assemblePromptText(ext: SofiaaExtension): string {
    const { identity, policies } = ext.promptModule;
    const parts = [identity];
    if (policies.length > 0) {
      parts.push(...policies);
    }
    return parts.join("\n");
  }
}

// ── Instancia singleton para uso en route.ts ──────────────────────────────────
export const extensionRegistry = new ExtensionRegistry();
