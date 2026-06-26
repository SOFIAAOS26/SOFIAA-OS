/**
 * SOFIAA 1.1.4 — Structured Log Correlation
 *
 * Cada request genera un traceId único. Todo evento del ciclo de vida
 * (guardrails, prompt assembly, groq response, errores) se registra
 * con ese ID en Firestore /logs.
 *
 * Investigar un error = filtrar por traceId en Firebase Console.
 * Sin herramientas APM pesadas — sin latencia extra.
 */

// ── TraceId ────────────────────────────────────────────────────────────────

/** Genera un ID único de 16 chars para correlacionar eventos de un request */
export function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${timestamp}-${random}`;
}

// ── Log Level ──────────────────────────────────────────────────────────────

export type LogLevel = "info" | "warn" | "error" | "blocked" | "cache_hit";

export interface StructuredLog {
  traceId: string;
  timestamp: number;
  level: LogLevel;
  extensionId: string | null;
  step: string;
  status: "ok" | "failed" | "blocked" | "skipped";
  durationMs?: number;
  tokensUsed?: number;
  message?: string;
  meta?: Record<string, unknown>;
}

// ── Tracer class ──────────────────────────────────────────────────────────

export class Tracer {
  private traceId: string;
  private extensionId: string | null;
  private startTime: number;
  private logs: StructuredLog[] = [];

  constructor(traceId: string, extensionId: string | null = null) {
    this.traceId = traceId;
    this.extensionId = extensionId;
    this.startTime = Date.now();
  }

  /** Registra un evento en el trace local */
  log(
    step: string,
    status: StructuredLog["status"],
    level: LogLevel = "info",
    meta?: Record<string, unknown>
  ): void {
    const entry: StructuredLog = {
      traceId: this.traceId,
      timestamp: Date.now(),
      level,
      extensionId: this.extensionId,
      step,
      status,
      durationMs: Date.now() - this.startTime,
      ...meta,
      meta,
    };
    this.logs.push(entry);
    // Log estructurado en consola para Vercel logs
    console.log(
      `[SOFIAA][${level.toUpperCase()}] traceId=${this.traceId} ext=${this.extensionId ?? "none"} step=${step} status=${status}`,
      meta ?? ""
    );
  }

  /** Persiste todos los logs a Firestore — llamar desde waitUntil() en Sprint B3 */
  async flush(): Promise<void> {
    if (this.logs.length === 0) return;
    try {
      // Import dinámico para no bloquear el Edge con el SDK de Firebase
      const { getFirestore } = await import("firebase-admin/firestore");
      const db = getFirestore();
      const batch = db.batch();
      for (const entry of this.logs) {
        const ref = db.collection("sofiaa_logs").doc();
        batch.set(ref, entry);
      }
      await batch.commit();
    } catch {
      // Los logs nunca deben romper el flujo principal
      console.error("[SOFIAA][TRACER] flush failed — logs lost for traceId:", this.traceId);
    }
  }

  get id(): string { return this.traceId; }
  get allLogs(): StructuredLog[] { return this.logs; }
  get elapsedMs(): number { return Date.now() - this.startTime; }
}

// ── Factory ───────────────────────────────────────────────────────────────

/** Crea un Tracer listo para un request */
export function createTracer(extensionId?: string | null): Tracer {
  return new Tracer(generateTraceId(), extensionId ?? null);
}
