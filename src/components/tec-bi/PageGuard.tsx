"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { canView } from "@/lib/permissions";

/**
 * Redirige a /tec-bi/briefs si el usuario no tiene permiso de ver la sección.
 * Coloca este componente al inicio del return de cada página protegida.
 */
export default function PageGuard({ section }: { section: string }) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    // Si hay sesión activa y no puede ver esta sección → redirigir
    if (profile && !canView(section, profile.rol)) {
      router.replace("/tec-bi/briefs");
    }
  }, [profile, loading, section, router]);

  return null;
}
