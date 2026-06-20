// SOFIAA — Telemetry Events
// Catálogo estandarizado de eventos capturables por el sistema

export type TelemetryEventType =
  | "session_start"       // usuario abre la app
  | "message_sent"        // usuario envía un mensaje
  | "message_received"    // SOFIAA termina de responder
  | "quick_action_used"   // usuario clickeó una quick action
  | "voice_input_used"    // usuario usó el micrófono
  | "navigation_triggered"// SOFIAA navegó a una ruta
  | "memory_loaded"       // memoria de largo plazo fue cargada
  | "memory_updated"      // memoria fue actualizada al resetear
  | "guardrail_triggered" // un guardrail bloqueó un mensaje
  | "session_reset"       // usuario limpió la conversación
  | "admin_opened";       // panel admin fue abierto

export interface TelemetryEvent {
  type: TelemetryEventType;
  timestamp: number;
  payload?: Record<string, string | number | boolean>;
}

/** Crea un evento de telemetría con timestamp actual */
export function createEvent(
  type: TelemetryEventType,
  payload?: TelemetryEvent["payload"]
): TelemetryEvent {
  return { type, timestamp: Date.now(), payload };
}
