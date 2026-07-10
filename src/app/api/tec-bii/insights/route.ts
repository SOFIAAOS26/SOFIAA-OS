/**
 * TEC Bii — POST /api/tec-bii/insights
 * Sprint T2-2: Intelligence Dashboard
 *
 * Analiza el estado operacional actual del área con Gemini Flash.
 * Lee todos los proyectos activos del usuario y genera:
 * - Riesgos detectados (proyectos en riesgo crítico)
 * - Recomendaciones de acción inmediata
 * - Patrones detectados en la carga del equipo
 * - Oportunidades identificadas
 *
 * Body: vacío — usa el uid del token para leer Firestore
 */

import { NextRequest, NextResponse }   from "next/server";
import { getAuth }                      from "firebase-admin/auth";
import { getAdminDb }                   from "@/lib/firebase-admin";
import { getAdminApp }                  from "@/lib/firebase-admin";
import { tecBiiPath }                   from "@/lib/tec-bii/collections";
import type { ProyectoV2 }             from "@/extensions/tec-bii/schema";
import { callGroq }                    from "@/lib/groq";

// ── Tipos de respuesta ────────────────────────────────────────────────────────

export interface TecBiiInsight {
  id:        string;
  tipo:      "riesgo" | "oportunidad" | "alerta" | "patron" | "recomendacion";
  titulo:    string;
  cuerpo:    string;
  prioridad: "alta" | "media" | "baja";
  entityIds?: string[];   // IDs de entidades relacionadas
  generadoEn: number;
}

