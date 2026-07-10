/**
 * TEC Bii — POST /api/tec-bii/brief-gen
 * Sprint T2-3: Brief Intelligence
 *
 * Recibe una descripción en lenguaje natural de un proyecto y genera
 * un BriefV2 estructurado completo usando Gemini Flash.
 *
 * Body: { descripcion: string }
 * Respuesta: { success, brief: Partial<BriefV2>, briefScore, suggestedTags }
 */

import { NextRequest, NextResponse }  from "next/server";
import { getAuth }                     from "firebase-admin/auth";
import { getAdminApp }                 from "@/lib/firebase-admin";
import type { BriefV2, TipoProyecto, EstadoBrief } from "@/extensions/tec-bii/schema";
import { callGroq }                    from "@/lib/groq";

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

// ── Generación con Gemini ─────────────────────────────────────────────────────

interface GeneratedBrief {
  titulo:             string;
  tipoProyecto:       TipoProyecto;
  descripcion:        string;
  objetivo:           string;
  audiencia:          string;
  plataforma:         string;
  entregables:        string[];
  requisitosTecnicos: string;
  referencias:        string;
  duracionSeg:        number | null;
  contactoSolicitante: string;
  briefScore:         number;
  suggestedTags:      string[];
  diasParaDeadline:   number;
}

const TIPO_PROYECTOS: TipoProyecto[] = [
  "Spot Publicitario", "Cápsula Educativa", "Diseño Gráfico",
  "Evento en Vivo", "Fotografía", "Motion Graphics",
  "Podcast / Audio", "Reel / Short", "Otro",
];

async function generateBriefFromDescription(
  descripcion: string
): Promise<GeneratedBrief | null> {
  const prompt = `Eres el sistema de inteligencia de briefs del Área de Producción Audiovisual del Tecnológico de Monterrey.

El usuario describió un proyecto con estas palabras:
"${descripcion}"

Genera un brief de producción audiovisual completamente estructurado basándote en esa descripción.
Infiere el tipo de proyecto, los entregables probables, la audiencia y los requisitos técnicos típicos de ese tipo de producción en el TEC de Monterrey.

Responde EXACTAMENTE en este formato JSON (sin texto adicional):
{
  "titulo": "título conciso del proyecto (máx 8 palabras)",
  "tipoProyecto": "uno de: Spot Publicitario | Cápsula Educativa | Diseño Gráfico | Evento en Vivo | Fotografía | Motion Graphics | Podcast / Audio | Reel / Short | Otro",
  "descripcion": "descripción mejorada y completa del proyecto (2-3 oraciones profesionales)",
  "objetivo": "objetivo principal del proyecto — qué debe lograr al entregarse",
  "audiencia": "público objetivo del contenido final",
  "plataforma": "plataforma(s) de distribución (ej: Instagram Reels, YouTube, pantallas internas TEC, etc.)",
  "entregables": ["entregable 1", "entregable 2", "..."],
  "requisitosTecnicos": "equipamiento, formatos, resolución, especificaciones técnicas típicas para este tipo de producción",
  "referencias": "tipos de referencias sugeridas para este proyecto",
  "duracionSeg": null o número de segundos si aplica (ej: 30, 60, 90, 120),
  "contactoSolicitante": "",
  "briefScore": número del 0 al 100 indicando qué tan completo está el brief dado el contexto disponible,
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "diasParaDeadline": número de días típico para este tipo de producción en el TEC (entre 7 y 90)
}`;

  try {
    const raw = await callGroq(prompt, { maxTokens: 700, temperature: 0.4, json: true });
    if (!raw) return null;

    const parsed = JSON.parse(raw) as GeneratedBrief;

    // Validar que tipoProyecto sea un valor válido
    if (!TIPO_PROYECTOS.includes(parsed.tipoProyecto)) {
      parsed.tipoProyecto = "Otro";
    }

    return parsed;
  } catch {
    return null;
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const uid = await getUid(req);
  if (!uid) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }

  let body: { descripcion: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "JSON inválido" }, { status: 400 });
  }

  const { descripcion } = body;
  if (!descripcion?.trim()) {
    return NextResponse.json({ success: false, error: "Descripción requerida" }, { status: 400 });
  }

  if (descripcion.length > 2000) {
    return NextResponse.json({ success: false, error: "Descripción muy larga (máx 2000 chars)" }, { status: 400 });
  }

  const generated = await generateBriefFromDescription(descripcion.trim());

  if (!generated) {
    return NextResponse.json(
      { success: false, error: "No se pudo generar el brief. Verifica la API key de Groq." },
      { status: 500 }
    );
  }

  const now       = Date.now();
  const deadline  = now + generated.diasParaDeadline * 24 * 60 * 60 * 1000;

  // Construir el brief parcial para pre-llenar el form
  const brief: Partial<BriefV2> = {
    titulo:              generated.titulo,
    tipoProyecto:        generated.tipoProyecto,
    descripcion:         generated.descripcion,
    objetivo:            generated.objetivo,
    audiencia:           generated.audiencia,
    plataforma:          generated.plataforma,
    entregables:         generated.entregables,
    requisitosTecnicos:  generated.requisitosTecnicos,
    referencias:         generated.referencias,
    duracionSeg:         generated.duracionSeg ?? undefined,
    contactoSolicitante: generated.contactoSolicitante,
    briefScore:          generated.briefScore,
    estado:              "Recibido" as EstadoBrief,
    fechaSolicitud:      now,
    fechaLimite:         deadline,
    aiGeneratedFrom:     "conversación",
    suggestedTags:       generated.suggestedTags,
    urgencyScore:        Math.max(0.1, Math.min(1, 1 - generated.diasParaDeadline / 90)),
  };

  return NextResponse.json({
    success:       true,
    brief,
    briefScore:    generated.briefScore,
    suggestedTags: generated.suggestedTags,
    diasDeadline:  generated.diasParaDeadline,
  });
}
