"use client";

/**
 * TEC Bii — Contexto compartido (Sprint Q-1)
 *
 * Centraliza las suscripciones Firestore de los catálogos que múltiples
 * páginas necesitan como datos de referencia:
 *   - empleados  → selects en Proyectos, Analisis, ROI
 *   - proveedores → selects en Proyectos, Analisis, ROI
 *   - clientes   → selects en Briefs
 *   - briefs     → selects en Proyectos, Evaluaciones
 *
 * Beneficio: una sola suscripción por colección en toda la sesión,
 * en lugar de N suscripciones paralelas (una por página activa).
 *
 * Uso:
 *   const { empleados, proveedores, clientes, briefs, loadingCatalogos } = useTecBii();
 *
 * Las páginas mantienen sus propias suscripciones para su dato principal
 * (ej: proyectos/page.tsx sigue suscrito a proyectos). Solo los catálogos
 * de referencia vienen del contexto.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeEmpleadosV2,
  subscribeBriefsV2,
  subscribeProveedoresV2,
  subscribeClientesV2,
} from "@/lib/tec-bii/firestore";
import type {
  EmpleadoV2,
  ProveedorV2,
  ClienteInternoV2,
  BriefV2,
} from "@/extensions/tec-bii/schema";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface TecBiiContextValue {
  empleados:         EmpleadoV2[];
  proveedores:       ProveedorV2[];
  clientes:          ClienteInternoV2[];
  briefs:            BriefV2[];
  loadingCatalogos:  boolean;
}

const DEFAULT: TecBiiContextValue = {
  empleados:        [],
  proveedores:      [],
  clientes:         [],
  briefs:           [],
  loadingCatalogos: true,
};

// ── Contexto ──────────────────────────────────────────────────────────────────

const TecBiiCtx = createContext<TecBiiContextValue>(DEFAULT);

// ── Provider ──────────────────────────────────────────────────────────────────

export function TecBiiProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [empleados,   setEmpleados]   = useState<EmpleadoV2[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorV2[]>([]);
  const [clientes,    setClientes]    = useState<ClienteInternoV2[]>([]);
  const [briefs,      setBriefs]      = useState<BriefV2[]>([]);

  // Rastrear cuántas suscripciones han recibido al menos un snapshot
  const [ready, setReady] = useState(0);
  const TOTAL_SUBS = 4;

  // Evitar activar suscripciones mientras no hay usuario
  const uid = user?.uid ?? null;

  // Ref para evitar re-suscripciones en renders estrictos de desarrollo
  const prevUid = useRef<string | null>(null);

  useEffect(() => {
    if (!uid || uid === prevUid.current) return;
    prevUid.current = uid;

    setReady(0); // reset mientras carga nuevo usuario

    const tick = () => setReady((n) => Math.min(n + 1, TOTAL_SUBS));

    const unsubEmp  = subscribeEmpleadosV2(uid,  (data) => { setEmpleados(data);   tick(); });
    const unsubProv = subscribeProveedoresV2(uid, (data) => { setProveedores(data); tick(); });
    const unsubCli  = subscribeClientesV2(uid,   (data) => { setClientes(data);    tick(); });
    const unsubBri  = subscribeBriefsV2(uid,     (data) => { setBriefs(data);      tick(); });

    return () => {
      unsubEmp();
      unsubProv();
      unsubCli();
      unsubBri();
      prevUid.current = null;
    };
  }, [uid]);

  // Sin usuario → limpiar y marcar como no-cargando (no hay nada que cargar)
  useEffect(() => {
    if (!uid) {
      setEmpleados([]);
      setProveedores([]);
      setClientes([]);
      setBriefs([]);
      setReady(TOTAL_SUBS); // no bloqueamos con "cargando" si no hay sesión
    }
  }, [uid]);

  const value: TecBiiContextValue = {
    empleados,
    proveedores,
    clientes,
    briefs,
    loadingCatalogos: uid !== null && ready < TOTAL_SUBS,
  };

  return <TecBiiCtx.Provider value={value}>{children}</TecBiiCtx.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTecBii(): TecBiiContextValue {
  return useContext(TecBiiCtx);
}
