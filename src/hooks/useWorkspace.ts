"use client";
// ── useWorkspace — hook multi-tenant para Marketing Pro ───────────
// Persiste el workspaceId activo en localStorage.
// En futuras versiones se integrará con Firebase Auth.

import { useState, useEffect, useCallback } from "react";
import { subscribeWorkspaces, createWorkspace } from "@/lib/marketing/firestore";
import type { SmmWorkspace } from "@/lib/marketing/types";

const LS_KEY = "smm_active_workspace";

export function useWorkspace() {
  const [workspaces,        setWorkspaces]        = useState<SmmWorkspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [loading,           setLoading]           = useState(true);

  // Cargar workspaces de Firestore
  useEffect(() => {
    const unsub = subscribeWorkspaces((list) => {
      setWorkspaces(list);
      setLoading(false);

      // Recuperar último workspace activo de localStorage
      const saved = typeof window !== "undefined"
        ? localStorage.getItem(LS_KEY)
        : null;

      if (saved && list.find((w) => w.id === saved)) {
        setActiveWorkspaceId(saved);
      } else if (list.length > 0 && !activeWorkspaceId) {
        // Auto-seleccionar el primero si no hay selección guardada
        setActiveWorkspaceId(list[0].id!);
        if (typeof window !== "undefined") {
          localStorage.setItem(LS_KEY, list[0].id!);
        }
      }
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectWorkspace = useCallback((id: string) => {
    setActiveWorkspaceId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_KEY, id);
    }
  }, []);

  const createAndSelect = useCallback(async (nombre: string, ownerEmail = "") => {
    const id = await createWorkspace({ nombre, ownerEmail, plan: "free" });
    setActiveWorkspaceId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_KEY, id);
    }
    return id;
  }, []);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? null;

  return {
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    loading,
    selectWorkspace,
    createAndSelect,
  };
}
