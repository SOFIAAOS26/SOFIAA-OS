/**
 * SOFIAA Sprint F-2 — /api/embed
 *
 * Endpoint para generación de embeddings.
 *
 * NOTA: Groq no ofrece API de embeddings.
 * Este endpoint retorna 503 para que el sistema haga fallback a ranking por peso.
 * El hybridScore() en embeddings.ts ya maneja el caso sin embedding.
 *
 * POST /api/embed
 * Body:  { text: string }
 * Reply: 503 embedding no disponible
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: "embedding no disponible — sistema usa ranking por peso" },
    { status: 503 }
  );
}
