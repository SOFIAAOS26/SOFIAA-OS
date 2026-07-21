/**
 * PROMETEO — Brand DNA Publisher (Sprint P-1)
 * Growth Intelligence Engine v2.0
 *
 * Publica el Brand DNA de un cliente al Experience Graph de N.E.X.O.
 * Convierte los campos del BrandDNA en NexoNodes semánticos:
 *   • Arquetipo + Personalidad → node "brand:arquetipo:{clienteId}"
 *   • Valores + Cultura → node "brand:valores:{clienteId}"
 *   • Tono + Lenguaje → node "brand:tono:{clienteId}"
 *   • Tabús → node "brand:tabus:{clienteId}"
 *   • Promesas → node "brand:promesas:{clienteId}"
 *   • Voz (ejemplos) → node "brand:voz:{clienteId}"
 *
 * Patrón idéntico a TEC Bii cognitive-publisher.ts.
 * Solo corre en contexto servidor (usa firebase-admin).
 */

import { generateEmbedding } from "@/lib/nexo/embeddings";
import { upsertNexoNode }    from "@/lib/nexo/firestore";
import { callGroq }          from "@/lib/groq";
import type { NexoNode }     from "@/types/nexo";
import { NEXO_INITIAL_WEIGHT, NEXO_DECAY_RATE } from "@/types/nexo";
import type { BrandDNA }     from "@/extensions/prometeo/schema";

// ── Tipos de nodos de Brand DNA ───────────────────────────────────────────────

type BrandDNANodeType =
  | "arquetipo"
  | "valores"
  | "tono"
  | "tabus"
  | "promesas"
  | "voz";

// ── Generación de resumen ─────────────────────────────────────────────────────

async function generateBrandSummary(
  nodeType: BrandDNANodeType,
  dna:      BrandDNA,
): Promise<string> {
  const prompt = buildPrompt(nodeType, dna);
  const result = await callGroq(prompt, { maxTokens: 150, temperature: 0.25 });
  return result?.trim() ?? buildFallback(nodeType, dna);
}

function buildPrompt(nodeType: BrandDNANodeType, dna: BrandDNA): string {
  const base = `Genera un resumen conciso (máximo 80 palabras, en español) del perfil de marca de "${dna.clienteNombre}" para que una IA de marketing pueda razonar sobre la identidad de esta marca al crear contenido.\n\n`;

  switch (nodeType) {
    case "arquetipo":
      return base +
        `ARQUETIPO: ${dna.arquetipo}\n` +
        `PERSONALIDAD: ${dna.personalidad.join(", ") || "—"}\n` +
        `CULTURA: ${dna.cultura || "—"}`;
    case "valores":
      return base +
        `VALORES: ${dna.valores.join(", ") || "—"}\n` +
        `PROMESAS: ${dna.promesas.join(", ") || "—"}\n` +
        `CULTURA: ${dna.cultura || "—"}`;
    case "tono":
      return base +
        `TONO: ${dna.tono || "—"}\n` +
        `LENGUAJE: ${dna.lenguaje || "—"}\n` +
        `NIVEL TÉCNICO: ${dna.nivelTecnico}/5`;
    case "tabus":
      return base +
        `TABÚS (palabras/temas prohibidos): ${dna.tabus.join(", ") || "—"}\n` +
        `MARCAS A NO COPIAR: ${dna.marcasNoCopiar.join(", ") || "—"}`;
    case "promesas":
      return base +
        `PROMESAS DE MARCA: ${dna.promesas.join(", ") || "—"}\n` +
        `MARCAS INSPIRADORAS: ${dna.marcasInspiradoras.join(", ") || "—"}`;
    case "voz":
      return base +
        `EJEMPLO APROBADO: "${dna.ejemploMensajeOK || "—"}"\n` +
        `EJEMPLO RECHAZADO: "${dna.ejemploMensajeMAL || "—"}"`;
  }
}

