// SOFIAA — Guardrails Engine
// Motor de validación de seguridad — corre en cliente Y servidor
// Detecta: prompt injection, extracción de secretos, fuga de contexto, jailbreak, abuso

import { SECURITY_RULES, type ThreatType } from "@/config/security.rules";

export interface GuardrailsResult {
  blocked: boolean;
  threat: ThreatType;
  severity: "low" | "medium" | "high" | "none";
  reason?: string;
}

const SAFE: GuardrailsResult = {
  blocked: false,
  threat: "none",
  severity: "none",
};

/**
 * Analiza un mensaje de usuario y retorna si debe ser bloqueado.
 * Corre tanto en cliente (page.tsx) como en servidor (route.ts).
 */
export function analyzeMessage(input: string): GuardrailsResult {
  const trimmed = input.trim();

  // Mensajes muy cortos — solo bloquear si es puramente vacío
  if (trimmed.length === 0) {
    return { blocked: true, threat: "abuse_pattern", severity: "low", reason: "Mensaje vacío" };
  }

  // Evaluar cada regla en orden de severidad
  for (const rule of SECURITY_RULES) {
    // Saltar la regla de caracteres cortos para mensajes normales (saludos, "ok", etc.)
    if (rule.type === "abuse_pattern" && trimmed.length <= 3 && /^[a-záéíóúüñ\s!?.]+$/i.test(trimmed)) {
      continue;
    }

    for (const pattern of rule.patterns) {
      if (pattern.test(trimmed)) {
        // context_leak de severidad media: no bloquear, dejar que SOFIAA responda con elegancia
        if (rule.severity === "low" || (rule.type === "context_leak" && rule.severity === "medium")) {
          return {
            blocked: false,
            threat: rule.type,
            severity: rule.severity,
            reason: `Detectado: ${rule.type}`,
          };
        }

        return {
          blocked: true,
          threat: rule.type,
          severity: rule.severity,
          reason: `Detectado: ${rule.type} (patrón: ${pattern.source.slice(0, 40)})`,
        };
      }
    }
  }

  return SAFE;
}

/**
 * Analiza el historial completo de mensajes buscando patrones acumulativos.
 * Útil para detectar intentos graduales de extracción.
 */
export function analyzeConversation(messages: { role: string; content: string }[]): GuardrailsResult {
  const userMessages = messages.filter((m) => m.role === "user");

  // Detectar si hay múltiples intentos de extracción de secretos en la misma sesión
  const secretAttempts = userMessages.filter((m) => {
    const r = analyzeMessage(m.content);
    return r.threat === "secret_extraction" || r.threat === "prompt_injection" || r.threat === "jailbreak";
  });

  if (secretAttempts.length >= 3) {
    return {
      blocked: true,
      threat: "abuse_pattern",
      severity: "high",
      reason: `Múltiples intentos detectados (${secretAttempts.length})`,
    };
  }

  return SAFE;
}

/**
 * Log de seguridad — registra sin exponer datos sensibles.
 * Solo corre en servidor (Node.js).
 */
export function logSecurityEvent(result: GuardrailsResult, inputLength: number): void {
  if (result.threat === "none") return;
  console.warn(
    `[SOFIAA Security] threat=${result.threat} severity=${result.severity} blocked=${result.blocked} inputLen=${inputLength}`
  );
}
