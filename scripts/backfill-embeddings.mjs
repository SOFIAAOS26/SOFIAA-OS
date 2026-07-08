/**
 * N.E.X.O. — Embedding Backfill (Sprint M-4B)
 * ─────────────────────────────────────────────
 * Uso:  npm run nexo:backfill-embeddings
 *       npm run nexo:backfill-embeddings -- --uid=ABC123   (solo un usuario)
 *       npm run nexo:backfill-embeddings -- --dry-run      (solo cuenta, no escribe)
 *
 * Genera embeddings (Gemini text-embedding-004) para todos los nodos NEXO
 * que no los tienen todavía. Los nodos creados antes de Sprint M-4 carecen
 * de embedding y caen a fallback por peso — este script los pone al día.
 *
 * Variables requeridas en .env.local:
 *   GEMINI_API_KEY
 *   FIREBASE_SERVICE_ACCOUNT_BASE64
 *
 * Rate-limit: 1 embedding cada 200ms (~5/seg) para no saturar la API.
 */

import { createRequire } from "module";

// ── Env ───────────────────────────────────────────────────────────────────────
const _require = createRequire(import.meta.url);
try {
  const dotenv = _require("dotenv");
  dotenv.config({ path: ".env.local" });
} catch { /* usa variables del sistema */ }

// ── Args ──────────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const DRY    = args.includes("--dry-run");
const UID_ARG = args.find(a => a.startsWith("--uid="))?.split("=")[1] ?? null;

// ── Config ────────────────────────────────────────────────────────────────────
const EMBEDDING_MODEL = "text-embedding-004";
const EMBED_URL       = key =>
  `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${key}`;
const RATE_MS         = 220;   // ms entre calls — ~4.5/seg, bajo el límite de 1500/min
const BATCH_SIZE      = 10;    // nodos por batch de Firestore update

// ── Firebase ──────────────────────────────────────────────────────────────────
async function initFirebase() {
  const { cert, initializeApp, getApps } = await import("firebase-admin/app");
  const { getFirestore }                  = await import("firebase-admin/firestore");

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 no está en .env.local");

  const sa  = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
  const app = getApps().find(a => a.name === "backfill")
    ?? initializeApp({ credential: cert(sa) }, "backfill");

  return getFirestore(app);
}

// ── Embedding ─────────────────────────────────────────────────────────────────
async function embed(text, apiKey) {
  const input = text.trim().slice(0, 2000);
  if (!input) return null;

  try {
    const res = await fetch(EMBED_URL(apiKey), {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model:    `models/${EMBEDDING_MODEL}`,
        content:  { parts: [{ text: input }] },
        taskType: "RETRIEVAL_DOCUMENT",
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`  ✗ Gemini error ${res.status}:`, err.slice(0, 120));
      return null;
    }
    const data = await res.json();
    return data?.embedding?.values ?? null;
  } catch (e) {
    console.error("  ✗ fetch error:", e.message);
    return null;
  }
}

// ── Obtener UIDs de todos los usuarios ───────────────────────────────────────
async function getAllUids(db) {
  const snap = await db.collection("users").listDocuments();
  return snap.map(ref => ref.id);
}

// ── Procesar un usuario ───────────────────────────────────────────────────────
async function processUser(db, uid, apiKey) {
  const col  = db.collection(`users/${uid}/nexo_nodes`);
  const snap = await col.get();

  if (snap.empty) return { total: 0, skipped: 0, done: 0, failed: 0 };

  // Filtrar nodos sin embedding
  const pending = snap.docs.filter(d => !d.data().embedding);

  console.log(`  → ${snap.size} nodos totales, ${pending.length} sin embedding`);

  let done = 0, failed = 0;

  for (let i = 0; i < pending.length; i++) {
    const doc  = pending[i];
    const node = doc.data();
    const text = `${node.title ?? ""}. ${node.summary ?? ""}`.trim();

    process.stdout.write(`  [${i + 1}/${pending.length}] ${node.title?.slice(0, 50) ?? doc.id}... `);

    if (DRY) {
      console.log("(dry-run, skip)");
      done++;
      continue;
    }

    const embedding = await embed(text, apiKey);

    if (!embedding) {
      console.log("✗ sin embedding");
      failed++;
    } else {
      try {
        await doc.ref.update({ embedding });
        console.log(`✓ ${embedding.length}d`);
        done++;
      } catch (e) {
        console.log(`✗ Firestore: ${e.message}`);
        failed++;
      }
    }

    // Rate-limit
    if (i < pending.length - 1) {
      await new Promise(r => setTimeout(r, RATE_MS));
    }
  }

  return { total: snap.size, skipped: snap.size - pending.length, done, failed };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  N.E.X.O. Embedding Backfill — Sprint M-4B");
  if (DRY) console.log("  🟡 DRY-RUN — no se escribirá nada en Firestore");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("✗ GEMINI_API_KEY no encontrada en .env.local");
    process.exit(1);
  }

  const db = await initFirebase();

  // Determinar usuarios a procesar
  let uids;
  if (UID_ARG) {
    uids = [UID_ARG];
    console.log(`Procesando usuario específico: ${UID_ARG}\n`);
  } else {
    uids = await getAllUids(db);
    console.log(`Usuarios encontrados: ${uids.length}\n`);
  }

  let totalDone = 0, totalFailed = 0, totalSkipped = 0;

  for (const uid of uids) {
    console.log(`👤 Usuario: ${uid}`);
    try {
      const stats = await processUser(db, uid, apiKey);
      totalDone    += stats.done;
      totalFailed  += stats.failed;
      totalSkipped += stats.skipped;
      console.log(
        `  ✓ done=${stats.done} skipped=${stats.skipped} failed=${stats.failed}\n`
      );
    } catch (e) {
      console.error(`  ✗ Error procesando usuario: ${e.message}\n`);
    }
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Resumen: ✓ ${totalDone} embeddings generados`);
  console.log(`           ⏭  ${totalSkipped} nodos ya tenían embedding`);
  if (totalFailed > 0) console.log(`           ✗ ${totalFailed} fallidos`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main().catch(e => {
  console.error("Error fatal:", e);
  process.exit(1);
});
