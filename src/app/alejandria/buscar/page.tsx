"use client";

/**
 * ALEJANDRÍA — /buscar (redirige al Centro de Mando con foco en búsqueda)
 * Sprint AJ-5
 */

import { useEffect } from "react";
import { useRouter }  from "next/navigation";

export default function BuscarPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/alejandria"); }, [router]);
  return null;
}
