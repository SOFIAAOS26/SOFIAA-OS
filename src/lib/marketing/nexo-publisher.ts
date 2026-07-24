/**
 * Marketing Sofia — N.E.X.O. Publisher (Sprint P-8)
 *
 * Publica clientes y métricas de Marketing Sofia al grafo N.E.X.O.
 * Mismo patrón que src/lib/tec-bii/cognitive-publisher.ts.
 *
 * Por cada cliente o métrica:
 *   1. Genera resumen en lenguaje natural con Groq
 *   2. Construye NexoNode con source "marketing_sofia"
 *   3. Upserta en users/{uid}/nexo_nodes
 *
 * Solo corre en servidor (usa firebase-admin).
 */

import { upsertNexoNode }    from "@/lib/nexo/firestore";
import { generateEmbedding } from "@/lib/nexo/embeddings";
import { callGroq }          from "@/lib/groq";
import type { NexoNode }     from "@/types/nexo";
import { NEXO_INITIAL_WEIGHT, NEXO_DECAY_RATE } from "@/types/nexo";
import type { SmmCliente, SmmMetrica }           from "@/lib/marketing/types";

// ── Slugify ───────────────────────────────────────────────────────────────────

function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

// ── Resumen de cliente ────────────────────────────────────────────────────────

async function summarizeCliente(c: SmmCliente): Promise<string> {
  const prompt =
    `Genera un resumen conciso (máximo 80 palabras, en español) de este cliente de marketing digital. ` +
    `El resumen debe capturar el contexto clave para que una IA pueda razonar sobre este cliente al responder preguntas sobre campañas y estrategia.\n\n` +
    `CLIENTE: "${c.nombre}"\n` +
    `Industria: ${c.industria} | Estado: ${c.estado}\n` +
    `Plataformas: ${c.plataformas.join(", ")}\n` +
    `Paquete mensual: $${c.paqueteMXN.toLocaleString("es-MX")} MXN\n` +
    `Score estimado: ${c.scoreEst}/5\n` +
    `Notas: ${c.notas || "—"}`;

  const result = await callGroq(prompt, { maxTokens: 120, temperature: 0.3 });
  return (
    result?.trim() ??
    `Cliente ${c.nombre} (${c.industria}) — ${c.estado} — ` +
    `plataformas: ${c.plataformas.join(", ")} — paquete $${c.paqueteMXN.toLocaleString("es-MX")} MXN/mes.`
  );
}

// ── Resumen de métrica ────────────────────────────────────────────────────────

async function summarizeMetrica(m: SmmMetrica): Promise<string> {
  const roas = m.invPubli > 0 ? (m.retorno / m.invPubli).toFixed(2) : "N/A";
  const prompt =
    `Genera un resumen conciso (máximo 80 palabras, en español) de estas métricas de campaña de marketing. ` +
    `Incluye el performance más relevante para análisis estratégico futuro.\n\n` +
    `CLIENTE: "${m.clienteNombre}" | MES: ${m.mes} | PLATAFORMA: ${m.plataforma}\n` +
    `Seguidores: ${m.seguidores.toLocaleString()} (+${m.nuevosSeguidores})\n` +
    `Alcance: ${m.alcance.toLocaleString()} | Engagement: ${(m.engagementPct * 100).toFixed(1)}%\n` +
    `Inversión publicitaria: $${m.invPubli.toLocaleString("es-MX")} MXN | Retorno: $${m.retorno.toLocaleString("es-MX")} MXN\n` +
    `ROAS: ${roas}x | Leads: ${m.leads} | Publicaciones: ${m.publicaciones}`;

  const result = await callGroq(prompt, { maxTokens: 120, temperature: 0.3 });
  return (
    result?.trim() ??
    `Métricas ${m.clienteNombre} — ${m.plataforma} — ${m.mes}: ` +
    `alcance ${m.alcance.toLocaleString()}, engagement ${(m.engagementPct * 100).toFixed(1)}%, ROAS ${roas}x.`
  );
}

// ── Publicar cliente ──────────────────────────────────────────────────────────

export async function publishClienteToNexo(
  uid:         string,
  workspaceId: string,
  cliente:     SmmCliente,
): Promise<string> {
  const clienteId = cliente.id ?? slug(cliente.nombre);
  const nodeId    = `nexo:work:smm-cliente-${slug(workspaceId)}-${slug(clienteId)}`;
  const summary   = await summarizeCliente(cliente);
  const embedding = await generateEmbedding(summary);

  const node: NexoNode = {
    id:             nodeId,
    type:           "captured",
    source:         "marketing_sofia",
    category:       "work",
    title:          `Cliente SMM: ${cliente.nombre}`,
    summary,
    entities:       { brand: cliente.nombre, extra: { workspaceId, clienteId, industria: cliente.industria, estado: cliente.estado } },
    url:            null,
    imageUrl:       null,
    weight:         NEXO_INITIAL_WEIGHT,
    importanceScore: 0.7,
    decayRate:      NEXO_DECAY_RATE,
    capturedAt:     Date.now(),
    lastReinforced: Date.now(),
    createdAt:      Date.now(),
    ...(embedding ? { embedding } : {}),
  };

  await upsertNexoNode(uid, node);
  return nodeId;
}

// ── Publicar métrica ──────────────────────────────────────────────────────────

export async function publishMetricaToNexo(
  uid:         string,
  workspaceId: string,
  metrica:     SmmMetrica,
): Promise<string> {
  const metricaId = metrica.id ?? `${slug(metrica.clienteId)}-${metrica.mes}-${slug(metrica.plataforma)}`;
  const nodeId    = `nexo:work:smm-metrica-${slug(workspaceId)}-${metricaId}`;
  const summary   = await summarizeMetrica(metrica);
  const embedding = await generateEmbedding(summary);
  const roas      = metrica.invPubli > 0 ? metrica.retorno / metrica.invPubli : 0;

  const node: NexoNode = {
    id:             nodeId,
    type:           "captured",
    source:         "marketing_sofia",
    category:       "work",
    title:          `Métricas ${metrica.clienteNombre} — ${metrica.plataforma} ${metrica.mes}`,
    summary,
    entities:       {
      brand:  metrica.clienteNombre,
      extra:  {
        workspaceId,
        clienteId:     metrica.clienteId,
        plataforma:    metrica.plataforma,
        mes:           metrica.mes,
        roas:          roas.toFixed(2),
        engagementPct: String(metrica.engagementPct),
        leads:         String(metrica.leads),
      },
    },
    url:            null,
    imageUrl:       null,
    weight:         NEXO_INITIAL_WEIGHT,
    importanceScore: 0.75,
    decayRate:      NEXO_DECAY_RATE,
    capturedAt:     Date.now(),
    lastReinforced: Date.now(),
    createdAt:      Date.now(),
    ...(embedding ? { embedding } : {}),
  };

  await upsertNexoNode(uid, node);
  return nodeId;
}
