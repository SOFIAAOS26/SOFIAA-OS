/**
 * SOFIAA — Edge Proxy (Next.js 16)
 *
 * Reemplaza middleware.ts → proxy.ts (convención Next.js 16).
 * Ejecuta en Vercel Edge Network ANTES de que el request llegue
 * al route handler. Valida RBAC por ruta de extensión.
 *
 * Si el rol no está en allowedRoles del manifiesto → redirección al login.
 * El Gemini API nunca se toca. Zero tokens consumidos por accesos no autorizados.
 *
 * LEAN: sin Firebase Admin SDK en el Edge (no es compatible).
 * El rol se lee del cookie "sofiaa_role" que escribe AuthContext al hacer login.
 */

import { NextRequest, NextResponse } from "next/server";

// ── Mapa estático de rutas protegidas ─────────────────────────────────────
// IMPORTANTE: solo incluir rutas que requieren roles específicos.
// TEC Bii (/tec-bii) NO está aquí — cualquier usuario autenticado puede acceder.
// jp-memorial es público — tampoco aparece aquí.
const PROTECTED_ROUTES: Record<string, string[]> = {
  "/tec-bi":          ["director", "admin", "coordinador"],
  "/marketing-sofia": ["admin", "estratega", "ejecutivo"],
};

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Matching exacto: el pathname debe ser igual al prefijo O empezar con prefijo + "/".
 * Evita que /tec-bii sea confundido con /tec-bi.
 */
function getActiveExtensionPrefix(pathname: string): string | null {
  for (const prefix of Object.keys(PROTECTED_ROUTES)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return prefix;
    }
  }
  return null;
}

function getRoleFromRequest(req: NextRequest): string | null {
  const roleCookie = req.cookies.get("sofiaa_role");
  if (roleCookie?.value) return roleCookie.value;
  return req.headers.get("x-sofiaa-role");
}

// ── Proxy handler ─────────────────────────────────────────────────────────

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const prefix = getActiveExtensionPrefix(pathname);
  if (!prefix) return NextResponse.next();

  const allowedRoles = PROTECTED_ROUTES[prefix];
  const userRole = getRoleFromRequest(req);

  if (!userRole || !allowedRoles.includes(userRole)) {
    const isPageNav = !pathname.startsWith("/api/");
    if (isPageNav) {
      const loginUrl = new URL("/", req.url);
      loginUrl.searchParams.set("auth_required", "1");
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return new NextResponse(
      JSON.stringify({ error: "Acceso no autorizado", requiredRoles: allowedRoles }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const response = NextResponse.next();
  response.headers.set("x-sofiaa-role", userRole);
  response.headers.set("x-sofiaa-ext", prefix.slice(1));
  return response;
}

// ── Matcher ───────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    "/tec-bi",
    "/tec-bi/:path+",
    "/marketing-sofia",
    "/marketing-sofia/:path+",
  ],
};
