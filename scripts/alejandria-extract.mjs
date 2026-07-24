/**
 * ALEJANDRÍA — Extractor Determinístico
 *
 * Convierte los raw JSONs al schema de Alejandría SIN llamar ninguna API.
 * Extrae campos directamente de la estructura de cada documento.
 *
 * Uso: node scripts/alejandria-extract.mjs
 */

import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");
const CORPUS    = path.join(ROOT, "alejandria_corpus");
const TODAY     = "2026-07-24";

// ── Módulos SOFIAA para detección automática ──────────────────────────────────
const MODULE_KEYWORDS = {
  "SOFIAA":      ["sofiaa", "ix-os", "soei", "sistema operativo de inteligencia"],
  "NEXO":        ["nexo", "n.e.x.o", "knowledge graph", "grafo", "nodo", "embedding"],
  "PROMETEO":    ["prometeo", "growth intelligence", "director autónomo", "director brief", "brand dna", "creative lab"],
  "NORA":        ["nora", "n.o.r.a", "observadora", "memoria episódica", "observer"],
  "HERMES":      ["hermes", "executor", "action execution", "cola de acciones", "conector", "monday", "slack"],
  "ATENA":       ["atena", "dmaic", "lean six sigma", "amef", "spc", "anova", "fmea", "six sigma", "kaizen", "poka-yoke"],
  "TEC_BII":     ["tec bi", "tec bii", "tec-bii", "brief canvas", "producción audiovisual", "empleados", "evaluaciones"],
  "ALEJANDRIA":  ["alejandría", "alejandria", "corpus", "memoria histórica", "autoconocimiento"],
  "LIVE_SDK":    ["live sdk", "unreal", "presencia física", "avatar"],
};

