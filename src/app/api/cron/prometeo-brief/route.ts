/**
 * GET /api/cron/prometeo-brief
 *
 * CRON diario a las 08:00 UTC — genera DirectorBrief automáticamente
 * para todos los workspaces activos de PROMETEO.
 *
 * Mismo patrón que /api/tec-bii/refine.
 * Autenticado con CRON_SECRET en header Authorization.
 *
 * Vercel cron: "0 8 * * *"
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb }                from "@/lib/firebase-admin";
import { callGroq }                  from "@/lib/groq";
import { FieldValue }                from "firebase-admin/firestore";
import { enqueueBriefActions }       from "@/lib/hermes/prometeo-bridge";
import type { BrandGoal, CreativeMemory, DirectorBrief } from "@/extensions/prometeo/schema";

// ── Auth CRON ─────────────────────────────────────────────────────────────────

function authOk(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev: sin secret → libre
  const auth = req.headers.get("Authorization");
  return auth === `Bearer ${secret}`;
}

// ── detectarFatiga ────────────────────────────────────────────────────────────

function detectarFatiga(goals: BrandGoal[]): BrandGoal[] {
  const now = Date.now();
  return goals.filter((g) => {
    if (g.estado !== "activo") return false;
    const pct      = g.valorObjetivo > 0 ? g.valorActual / g.valorObjetivo : 0;
    const diasLeft = g.fechaLimite
      ? (g.fechaLimite - now) / 86_400_000
      : Infinity;
    return pct < 0.5 && diasLeft < 7;
  });
}

// ── Tipos de respuesta Groq ───────────────────────────────────────────────────

interface GroqBriefResponse {
  recomendaciones?: Array<{
    urgencia:        "ALTA" | "MEDIA" | "BAJA";
    clienteId?:      string;
    clienteNombre?:  string;
    tipo?:           "FATIGA" | "ESCALAR" | "PAUSAR" | "NUEVO_CREATIVO" | "CAMBIAR_CANAL";
    descripcion:     string;
    accionSugerida?: string;
  }>;
  oportunidades?: Array<{
    clienteId?:       string;
    descripcion:      string;
    potencialEstimado?: string;
    potencial?:       string;
  }>;
}

// ── Generar brief para un workspace ──────────────────────────────────────────

async function generateBriefForWorkspace(workspaceId: string): Promise<boolean> {
  const db = getAdminDb();

  // Leer goals activos
  const goalsSnap = await db
    .collection(`smm_workspaces/${workspaceId}/prometeo_goals`)
    .where("estado", "==", "activo")
    .get();
  const goals = goalsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as BrandGoal));

  // Leer top 10 creative memories
  const memSnap = await db
    .collection(`smm_workspaces/${workspaceId}/prometeo_creative_memory`)
    .orderBy("performanceScore", "desc")
    .limit(10)
    .get();
  const memories = memSnap.docs.map((d) => ({ id: d.id, ...d.data() } as CreativeMemory));

  const goalsConFatiga = detectarFatiga(goals);
  const roasPromedio   = memories.length > 0
    ? parseFloat((memories.reduce((s, m) => s + (m.roasLogrado ?? 0), 0) / memories.length).toFixed(2))
    : 0;

  const topHooks = memories.slice(0, 3).map((m) =>
    `${m.hookType} en ${m.canal} — ROAS ${m.roasLogrado}x, score ${m.performanceScore}`
  );

  const prompt =
    `Eres el Director Autónomo de PROMETEO, el CMO Cognitivo de SOFIAA OS. ` +
    `Genera un brief de acción diario en JSON estricto.\n\n` +
    `WORKSPACE: ${workspaceId}\n` +
    `OBJETIVOS ACTIVOS: ${goals.length} (${goalsConFatiga.length} con FATIGA detectada)\n` +
    `ROAS PROMEDIO: ${roasPromedio}x\n` +
    `TOP HOOKS: ${topHooks.join(" | ") || "Sin datos aún"}\n` +
    `OBJETIVOS EN FATIGA: ${goalsConFatiga.map((g) => `${g.tipo} — ${Math.round((g.valorActual / g.valorObjetivo) * 100)}% avance`).join(", ") || "Ninguno"}\n\n` +
    `Devuelve SOLO JSON con esta estructura:\n` +
    `{\n` +
    `  "recomendaciones": [\n` +
    `    { "urgencia": "ALTA"|"MEDIA"|"BAJA", "clienteId": "...", "clienteNombre": "...", "tipo": "FATIGA"|"ESCALAR"|"PAUSAR"|"NUEVO_CREATIVO"|"CAMBIAR_CANAL", "descripcion": "..." }\n` +
    `  ],\n` +
    `  "oportunidades": [\n` +
    `    { "clienteId": "...", "descripcion": "...", "potencial": "..." }\n` +
    `  ]\n` +
    `}`;

  const raw = await callGroq(prompt, { maxTokens: 800, temperature: 0.4, json: true });
  if (!raw) return false;

  let parsed: GroqBriefResponse;
  try { parsed = JSON.parse(raw); } catch { return false; }

  const brief: Omit<DirectorBrief, "id"> = {
    workspaceId,
    fecha:             new Date().toISOString().slice(0, 10),
    totalClientes:     goals.length,
    clientesConFatiga: goalsConFatiga.length,
    clientesSinMeta:   goals.filter((g) => g.valorObjetivo === 0).length,
    inversionSemana:   goals.reduce((s, g) => s + (g.presupuestoMXN ?? 0), 0),
    roasPromedio,
    alertasCriticas:   [],
    recomendaciones:   (parsed.recomendaciones ?? []).map((r) => ({
      clienteId:    r.clienteId    ?? "",
      clienteNombre: r.clienteNombre ?? "",
      tipo:         r.tipo         ?? "ESCALAR",
      descripcion:  r.descripcion,
      urgencia:     r.urgencia,
      accionada:    false,
    })),
    oportunidades: (parsed.oportunidades ?? []).map((o) => ({
      clienteId:   o.clienteId   ?? "",
      descripcion: o.descripcion,
      potencial:   o.potencial ?? o.potencialEstimado ?? "",
    })),
    generadoAt:    Date.now(),
  };

  const ref = await db
    .collection(`smm_workspaces/${workspaceId}/prometeo_director_briefs`)
    .add({ ...brief, serverTimestamp: FieldValue.serverTimestamp() });

  // Encolar acciones en HERMES
  await enqueueBriefActions(workspaceId, { id: ref.id, ...brief })
    .catch((err) => console.error("[CRON][bridge] HERMES enqueue error:", err));

  return true;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();

  const wsSnap = await db.collection("smm_workspaces").get();
  const results: { workspaceId: string; ok: boolean }[] = [];

  await Promise.allSettled(
    wsSnap.docs.map(async (doc) => {
      const ok = await generateBriefForWorkspace(doc.id);
      results.push({ workspaceId: doc.id, ok });
    })
  );

  const success = results.filter((r) => r.ok).length;
  console.log(`[CRON][prometeo-brief] ${success}/${results.length} workspaces procesados`);

  return NextResponse.json({
    ok:        true,
    processed: results.length,
    success,
    ts:        new Date().toISOString(),
  });
}
