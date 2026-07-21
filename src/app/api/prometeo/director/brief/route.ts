/**
 * POST /api/prometeo/director/brief
 *
 * Genera el brief diario del Director Autónomo de PROMETEO.
 * Lee el estado del workspace (goals, creative memory, fatigue) y
 * usa Groq para producir recomendaciones y oportunidades priorizadas.
 *
 * Body: { workspaceId }
 * Auth: Firebase ID token en Authorization header.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth }                   from "firebase-admin/auth";
import { getAdminApp, getAdminDb }   from "@/lib/firebase-admin";
import { callGroq }                  from "@/lib/groq";
import type {
  BrandGoal,
  CreativeMemory,
  DirectorBrief,
} from "@/extensions/prometeo/schema";

// ── Fecha de hoy ──────────────────────────────────────────────────────────────

function hoy(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Análisis de fatiga simple ─────────────────────────────────────────────────

function detectarFatiga(goals: BrandGoal[], memories: CreativeMemory[]) {
  // Heurística: si el ROAS promedio de creativos del canal está cayendo
  // y el objetivo está activo pero avanzando lento → fatiga posible
  return goals
    .filter((g) => g.estado === "activo")
    .filter((g) => {
      const pct = g.valorObjetivo > 0
        ? (g.valorActual / g.valorObjetivo) * 100
        : 0;
      return pct < 50 && (g.fechaLimite - Date.now()) < 7 * 86_400_000;
    })
    .map((g) => g.clienteId);
}

// ── Builder del prompt para Groq ──────────────────────────────────────────────

function buildPrompt(
  goals:    BrandGoal[],
  memories: CreativeMemory[],
): string {
  const goalsActivos = goals.filter((g) => g.estado === "activo");

  const resumenGoals = goalsActivos
    .slice(0, 8)
    .map((g) => {
      const pct = g.valorObjetivo > 0
        ? Math.round((g.valorActual / g.valorObjetivo) * 100)
        : 0;
      const dias = Math.ceil((g.fechaLimite - Date.now()) / 86_400_000);
      return `• ${g.clienteNombre} | ${g.tipo} en ${g.canal} | Meta: ${g.valorObjetivo} ${g.unidad} | Actual: ${g.valorActual} (${pct}%) | ${dias}d restantes | $${g.presupuestoMXN.toLocaleString()} MXN`;
    })
    .join("\n");

  const topMemories = memories
    .filter((m) => m.usarDeNuevo && m.performanceScore >= 70)
    .slice(0, 4)
    .map((m) => `• ${m.canal} | ${m.hookType} | ROAS ${m.roasLogrado}x | CTR ${m.ctr}%`)
    .join("\n");

  const clientesUnicos = [...new Set(goalsActivos.map((g) => g.clienteNombre))];

  return `Eres el Director Autónomo de PROMETEO, un CMO cognitivo.
Hoy es ${hoy()}. Analiza el estado del workspace y genera el brief ejecutivo del día.

CLIENTES ACTIVOS: ${clientesUnicos.join(", ") || "ninguno"}

OBJETIVOS ACTIVOS (${goalsActivos.length}):
${resumenGoals || "Sin objetivos activos."}

CREATIVOS GANADORES EN MEMORIA:
${topMemories || "Sin data de performance disponible."}

Genera un brief de director en JSON con este formato exacto:
{
  "recomendaciones": [
    {
      "clienteId": "id-o-nombre",
      "clienteNombre": "nombre del cliente",
      "tipo": "FATIGA|ESCALAR|PAUSAR|NUEVO_CREATIVO|CAMBIAR_CANAL",
      "descripcion": "acción concreta en máx 80 palabras",
      "urgencia": "ALTA|MEDIA|BAJA"
    }
  ],
  "oportunidades": [
    {
      "clienteId": "id-o-nombre",
      "descripcion": "oportunidad concreta en máx 60 palabras",
      "potencial": "estimado de impacto (ej: ROAS estimado 4.2x)"
    }
  ]
}

Genera máx 5 recomendaciones y 3 oportunidades. Sé directo y accionable.`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    getAdminApp();

    // Auth
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "No auth token" }, { status: 401 });

    try {
      await getAuth().verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    // Body
    const { workspaceId } = await req.json() as { workspaceId: string };
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId requerido" }, { status: 400 });
    }

    const db = getAdminDb();

    // Leer goals activos
    const goalsSnap = await db
      .collection(`smm_workspaces/${workspaceId}/prometeo_goals`)
      .where("estado", "==", "activo")
      .limit(20)
      .get();
    const goals = goalsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as BrandGoal));

    // Leer Creative Memory
    const memSnap = await db
      .collection(`smm_workspaces/${workspaceId}/prometeo_creative_memory`)
      .orderBy("performanceScore", "desc")
      .limit(20)
      .get();
    const memories = memSnap.docs.map((d) => ({ id: d.id, ...d.data() } as CreativeMemory));

    // Métricas ejecutivas
    const clientesUnicos   = [...new Set(goals.map((g) => g.clienteNombre))];
    const clientesConFatiga = detectarFatiga(goals, memories).length;
    const clientesSinMeta  = goals.filter((g) => {
      const pct = g.valorObjetivo > 0 ? (g.valorActual / g.valorObjetivo) * 100 : 0;
      return pct < 30;
    }).length;
    const inversionSemana  = goals.reduce((s, g) => s + (g.presupuestoMXN || 0), 0);
    const roasPromedio     = memories.length
      ? memories.slice(0, 10).reduce((s, m) => s + m.roasLogrado, 0) /
        Math.min(10, memories.length)
      : 0;

    // Generar con Groq
    const raw = await callGroq(buildPrompt(goals, memories), {
      maxTokens:   1000,
      temperature: 0.4,
      json:        true,
    });

    let recomendaciones: DirectorBrief["recomendaciones"] = [];
    let oportunidades:   DirectorBrief["oportunidades"]   = [];

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as {
          recomendaciones?: DirectorBrief["recomendaciones"];
          oportunidades?:   DirectorBrief["oportunidades"];
        };
        recomendaciones = (parsed.recomendaciones ?? []).map((r) => ({
          ...r,
          accionada: false,
        }));
        oportunidades = parsed.oportunidades ?? [];
      } catch {
        console.error("[PROMETEO][DIRECTOR] Error parseando JSON de Groq");
      }
    }

    // Fallback si Groq no respondió
    if (recomendaciones.length === 0) {
      recomendaciones = goals.slice(0, 3).map((g) => {
        const pct = g.valorObjetivo > 0 ? (g.valorActual / g.valorObjetivo) * 100 : 0;
        return {
          clienteId:    g.clienteId,
          clienteNombre: g.clienteNombre,
          tipo:         pct < 30 ? "NUEVO_CREATIVO" : pct < 60 ? "ESCALAR" : "FATIGA",
          descripcion:  `${g.clienteNombre}: objetivo ${g.tipo} en ${g.canal} al ${Math.round(pct)}% — revisar creativos y ajustar presupuesto.`,
          urgencia:     pct < 30 ? "ALTA" : "MEDIA",
          accionada:    false,
        } as DirectorBrief["recomendaciones"][0];
      });
    }

    // Guardar brief en Firestore
    const brief: Omit<DirectorBrief, "id"> = {
      workspaceId,
      fecha:              hoy(),
      totalClientes:      clientesUnicos.length,
      clientesConFatiga,
      clientesSinMeta,
      inversionSemana,
      roasPromedio:       Math.round(roasPromedio * 10) / 10,
      alertasCriticas:    [],
      recomendaciones,
      oportunidades,
      generadoAt:         Date.now(),
    };

    const ref = await db
      .collection(`smm_workspaces/${workspaceId}/prometeo_director_briefs`)
      .add(brief);

    return NextResponse.json({ ok: true, briefId: ref.id, brief: { id: ref.id, ...brief } });

  } catch (err) {
    console.error("[PROMETEO][DIRECTOR][brief]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