// ── Tipo por carpeta ──────────────────────────────────────────────────────────
const TIPO_BY_FOLDER = {
  sprints:     "sprint",
  decisiones:  "decision_arquitectura",
  brainstorming: "brainstorming",
  modulos:     "especificacion_modulo",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extrae todo el texto de cualquier JSON de forma recursiva */
function extractAllText(obj, depth = 0) {
  if (depth > 8) return "";
  if (typeof obj === "string") return obj;
  if (typeof obj === "number" || typeof obj === "boolean") return String(obj);
  if (Array.isArray(obj)) return obj.map(v => extractAllText(v, depth + 1)).join(" ");
  if (obj && typeof obj === "object") {
    return Object.values(obj).map(v => extractAllText(v, depth + 1)).join(" ");
  }
  return "";
}

/** Busca un título en las rutas más comunes de los raw docs */
function extractTitle(doc) {
  const attempts = [
    () => doc.titulo,
    () => doc.documento?.titulo,
    () => doc.documento_fundacional?.titulo,
    () => doc.articulo_cientifico?.titulo_espanol || doc.articulo_cientifico?.titulo_academico_original,
    () => doc.documento?.nombre_completo,
    () => doc.modulo?.nombre_oficial,
    () => doc.fase && typeof doc.fase === "string" ? `SOFIAA — ${doc.fase}` : null,
    () => doc.etapa && typeof doc.etapa === "string" ? `SOFIAA — ${doc.etapa}` : null,
    () => {
      // auditoria_de_referencias style
      if (doc.auditoria_de_referencias) return "Auditoría de Referencias y Evaluación Crítica SOFIAA";
      return null;
    },
    () => Object.keys(doc).find(k => k !== "documento" && typeof doc[k] === "object" && doc[k]?.titulo)
          ? doc[Object.keys(doc).find(k => k !== "documento" && typeof doc[k] === "object" && doc[k]?.titulo)]?.titulo
          : null,
  ];

  for (const fn of attempts) {
    try {
      const t = fn();
      if (t && typeof t === "string" && t.trim().length > 3) return t.trim();
    } catch {}
  }
  return "Documento SOFIAA (sin título)";
}

/** Busca una fecha en las rutas más comunes */
function extractDate(doc) {
  const attempts = [
    () => doc.fecha,
    () => doc.documento?.fecha,
    () => doc.modulo?.fecha,
    () => doc.meta_datos?.fecha,
    () => doc.documento?.meta_datos?.fecha,
  ];

  for (const fn of attempts) {
    try {
      const d = fn();
      if (d && typeof d === "string" && d.trim()) {
        // Try to parse common Spanish date formats
        const s = d.trim();
        // Already ISO
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        // "Julio 2026", "julio 2026", "julio de 2026"
        const months = { enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6,
                         julio:7, agosto:8, septiembre:9, octubre:10, noviembre:11, diciembre:12 };
        const m = s.toLowerCase().match(/(\d{1,2})?\s*(?:de\s+)?(\w+)\s+(?:de\s+)?(\d{4})/);
        if (m) {
          const day = m[1] ? m[1].padStart(2, "0") : "01";
          const month = months[m[2]] || 7;
          return `${m[3]}-${String(month).padStart(2, "0")}-${day}`;
        }
        // "June 2026"
        const enMonths = { january:1, february:2, march:3, april:4, may:5, june:6,
                           july:7, august:8, september:9, october:10, november:11, december:12 };
        const em = s.toLowerCase().match(/(\w+)\s+(\d{4})/);
        if (em && enMonths[em[1]]) return `${em[2]}-${String(enMonths[em[1]]).padStart(2,"0")}-01`;
      }
    } catch {}
  }
  return TODAY;
}

/** Detecta qué módulos de SOFIAA se mencionan en el texto */
function detectModules(text) {
  const lower = text.toLowerCase();
  const found = [];
  for (const [mod, keywords] of Object.entries(MODULE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) found.push(mod);
  }
  // Siempre incluir SOFIAA
  if (!found.includes("SOFIAA")) found.unshift("SOFIAA");
  return found;
}

/** Genera un ID limpio desde título + fecha */
function makeId(tipo, title, date) {
  const slugTitle = title
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")   // remove accents
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join("_");
  const dateSlug = date.replace(/-/g, "");
  const tipoSlug = tipo.replace("_", "");
  return `${tipoSlug}_${slugTitle}_${dateSlug}`.replace(/__+/g, "_");
}

/** Genera un resumen a partir de los primeros bloques de texto significativos */
function makeResumen(doc, allText) {
  // Try to get structured first sections
  const candidates = [];

  // common summary fields
  for (const key of ["resumen", "abstract", "resumen_ejecutivo", "veredicto_final",
                      "veredicto_general", "evaluacion_general"]) {
    const val = doc[key] || doc.documento?.[key];
    if (val && typeof val === "string" && val.length > 50) {
      candidates.push(val);
      break;
    }
  }

  // objective / strategy
  for (const key of ["objetivo", "estrategia", "contexto", "definicion_y_vision",
                      "concepto_y_filosofia", "naturaleza_y_filosofia"]) {
    const val = doc[key] || doc.documento?.[key];
    if (val && typeof val === "string" && val.length > 50) {
      candidates.push(val);
      break;
    }
    if (val && typeof val === "object") {
      const nested = extractAllText(val).slice(0, 400);
      if (nested.length > 50) { candidates.push(nested); break; }
    }
  }

  const baseText = candidates.length > 0
    ? candidates.join(" ").slice(0, 600)
    : allText.slice(0, 600);

  // Clean up — remove excessive whitespace
  return baseText.replace(/\s+/g, " ").trim().slice(0, 600);
}

/** Extrae preguntas que responde basadas en el título y módulos */
function makePreguntas(titulo, modulos, tipo) {
  const preguntas = [];

  if (tipo === "sprint") {
    preguntas.push(`¿Qué se implementó en el sprint ${titulo.includes("Sprint") ? titulo.match(/Sprint\s+[\w.-]+/)?.[0] || titulo : titulo}?`);
    preguntas.push("¿Cuáles fueron los cambios técnicos en esta etapa?");
    preguntas.push("¿Qué archivos y funcionalidades se crearon?");
  } else if (tipo === "decision_arquitectura") {
    preguntas.push(`¿Por qué se tomó la decisión sobre ${titulo.slice(0,40)}?`);
    preguntas.push("¿Qué alternativas se descartaron?");
    preguntas.push("¿Cómo afectó esta decisión a la arquitectura del sistema?");
  } else if (tipo === "especificacion_modulo") {
    preguntas.push(`¿Cómo funciona ${titulo.slice(0,40)}?`);
    preguntas.push(`¿Cuál es la arquitectura de ${modulos.slice(0,2).join(" y ")}?`);
    preguntas.push("¿Qué capacidades tiene este módulo?");
  } else {
    preguntas.push(`¿Qué propone ${titulo.slice(0,40)}?`);
    preguntas.push("¿Cómo se relaciona con los módulos de SOFIAA?");
  }

  modulos.filter(m => m !== "SOFIAA").slice(0, 2).forEach(m => {
    preguntas.push(`¿Cómo se implementó ${m} en esta fase?`);
  });

  return preguntas.slice(0, 6);
}

/** Genera tags relevantes */
function makeTags(titulo, modulos, tipo, allText) {
  const tags = new Set();

  // From tipo
  tags.add(tipo.replace("_", "-"));

  // From modules (lowercase)
  modulos.forEach(m => tags.add(m.toLowerCase().replace("_", "-")));

  // From title keywords
  const titleWords = titulo.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 4 && !["sofiaa","sistema","modulo","reporte","sprint"].includes(w));
  titleWords.slice(0, 3).forEach(w => tags.add(w));

  // Tech keywords in text
  const techKw = ["typescript","firebase","groq","nextjs","firestore","react",
                  "dmaic","amef","spc","nexo","embedding","webhook","api","cron"];
  const lower = allText.toLowerCase();
  techKw.forEach(kw => { if (lower.includes(kw)) tags.add(kw); });

  return [...tags].slice(0, 8);
}

