"use client";

import { useIsAdmin } from "@/contexts/AuthContext";

/**
 * Renderiza children solo si el usuario autenticado tiene rol "admin".
 * Si fallback es true, muestra un tooltip de lock en lugar de nada.
 */
export default function AdminOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const isAdmin = useIsAdmin();
  if (isAdmin) return <>{children}</>;
  return <>{fallback}</>;
}

/** Botón deshabilitado con tooltip para no-admins */
export function LockButton({ label }: { label: string }) {
  return (
    <span
      title="Solo administradores pueden modificar datos"
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
