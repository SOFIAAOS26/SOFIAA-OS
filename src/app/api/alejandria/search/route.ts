/**
 * ALEJANDRÍA — POST /api/alejandria/search
 * Sprint AJ-2 · Endpoint de búsqueda semántica
 *
 * Body: { query: string; limit?: number }
 * Response: { results: AlejandriaSearchResult[]; query: string; took: number }
 *
 * Autenticación: Bearer token de Firebase Auth
 */

import { NextRequest, NextResponse }    from "next/server";
import { getAuth }                      from "firebase-admin/auth";
import { getAdminApp }                  from "@/lib/firebase-admin";
import { semanticSearchAlejandria }     from "@/lib/alejandria/search";

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getUid(req: NextRequest): Promise<string | null> {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const start = Date.now();

  // Autenticación
  const uid = await getUid(req);
  if (!uid) return err("No autorizado — se requiere sesión Firebase", 401);

  // Parsear body
  let body: { query?: string; limit?: number };
  try {
    body = await req.json();
  } catch {
    return err("JSON inválido");
  }

  const query = body.query?.trim();
  if (!query || query.length < 2) {
    return err("query requerido (mínimo 2 caracteres)");
  }

  const limit = Math.min(body.limit ?? 8, 20);

  // Búsqueda semántica
  const results = await semanticSearchAlejandria(uid, query, limit);

  return NextResponse.json({
    success: true,
    query,
    results: results.map(r => ({
      id:                r.node.id,
      tipo:              r.node.tipo,
      titulo:            r.node.titulo,
      resumen:           r.node.resumen,
      fecha:             r.node.fecha,
      modulos_afectados: r.node.modulos_afectados,
      tags:              r.node.tags,
      sprint_referencia: r.node.sprint_referencia,
      reinforceCount:    r.node.reinforceCount,
      score:             Math.round(r.score * 1000) / 1000,
    })),
    total:   results.length,
    took:    Date.now() - start,
  });
}
