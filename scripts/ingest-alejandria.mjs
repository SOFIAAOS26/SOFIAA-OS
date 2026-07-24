/**
 * ALEJANDRÍA — Ingestión del Corpus a Firestore
 * Sprint AJ-1 · Ingesta batch con embeddings opcionales
 *
 * Lee todos los JSONs del corpus (ya en schema Alejandría),
 * les agrega uid + timestamps + reinforceCount, genera embeddings
 * con Gemini si GEMINI_API_KEY está disponible, y los sube a:
 *   users/{uid}/alejandria_nodos/{nodeId}
 *
 * Uso:
 *   node scripts/ingest-alejandria.mjs <uid>
 *   ALEJANDRIA_UID=<uid> node scripts/ingest-alejandria.mjs
 *
 * Variables necesarias en .env.local:
 *   FIREBASE_SERVICE_ACCOUNT_BASE64=<base64 del service account>
 *   GEMINI_API_KEY=<tu API key>   (opcional — genera embeddings)
 *   ALEJANDRIA_UID=<firebase uid>  (alternativa al CLI arg)
 */

import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ── Paths ─────────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");
const CORPUS    = path.join(ROOT, "alejandria_corpus");

// ── Cargar .env.local ─────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = val;
  }
}

loadEnv();

// ── Firebase Admin init ───────────────────────────────────────────────────────

async function initFirebase() {
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore }                  = await import("firebase-admin/firestore");

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) {
    throw new Error(
      "❌ FIREBASE_SERVICE_ACCOUNT_BASE64 no está configurado en .env.local\n" +
      "   → Firebase Console → Project Settings → Service Accounts → Generate new private key\n" +
      "   → cat service-account.json | base64 | tr -d '\\n'  → pegar en .env.local"
    );
  }

  const serviceAccount = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));

  const app = getApps().find(a => a.name === "alejandria-ingest")
    ?? initializeApp({ credential: cert(serviceAccount) }, "alejandria-ingest");

  return getFirestore(app);
}

// ── Gemini Embeddings (opcional) ──────────────────────────────────────────────

const GEMINI_EMBED_MODEL = "text-embedding-004";
const GEMINI_EMBED_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent`;
const EMBED_DELAY_MS     = 300;   // delay entre requests para respetar rate limits
const EMBED_MAX_CHARS    = 9000;  // max chars por request (Gemini límite seguro)

async function generateEmbedding(apiKey, text) {
  const truncated = text.slice(0, EMBED_MAX_CHARS);
  const res = await fetch(`${GEMINI_EMBED_URL}?key=${apiKey}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model:   `models/${GEMINI_EMBED_MODEL}`,
      content: { parts: [{ text: truncated }] },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini embed error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data  = await res.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("Gemini no retornó un vector válido");
  }
  return values; // number[]
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Leer corpus ───────────────────────────────────────────────────────────────

function getAllJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory())  results.push(...getAllJsonFiles(full));
    else if (
      entry.name.endsWith(".json") &&
      !entry.name.startsWith("_")
    ) results.push(full);
  }
  return results;
}

function isAlejandriaSchema(doc) {
  return doc &&
    typeof doc.id    === "string" && doc.id.length > 5 &&
    typeof doc.tipo  === "string" &&
    typeof doc.titulo === "string" && doc.titulo.length > 3 &&
    typeof doc.resumen === "string";
}

// ── Batch write helper ────────────────────────────────────────────────────────

