/**
 * N.E.X.O. — POST /api/nexo/ingest
 * Sprint N-2: clasificación LLM (Gemini Flash) + persistencia Firestore
 *
 * Recibe capturas desde la Chrome Extension, PWA Share Target o el chat.
 * 1. Verifica sesión Firebase
 * 2. Valida y sanitiza el payload
 * 3. Clasifica con Gemini Flash (categoría, entidades, importanceScore, resumen)
 * 4. Persiste el NexoNode en Firestore (upsert — deduplicación por URL)
 * 5. Registra evento en N.O.R.A
 */

import { NextRequest, NextResponse }          from "next/server";
import { getAuth }                             from "firebase-admin/auth";
import { getAdminApp }                         from "@/lib/firebase-admin";
import { classifyNexoPayload }                 from "@/lib/nexo/classifier";
import { upsertNexoNode, logNexoEvent }        from "@/lib/nexo/firestore";
import type {
  NexoIngestPayload,
  NexoIngestResponse,
  NexoNode,
} from "@/types/nexo";
import {
  NEXO_INITIAL_WEIGHT,
  NEXO_DECAY_RATE,
} from "@/types/nexo";

// ── Helpers ───────────────────────────────────────────────────────────────────

function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

/** Extrae y verifica el Bearer token de Firebase Auth */
async function getUid(req: NextRequest): Promise<string | null> {
  try {
    const auth  = getAuth(getAdminApp());
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const start = Date.now();

  // 1. Autenticación
  const uid = await getUid(req);
  if (!uid) return err("No autorizado — se requiere sesión de Firebase", 401);

  // 2. Parsear body
  let payload: NexoIngestPayload;
  try {
    payload = await req.json();
  } catch {
    return err("Body inválido — se espera JSON");
  }

  // 3. Validar campos requeridos
  if (!payload.title?.trim()) return err("Campo requerido: title");
  if (!payload.text?.trim())  return err("Campo requerido: text");
  if (!payload.source)        return err("Campo requerido: source");
  if (!payload.capturedAt)    return err("Campo requerido: capturedAt");

  // Sanitizar
  const clean: NexoIngestPayload = {
    url:         payload.url?.trim() ?? null,
    title:       payload.title.trim().slice(0, 300),
    text:        payload.text.trim().slice(0, 8000),
    imageUrl:    payload.imageUrl?.trim() || undefined,
    imageBase64: payload.imageBase64 ?? undefined,
    source:      payload.source,
    capturedAt:  payload.capturedAt,
  };

  // 4. Clasificar con Gemini Flash
  const classification = await classifyNexoPayload(clean);

  // 5. Construir NexoNode
  const nodeId = `nexo:${classification.category}:${classification.slug}`;
  const now    = Date.now();

  const node: NexoNode = {
    id:              nodeId,
    category:        classification.category,
    title:           clean.title,
    summary:         classification.summary,
    entities:        classification.entities,
    url:             clean.url,
    imageUrl:        clean.imageUrl ?? null,
    source:          clean.source,
    weight:          NEXO_INITIAL_WEIGHT,
    importanceScore: classification.importanceScore,
    decayRate:       NEXO_DECAY_RATE,
    lastReinforced:  now,
    capturedAt:      clean.capturedAt,
    createdAt:       now,
  };

  // 6. Persistir en Firestore (upsert — si ya existe la URL, refuerza el peso)
  await upsertNexoNode(uid, node);

  // 7. Log evento en N.O.R.A
  const durationMs = Date.now() - start;
  await logNexoEvent(uid, {
    id:              `ingest:${now}:${uid.slice(0, 8)}`,
    userId:          uid,
    nodeId,
    action:          "captured",
    source:          clean.source,
    category:        classification.category,
    importanceScore: classification.importanceScore,
    tokensUsed:      classification.tokensUsed,
    durationMs,
    timestamp:       now,
  });

  console.log(
    `[N.E.X.O. ingest] uid=${uid.slice(0,8)} cat=${classification.category} ` +
    `score=${classification.importanceScore.toFixed(2)} tokens=${classification.tokensUsed} dt=${durationMs}ms`
  );

  const response: NexoIngestResponse = {
    success:         true,
    nodeId,
    category:        classification.category,
    importanceScore: classification.importanceScore,
    summary:         classification.summary,
    entities:        classification.entities,
    durationMs,
  };

  return NextResponse.json(response, { status: 200 });
}

// Rechazar otros métodos
export function GET()    { return err("Método no permitido", 405); }
export function PUT()    { return err("Método no permitido", 405); }
export function DELETE() { return err("Método no permitido", 405); }
