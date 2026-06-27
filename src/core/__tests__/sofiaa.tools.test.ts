/**
 * Tests: src/core/sofiaa.tools.ts
 */
import { describe, it, expect, vi } from "vitest";
import { SOFIAA_TOOLS, parseToolCalls, serializeToolResults } from "../sofiaa.tools";

describe("SOFIAA_TOOLS", () => {
  it("define exactamente 2 tools", () => {
    expect(SOFIAA_TOOLS.length).toBe(2);
  });

  it('incluye "navigate" y "show_ui"', () => {
    const names = SOFIAA_TOOLS.map((t) => t.function.name);
    expect(names).toContain("navigate");
    expect(names).toContain("show_ui");
  });

  it("navigate requiere destination e isExternal", () => {
    const nav = SOFIAA_TOOLS.find((t) => t.function.name === "navigate")!;
    expect(nav.function.parameters.required).toContain("destination");
    expect(nav.function.parameters.required).toContain("isExternal");
  });

  it("show_ui requiere type y payload", () => {
    const ui = SOFIAA_TOOLS.find((t) => t.function.name === "show_ui")!;
    expect(ui.function.parameters.required).toContain("type");
    expect(ui.function.parameters.required).toContain("payload");
  });
});

describe("parseToolCalls", () => {
  it("parsea un tool call navigate válido", () => {
    const calls = [
      {
        function: {
          name: "navigate",
          arguments: JSON.stringify({ destination: "/tec-bi", isExternal: false }),
        },
      },
    ];
    const result = parseToolCalls(calls);
    expect(result.navigate).toEqual({ destination: "/tec-bi", isExternal: false });
  });

  it("parsea un tool call show_ui válido", () => {
    const calls = [
      {
        function: {
          name: "show_ui",
          arguments: JSON.stringify({
            type: "quick_actions",
            payload: { actions: [{ label: "Ver Briefs", msg: "briefs", icon: "📋" }] },
          }),
        },
      },
    ];
    const result = parseToolCalls(calls);
    expect(result.showUI?.type).toBe("quick_actions");
    expect(result.showUI?.payload).toBeDefined();
  });

  it("JSON malformado → no rompe, retorna objeto vacío", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const calls = [
      {
        function: {
          name: "navigate",
          arguments: "{ destination: broken json }",
        },
      },
    ];
    const result = parseToolCalls(calls);
    expect(result.navigate).toBeUndefined();
    consoleSpy.mockRestore();
  });

  it("tool desconocido → se ignora silenciosamente", () => {
    const calls = [
      {
        function: {
          name: "herramienta_inexistente",
          arguments: JSON.stringify({ foo: "bar" }),
        },
      },
    ];
    const result = parseToolCalls(calls);
    expect(result.navigate).toBeUndefined();
    expect(result.showUI).toBeUndefined();
  });

  it("array vacío → objeto vacío", () => {
    expect(parseToolCalls([])).toEqual({});
  });
});

describe("serializeToolResults", () => {
  it("serializa navigate a formato [NAVIGATE:url]", () => {
    const result = serializeToolResults({
      navigate: { destination: "/servicios", isExternal: false },
    });
    expect(result).toBe("[NAVIGATE:/servicios]");
  });

  it("serializa navigate externo", () => {
    const result = serializeToolResults({
      navigate: { destination: "https://tec.mx", isExternal: true },
    });
    expect(result).toBe("[NAVIGATE:https://tec.mx]");
  });

  it("serializa show_ui a formato [UI:tipo:json]", () => {
    const payload = { actions: [] };
    const result = serializeToolResults({
      showUI: { type: "quick_actions", payload },
    });
    expect(result).toBe(`[UI:quick_actions:${JSON.stringify(payload)}]`);
  });

  it("serializa ambos juntos separados por salto de línea", () => {
    const result = serializeToolResults({
      navigate: { destination: "/tec-bi", isExternal: false },
      showUI: { type: "info_card", payload: { title: "TEC BI" } },
    });
    const lines = result.split("\n");
    expect(lines.length).toBe(2);
    expect(lines[0]).toBe("[NAVIGATE:/tec-bi]");
    expect(lines[1]).toContain("[UI:info_card:");
  });

  it("resultado vacío para objeto vacío", () => {
    expect(serializeToolResults({})).toBe("");
  });
});
