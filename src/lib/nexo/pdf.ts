/**
 * N.E.X.O. — PDF Library Engine (Sprint M-1)
 *
 * Procesa un documento PDF usando Gemini Flash con datos inline.
 * No requiere pdf-parse — Gemini lee el PDF directamente como base64.
 *
 * Flujo:
 *   1. Guarda metadata en users/{uid}/biblioteca/{docId} (status: "processing")
 *   2. Envía el PDF a Gemini para extracción estructurada de conocimiento
 *   3. Crea NexoNodes (source: "pdf_library") por cada tema/capítulo detectado
 *   4. Actualiza el BibliotecaDoc con status: "processed" + nodesCreated
 *
 * Límite: PDFs hasta ~10MB (límite de Gemini inline data en producción).
 */

import { getAdminDb } from "@/lib/firebase-admin";
import type { NexoNode, NexoCategory, BibliotecaDoc } from "@/types/nexo";

// ── Gemini endpoint ───────────────────────────────────────────────────────────

const GEMINI_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;

// ── Tipos internos ────────────────────────────────────────────────────────────

interface GeminiPdfNode {
  title:    string;
  summary:  string;
  category: string;
  entities: {
    person?:  string;
    place?:   string;
    product?: string;
    brand?:   string;
    price?:   string;
  };
}

interface GeminiPdfResult {
  title:    string;
  author:   string;
  language: string;
  nodes:    GeminiPdfNode[];
}

const VALID_CATEGORIES: NexoCategory[] = [
  "food", "work", "travel", "shopping", "research", "social", "media", "other"
];

function toNexoCategory(raw: string): NexoCategory {
  const cat = raw?.toLowerCase() as NexoCategory;
  return VALID_CATEGORIES.includes(cat) ? cat : "research";
}

// ── Motor principal ───────────────────────────────────────────────────────────

export interface ProcessPdfOptions {
  uid:         string;
  filename:    string;
  sizeBytes:   number;
  pdfBase64:   string;  // base64 del PDF completo
}

export interface ProcessPdfResult {
  docId:        string;
  title:        string;
  author:       string;
  nodesCreated: number;
  durationMs:   number;
}

