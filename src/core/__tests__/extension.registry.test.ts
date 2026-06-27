/**
 * Tests: src/core/extension.registry.ts
 */
import { describe, it, expect, beforeEach } from "vitest";
import { ExtensionRegistry } from "../extension.registry";
import type { SofiaaExtension } from "@/types/sofiaa-platform";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeExt = (
  id: string,
  routePrefix: string,
  version: `${number}.${number}.${number}`,
  allowedRoles: string[] = []
): SofiaaExtension => ({
  manifest: {
    id,
    name: id,
    version,
    description: "",
    routePrefix,
    capabilities: ["conversation"],
    security: {
      allowedRoles,
      rateLimits: { maxRequests: 60, windowMs: 60_000 },
    },
  },
  promptModule: {
    identity: `${id} identity`,
    policies: [`${id} policy`],
  },
});

const extA_v1 = makeExt("ext-a", "/ext-a", "1.0.0", ["admin"]);
const extA_v2 = makeExt("ext-a", "/ext-a", "1.2.0", ["admin"]);
const extA_v3 = makeExt("ext-a", "/ext-a", "2.0.0", ["admin"]);
const extPublic = makeExt("public-ext", "/public", "1.0.0", []);
const extB = makeExt("ext-b", "/ext-b", "1.0.0", ["director"]);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ExtensionRegistry.resolve", () => {
  it("resuelve una extensión simple por prefijo", () => {
    const registry = new ExtensionRegistry([extB]);
    const result = registry.resolve("/ext-b/subpage");
    expect(result).not.toBeNull();
    expect(result?.extension.manifest.id).toBe("ext-b");
  });

  it("retorna null si no hay match", () => {
    const registry = new ExtensionRegistry([extB]);
    const result = registry.resolve("/nada");
    expect(result).toBeNull();
  });

  it("el promptText incluye identity y policies", () => {
    const registry = new ExtensionRegistry([extB]);
    const result = registry.resolve("/ext-b");
    expect(result?.promptText).toContain("ext-b identity");
    expect(result?.promptText).toContain("ext-b policy");
  });

  it("sin versioning, usa la única extensión disponible", () => {
    const registry = new ExtensionRegistry([extA_v1]);
    const result = registry.resolve("/ext-a");
    expect(result?.extension.manifest.version).toBe("1.0.0");
  });
});

describe("ExtensionRegistry — semantic versioning", () => {
  let registry: ExtensionRegistry;

  beforeEach(() => {
    registry = new ExtensionRegistry([extA_v1, extA_v2, extA_v3]);
  });

  it("sin pin, elige la versión más alta (2.0.0)", () => {
    const result = registry.resolve("/ext-a");
    expect(result?.extension.manifest.version).toBe("2.0.0");
  });

  it("con pin, elige la versión pinada", () => {
    registry.pinVersion("ext-a", "1.2.0");
    const result = registry.resolve("/ext-a");
    expect(result?.extension.manifest.version).toBe("1.2.0");
  });

  it("rollback vuelve a la versión anterior al pin", () => {
    registry.pinVersion("ext-a", "1.0.0");
    registry.rollback("ext-a");
    // Antes del pin no había pin, así que vuelve a latest
    const result = registry.resolve("/ext-a");
    expect(result?.extension.manifest.version).toBe("2.0.0");
  });

  it("clearPin elimina el pin y vuelve a latest", () => {
    registry.pinVersion("ext-a", "1.0.0");
    registry.clearPin("ext-a");
    const result = registry.resolve("/ext-a");
    expect(result?.extension.manifest.version).toBe("2.0.0");
  });

  it("pin inválido (versión no registrada) → fallback a latest sin crash", () => {
    registry.pinVersion("ext-a", "9.9.9");
    const result = registry.resolve("/ext-a");
    expect(result?.extension.manifest.version).toBe("2.0.0");
  });

  it("listVersions retorna las 3 versiones ordenadas mayor a menor", () => {
    const versions = registry.listVersions("ext-a");
    expect(versions.map((v) => v.version)).toEqual(["2.0.0", "1.2.0", "1.0.0"]);
  });

  it("listVersions marca active=true solo en la versión más alta (sin pin)", () => {
    const versions = registry.listVersions("ext-a");
    expect(versions.find((v) => v.version === "2.0.0")?.active).toBe(true);
    expect(versions.find((v) => v.version === "1.2.0")?.active).toBe(false);
  });
});

describe("ExtensionRegistry.checkAccess", () => {
  const registry = new ExtensionRegistry([extA_v2, extPublic, extB]);

  it("sin extensión activa → acceso libre", () => {
    expect(registry.checkAccess("/otra-ruta", "cualquier_rol")).toBe(true);
  });

  it("extensión pública (allowedRoles=[]) → siempre acceso", () => {
    expect(registry.checkAccess("/public/algo", undefined)).toBe(true);
    expect(registry.checkAccess("/public/algo", "invitado")).toBe(true);
  });

  it("rol autorizado → acceso permitido", () => {
    expect(registry.checkAccess("/ext-a/briefs", "admin")).toBe(true);
  });

  it("rol no autorizado → acceso denegado", () => {
    expect(registry.checkAccess("/ext-a/briefs", "invitado")).toBe(false);
  });

  it("sin rol en ruta protegida → acceso denegado", () => {
    expect(registry.checkAccess("/ext-a/briefs", undefined)).toBe(false);
  });
});

describe("ExtensionRegistry.listIds", () => {
  it("retorna IDs únicos aunque haya múltiples versiones", () => {
    const registry = new ExtensionRegistry([extA_v1, extA_v2, extA_v3, extPublic]);
    const ids = registry.listIds();
    expect(ids).toContain("ext-a");
    expect(ids).toContain("public-ext");
    expect(ids.filter((id) => id === "ext-a").length).toBe(1);
  });
});
