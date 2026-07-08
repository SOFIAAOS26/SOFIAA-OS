/**
 * N.E.X.O. — POST /api/nexo/ingest
 * Sprint N-0: endpoint esqueleto con validación completa
 * Sprint N-2: clasificación LLM + persistencia (próximo sprint)
 *
 * Recibe capturas desde la Chrome Extension, PWA Share Target o el chat.
 * Valida el payload, retorna 200 con un echo del contenido recibido.
 * En Sprint N-2 se añade la clasificación con Gemini Flash.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth }                    from "firebase-admin/auth";
import { getAdminApp }                from "@/lib/firebase-admin";
import type { NexoIngestPayload, NexoIngestResponse } from "@/types/nexo";

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

// ── Handler principal ─────────────────────────────────────────────────────────

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
    imageUrl:    payload.imageUrl?.trim() ?? undefined,
    imageBase64: payload.imageBase64 ?? undefined,
    source:      payload.source,
    capturedAt:  payload.capturedAt,
  };

  // 4. Sprint N-0: respuesta esqueleto (clasificación LLM se añade en N-2)
  //    Por ahora retorna categoría "other" y score 0.5 como placeholders.
  const nodeId = `nexo:pending:${Date.now()}`;

  const response: NexoIngestResponse = {
    success:         true,
    nodeId,
    category:        "other",    // Sprint N-2: Gemini Flash clasificará esto
    importanceScore: 0.5,        // Sprint N-2: LLM asignará score real
    summary:         clean.text.slice(0, 200) + "...", // Sprint N-2: resumen LLM
    entities:        {},         // Sprint N-2: extracción de entidades
    durationMs:      Date.now() - start,
  };

  // 5. Log básico (Sprint N-2 escribirá en Firestore)
  console.log(`[N.E.X.O. ingest] uid=${uid} source=${clean.source} title="${clean.title}" dt=${response.durationMs}ms`);

  return NextResponse.json(response, { status: 200 });
}

// Rechazar otros métodos
export function GET()    { return err("Método no permitido", 405); }
export function PUT()    { return err("Método no permitido", 405); }
export function DELETE() { return err("Método no permitido", 405); }
