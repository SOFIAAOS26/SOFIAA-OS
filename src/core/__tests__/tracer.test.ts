/**
 * Tests: src/core/tracer.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateTraceId, Tracer, createTracer } from "../tracer";

// Mock firebase-admin para no necesitar credenciales en tests
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    batch: () => ({
      set: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    }),
    collection: () => ({ doc: () => ({}) }),
  }),
}));

describe("generateTraceId", () => {
  it("genera un id no vacío", () => {
    const id = generateTraceId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");
  });

  it("tiene exactamente un guión separando timestamp y random", () => {
    const id = generateTraceId();
    const parts = id.split("-");
    expect(parts.length).toBe(2);
  });

  it("cada llamada genera un id diferente", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateTraceId()));
    expect(ids.size).toBe(20);
  });
});

describe("Tracer", () => {
  let tracer: Tracer;

  beforeEach(() => {
    tracer = createTracer("tec-bi");
  });

  it("el id es un string válido", () => {
    expect(typeof tracer.id).toBe("string");
    expect(tracer.id.length).toBeGreaterThan(0);
  });

  it("log registra entradas en allLogs", () => {
    tracer.log("test_step", "ok", "info");
    tracer.log("error_step", "failed", "error");
    expect(tracer.allLogs.length).toBe(2);
  });

  it("las entradas de log tienen los campos correctos", () => {
    tracer.log("guardrails_check", "blocked", "blocked", { threat: "injection" });
    const entry = tracer.allLogs[0];
    expect(entry.step).toBe("guardrails_check");
    expect(entry.status).toBe("blocked");
    expect(entry.level).toBe("blocked");
    expect(entry.traceId).toBe(tracer.id);
  });

  it("elapsedMs aumenta con el tiempo", async () => {
    const t0 = tracer.elapsedMs;
    await new Promise((r) => setTimeout(r, 10));
    const t1 = tracer.elapsedMs;
    expect(t1).toBeGreaterThan(t0);
  });

  it("flush no lanza si no hay logs", async () => {
    await expect(tracer.flush()).resolves.toBeUndefined();
  });
});
