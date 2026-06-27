/**
 * Tests: src/config/prompt.modules.ts + src/core/prompt.resolver.ts
 */
import { describe, it, expect } from "vitest";
import { assemblePrompt, MODULES } from "../../config/prompt.modules";
import { resolveModules } from "../prompt.resolver";
import type { ModuleKey } from "../../config/prompt.modules";

describe("MODULES — tokens mínimos", () => {
  it("base existe y no está vacío", () => {
    expect(MODULES.base.length).toBeGreaterThan(0);
  });

  it("nav_core existe y no está vacío", () => {
    expect(MODULES.nav_core.length).toBeGreaterThan(0);
  });

  it("generative_ui existe y no está vacío", () => {
    expect(MODULES.generative_ui.length).toBeGreaterThan(0);
  });
});

describe("assemblePrompt", () => {
  it("incluye siempre base", () => {
    const prompt = assemblePrompt(["base"]);
    expect(prompt).toContain(MODULES.base.slice(0, 30));
  });

  it("combina múltiples módulos", () => {
    const prompt = assemblePrompt(["base", "nav_core"]);
    expect(prompt).toContain(MODULES.base.slice(0, 20));
    expect(prompt).toContain(MODULES.nav_core.slice(0, 20));
  });

  it("inyecta extensionData si se proporciona", () => {
    const prompt = assemblePrompt(["base"], "EXTENSIÓN CUSTOM: hola mundo");
    expect(prompt).toContain("EXTENSIÓN CUSTOM: hola mundo");
  });

  it("sin extensionData no añade string vacío", () => {
    const prompt = assemblePrompt(["base"]);
    expect(prompt).not.toContain("undefined");
    expect(prompt).not.toContain("null");
  });
});

describe("resolveModules", () => {
  it("chat general → incluye base y nav_core", () => {
    const modules = resolveModules({ activePath: "/", userMessage: "hola" });
    expect(modules).toContain("base");
    expect(modules).toContain("nav_core");
  });

  it("ruta TEC BI → incluye módulo tec_bi", () => {
    const modules = resolveModules({ activePath: "/tec-bi/briefs", userMessage: "muéstrame los briefs" });
    expect(modules).toContain("tec_bi");
  });

  it("ruta JP Memorial → incluye módulo jp_memorial", () => {
    const modules = resolveModules({ activePath: "/jp-memorial", userMessage: "hola" });
    expect(modules).toContain("jp_memorial");
  });

  it("ruta marketing → incluye módulo marketing", () => {
    const modules = resolveModules({ activePath: "/marketing-sofia", userMessage: "clientes" });
    expect(modules).toContain("marketing");
  });

  it("no retorna duplicados", () => {
    const modules = resolveModules({ activePath: "/tec-bi", userMessage: "proyectos" });
    const unique = [...new Set(modules)];
    expect(modules.length).toBe(unique.length);
  });

  it("siempre retorna al menos 1 módulo", () => {
    const modules = resolveModules({ activePath: "", userMessage: "" });
    expect(modules.length).toBeGreaterThan(0);
  });
});
