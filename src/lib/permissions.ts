import type { Rol } from "@/contexts/AuthContext";

/** Roles que pueden VER cada sección de TEC BI */
export const VIEW_ROLES: Record<string, Rol[]> = {
  dashboard:    ["admin", "director"],
  briefs:       ["admin", "director", "user"],
  proyectos:    ["admin", "director"],
  empleados:    ["admin", "director"],
  proveedores:  ["admin", "director"],
  clientes:     ["admin", "director"],
  evaluaciones: ["admin", "director"],
  analisis:     ["admin", "director"],
  roi:          ["admin", "director"],
};

/** Roles que pueden CREAR/EDITAR en cada sección */
export const EDIT_ROLES: Record<string, Rol[]> = {
  briefs:       ["admin", "director", "user"],
  proyectos:    ["admin", "director"],
  empleados:    ["admin", "director"],
  proveedores:  ["admin", "director"],
  clientes:     ["admin", "director"],
  evaluaciones: ["admin"],
};

/** Mapeo de path a sección */
export function pathToSection(pathname: string): string {
  if (pathname === "/tec-bi")              return "dashboard";
  if (pathname.startsWith("/tec-bi/briefs"))       return "briefs";
  if (pathname.startsWith("/tec-bi/proyectos"))    return "proyectos";
  if (pathname.startsWith("/tec-bi/empleados"))    return "empleados";
  if (pathname.startsWith("/tec-bi/proveedores"))  return "proveedores";
  if (pathname.startsWith("/tec-bi/clientes"))     return "clientes";
  if (pathname.startsWith("/tec-bi/evaluaciones")) return "evaluaciones";
  if (pathname.startsWith("/tec-bi/analisis"))     return "analisis";
  if (pathname.startsWith("/tec-bi/roi"))          return "roi";
  return "dashboard";
}

export function canView(section: string, rol: Rol | null | undefined): boolean {
  if (!rol) return true; // sin login: ve todo, pero no puede editar
  return VIEW_ROLES[section]?.includes(rol) ?? false;
}

export function canEdit(section: string, rol: Rol | null | undefined): boolean {
  if (!rol) return false;
  return EDIT_ROLES[section]?.includes(rol) ?? false;
}
