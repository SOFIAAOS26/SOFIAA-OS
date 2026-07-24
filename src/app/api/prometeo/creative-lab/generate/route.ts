/**
 * POST /api/prometeo/creative-lab/generate
 *
 * Genera N variantes creativas usando Groq.
 * Usa patrones de la Creative Memory del workspace para calcular scores predictivos.
 *
 * Body: { workspaceId, objetivo, canal, industria, presupuestoMXN, clienteId?, goalId? }
 * Auth: Firebase ID token en Authorization header.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth }        from "firebase-admin/auth";
import { getAdminApp, getAdminDb } from "@/lib/firebase-admin";
import { callGroq }       from "@/lib/groq";
import type { CreativeVariant, HookType, TipoObjetivo, CanalMarketing, CreativeMemory } from "@/extensions/prometeo/schema";

// ── Hook types disponibles ────────────────────────────────────────────────────

const HOOK_TYPES: HookType[] = [
  "PREGUNTA_PROVOCADORA", "CIFRA_IMPACTANTE", "HISTORIA_CLIENTE",
  "PROBLEMA_SOLUCION", "ANTES_DESPUES", "TESTIMONIO",
  "SECRETO_REVELADO", "CONTRAINTUITIVO", "URGENCIA",
];

// ── Calcular score predictivo basado en Creative Memory ───────────────────────

function calcPredictiveScores(
  hookType: HookType,
  canal:    CanalMarketing,
  objetivo: TipoObjetivo,
  memories: CreativeMemory[],
): { roas: number; engagement: number } {
  // Filtrar memorias relevantes (mismo hookType o canal)
  const relevant = memories.filter(
    (m) => m.hookType === hookType || m.canal === canal
  );

  if (relevant.length === 0) {
    // Scores base por hookType
    const baseRoas: Partial<Record<HookType, number>> = {
      PROBLEMA_SOLUCION: 7, HISTORIA_CLIENTE: 6.5, ANTES_DESPUES: 7.5,
      CIFRA_IMPACTANTE: 6, TESTIMONIO: 6.5, PREGUNTA_PROVOCADORA: 6,
      URGENCIA: 7, SECRETO_REVELADO: 6.5, CONTRAINTUITIVO: 5.5,
    };
    const baseEngagement: Partial<Record<HookType, number>> = {
      PREGUNTA_PROVOCADORA: 8, HISTORIA_CLIENTE: 7.5, CONTRAINTUITIVO: 8,
      ANTES_DESPUES: 7, TESTIMONIO: 7.5, CIFRA_IMPACTANTE: 7,
      URGENCIA: 6.5, PROBLEMA_SOLUCION: 7, SECRETO_REVELADO: 7.5,
    };
    return {
      roas:       baseRoas[hookType] ?? 5,
      engagement: baseEngagement[hookType] ?? 5,
    };
  }

  const sameHook  = relevant.filter((m) => m.hookType === hookType);
  const sameCanal = relevant.filter((m) => m.canal === canal);

  const avgRoas = sameHook.length > 0
    ? sameHook.reduce((s, m) => s + m.roasLogrado, 0) / sameHook.length
    : (sameCanal.reduce((s, m) => s + m.roasLogrado, 0) / sameCanal.length);

  const avgCtr = sameHook.length > 0
    ? sameHook.reduce((s, m) => s + m.ctr, 0) / sameHook.length
    : (sameCanal.reduce((s, m) => s + m.ctr, 0) / sameCanal.length);

  // Normalizar: ROAS 0-10x → score 0-10, CTR 0-5% → score 0-10
  const roasScore       = Math.min(10, avgRoas);
  const engagementScore = Math.min(10, avgCtr * 2);

  return {
    roas:       Math.round(roasScore * 10) / 10,
    engagement: Math.round(engagementScore * 10) / 10,
  };
}

// ── Generador de variantes ────────────────────────────────────────────────────

async function generateVariants(
  objetivo:      TipoObjetivo,
  canal:         CanalMarketing,
  industria:     string,
  presupuesto:   number,
  memories:      CreativeMemory[],
  clienteNombre: string,
): Promise<CreativeVariant[]> {

  // Top hooks de la Creative Memory (para informar al LLM)
  const topHookPatterns = memories
    .filter((m) => m.usarDeNuevo && m.performanceScore >= 60)
    .slice(0, 3)
    .map((m) => `Hook "${m.hookType}": "${m.hookTexto.slice(0, 60)}" — ROAS ${m.roasLogrado}x`)
    .join("\n");

  const prompt = `Eres un experto en publicidad digital especializado en ${industria}.
Cliente: ${clienteNombre || "una empresa de " + industria}
Objetivo: ${objetivo} | Canal: ${canal} | Presupuesto: $${presupuesto.toLocaleString()} MXN

${topHookPatterns ? `PATRONES GANADORES del historial de este cliente:\n${topHookPatterns}\n` : ""}

Genera exactamente 6 variantes creativas únicas y poderosas para este objetivo.
Cada variante debe tener un hook diferente de esta lista: ${HOOK_TYPES.join(", ")}

Responde SOLO con JSON válido, sin texto extra:
{
  "variantes": [
    {
      "hookType": "TIPO_DE_HOOK",
      "hookTexto": "texto del hook (máx 80 chars, en español, directo y poderoso)",
      "ctaTexto": "texto del CTA (máx 25 chars, acción clara)",
      "oferta": "descripción de la oferta o propuesta de valor (máx 60 chars)"
    }
  ]
}`;

  const raw = await callGroq(prompt, {
    maxTokens:   900,
    temperature: 0.8,
    json:        true,
  });

  if (!raw) return generateFallbackVariants(objetivo, canal, industria);

  try {
    const parsed = JSON.parse(raw) as {
      variantes: { hookType: string; hookTexto: string; ctaTexto: string; oferta: string }[];
    };

    return parsed.variantes.map((v, i) => {
      const hookType = (HOOK_TYPES.includes(v.hookType as HookType)
        ? v.hookType
        : HOOK_TYPES[i % HOOK_TYPES.length]) as HookType;

      const scores = calcPredictiveScores(hookType, canal, objetivo, memories);

      return {
        id:                        `var_${Date.now()}_${i}`,
        hookType,
        hookTexto:                 v.hookTexto ?? "",
        ctaTexto:                  v.ctaTexto ?? "Contáctanos",
        oferta:                    v.oferta ?? "",
        scorePredictivoRoas:       scores.roas,
        scorePredictivoEngagement: scores.engagement,
        selected:                  false,
      } satisfies CreativeVariant;
    });
  } catch {
    return generateFallbackVariants(objetivo, canal, industria);
  }
}

// ── Fallback si Groq falla ────────────────────────────────────────────────────

function generateFallbackVariants(
  objetivo:  TipoObjetivo,
  canal:     CanalMarketing,
  industria: string,
): CreativeVariant[] {
  const templates: { hookType: HookType; hookTexto: string; ctaTexto: string; oferta: string }[] = [
    { hookType: "PREGUNTA_PROVOCADORA", hookTexto: `¿Cuánto dinero estás perdiendo por no optimizar tu ${industria}?`, ctaTexto: "Descúbrelo gratis", oferta: "Diagnóstico gratuito" },
    { hookType: "CIFRA_IMPACTANTE",     hookTexto: `El 87% de empresas de ${industria} cometen este error fatal`, ctaTexto: "Ver el error", oferta: "Guía práctica" },
    { hookType: "ANTES_DESPUES",        hookTexto: `De 2 clientes a 20 en 30 días — esto es lo que cambió`, ctaTexto: "Quiero lo mismo", oferta: "Método probado" },
    { hookType: "PROBLEMA_SOLUCION",    hookTexto: `¿Sin resultados en ${canal}? Este es el problema real`, ctaTexto: "Solucionarlo ya", oferta: "Consulta sin costo" },
    { hookType: "TESTIMONIO",           hookTexto: `"Recuperé mi inversión en la primera semana" — cliente real`, ctaTexto: "Ver caso completo", oferta: "Estrategia garantizada" },
    { hookType: "URGENCIA",             hookTexto: `Solo quedan 3 espacios para nuevos clientes este mes`, ctaTexto: "Reservar mi lugar", oferta: "Cupo limitado" },
  ];

  return templates.map((t, i) => ({
    ...t,
    id:                        `var_fallback_${i}`,
    scorePredictivoRoas:       5 + (i % 3),
    scorePredictivoEngagement: 5 + ((i + 1) % 3),
    selected:                  false,
  }));
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    getAdminApp();

    // Auth
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "No auth token" }, { status: 401 });

    try {
      await getAuth(getAdminApp()).verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    // Body
    const { workspaceId, objetivo, canal, industria, presupuestoMXN, clienteId, goalId } =
      await req.json() as {
        workspaceId:    string;
        objetivo:       TipoObjetivo;
        canal:          CanalMarketing;
        industria:      string;
        presupuestoMXN: number;
        clienteId?:     string;
        goalId?:        string;
      };

    if (!workspaceId || !objetivo || !canal || !industria) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    // Leer Creative Memory del workspace para scoring contextual
    const db = getAdminDb();
    const memSnap = await db
      .collection(`smm_workspaces/${workspaceId}/prometeo_creative_memory`)
      .orderBy("performanceScore", "desc")
      .limit(20)
      .get();

    const memories = memSnap.docs.map((d) => ({ id: d.id, ...d.data() } as CreativeMemory));

    // Leer nombre del cliente si se proveyó clienteId
    let clienteNombre = "";
    if (clienteId) {
      const clienteSnap = await db
        .collection(`smm_workspaces/${workspaceId}/clientes`)
        .doc(clienteId)
        .get();
      clienteNombre = (clienteSnap.data()?.nombre as string | undefined) ?? "";
    }

    // Generar variantes
    const variantes = await generateVariants(
      objetivo, canal, industria, presupuestoMXN ?? 0, memories, clienteNombre,
    );

    // Ordenar por score predictivo ROAS desc
    variantes.sort((a, b) => b.scorePredictivoRoas - a.scorePredictivoRoas);

    return NextResponse.json({
      ok:        true,
      variantes,
      generadas: variantes.length,
      basadasEn: memories.length,   // cuántas memorias se usaron para scoring
    });

  } catch (err) {
    console.error("[PROMETEO][CREATIVE-LAB][generate]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