async function batchWrite(db, uid, nodes) {
  let count = 0;
  const colPath = `users/${uid}/alejandria_nodos`;

  for (let i = 0; i < nodes.length; i += 499) {
    const batch = db.batch();
    const chunk = nodes.slice(i, i + 499);

    for (const node of chunk) {
      const ref = db.collection(colPath).doc(node.id);
      const { id, ...data } = node;
      batch.set(ref, data, { merge: true });
    }

    await batch.commit();
    count += chunk.length;
    console.log(`   📤 Batch ${Math.floor(i / 499) + 1}: ${chunk.length} nodos escritos`);
  }
  return count;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // ── UID ──────────────────────────────────────────────────────────────────
  const uid = process.argv[2] || process.env.ALEJANDRIA_UID;
  if (!uid) {
    console.error(
      "❌ UID de Firebase requerido.\n" +
      "   Uso: node scripts/ingest-alejandria.mjs <uid>\n" +
      "        ALEJANDRIA_UID=<uid> node scripts/ingest-alejandria.mjs"
    );
    process.exit(1);
  }

  console.log(`\n🏛  ALEJANDRÍA — Ingestión AJ-1`);
  console.log(`   UID: ${uid}`);

  // ── Gemini ────────────────────────────────────────────────────────────────
  const geminiKey    = process.env.GEMINI_API_KEY;
  const useEmbeddings = !!geminiKey;
  console.log(`   Embeddings: ${useEmbeddings ? "✅ Gemini " + GEMINI_EMBED_MODEL : "⚠️  sin clave GEMINI_API_KEY — se omiten"}`);

  // ── Firebase ──────────────────────────────────────────────────────────────
  console.log("\n🔌 Conectando a Firebase...");
  const db = await initFirebase();
  console.log("   ✓ Firebase Admin listo");

  // ── Leer corpus ───────────────────────────────────────────────────────────
  if (!fs.existsSync(CORPUS)) {
    console.error("❌ No se encontró alejandria_corpus/");
    process.exit(1);
  }

  const files = getAllJsonFiles(CORPUS);
  console.log(`\n📂 ${files.length} archivos JSON encontrados`);

  const now    = Date.now();
  const nodes  = [];
  const stats  = { valid: 0, invalid: 0, withEmbedding: 0, embedErrors: 0 };

  // ── Procesar cada archivo ─────────────────────────────────────────────────
  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const rel      = path.relative(CORPUS, filePath);

    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch {
      console.log(`  ✗ JSON inválido: ${rel}`);
      stats.invalid++;
      continue;
    }

    if (!isAlejandriaSchema(raw)) {
      console.log(`  ⚠️  Sin schema Alejandría: ${rel}`);
      stats.invalid++;
      continue;
    }

    // Construir el nodo completo
    const node = {
      // Schema fields del corpus
      id:                    raw.id,
      tipo:                  raw.tipo,
      fecha:                 raw.fecha ?? "2026-07-24",
      fase_corpus:           raw.fase_corpus ?? "fase_1",
      titulo:                raw.titulo,
      resumen:               raw.resumen ?? "",
      modulos_afectados:     raw.modulos_afectados ?? ["SOFIAA"],
      sprint_referencia:     raw.sprint_referencia ?? null,
      version_sofiaa:        raw.version_sofiaa ?? null,
      decisiones:            raw.decisiones         ?? [],
      conceptos_clave:       raw.conceptos_clave    ?? [],
      hitos:                 raw.hitos              ?? [],
      preguntas_que_responde: raw.preguntas_que_responde ?? [],
      tags:                  raw.tags               ?? [],
      texto_embedding:       raw.texto_embedding    ?? raw.resumen ?? "",
      documento_original:    raw.documento_original ?? path.basename(filePath),
      procesado_por:         raw.procesado_por      ?? "extractor-deterministico",
      // Campos de persistencia
      uid,
      reinforceCount: 0,
      createdAt:      now,
      updatedAt:      now,
    };

    // Embedding opcional
    if (useEmbeddings && node.texto_embedding) {
      process.stdout.write(`  [${i + 1}/${files.length}] 🔢 Embedding: ${node.id.slice(0, 50)}...`);
      try {
        node.embedding = await generateEmbedding(geminiKey, node.texto_embedding);
        stats.withEmbedding++;
        process.stdout.write(" ✓\n");
        if (i < files.length - 1) await sleep(EMBED_DELAY_MS);
      } catch (e) {
        process.stdout.write(` ✗ ${e.message.slice(0, 60)}\n`);
        stats.embedErrors++;
        // Si el error es rate limit, esperar más
        if (e.message.includes("429") || e.message.includes("quota")) {
          console.log("   ⏳ Rate limit detectado — esperando 5s...");
          await sleep(5000);
        }
      }
    } else {
      console.log(`  [${i + 1}/${files.length}] ✓ ${node.id.slice(0, 55)}`);
    }

    nodes.push(node);
    stats.valid++;
  }

  // ── Escribir en Firestore ─────────────────────────────────────────────────
  console.log(`\n📤 Escribiendo ${nodes.length} nodos en Firestore...`);
  console.log(`   → users/${uid}/alejandria_nodos/`);

  const written = await batchWrite(db, uid, nodes);

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(55));
  console.log(`✅ Nodos escritos:    ${written}`);
  console.log(`⚠️  Inválidos/omitidos: ${stats.invalid}`);
  if (useEmbeddings) {
    console.log(`🔢 Con embedding:    ${stats.withEmbedding}`);
    console.log(`❌ Embed errors:     ${stats.embedErrors}`);
  }
  console.log("═".repeat(55));
  console.log("\n✓ Ingestión completada. AJ-1 listo.");
  console.log(`  → Verifica en Firestore Console:`);
  console.log(`    users/${uid}/alejandria_nodos\n`);
}

main().catch(e => {
  console.error("\n💥 Error fatal:", e.message);
  process.exit(1);
});
