/**
 * N.E.X.O. — Ingestor de Biblioteca (Sprint M-1B)
 * ─────────────────────────────────────────────────
 * Uso:  npm run biblioteca:ingest
 *
 * Lee todos los PDFs de la carpeta biblioteca/ y los procesa con Gemini.
 * Guarda el conocimiento en Firestore → colección global sofiaa_biblioteca.
 * Solo procesa archivos nuevos — los ya procesados se saltan.
 *
 * Variables requeridas en .env.local:
 *   GEMINI_API_KEY
 *   FIREBASE_SERVICE_ACCOUNT_BASE64
 */

import { readdir, readFile, access } from "fs/promises";
import { join }                      from "path";
import { createRequire }             from "module";

// ── Cargar variables de entorno ───────────────────────────────────────────────
const _require = createRequire(import.meta.url);
try {
  const dotenv = _require("dotenv");
  dotenv.config({ path: ".env.local" });
} catch { /* sin dotenv — usa variables del sistema */ }

// ── Config ────────────────────────────────────────────────────────────────────
const BIBLIOTECA_DIR = join(process.cwd(), "biblioteca");
const MAX_MB         = 15;
const MAX_BYTES      = MAX_MB * 1024 * 1024;

const GEMINI_URL = key =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;

// ── Firebase Admin (ESM dinámico) ─────────────────────────────────────────────
async function initFirebase() {
  const { cert, initializeApp, getApps } = await import("firebase-admin/app");
  const { getFirestore }                  = await import("firebase-admin/firestore");

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 no está en .env.local");

  const sa  = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
  const app = getApps().find(a => a.name === "biblioteca")
    ?? initializeApp({ credential: cert(sa) }, "biblioteca");

  return getFirestore(app);
}

// ── Procesar un PDF ───────────────────────────────────────────────────────────
async function processOnePdf(db, filename, apiKey) {
  const filePath = join(BIBLIOTECA_DIR, filename);
  const buffer   = await readFile(filePath);

  if (buffer.length > MAX_BYTES) {
    throw new Error(`PDF supera el límite de ${MAX_MB}MB (${(buffer.length/1048576).toFixed(1)}MB)`);
  }

  const pdfBase64 = buffer.toString("base64");

  const prompt = `Analiza este documento PDF y extrae su conocimiento de forma estructurada.

INSTRUCCIONES:
- Encuentra el título real y el autor del documento (si están presentes)
- Escribe una sinopsis de 3-5 oraciones que capture la esencia, los argumentos principales y el valor del documento
- Lista los 5-8 temas o conceptos principales
- Responde ÚNICAMENTE con un objeto JSON válido:

{
  "title": "Título real del documento",
  "author": "Autor o institución (vacío si no se encuentra)",
  "synopsis": "Sinopsis de 3-5 oraciones concisas y útiles",
  "topics": ["tema 1", "tema 2", "tema 3"],
  "language": "es o en"
}`;

  const res = await fetch(GEMINI_URL(apiKey), {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role:  "user",
        parts: [
          { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
          { text: prompt },
        ],
      }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data     = await res.json();
  const rawText  = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Gemini no devolvió JSON. Respuesta: ${rawText.slice(0, 100)}`);

  const result = JSON.parse(jsonMatch[0]);

  const docId = `bib_${filename
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase()
    .slice(0, 60)}`;

  await db.collection("sofiaa_biblioteca").doc(docId).set({
    id:          docId,
    filename,
    title:       result.title  || filename.replace(/\.pdf$/i, ""),
    author:      result.author || "",
    synopsis:    result.synopsis || "",
    topics:      Array.isArray(result.topics) ? result.topics : [],
    language:    result.language || "es",
    sizeBytes:   buffer.length,
    processedAt: Date.now(),
  });

  return { docId, title: result.title, topicCount: (result.topics ?? []).length };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n📚 N.E.X.O. Ingestor de Biblioteca\n");

  // Verificar carpeta
  try {
    await access(BIBLIOTECA_DIR);
  } catch {
    console.log(`ℹ️  Carpeta biblioteca/ no encontrada.`);
    console.log(`   Créala en la raíz del proyecto y agrega PDFs.\n`);
    return;
  }

  const files = await readdir(BIBLIOTECA_DIR);
  const pdfs  = files.filter(f => f.toLowerCase().endsWith(".pdf"));

  if (pdfs.length === 0) {
    console.log("ℹ️  No hay PDFs en biblioteca/ — agrega archivos y vuelve a correr.\n");
    return;
  }

  console.log(`📖 ${pdfs.length} PDF(s) encontrado(s)\n`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY no está configurado en .env.local");

  const db = await initFirebase();
  let processed = 0;
  let skipped   = 0;
  let errors    = 0;

  for (const filename of pdfs) {
    const docId = `bib_${filename
      .replace(/\.pdf$/i, "")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()
      .slice(0, 60)}`;

    // Saltar si ya está procesado
    const existing = await db.collection("sofiaa_biblioteca").doc(docId).get();
    if (existing.exists) {
      console.log(`  ⏩ ${filename} — ya en biblioteca`);
      skipped++;
      continue;
    }

    process.stdout.write(`  ⚡ ${filename}… `);
    const start = Date.now();

    try {
      const result = await processOnePdf(db, filename, apiKey);
      const dt     = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`✅  "${result.title}" · ${result.topicCount} temas · ${dt}s`);
      processed++;
    } catch (err) {
      console.log(`❌\n     Error: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n${"─".repeat(48)}`);
  console.log(`✅ Procesados: ${processed}  |  ⏩ Saltados: ${skipped}  |  ❌ Errores: ${errors}`);

  if (processed > 0) {
    console.log(`\nSOFIAA ya integró los documentos nuevos en su conocimiento.`);
    console.log(`Haz commit del PDF para que quede registrado en el repo.\n`);
  } else if (errors === 0) {
    console.log(`\nTodo actualizado — no había documentos nuevos.\n`);
  } else {
    console.log();
  }
}

main().catch(err => {
  console.error("\n❌ Error fatal:", err.message);
  process.exit(1);
});