export interface InsightsResponse {
  success:     boolean;
  insights:    TecBiiInsight[];
  resumenIA:   string;
  generadoEn:  number;
  proyectos:   number;
  urgentes:    number;
  enGrafo:     number;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

async function getUid(req: NextRequest): Promise<string | null> {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

// ── Análisis Gemini ───────────────────────────────────────────────────────────

async function generateInsightsWithGemini(
  proyectos: ProyectoV2[]
): Promise<{ insights: TecBiiInsight[]; resumen: string }> {
  const activos   = proyectos.filter((p) => p.estado === "En producción");
  const revision  = proyectos.filter((p) => p.estado === "En revisión");
  const urgentes  = proyectos.filter((p) => (p.urgencyScore ?? 0) >= 0.7);
  const enGrafo   = proyectos.filter((p) => !!p.nexoNodeId);

  // Fallback sin datos
  if (proyectos.length === 0) {
    return buildFallbackInsights(proyectos);
  }

  const proyectosResumen = activos.slice(0, 8).map((p) =>
    `- "${p.titulo}" | Estado: ${p.estado} | Urgencia: ${Math.round((p.urgencyScore ?? 0) * 100)}% | Valor: $${(p.valorEstimado ?? 0).toLocaleString("es-MX")} MXN${p.notas ? ` | Notas: ${p.notas.slice(0, 80)}` : ""}`
  ).join("\n");

  const prompt = `Eres el motor de inteligencia operacional del Área de Producción Audiovisual del TEC de Monterrey.

Analiza el estado actual del área y genera insights accionables. Responde EXACTAMENTE en este formato JSON:

{
  "resumen": "párrafo de 2-3 oraciones describiendo el estado general del área",
  "insights": [
    {
      "tipo": "riesgo|oportunidad|alerta|patron|recomendacion",
      "titulo": "título corto (max 8 palabras)",
      "cuerpo": "explicación de 1-2 oraciones específica y accionable",
      "prioridad": "alta|media|baja"
    }
  ]
}

CONTEXTO ACTUAL:
- Total proyectos: ${proyectos.length}
- En producción: ${activos.length}
- En revisión: ${revision.length}
- Proyectos urgentes (urgencia ≥70%): ${urgentes.length}
- Conectados al grafo cognitivo (NEXO): ${enGrafo.length}

PROYECTOS EN PRODUCCIÓN:
${proyectosResumen || "Ninguno actualmente."}

PROYECTOS URGENTES:
${urgentes.map((p) => `- "${p.titulo}" urgencia ${Math.round((p.urgencyScore ?? 0) * 100)}%`).join("\n") || "Ninguno."}

Genera entre 3 y 6 insights relevantes. Sé específico, no genérico. Si hay proyectos urgentes, prioriza esas alertas.`;

  try {
    const raw = await callGroq(prompt, { maxTokens: 900, temperature: 0.4, json: true });
    if (!raw) return buildFallbackInsights(proyectos);

    const parsed = JSON.parse(raw) as {
      resumen: string;
      insights: Array<{
        tipo:      TecBiiInsight["tipo"];
        titulo:    string;
        cuerpo:    string;
        prioridad: TecBiiInsight["prioridad"];
      }>;
    };

    const now = Date.now();
    const insights: TecBiiInsight[] = parsed.insights.map((ins, i) => ({
      id:         `insight-${now}-${i}`,
      tipo:       ins.tipo,
      titulo:     ins.titulo,
      cuerpo:     ins.cuerpo,
      prioridad:  ins.prioridad,
      generadoEn: now,
    }));

    return { insights, resumen: parsed.resumen };
  } catch {
    return buildFallbackInsights(proyectos);
  }
}

function buildFallbackInsights(
  proyectos: ProyectoV2[]
): { insights: TecBiiInsight[]; resumen: string } {
  const now     = Date.now();
  const urgentes = proyectos.filter((p) => (p.urgencyScore ?? 0) >= 0.7);
  const insights: TecBiiInsight[] = [];

  if (proyectos.length === 0) {
    return {
      insights: [{
        id:         `insight-${now}-0`,
        tipo:       "recomendacion",
        titulo:     "Registra tu primer proyecto",
        cuerpo:     "Crea proyectos en TEC Bii para que SOFIAA pueda generar inteligencia operacional sobre el área.",
        prioridad:  "media",
        generadoEn: now,
      }],
      resumen: "No hay proyectos registrados aún. Comienza agregando proyectos para activar el motor de inteligencia.",
    };
  }

  if (urgentes.length > 0) {
    insights.push({
      id:         `insight-${now}-urg`,
      tipo:       "alerta",
      titulo:     `${urgentes.length} proyecto${urgentes.length > 1 ? "s" : ""} con urgencia crítica`,
      cuerpo:     `${urgentes.map((p) => `"${p.titulo}"`).join(", ")} requiere${urgentes.length > 1 ? "n" : ""} atención inmediata.`,
      prioridad:  "alta",
      entityIds:  urgentes.map((p) => p.id ?? "").filter(Boolean),
      generadoEn: now,
    });
  }

  const enGrafo = proyectos.filter((p) => !!p.nexoNodeId).length;
  if (enGrafo < proyectos.length) {
    insights.push({
      id:         `insight-${now}-grafo`,
      tipo:       "recomendacion",
      titulo:     "Sincronización cognitiva incompleta",
      cuerpo:     `${proyectos.length - enGrafo} proyecto${proyectos.length - enGrafo > 1 ? "s" : ""} aún no está${proyectos.length - enGrafo > 1 ? "n" : ""} en el grafo NEXO. El análisis cruzado estará limitado.`,
      prioridad:  "baja",
      generadoEn: now,
    });
  }

  return {
    insights,
    resumen: `El área tiene ${proyectos.length} proyecto${proyectos.length > 1 ? "s" : ""} registrado${proyectos.length > 1 ? "s" : ""}${urgentes.length > 0 ? `, de los cuales ${urgentes.length} está${urgentes.length > 1 ? "n" : ""} en estado urgente` : ""}.`,
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const uid = await getUid(req);
  if (!uid) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }

  try {
    const db = getAdminDb();

    // Leer proyectos activos (los más relevantes para el análisis)
    const snap = await db
      .collection(tecBiiPath(uid, "proyecto"))
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const proyectos = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProyectoV2);

    const { insights, resumen } = await generateInsightsWithGemini(proyectos);

    const urgentes = proyectos.filter((p) => (p.urgencyScore ?? 0) >= 0.7).length;
    const enGrafo  = proyectos.filter((p) => !!p.nexoNodeId).length;

    const response: InsightsResponse = {
      success:    true,
      insights,
      resumenIA:  resumen,
      generadoEn: Date.now(),
      proyectos:  proyectos.length,
      urgentes,
      enGrafo,
    };

    return NextResponse.json(response);
  } catch (e) {
    console.error("[tec-bii/insights]", e);
    return NextResponse.json(
      { success: false, error: "Error generando análisis" },
      { status: 500 }
    );
  }
}
