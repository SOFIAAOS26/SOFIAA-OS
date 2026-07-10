/**
 * N.E.X.O. — LLM Classifier (Sprint N-2)
 *
 * Usa Gemini Flash con responseMimeType JSON para clasificar contenido capturado:
 *   - category (NexoCategory)
 *   - importanceScore (0.0 – 1.0)
 *   - summary (≤200 chars, en español)
 *   - entities (place, person, product, price, brand, hashtags)
 *   - slug (para componer el nodeId)
 */

import type { NexoCategory, NexoEntities, NexoIngestPayload } from "@/types/nexo";
import { callGroq } from "@/lib/groq";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClassifierResult {
  category:        NexoCategory;
  importanceScore: number;   // 0.0 – 1.0
  summary:         string;   // ≤200 chars
  entities:        NexoEntities;
  slug:            string;   // "sushi-restaurante-tokyo" etc.
  tokensUsed:      number;
}

// ── Prompt ────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres un extractor de conocimiento estructurado para SOFIAA, una IA personal.
Tu tarea es analizar contenido web capturado por el usuario y devolver un JSON con:

- category: una de ["food","work","travel","shopping","research","social","media","other"]
- importanceScore: número 0.0–1.0 (qué tan relevante es para recordar; spam/pub = 0.1, info útil = 0.7–0.9)
- summary: resumen de máximo 200 caracteres en español, informativo y concreto
- entities: objeto con campos opcionales: place, person, product, price, brand, hashtags (array)
- slug: 3-5 palabras en kebab-case que identifican únicamente el contenido

Reglas:
- Si es un restaurante o comida → food
- Si es producto con precio → shopping
- Si es artículo técnico, paper, noticia → research o work
- Si es lugar turístico → travel
- Si es un perfil, post de red social → social
- Si es video, película, música → media
- importanceScore alto (≥0.7) solo si el contenido tiene información concreta y útil
- El summary debe ser en español, descriptivo y breve
- El slug NO debe tener acentos ni caracteres especiales

Responde SOLO con el JSON, sin markdown, sin explicaciones.`;

const CATEGORIES: NexoCategory[] = [
  "food","work","travel","shopping","research","social","media","other"
];

// ── Fallback cuando Gemini falla ──────────────────────────────────────────────

function heuristicClassify(payload: NexoIngestPayload): ClassifierResult {
  const text  = `${payload.title} ${payload.text}`.toLowerCase();
  const slug  = slugify(payload.title);

  let category: NexoCategory = "other";
  if (/restau|comida|taco|sushi|pizza|menú|platillo|receta/.test(text)) category = "food";
  else if (/precio|compra|tienda|producto|envío|carrito|oferta|descuento/.test(text)) category = "shopping";
  else if (/hotel|vuelo|viaje|turismo|airbnb|booking/.test(text))                    category = "travel";
  else if (/paper|estudio|investigación|análisis|reporte|noticia/.test(text))         category = "research";
  else if (/trabajo|proyecto|empresa|cliente|propuesta|reunión/.test(text))           category = "work";
  else if (/instagram|twitter|linkedin|facebook|perfil|follow/.test(text))            category = "social";
  else if (/youtube|spotify|netflix|película|serie|podcast|música/.test(text))        category = "media";

  return {
    category,
    importanceScore: 0.5,
    summary: payload.text.slice(0, 197) + (payload.text.length > 197 ? "..." : ""),
    entities: {},
    slug,
    tokensUsed: 0,
  };
}

// ── Main classifier ───────────────────────────────────────────────────────────

export async function classifyNexoPayload(
  payload: NexoIngestPayload
): Promise<ClassifierResult> {
  const content = buildContent(payload);

  try {
    const rawText = await callGroq(content, {
      system:      SYSTEM_PROMPT,
      maxTokens:   512,
      temperature: 0.1,
      json:        true,
    });

    if (!rawText) {
      console.warn("[N.E.X.O. classifier] Groq sin respuesta — usando heurística");
      return heuristicClassify(payload);
    }

    const parsed = JSON.parse(rawText);
    return sanitizeResult(parsed, payload, 0);

  } catch (err) {
    console.error("[N.E.X.O. classifier] Error:", err);
    return heuristicClassify(payload);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildContent(payload: NexoIngestPayload): string {
  const lines: string[] = [
    `URL: ${payload.url ?? "(sin url)"}`,
    `TÍTULO: ${payload.title}`,
    `FUENTE: ${payload.source}`,
    `TEXTO:\n${payload.text.slice(0, 3000)}`,
  ];
  return lines.join("\n");
}

function sanitizeResult(
  raw: Record<string, unknown>,
  payload: NexoIngestPayload,
  tokensUsed: number
): ClassifierResult {
  const category: NexoCategory =
    CATEGORIES.includes(raw.category as NexoCategory)
      ? (raw.category as NexoCategory)
      : "other";

  const importanceScore = Math.min(1, Math.max(0,
    typeof raw.importanceScore === "number" ? raw.importanceScore : 0.5
  ));

  const summary =
    typeof raw.summary === "string"
      ? raw.summary.slice(0, 200)
      : payload.text.slice(0, 200);

  const rawEntities = (raw.entities ?? {}) as Record<string, unknown>;
  const entities: NexoEntities = {
    place:    typeof rawEntities.place    === "string" ? rawEntities.place    : undefined,
    person:   typeof rawEntities.person   === "string" ? rawEntities.person   : undefined,
    product:  typeof rawEntities.product  === "string" ? rawEntities.product  : undefined,
    price:    typeof rawEntities.price    === "string" ? rawEntities.price    : undefined,
    brand:    typeof rawEntities.brand    === "string" ? rawEntities.brand    : undefined,
    hashtags: Array.isArray(rawEntities.hashtags)
      ? (rawEntities.hashtags as unknown[]).filter((h): h is string => typeof h === "string")
      : undefined,
  };

  const slug =
    typeof raw.slug === "string" && raw.slug.trim()
      ? raw.slug.trim().slice(0, 60)
      : slugify(payload.title);

  return { category, importanceScore, summary, entities, slug, tokensUsed };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // quitar acentos
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}
