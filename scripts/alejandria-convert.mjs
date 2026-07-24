/**
 * ALEJANDRÍA — Batch Converter
 *
 * Convierte documentos raw (cualquier estructura JSON)
 * al schema estándar de Alejandría usando Groq.
 *
 * Uso:
 *   node scripts/alejandria-convert.mjs
 *
 * Prerrequisitos:
 *   - GROQ_API_KEY en .env.local
 *   - carpeta alejandria_corpus/ poblada con documentos
 *
 * El script:
 *   1. Escanea todos los JSON en alejandria_corpus/
 *   2. Salta los que ya tienen schema Alejandría (id + tipo + titulo + resumen)
 *   3. Convierte los raw con Groq usando el prompt oficial de ALEJANDRIA_SCHEMA.md
 *   4. Guarda el resultado en el mismo archivo (sobreescribe)
 *   5. Genera _indice.json al terminar
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");

// ── Cargar GROQ_API_KEY desde .env.local ─────────────────────────────────────
function loadEnv() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) throw new Error(".env.local no encontrado");
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const [key, ...val] = line.split("=");
    if (key?.trim() === "GROQ_API_KEY") return val.join("=").trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("GROQ_API_KEY no encontrado en .env.local");
}

// ── Groq call ─────────────────────────────────────────────────────────────────
async function callGroq(apiKey, content) {
  const prompt = `Eres un procesador de conocimiento especializado en el proyecto SOFIAA, un ecosistema de inteligencia artificial modular construido con Next.js, Firebase y Groq.

El sistema tiene los siguientes módulos principales:
- SOFIAA: núcleo de chat e IA principal
- NEXO (N.E.X.O.): sistema nervioso central / knowledge graph / memoria semántica
- PROMETEO: motor de growth intelligence para agencias de marketing
- NORA: sistema de observación y memoria episódica del usuario
- HERMES: motor de automatización y ejecución de acciones
- ATENA: motor de análisis científico (Lean Six Sigma, DMAIC, PMBOK, AMEF, SPC)
- TEC BII: gestión institucional (empleados, proyectos, briefs, evaluaciones)
- ALEJANDRÍA: memoria histórica e ingeniería del proyecto

Tu tarea: procesar el documento adjunto y convertirlo en un nodo de conocimiento estructurado en formato JSON.

Reglas de extracción:
1. El campo "resumen" debe ser denso en información — quien lo lea sin ver el documento original debe entender el 80% del valor.
2. En "decisiones": extrae SOLO decisiones reales (arquitectura, tecnología, diseño). Si el documento no tiene decisiones explícitas, deja el array vacío.
3. En "texto_embedding": reescribe el contenido eliminando relleno, saludos, frases genéricas. Máximo 1500 palabras. Debe leer como conocimiento técnico comprimido.
4. En "preguntas_que_responde": escribe las preguntas literales que alguien podría hacerle a SOFIAA sobre este tema y que este documento respondería.
5. Elige el "tipo" más apropiado: sprint | decision_arquitectura | brainstorming | especificacion_modulo | experimento | hito | idea
6. En "modulos_afectados": incluye solo los módulos que el documento menciona o implica directamente.
7. Si el documento menciona una fecha, úsala en "fecha". Si no, usa "2026-07-24".
8. En "tags": 4-8 palabras clave técnicas.
9. Para el campo "id": usa el formato {tipo}_{modulo_principal}_{descripcion_corta}_{fecha_sin_guiones}. Ejemplo: decision_nexo_backplane_arquitectura_20260720
10. fase_corpus: usa siempre "fase_1"

Formato de salida: SOLO el JSON válido, sin markdown, sin explicaciones antes o después.

Schema:
{
  "id": "",
  "tipo": "",
  "fecha": "",
  "fase_corpus": "fase_1",
  "titulo": "",
  "resumen": "",
  "modulos_afectados": [],
  "sprint_referencia": null,
  "version_sofiaa": null,
  "decisiones": [],
  "conceptos_clave": [],
  "hitos": [],
  "preguntas_que_responde": [],
  "tags": [],
  "texto_embedding": "",
  "documento_original": "",
  "procesado_por": "groq",
  "fecha_procesamiento": "2026-07-24"
}

Documento a procesar:
${content}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.choices[0].message.content.trim();

  // Strip markdown code fences if present
  const clean = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(clean);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAlejandriaSchema(obj) {
  return obj && typeof obj === "object" &&
    "id" in obj && "tipo" in obj && "titulo" in obj && "resumen" in obj &&
    obj.id && obj.titulo;  // non-empty
}

function getAllJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...getAllJsonFiles(full));
    else if (entry.name.endsWith(".json") && !entry.name.startsWith("_")) results.push(full);
  }
  return results;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const corpusDir = path.join(ROOT, "alejandria_corpus");
  if (!fs.existsSync(corpusDir)) {
    console.error("❌ No se encontró alejandria_corpus/");
    process.exit(1);
  }

  let apiKey;
  try {
    apiKey = loadEnv();
    console.log("✓ GROQ_API_KEY cargada");
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }

  const files = getAllJsonFiles(corpusDir);
  console.log(`\n📂 ${files.length} archivos JSON encontrados\n`);

  const results = { converted: [], skipped: [], failed: [] };

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const relPath  = path.relative(corpusDir, filePath);
    const fileName = path.basename(filePath);

    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch (e) {
      console.log(`  ✗ [${i+1}/${files.length}] JSON inválido: ${relPath}`);
      results.failed.push(relPath);
      continue;
    }

    // Ya tiene schema correcto — saltar
    if (isAlejandriaSchema(raw)) {
      console.log(`  ⏭  [${i+1}/${files.length}] Ya convertido: ${raw.id?.slice(0, 50)}`);
      results.skipped.push({ file: relPath, id: raw.id, titulo: raw.titulo });
      continue;
    }

    // Convertir
    console.log(`  ⚙️  [${i+1}/${files.length}] Convirtiendo: ${relPath}`);

    const contentStr = JSON.stringify(raw, null, 2);
    // Truncar si el doc es muy grande (max ~8000 chars para no saturar tokens)
    const truncated = contentStr.length > 8000
      ? contentStr.slice(0, 8000) + "\n... [truncado]"
      : contentStr;

    try {
      const converted = await callGroq(apiKey, truncated);

      // Asegurarse de que documento_original tenga el nombre del archivo
      if (!converted.documento_original) {
        converted.documento_original = fileName;
      }

      // Preservar fase_corpus según la carpeta
      if (relPath.startsWith("fase_2")) converted.fase_corpus = "fase_2";
      else converted.fase_corpus = "fase_1";

      fs.writeFileSync(filePath, JSON.stringify(converted, null, 2), "utf-8");
      console.log(`  ✓  → id: ${converted.id?.slice(0, 60)}`);
      results.converted.push({ file: relPath, id: converted.id, titulo: converted.titulo });

      // Rate limiting — esperar 1.2s entre requests para no saturar la API
      if (i < files.length - 1) await sleep(1200);

    } catch (e) {
      console.log(`  ✗  Error Groq: ${e.message?.slice(0, 100)}`);
      results.failed.push(relPath);
      await sleep(2000); // espera más si hay error
    }
  }

  // ── Generar índice maestro ────────────────────────────────────────────────

  console.log("\n📋 Generando _indice.json...");

  const allFiles = getAllJsonFiles(corpusDir);
  const indice = { generado: new Date().toISOString(), total: 0, documentos: [] };

  for (const f of allFiles) {
    try {
      const d = JSON.parse(fs.readFileSync(f, "utf-8"));
      if (isAlejandriaSchema(d)) {
        indice.documentos.push({
          id:                d.id,
          archivo:           path.relative(corpusDir, f),
          tipo:              d.tipo,
          titulo:            d.titulo,
          fecha:             d.fecha,
          fase_corpus:       d.fase_corpus,
          modulos_afectados: d.modulos_afectados,
          sprint_referencia: d.sprint_referencia,
          tags:              d.tags,
        });
      }
    } catch {}
  }

  indice.total = indice.documentos.length;
  fs.writeFileSync(
    path.join(corpusDir, "_indice.json"),
    JSON.stringify(indice, null, 2),
    "utf-8"
  );

  // ── Resumen final ─────────────────────────────────────────────────────────

  console.log("\n" + "═".repeat(50));
  console.log(`✅ Convertidos:  ${results.converted.length}`);
  console.log(`⏭  Ya listos:   ${results.skipped.length}`);
  console.log(`❌ Fallidos:     ${results.failed.length}`);
  console.log(`📋 Índice:       alejandria_corpus/_indice.json (${indice.total} docs)`);
  console.log("═".repeat(50));

  if (results.failed.length > 0) {
    console.log("\nArchivos fallidos:");
    results.failed.forEach(f => console.log(`  - ${f}`));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
