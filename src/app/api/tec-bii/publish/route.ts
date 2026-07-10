/**
 * TEC Bii — POST /api/tec-bii/publish
 * Sprint T2-1: Cognitive Entity Layer
 *
 * Publica una entidad TEC Bii al Experience Graph de N.E.X.O.
 * El cliente lo llama de forma no bloqueante (fire-and-forget)
 * después de cada create/update en Firestore.
 *
 * Body: { entityType, entityId, entity }
 */

import { NextRequest, NextResponse }   from "next/server";
import { getAuth }                      from "firebase-admin/auth";
import { getAdminApp }                  from "@/lib/firebase-admin";
import { publishEntityToGraph }         from "@/lib/tec-bii/cognitive-publisher";
import type { TecBiiEntityType }        from "@/extensions/tec-bii/schema";

function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

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

export async function POST(req: NextRequest) {
  const uid = await getUid(req);
  if (!uid) return err("No autorizado", 401);

  let body: { entityType: TecBiiEntityType; entityId: string; entity: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return err("JSON inválido");
  }

  const { entityType, entityId, entity } = body;
  if (!entityType || !entityId || !entity) {
    return err("Campos requeridos: entityType, entityId, entity");
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await publishEntityToGraph(uid, entityType, entityId, entity as any);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error("[tec-bii/publish]", e);
    return NextResponse.json(
      { success: false, error: "Error en publicación cognitiva" },
      { status: 500 }
    );
  }
}
