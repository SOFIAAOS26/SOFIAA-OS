/**
 * Groq LLM Utility
 *
 * Wrapper mínimo sobre la API de Groq (compatible con OpenAI).
 * Reemplaza todas las llamadas directas a Gemini Flash.
 *
 * Modelo: llama-3.3-70b-versatile
 * Free tier: 30 RPM · 6,000 TPM · 14,400 req/día — sin tarjeta.
 * Variable de entorno requerida: GROQ_API_KEY
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL    = "llama-3.3-70b-versatile";

interface GroqOpts {
  maxTokens?:  number;
  temperature?: number;
  /** Si true, activa JSON mode (el prompt debe mencionar "JSON") */
  json?:       boolean;
  /** Mensaje de sistema opcional — útil para clasificadores con instrucciones fijas */
  system?:     string;
}

/**
 * Llama a Groq y devuelve el texto de respuesta, o null si falla.
 * Nunca lanza — el caller decide el fallback.
 */
export async function callGroq(
  prompt: string,
  opts: GroqOpts = {},
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(GROQ_URL, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:    MODEL,
        messages: [
          ...(opts.system ? [{ role: "system", content: opts.system }] : []),
          { role: "user", content: prompt },
        ],
        max_tokens:  opts.maxTokens  ?? 800,
        temperature: opts.temperature ?? 0.4,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) return null;

    const data = await res.json() as {
      choices?: { message?: { content?: string } }[];
    };

    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}
