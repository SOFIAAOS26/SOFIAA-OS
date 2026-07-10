/**
 * SOFIAA Sprint H-1 — /api/analyze
 *
 * Endpoint para el AgentTool "analyze".
 * Recibe datos crudos + instrucción → llama a Groq → devuelve análisis.
 *
 * Separado de /api/chat para:
 *   - Poder llamarse dentro del loop ReAct sin recursión
 *   - Mantener el conteo de tokens separado del stream principal
 */

import { NextRequest } from "next/server";
import { callGroq }    from "@/lib/groq";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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
    const analysis = await callGroq(prompt, { maxTokens: 512, temperature: 0.3 });

    if (!analysis) {
      return Response.json({ error: "No se pudo generar el análisis" }, { status: 502 });
    }

    return Response.json({ analysis });

  } catch (err) {
    return Response.json(
      { error: `Error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    );
  }
}