function buildFallback(nodeType: BrandDNANodeType, dna: BrandDNA): string {
  const map: Record<BrandDNANodeType, string> = {
    arquetipo: `${dna.clienteNombre} — Arquetipo ${dna.arquetipo}. Personalidad: ${dna.personalidad.join(", ")}.`,
    valores:   `${dna.clienteNombre} — Valores: ${dna.valores.join(", ")}. Promesas: ${dna.promesas.join(", ")}.`,
    tono:      `${dna.clienteNombre} — Tono ${dna.tono}. Lenguaje: ${dna.lenguaje}. Nivel técnico: ${dna.nivelTecnico}/5.`,
    tabus:     `${dna.clienteNombre} — Tabús: ${dna.tabus.join(", ")}. No copiar: ${dna.marcasNoCopiar.join(", ")}.`,
    promesas:  `${dna.clienteNombre} — Promesas: ${dna.promesas.join(", ")}. Inspiración: ${dna.marcasInspiradoras.join(", ")}.`,
    voz:       `${dna.clienteNombre} — Voz aprobada: "${dna.ejemploMensajeOK}".`,
  };
  return map[nodeType];
}

// ── Construir NexoNode ────────────────────────────────────────────────────────

async function buildBrandNode(
  uid:      string,
  nodeType: BrandDNANodeType,
  dna:      BrandDNA,
): Promise<NexoNode> {
  const slug    = `${dna.clienteId.slice(0, 12)}`;
  const nodeId  = `nexo:brand_${nodeType}:${slug}`;
  const summary = await generateBrandSummary(nodeType, dna);
  const embedding = await generateEmbedding(summary).catch(() => undefined);

  const titles: Record<BrandDNANodeType, string> = {
    arquetipo: `${dna.clienteNombre} — Arquetipo & Personalidad`,
    valores:   `${dna.clienteNombre} — Valores & Cultura`,
    tono:      `${dna.clienteNombre} — Tono & Lenguaje`,
    tabus:     `${dna.clienteNombre} — Tabús & Restricciones`,
    promesas:  `${dna.clienteNombre} — Promesas & Referentes`,
    voz:       `${dna.clienteNombre} — Voz de Marca (ejemplos)`,
  };

  return {
    id:      nodeId,
    type:    "insight",
    category: "brand_identity" as NexoNode["category"],
    title:   titles[nodeType],
    summary,
    entities: {
      product:  dna.clienteNombre,
      brand:    dna.clienteNombre,
    },
    url:            null,
    imageUrl:       null,
    source:         "prometeo" as NexoNode["source"],
    weight:         NEXO_INITIAL_WEIGHT,
    importanceScore: 0.85,
    decayRate:      NEXO_DECAY_RATE,
    capturedAt:     Date.now(),
    createdAt:      Date.now(),
    lastReinforced: Date.now(),
    reinforceCount: 0,
    ...(embedding ? { embedding } : {}),
  };
}

// ── Entry point ───────────────────────────────────────────────────────────────

/**
 * Publica todos los nodos del Brand DNA de un cliente a N.E.X.O.
 * Llama a upsertNexoNode 6 veces (una por dimensión del DNA).
 */
export async function publishBrandDNA(
  uid: string,
  dna: BrandDNA,
): Promise<{ published: number; nodes: string[] }> {
  const nodeTypes: BrandDNANodeType[] = [
    "arquetipo", "valores", "tono", "tabus", "promesas", "voz",
  ];

  const results: string[] = [];

  await Promise.allSettled(
    nodeTypes.map(async (nt) => {
      try {
        const node = await buildBrandNode(uid, nt, dna);
        await upsertNexoNode(uid, node);
        results.push(node.id);
      } catch (err) {
        console.error(`[PROMETEO][BRAND-DNA-PUBLISHER] error en ${nt}:`, err);
      }
    }),
  );

  console.log(`[PROMETEO][BRAND-DNA-PUBLISHER] publicados ${results.length}/6 nodos para ${dna.clienteNombre}`);
  return { published: results.length, nodes: results };
}
