/**
 * SOFIAA Sprint D-A — useGoalState Hook
 *
 * Gestiona el ciclo de vida del goal activo en la sesión React.
 * Persiste en sessionStorage para sobrevivir refreshes dentro de la misma pestaña.
 * Se resetea al iniciar nueva conversación.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import {
  type GoalState,
  createGoalState,
  advanceGoal,
  cancelGoal,
  pauseGoal,
  detectMultiStepGoal,
  buildGoalPromptBlock,
} from "@/core/goal.state";

const STORAGE_KEY = "sofiaa_active_goal";

// ── Hook ──────────────────────────────────────────────────────────────────

export function useGoalState(activeExtension?: string) {
  const [goal, setGoalInternal] = useState<GoalState | null>(null);

  // Restaurar desde sessionStorage al montar
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: GoalState = JSON.parse(stored);
        // Solo restaurar si el goal sigue activo y es reciente (< 30 min)
        const isRecent  = Date.now() - parsed.updatedAt < 30 * 60 * 1000;
        const isActive  = parsed.status === "active" || parsed.status === "paused";
        if (isRecent && isActive) setGoalInternal(parsed);
      }
    } catch { /* sessionStorage no disponible o datos corruptos */ }
  }, []);

  // Persistir en sessionStorage cada vez que cambia el goal
  const setGoal = useCallback((newGoal: GoalState | null) => {
    setGoalInternal(newGoal);
    try {
      if (newGoal) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newGoal));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch { /* ignorar */ }
  }, []);

  // ── Acciones públicas ─────────────────────────────────────────────────

  /**
   * Analiza el mensaje del usuario. Si dispara un goal multi-step, lo inicia.
   * Devuelve true si se inició un nuevo goal.
   */
  const detectAndStart = useCallback((userMessage: string): boolean => {
    // Si ya hay un goal activo, no iniciar otro
    if (goal?.status === "active") return false;

    const templateId = detectMultiStepGoal(userMessage);
    if (!templateId) return false;

    const newGoal = createGoalState(templateId, activeExtension);
    if (!newGoal) return false;

    setGoal(newGoal);
    return true;
  }, [goal, activeExtension, setGoal]);

  /**
   * Avanza al siguiente paso del goal activo.
   * Llamar después de que el LLM responde en cada paso.
   */
  const advance = useCallback((stepData?: Record<string, unknown>) => {
    if (!goal || goal.status !== "active") return;
    const updated = advanceGoal(goal, stepData);
    setGoal(updated.status === "completed" ? null : updated);
  }, [goal, setGoal]);

  /**
   * Cancela el goal activo (usuario cambió de tema).
   */
  const cancel = useCallback(() => {
    if (!goal) return;
    setGoal(null); // limpiar inmediatamente
  }, [goal, setGoal]);

  /**
   * Pausa el goal (para retomarlo después).
   */
  const pause = useCallback(() => {
    if (!goal || goal.status !== "active") return;
    setGoal(pauseGoal(goal));
  }, [goal, setGoal]);

  /**
   * Resetea completamente (llamar en resetChat).
   */
  const reset = useCallback(() => {
    setGoal(null);
  }, [setGoal]);

  /**
   * Genera el bloque de contexto para el system prompt.
   * Devuelve "" si no hay goal activo.
   */
  const getPromptBlock = useCallback((): string => {
    if (!goal || goal.status !== "active") return "";
    return buildGoalPromptBlock(goal);
  }, [goal]);

  // ── Estado derivado ───────────────────────────────────────────────────

  const isActive      = goal?.status === "active";
  const currentStep   = goal ? goal.steps[goal.currentStep] : null;
  const stepProgress  = goal
    ? { current: goal.currentStep + 1, total: goal.steps.length }
    : null;

  return {
    goal,
    isActive,
    currentStep,
    stepProgress,
    detectAndStart,
    advance,
    cancel,
    pause,
    reset,
    getPromptBlock,
  };
}
