"use client";

// SOFIAA — useSofiaaTelemetry
// Hook React para captura de eventos y escritura de métricas en localStorage

import { useRef, useCallback } from "react";
import { createEvent, type TelemetryEventType } from "@/config/telemetry.events";
import {
  emptyMetrics,
  readTelemetryStore,
  writeTelemetryStore,
  type TelemetrySession,
  TELEMETRY_VERSION,
} from "@/config/metrics.schema";

function generateSessionId(): string {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function useSofiaaTelemetry() {
  const sessionRef = useRef<TelemetrySession>({
    version: TELEMETRY_VERSION,
    sessionId: generateSessionId(),
    startedAt: Date.now(),
    events: [],
    metrics: emptyMetrics(),
  });

  const ttiStartRef = useRef<number | null>(null);

  /** Persiste la sesión actual en el store */
  const persist = useCallback(() => {
    const store = readTelemetryStore();
    const session = sessionRef.current;
    // Actualizar IAI: quick actions / total mensajes
    if (session.metrics.totalMessages > 0) {
      session.metrics.iai = Math.round((session.metrics.cvr / session.metrics.totalMessages) * 100) / 100;
    }
    // Reemplazar si ya existe, o agregar
    const idx = store.sessions.findIndex((s) => s.sessionId === session.sessionId);
    if (idx >= 0) {
      store.sessions[idx] = session;
    } else {
      store.sessions.push(session);
    }
    writeTelemetryStore(store);
  }, []);

  /** Registra un evento genérico */
  const track = useCallback((
    type: TelemetryEventType,
    payload?: Record<string, string | number | boolean>
  ) => {
    const event = createEvent(type, payload);
    sessionRef.current.events.push(event);

    // Actualizar métricas según el tipo de evento
    const m = sessionRef.current.metrics;
    switch (type) {
      case "session_start":
        m.cks = payload?.hasLongMemory === true;
        break;
      case "message_sent":
        m.totalMessages++;
        ttiStartRef.current = Date.now();
        if (typeof payload?.length === "number") {
          m.ifc.push(payload.length);
        }
        break;
      case "message_received":
        if (ttiStartRef.current !== null) {
          m.tti.push(Date.now() - ttiStartRef.current);
          ttiStartRef.current = null;
        }
        break;
      case "quick_action_used":
        m.cvr++;
        m.totalMessages++;
        break;
      case "voice_input_used":
        m.voiceUsed = true;
        break;
      case "guardrail_triggered":
        m.guardrailsTriggered++;
        break;
    }

    persist();
  }, [persist]);

  /** Helpers de conveniencia */
  const trackMessageSent = useCallback((content: string) => {
    track("message_sent", { length: content.length });
  }, [track]);

  const trackMessageReceived = useCallback(() => {
    track("message_received");
  }, [track]);

  const trackQuickAction = useCallback((label: string) => {
    track("quick_action_used", { label });
  }, [track]);

  const trackVoice = useCallback(() => {
    track("voice_input_used");
  }, [track]);

  const trackGuardrail = useCallback((threat: string) => {
    track("guardrail_triggered", { threat });
  }, [track]);

  const trackNavigation = useCallback((dest: string) => {
    track("navigation_triggered", { dest });
  }, [track]);

  const trackSessionStart = useCallback((hasLongMemory: boolean) => {
    track("session_start", { hasLongMemory });
  }, [track]);

  const trackSessionReset = useCallback(() => {
    track("session_reset");
    persist();
    // Iniciar nueva sesión
    sessionRef.current = {
      version: TELEMETRY_VERSION,
      sessionId: generateSessionId(),
      startedAt: Date.now(),
      events: [],
      metrics: emptyMetrics(),
    };
  }, [track, persist]);

  return {
    track,
    trackMessageSent,
    trackMessageReceived,
    trackQuickAction,
    trackVoice,
    trackGuardrail,
    trackNavigation,
    trackSessionStart,
    trackSessionReset,
    getSession: () => sessionRef.current,
  };
}
