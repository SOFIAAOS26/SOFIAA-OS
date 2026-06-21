/**
 * Monday.com — Cliente GraphQL para TEC BI
 *
 * ACTIVACIÓN:
 *   1. Agrega en .env.local:
 *        MONDAY_API_TOKEN=tu_token_personal
 *        MONDAY_ENABLED=true
 *   2. El token se genera en Monday → Avatar → Admin → API → Generate token
 *
 * Mientras MONDAY_ENABLED=false (o no existe), todas las funciones
 * retornan null sin hacer ninguna llamada de red.
 */

const MONDAY_API = "https://api.monday.com/v2";

function isEnabled(): boolean {
  return process.env.MONDAY_ENABLED === "true";
}

function getToken(): string {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) throw new Error("[Monday] MONDAY_API_TOKEN no está configurado en .env.local");
  return token;
}

/**
 * Ejecuta una query o mutation GraphQL contra la API de Monday.
 * Retorna null si el adaptador está desactivado.
 */
export async function mondayQuery<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T | null> {
  if (!isEnabled()) {
    console.info("[Monday] Adaptador desactivado (MONDAY_ENABLED=false). Skipping query.");
    return null;
  }

  const response = await fetch(MONDAY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": getToken(),
      "API-Version": "2024-10",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[Monday] HTTP ${response.status}: ${text}`);
  }

  const json = await response.json() as { data?: T; errors?: { message: string }[] };

  if (json.errors?.length) {
    throw new Error(`[Monday] GraphQL error: ${json.errors.map((e) => e.message).join(", ")}`);
  }

  return json.data ?? null;
}