export async function processPdf(opts: ProcessPdfOptions): Promise<ProcessPdfResult> {
  const { uid, filename, sizeBytes, pdfBase64 } = opts;
  const start = Date.now();
  const db    = getAdminDb();

  // Generar IDs
  const ts    = Date.now();
  const slug  = filename
    .toLowerCase()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9]/g, "_")
    .slice(0, 40);
  const docId = `bib:${slug}:${ts}`;

  // ── 1. Guardar metadata inicial ───────────────────────────────────────────
  const bibRef = db.collection(`users/${uid}/biblioteca`).doc(docId);
  const initial: BibliotecaDoc = {
    id:           docId,
    title:        filename.replace(/\.pdf$/i, ""),
    filename,
    author:       "",
    sizeBytes,
    nodesCreated: 0,
    status:       "processing",
    processedAt:  0,
    createdAt:    ts,
  };
  await bibRef.set(initial);

  try {
    // ── 2. Llamar a Gemini con el PDF ─────────────────────────────────────
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");

    const prompt = `Analiza este documento PDF y extrae su conocimiento de forma estructurada.

INSTRUCCIONES:
- Identifica el título real y autor del documento (si están presentes)
- Extrae los 3 a 7 temas, capítulos o conceptos más importantes
- Para cada uno: escribe un resumen claro y útil en 2-3 oraciones
- Categoriza cada tema: research, work, food, travel, shopping, social, media, u other
- Extrae entidades relevantes: personas, lugares, marcas, precios

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "title": "Título real del documento",
  "author": "Autor o institución (vacío si no está)",
  "language": "es o en",
  "nodes": [
    {
      "title": "Nombre del tema o capítulo (máx 60 chars)",
      "summary": "Resumen del tema en 2-3 oraciones concretas y útiles",
      "category": "research",
      "entities": {
        "person": "nombre si aplica",
        "place": "lugar si aplica",
        "brand": "marca si aplica",
        "product": "producto si aplica",
        "price": "precio si aplica"
      }
    }
  ]
}`;

    const geminiRes = await fetch(GEMINI_URL(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data:     pdfBase64,
              },
            },
            { text: prompt },
          ],
        }],
        generationConfig: {
          temperature:     0.3,   // más determinista para extracción
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => "");
      throw new Error(`Gemini error ${geminiRes.status}: ${errText.slice(0, 200)}`);
    }

    const geminiData = await geminiRes.json();
    const rawText    = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Extraer JSON
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Gemini no devolvió JSON válido");

    let result: GeminiPdfResult;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error(`JSON inválido: ${jsonMatch[0].slice(0, 100)}`);
    }

    // ── 3. Crear NexoNodes ──────────────────────────────────────────────
    const now          = Date.now();
    let nodesCreated   = 0;

    for (const rawNode of (result.nodes ?? []).slice(0, 7)) {
      if (!rawNode.title || !rawNode.summary) continue;

      const nodeTs  = now + nodesCreated; // ms únicos por nodo
      const nodeSlug = rawNode.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .slice(0, 30);
      const nodeId = `nexo:${toNexoCategory(rawNode.category)}:${nodeSlug}:${nodeTs}`;

      // Filtrar entidades vacías
      const entities = Object.fromEntries(
        Object.entries(rawNode.entities ?? {}).filter(([, v]) => v && v.length > 0)
      );

      const node: NexoNode = {
        id:              nodeId,
        category:        toNexoCategory(rawNode.category),
        title:           rawNode.title.slice(0, 100),
        summary:         rawNode.summary,
        entities: {
          ...entities,
          extra: {
            docId,
            source_title: result.title,
            author:       result.author,
          },
        },
        url:             null,
        imageUrl:        null,
        source:          "pdf_library",
        weight:          0.75,
        importanceScore: 0.75,
        decayRate:       0.02,        // libros decaen más lento
        lastReinforced:  nodeTs,
        capturedAt:      nodeTs,
        createdAt:       nodeTs,
      };

      await db.collection(`users/${uid}/nexo_nodes`).doc(nodeId).set(node);
      nodesCreated++;
    }

    // ── 4. Actualizar metadata del documento ─────────────────────────────
    const finalTitle  = result.title?.trim() || filename.replace(/\.pdf$/i, "");
    const finalAuthor = result.author?.trim() || "";

    await bibRef.update({
      title:        finalTitle,
      author:       finalAuthor,
      nodesCreated,
      status:       "processed",
      processedAt:  Date.now(),
    });

    console.log(
      `[M-1 PDF] uid=${uid.slice(0, 8)} doc="${finalTitle}" ` +
      `nodes=${nodesCreated} dt=${Date.now() - start}ms`
    );

    return {
      docId,
      title:        finalTitle,
      author:       finalAuthor,
      nodesCreated,
      durationMs:   Date.now() - start,
    };

  } catch (error) {
    // Marcar como error pero no perder el documento
    await bibRef.update({
      status:      "error",
      errorMsg:    String(error),
      processedAt: Date.now(),
    });
    throw error;
  }
}

// ── Borrar documento y sus nodos ──────────────────────────────────────────────

export async function deleteBibliotecaDoc(uid: string, docId: string): Promise<void> {
  const db = getAdminDb();

  // Borrar nodos asociados (source: pdf_library con docId en entities.extra)
  const nodesSnap = await db
    .collection(`users/${uid}/nexo_nodes`)
    .where("source", "==", "pdf_library")
    .get();

  const batch = db.batch();
  nodesSnap.docs.forEach(d => {
    const node = d.data() as NexoNode;
    if (node.entities?.extra?.docId === docId) {
      batch.delete(d.ref);
    }
  });

  // Borrar metadata del documento
  batch.delete(db.collection(`users/${uid}/biblioteca`).doc(docId));
  await batch.commit();
}
