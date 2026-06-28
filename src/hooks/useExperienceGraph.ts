/**
 * SOFIAA Sprint D-E — useExperienceGraph Hook
 *
 * Gestiona el ciclo de vida del ExperienceGraph en React.
 * - Carga el grafo al montar (localStorage + Firestore opcional)
 * - Actualiza nodos tras cada mensaje
 * - Persiste con debounce para no bloquear la UI
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { ExperienceGraph } from "@/core/experience.graph";
import {
  createGraph,
  upsertNode,
  upsertEdge,
  detectTopics,
  detectExtensionNode,
} from "@/core/experience.graph";
import {
  loadGraphFromStorage,
  debouncedSave,
  syncGraphToFirestore,
} from "@/core/graph.store";
import {
  buildGraphContext,
  serializeGraphForAPI,
  getUserExperienceLevel,
  type GraphContext,
} from "@/core/graph.query";

// ── Hook ──────────────────────────────────────────────────────────────────

export function useExperienceGraph(userId?: string | null) {
  const [graph, setGraphRaw] = useState<ExperienceGraph>(() => createGraph(userId ?? null));
  const initializedRef = useRef(false);

  // Cargar desde storage al montar
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const loaded = loadGraphFromStorage(userId ?? null);
    setGraphRaw(loaded);

    // Si hay userId, intentar sincronizar con Firestore (async)
    if (userId) {
      import("@/core/graph.store").then(({ loadGraphFromFirestore }) => {
        loadGraphFromFirestore(userId).then((firestoreGraph) => {
          if (firestoreGraph) {
            setGraphRaw(firestoreGraph);
            // Guardar en localStorage la versión de Firestore
            debouncedSave(firestoreGraph);
          }
        }).catch(() => { /* no crítico */ });
      }).catch(() => {});
    }
  }, [userId]);

  // Setter con persistencia automática
  const setGraph = useCallback((newGraph: ExperienceGraph) => {
    setGraphRaw(newGraph);
    debouncedSave(newGraph);

    // Sync a Firestore si está autenticado (fire-and-forget)
    if (userId && newGraph.userId) {
      syncGraphToFirestore(newGraph, userId).catch(() => {});
    }
  }, [userId]);

  // ── Acciones públicas ─────────────────────────────────────────────────

  /**
   * Registra la actividad de un turno de conversación.
   * Llama después de que el usuario envía un mensaje Y recibe respuesta.
   */
  const recordTurn = useCallback((
    userMessage:    string,
    activePath?:    string,
    completedGoal?: string
  ) => {
    let updated = graph;

    // Registrar topics detectados
    const topics = detectTopics(userMessage);
    for (const { id, label } of topics) {
      updated = upsertNode(updated, id, "topic", label);
    }

    // Registrar extensión activa
    if (activePath) {
      const ext = detectExtensionNode(activePath);
      if (ext) {
        updated = upsertNode(updated, ext.id, "extension", ext.label);
        // Arista: topic → led_to → extension
        for (const { id: topicId } of topics) {
          updated = upsertEdge(updated, topicId, ext.id, "led_to", 0.08);
        }
      }
    }

    // Registrar goal completado
    if (completedGoal) {
      const goalId = `goal:${completedGoal}`;
      updated = upsertNode(updated, goalId, "goal", completedGoal, { status: "completed" });
      // Arista: goal → led_to → extensión activa
      if (activePath) {
        const ext = detectExtensionNode(activePath);
        if (ext) {
          updated = upsertEdge(updated, goalId, ext.id, "led_to");
        }
      }
    }

    if (updated !== graph) setGraph(updated);
  }, [graph, setGraph]);

  /**
   * Registra una preferencia inferida (tono, detalle, idioma).
   */
  const recordPreference = useCallback((
    id:    string,
    label: string
  ) => {
    const updated = upsertNode(graph, `pref:${id}`, "preference", label);
    setGraph(updated);
  }, [graph, setGraph]);

  /**
   * Registra una entidad nombrada detectada en la conversación.
   */
  const recordEntity = useCallback((label: string) => {
    const id = `entity:${label.toLowerCase().replace(/\s+/g, "_")}`;
    const updated = upsertNode(graph, id, "entity", label);
    setGraph(updated);
  }, [graph, setGraph]);

  // ── Consultas ─────────────────────────────────────────────────────────

  /**
   * Genera el contexto del grafo para inyectar en el system prompt.
   */
  const getContext = useCallback((activePath?: string): GraphContext => {
    return buildGraphContext(graph, activePath);
  }, [graph]);

  /**
   * Serialización ligera para enviar a la API.
   */
  const getAPIPayload = useCallback(() => {
    return serializeGraphForAPI(graph);
  }, [graph]);

  /**
   * Nivel de experiencia del usuario (0-1).
   */
  const experienceLevel = getUserExperienceLevel(graph);

  return {
    graph,
    recordTurn,
    recordPreference,
    recordEntity,
    getContext,
    getAPIPayload,
    experienceLevel,
  };
}
