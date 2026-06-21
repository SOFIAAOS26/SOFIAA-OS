"use client";

import { useAuth } from "@/contexts/AuthContext";
import { canEdit } from "@/lib/permissions";

/**
 * Renderiza children solo si el usuario puede editar la sección indicada.
 * section: "briefs" | "proyectos" | "empleados" | "proveedores" | "clientes" | "evaluaciones"
 */
export default function AdminOnly({
  children,
  section = "evaluaciones", // default: solo admin
  fallback = null,
}: {
  children: React.ReactNode;
  section?: string;
  fallback?: React.ReactNode;
}) {
  const { profile } = useAuth();
  if (canEdit(section, profile?.rol)) return <>{children}</>;
  return <>{fallback}</>;
}

/** Botón deshabilitado con tooltip para roles sin permiso */
export function LockButton({ label }: { label: string }) {
  return (
    <span
      title="No tienes permiso para esta acción"
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 10, padding: "9px 16px", fontSize: 12,
        color: "#ccc", cursor: "not-allowed", userSelect: "none",
      }}
    >
      🔒 {label}
    </span>
  );
}
