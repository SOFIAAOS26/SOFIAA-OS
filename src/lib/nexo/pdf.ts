/**
 * N.E.X.O. — PDF Library Engine (Sprint M-1, actualizado Groq)
 *
 * Procesa un documento PDF usando pdf-parse (extracción de texto) + Groq LLM.
 *
 * Flujo:
 *   1. Guarda metadata en users/{uid}/biblioteca/{docId} (status: "processing")
 *   2. Extrae texto plano del PDF con pdf-parse
 *   3. Envía el texto a Groq para extracción estructurada de conocimiento (JSON)
 *   4. Crea NexoNodes (source: "pdf_library") por cada tema/capítulo detectado
 *   5. Actualiza el BibliotecaDoc con status: "processed" + nodesCreated
 */

import { getAdminDb } from "@/lib/firebase-admin";
import { callGroq }   from "@/lib/groq";
import type { NexoNode, NexoCategory, BibliotecaDoc } from "@/types/nexo";

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
    // ── 2. Extraer texto del PDF con pdf-parse ────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    const pdfData   = await pdfParse(pdfBuffer);
    const pdfText   = pdfData.text.slice(0, 8000); // truncar para no exceder TPM

    // ── 3. Llamar a Groq con el texto extraído ────────────────────────────
    const prompt = `Analiza el siguiente texto extraído de un documento PDF y extrae su conocimiento de forma estructurada.

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
}

TEXTO DEL PDF:
${pdfText}`;

    const rawText = await callGroq(prompt, { maxTokens: 2048, temperature: 0.3, json: true });
    if (!rawText) throw new Error("Groq no devolvió respuesta");

    // Extraer JSON
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Groq no devolvió JSON válido");

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
      `[M-1 PDF/Groq] uid=${uid.slice(0, 8)} doc="${finalTitle}" ` +
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
