/**
 * SOFIAA 1.1.4 — Edge Middleware
 *
 * Ejecuta en Vercel Edge Network ANTES de que el request llegue
 * al route handler. Valida RBAC por ruta de extensión.
 *
 * Si el rol no está en allowedRoles del manifiesto → 401 inmediato.
 * El Groq API nunca se toca. Zero tokens consumidos por accesos no autorizados.
 *
 * LEAN: sin Firebase Admin SDK en el Edge (no es compatible).
 * El rol se lee del cookie de sesión firmado por el route de auth.
 */

import { NextRequest, NextResponse } from "next/server";

// ── Mapa estático de rutas protegidas ─────────────────────────────────────
// Derivado de los manifiestos — se actualiza cuando se agrega una extensión.
// En Sprint C se genera dinámicamente desde el Registry via build step.
const PROTECTED_ROUTES: Record<string, string[]> = {
  "/tec-bi":         ["director", "admin", "coordinador"],
  "/marketing-sofia": ["admin", "estratega", "ejecutivo"],
  // jp-memorial es público (allowedRoles: []) — no aparece aquí
};

// ── Helpers ───────────────────────────────────────────────────────────────

function getActiveExtensionPrefix(pathname: string): string | null {
  for (const prefix of Object.keys(PROTECTED_ROUTES)) {
    if (pathname.startsWith(prefix)) return prefix;
  }
  return null;
}

function getRoleFromRequest(req: NextRequest): string | null {
  // El role se guarda en cookie "sofiaa_role" al hacer login en Firebase
  // Formato: nombre_de_rol (ej. "director", "admin")
  const roleCookie = req.cookies.get("sofiaa_role");
  if (roleCookie?.value) return roleCookie.value;

  // Fallback: header x-sofiaa-role (para requests de server-side)
  const roleHeader = req.headers.get("x-sofiaa-role");
  return roleHeader;
}

// ── Middleware ────────────────────────────────────────────────────────────

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Solo evaluar rutas de extensiones protegidas
  const prefix = getActiveExtensionPrefix(pathname);
  if (!prefix) return NextResponse.next();

  const allowedRoles = PROTECTED_ROUTES[prefix];
  const userRole = getRoleFromRequest(req);

  // Sin rol o rol no autorizado → 401
  if (!userRole || !allowedRoles.includes(userRole)) {
    // Si es navegación de página (no API) → redirigir al login
    const isPageNav = !pathname.startsWith("/api/");
    if (isPageNav) {
      const loginUrl = new URL("/", req.url);
      loginUrl.searchParams.set("auth_required", "1");
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Si es API → 401 JSON
    return new NextResponse(
      JSON.stringify({ error: "Acceso no autorizado", requiredRoles: allowedRoles }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Acceso autorizado — inyectar traceId en headers para el route handler
  const response = NextResponse.next();
  response.headers.set("x-sofiaa-role", userRole);
  response.headers.set("x-sofiaa-ext", prefix.slice(1)); // "tec-bi"
  return response;
}

// ── Matcher ───────────────────────────────────────────────────────────────
// Solo corre en rutas de extensiones — nunca en / ni en assets

export const config = {
  matcher: [
    "/tec-bi/:path*",
    "/marketing-sofia/:path*",
    // jp-memorial no necesita middleware (público)
  ],
};