// ── Schema builder ────────────────────────────────────────────────────────────

function isAlejandriaReady(doc) {
  return doc && doc.id && doc.tipo && doc.titulo && doc.resumen &&
         doc.id.length > 5 && doc.titulo.length > 5;
}

function buildSchema(raw, filePath) {
  // Determine tipo from folder
  const parts  = filePath.split(path.sep);
  const folder = parts[parts.length - 2]; // sprints / decisiones / brainstorming / modulos
  const tipo   = TIPO_BY_FOLDER[folder] || "especificacion_modulo";
  const fase   = parts.includes("fase_2") ? "fase_2" : "fase_1";
  const fileName = path.basename(filePath);

  const allText  = extractAllText(raw);
  const titulo   = extractTitle(raw);
  const fecha    = extractDate(raw);
  const modulos  = detectModules(allText);
  const id       = makeId(tipo, titulo, fecha);
  const resumen  = makeResumen(raw, allText);
  const embedding = allText.replace(/\s+/g, " ").trim().slice(0, 6000); // max 6k chars
  const preguntas = makePreguntas(titulo, modulos, tipo);
  const tags     = makeTags(titulo, modulos, tipo, allText);

  // Try to detect sprint_referencia
  const sprintMatch = allText.match(/\b(Sprint\s+[A-Z0-9]+[-.]?[0-9]*|Sprint\s+[A-Z]-\d+)\b/i);
  const sprintRef   = sprintMatch ? sprintMatch[1] : null;

  return {
    id,
    tipo,
    fecha,
    fase_corpus: fase,
    titulo,
    resumen,
    modulos_afectados: modulos,
    sprint_referencia: sprintRef,
    version_sofiaa: null,
    decisiones: [],
    conceptos_clave: [],
    hitos: [],
    preguntas_que_responde: preguntas,
    tags,
    texto_embedding: embedding,
    documento_original: fileName,
    procesado_por: "extractor-deterministico",
    fecha_procesamiento: TODAY,
  };
}

// ── Scan all JSON files ───────────────────────────────────────────────────────

function getAllJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...getAllJsonFiles(full));
    else if (entry.name.endsWith(".json") && !entry.name.startsWith("_")) results.push(full);
  }
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(CORPUS)) {
    console.error("❌ No se encontró alejandria_corpus/");
    process.exit(1);
  }

  const files = getAllJsonFiles(CORPUS);
  console.log(`\n📂 ${files.length} archivos JSON encontrados\n`);

  const stats = { converted: 0, skipped: 0, failed: 0 };
  const index = [];

  for (const filePath of files) {
    const rel = path.relative(CORPUS, filePath);

    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch (e) {
      console.log(`  ✗ JSON inválido: ${rel}`);
      stats.failed++;
      continue;
    }

    if (isAlejandriaReady(raw)) {
      console.log(`  ⏭  Ya listo: ${raw.id?.slice(0, 55)}`);
      stats.skipped++;
      index.push({
        id: raw.id, archivo: rel, tipo: raw.tipo,
        titulo: raw.titulo, fecha: raw.fecha,
        fase_corpus: raw.fase_corpus,
        modulos_afectados: raw.modulos_afectados,
        sprint_referencia: raw.sprint_referencia,
        tags: raw.tags,
      });
      continue;
    }

    try {
      const schema = buildSchema(raw, filePath);
      fs.writeFileSync(filePath, JSON.stringify(schema, null, 2), "utf-8");
      console.log(`  ✓  ${schema.id.slice(0, 60)}`);
      stats.converted++;
      index.push({
        id: schema.id, archivo: rel, tipo: schema.tipo,
        titulo: schema.titulo, fecha: schema.fecha,
        fase_corpus: schema.fase_corpus,
        modulos_afectados: schema.modulos_afectados,
        sprint_referencia: schema.sprint_referencia,
        tags: schema.tags,
      });
    } catch (e) {
      console.log(`  ✗  Error: ${rel} → ${e.message}`);
      stats.failed++;
    }
  }

  // Write master index
  const indexData = {
    generado: new Date().toISOString(),
    total: index.length,
    documentos: index.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")),
  };
  fs.writeFileSync(path.join(CORPUS, "_indice.json"), JSON.stringify(indexData, null, 2));

  console.log("\n" + "═".repeat(55));
  console.log(`✅ Convertidos:  ${stats.converted}`);
  console.log(`⏭  Ya listos:   ${stats.skipped}`);
  console.log(`❌ Fallidos:     ${stats.failed}`);
  console.log(`📋 Índice:       alejandria_corpus/_indice.json (${index.length} docs)`);
  console.log("═".repeat(55));
  console.log("\n✓ Corpus listo para ingestión a Firestore.");
}

main();
