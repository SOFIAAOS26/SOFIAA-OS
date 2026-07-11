"use client";

/**
 * TEC Bii v2 — PageGuard
 *
 * Requisito: sesión activa (cualquier rol).
 * Sin sesión → redirige a / (SOFIAA principal, donde puede hacer login).
 *
 * Intencionalmente más simple que el guard de TEC BI v1:
 * - No restringe por sección ni rol — el acceso granular lo gestiona el layout
 * - Redirige a /tec-bii (no a /tec-bi/briefs) si hay sesión pero algo falla
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth }   from "@/contexts/AuthContext";

export default function PageGuard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/");
  }, [user, loading, router]);

  return null;
}
