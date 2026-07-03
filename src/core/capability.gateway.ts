/**
 * SOFIAA Sprint E — Capability Gateway
 *
 * RBAC + audit antes de ejecutar cualquier capability.
 *
 * Flujo:
 *   1. authorize(): verifica capability existe + rol permitido + rate limit
 *   2. execute(): si autorizado → Runtime.fetchRaw → Summarizer → CapabilityResult
 *
 * Nunca llama a Firestore directamente — delega al Runtime.
 */

import type { CapabilityContext, CapabilityResult } from "@/core/capability.runtime";
import { capabilityRuntime } from "@/core/capability.runtime";
import { resolveCapability } from "@/core/capability.registry";
import { summarize, buildCapabilityBlock } from "@/core/capability.summarizer";

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface GatewayResult {
  allowed:  boolean;
  reason?:  string;
}

export interface GatewayAuditEntry {
  capabilityId: string;
  userId:       string;
  userRole:     string;
  allowed:      boolean;
  reason?:      string;
  timestamp:    number;
}

export interface GatewayExecuteResult {
  result:         CapabilityResult;
  promptBlock:    string;
}

// ── Rate limiter simple (por sesión, en memoria) ──────────────────────────

const sessionCallCounts = new Map<string, number>();
const MAX_CALLS_PER_SESSION = 10;

function getSessionKey(userId: string): string {
  return userId;
}

function checkRateLimit(userId: string): boolean {
  const key  = getSessionKey(userId);
  const count = sessionCallCounts.get(key) ?? 0;
  if (count >= MAX_CALLS_PER_SESSION) return false;
  sessionCallCounts.set(key, count + 1);
  return true;
}

// ── Gateway ────────────────────────────────────────────────────────────────

export class CapabilityGateway {
  private auditLog: GatewayAuditEntry[] = [];

  /**
   * Verifica si el contexto puede ejecutar la capability.
   * No tiene efectos secundarios — solo evalúa.
   */
  authorize(capabilityId: string, ctx: CapabilityContext): GatewayResult {
    const def = resolveCapability(capabilityId);

    if (!def) {
      return { allowed: false, reason: `Capability "${capabilityId}" no existe en el Registry` };
    }

    if (!def.requiredRoles.includes(ctx.userRole)) {
      return {
        allowed: false,
        reason: `Rol "${ctx.userRole}" no tiene permiso para "${capabilityId}". Roles requeridos: ${def.requiredRoles.join(", ")}`,
      };
    }

    // Admin puede acceder a capabilities de cualquier extensión (cross-extension)
    // El resto solo puede acceder a las de su extensión activa
    const isAdminRole = ctx.userRole === "admin";
    if (!isAdminRole && def.extensionId !== ctx.extensionId) {
      return {
        allowed: false,
        reason: `Capability "${capabilityId}" pertenece a la extensión "${def.extensionId}", no a "${ctx.extensionId}"`,
      };
    }

    return { allowed: true };
  }

  /**
   * Ejecuta la capability si está autorizada.
   * Registra en el audit log independientemente del resultado.
   */
  async execute(
    capabilityId: string,
    ctx:          CapabilityContext
  ): Promise<GatewayExecuteResult> {
    const authResult = this.authorize(capabilityId, ctx);

    // Audit — siempre
    this.auditLog.push({
      capabilityId,
      userId:    ctx.userId,
      userRole:  ctx.userRole,
      allowed:   authResult.allowed,
      reason:    authResult.reason,
      timestamp: Date.now(),
    });

    if (!authResult.allowed) {
      throw new Error(`[CapabilityGateway] Acceso denegado: ${authResult.reason}`);
    }

    // Rate limit
    if (!checkRateLimit(ctx.userId)) {
      throw new Error(`[CapabilityGateway] Límite de consultas alcanzado para esta sesión`);
    }

    const def = resolveCapability(capabilityId)!;

    // Ejecutar via Runtime (agnóstico de fuente)
    const raw = await capabilityRuntime.fetchRaw(def, ctx);

    // Resumir — nunca inyectar el raw completo
    const result      = summarize(raw, def);
    const promptBlock = buildCapabilityBlock(result);

    return { result, promptBlock };
  }

  getAuditLog(): GatewayAuditEntry[] {
    return [...this.auditLog];
  }

  clearAuditLog(): void {
    this.auditLog = [];
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────

export const capabilityGateway = new CapabilityGateway();
