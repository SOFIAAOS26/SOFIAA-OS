/**
 * SOFIAA Sprint H-1 — /api/analyze
 *
 * Endpoint para el AgentTool "analyze".
 * Recibe datos crudos + instrucción → llama a Gemini → devuelve análisis.
 *
 * Separado de /api/chat para:
 *   - Poder llamarse dentro del loop ReAct sin recursión
 *   - Usar Gemini directamente (mejor en análisis/síntesis que Groq)
 *   - Mantener el conteo de tokens separado del stream principal
 */

import { NextRequest } from "next/server";

export const runtime = "edge";

const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GEMINI_API_KEY no configurada" }, { status: 500 });
  }

  let data: string, instruction: string;
  try {
    ({ data, instruction } = await req.json());
    if (!data || !instruction) throw new Error("missing fields");
  } catch {
    return Response.json({ error: "Se requieren los campos data e instruction" }, { status: 400 });
  }

  const prompt = `Eres un analista de datos experto. Analiza el siguiente contenido y responde la instrucción de forma concisa y directa.

DATOS:
${data.slice(0, 3000)}

INSTRUCCIÓN DE ANÁLISIS:
${instruction}

Responde en español, máximo 300 palabras, sin preámbulos ni meta-comentarios.`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature:     0.3,
          maxOutputTokens: 512,
        },
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => res.statusText);
      return Response.json({ error: `Gemini error ${res.status}: ${txt}` }, { status: 502 });
    }

    const json = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const analysis = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!analysis) {
      return Response.json({ error: "Gemini no devolvió contenido" }, { status: 502 });
    }

    return Response.json({ analysis });

  } catch (err) {
    return Response.json(
      { error: `Error de red: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    );
  }
}
