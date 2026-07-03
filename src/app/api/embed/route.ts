/**
 * SOFIAA Sprint F-2 — /api/embed
 *
 * Endpoint server-side para generación de embeddings con Gemini text-embedding-004.
 * La clave de API nunca sale al cliente — solo el vector resultante.
 *
 * POST /api/embed
 * Body:  { text: string }
 * Reply: { embedding: number[] }  (768 dimensiones)
 */

import { NextRequest, NextResponse } from "next/server";

const GEMINI_EMBED_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { text } = (await req.json()) as { text?: string };

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "text requerido" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "embedding no disponible" }, { status: 503 });
    }

    const response = await fetch(`${GEMINI_EMBED_URL}?key=${apiKey}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model:   "models/text-embedding-004",
        content: { parts: [{ text: text.slice(0, 2000) }] }, // límite seguro
      }),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => "");
      console.error("[SOFIAA][embed] Gemini error", response.status, err);
      return NextResponse.json({ error: "embedding fallido" }, { status: 502 });
    }

    const data = (await response.json()) as { embedding?: { values: number[] } };
    const embedding = data?.embedding?.values;

    if (!embedding || !Array.isArray(embedding)) {
      return NextResponse.json({ error: "respuesta inesperada de Gemini" }, { status: 502 });
    }

    return NextResponse.json({ embedding });
  } catch (err) {
    console.error("[SOFIAA][embed] error inesperado:", err);
    return NextResponse.json({ error: "error interno" }, { status: 500 });
  }
}
