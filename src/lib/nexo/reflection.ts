/**
 * N.E.X.O. — Reflection Engine (Sprint M-0)
 *
 * Gemini Flash analiza los nodos del usuario y genera insights sobre:
 * - Patrones de interés emergentes
 * - Conexiones temáticas entre categorías
 * - Observaciones cognitivas relevantes
 *
 * Los insights se guardan como nodos especiales (type: "insight") en Firestore.
 * El engine evita generar insights si ya hay uno reciente (< 20h).
 */

import { getAdminDb }   from "@/lib/firebase-admin";
import { getNexoNodes } from "@/lib/nexo/firestore";
import type { NexoNode } from "@/types/nexo";

// ── Gemini endpoint ───────────────────────────────────────────────────────────

const GEMINI_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;

// ── Tipos internos ────────────────────────────────────────────────────────────

interface ReflectionInsight {
  title:      string;   // ≤ 60 chars
  summary:    string;   // 2-3 oraciones
  pattern:    string;   // curiosidad | hábito | interés_emergente | conexión_temática
  categories: string[]; // categorías involucradas
}

interface ReflectionResult {
  insights:    ReflectionInsight[];
  patterns:    string[];
  connections: string[];
}

// ── Lógica principal ──────────────────────────────────────────────────────────

/**
 * Corre la reflexión para un usuario.
 * - Lee sus nodos activos
 * - Llama a Gemini Flash para detectar patrones
 * - Guarda los insights como nodos tipo "insight" en Firestore
 *
 * @returns Número de insights creados y tiempo de procesamiento
 */
export async function runReflection(uid: string): Promise<{
  insightsCreated: number;
  skipped:         boolean;
  reason?:         string;
  durationMs:      number;
}> {
  const start = Date.now();
  const db    = getAdminDb();

  // ── Verificar si ya hay un insight reciente (< 20h) ──────────────────────
  const recentSnap = await db
    .collection(`users/${uid}/nexo_nodes`)
    .where("type", "==", "insight")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (!recentSnap.empty) {
    const lastInsight = recentSnap.docs[0].data() as NexoNode;
    const hoursSince  = (Date.now() - lastInsight.createdAt) / 3_600_000;
    if (hoursSince < 20) {
      return {
        insightsCreated: 0,
        skipped:         true,
        reason:          `Insight reciente (${hoursSince.toFixed(1)}h atrás)`,
        durationMs:      Date.now() - start,
      };
    }
  }

  // ── Obtener nodos del usuario ─────────────────────────────────────────────
  const allNodes = await getNexoNodes(uid);

  // Filtrar solo nodos capturados (no insights) con peso > 0.1
  const nodes = allNodes
    .filter(n => (!n.type || n.type === "captured") && n.weight > 0.1)
    .slice(0, 30); // top 30 por peso

  if (nodes.length < 3) {
    return {
      insightsCreated: 0,
      skipped:         true,
      reason:          `Pocos nodos para reflexionar (${nodes.length})`,
      durationMs:      Date.now() - start,
    };
  }

  // ── Preparar contexto para Gemini ─────────────────────────────────────────
  const nodeLines = nodes
    .map(n => `[${n.category}] ${n.title}: ${n.summary}`)
    .join("\n");

  const prompt = `Eres el motor de reflexión cognitiva de SOFIAA, un asistente de inteligencia personal.

Analiza los siguientes nodos del grafo de memoria de un usuario y genera insights sobre sus patrones de interés, conexiones entre temas, y tendencias de comportamiento.

NODOS DEL USUARIO (ordenados por relevancia):
${nodeLines}

INSTRUCCIONES:
- Genera entre 1 y 3 insights genuinamente útiles y específicos
- Sé concreto: menciona categorías y temas reales del usuario
- NO seas genérico ("el usuario le interesa la tecnología" no es útil)
- Identifica conexiones NO obvias entre categorías distintas
- Un insight puede ser una recomendación, una observación o una pregunta reflexiva

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura:
{
  "insights": [
    {
      "title": "título conciso del insight (máx 60 caracteres)",
      "summary": "observación detallada y útil (2-3 oraciones)",
      "pattern": "uno de: curiosidad | hábito | interés_emergente | conexión_temática",
      "categories": ["categoría1", "categoría2"]
    }
  ],
  "patterns": ["patrón observado 1", "patrón observado 2"],
  "connections": ["conexión entre tema A y tema B"]
}`;

  // ── Llamar a Gemini Flash ─────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");

  const geminiRes = await fetch(GEMINI_URL(apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature:     0.75,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!geminiRes.ok) {
    const errText = await geminiRes.text().catch(() => "");
    throw new Error(`Gemini error ${geminiRes.status}: ${errText.slice(0, 200)}`);
  }

  const geminiData = await geminiRes.json();
  const rawText    = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Extraer el bloque JSON de la respuesta
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Respuesta Gemini sin JSON: ${rawText.slice(0, 200)}`);

  let result: ReflectionResult;
  try {
    result = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`JSON inválido de Gemini: ${jsonMatch[0].slice(0, 200)}`);
  }

  // ── Guardar insights como nodos especiales ────────────────────────────────
  const now             = Date.now();
  let   insightsCreated = 0;

  for (const insight of (result.insights ?? []).slice(0, 3)) {
    if (!insight.title || !insight.summary) continue;

    const nodeId      = `nexo:insight:${now}:${insightsCreated}`;
    const insightNode: NexoNode = {
      id:              nodeId,
      type:            "insight",
      category:        "other",
      title:           insight.title.slice(0, 80),
      summary:         insight.summary,
      entities: {
        extra: {
          pattern:    insight.pattern ?? "observación",
          categories: (insight.categories ?? []).join(","),
        },
      },
      url:             null,
      imageUrl:        null,
      source:          "manual",
      weight:          0.85,
      importanceScore: 0.85,
      decayRate:       0.02,        // decay más lento — los insights duran más
      lastReinforced:  now,
      capturedAt:      now,
      createdAt:       now,
    };

    await db.collection(`users/${uid}/nexo_nodes`).doc(nodeId).set(insightNode);
    insightsCreated++;
  }

  console.log(
    `[M-0 Reflection] uid=${uid.slice(0, 8)} nodes=${nodes.length} ` +
    `insights=${insightsCreated} dt=${Date.now() - start}ms`
  );

  return {
    insightsCreated,
    skipped:    false,
    durationMs: Date.now() - start,
  };
}
