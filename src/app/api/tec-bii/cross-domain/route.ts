/**
 * TEC Bii — POST /api/tec-bii/cross-domain
 * Sprint T2-4: Cross-Domain Reasoning
 *
 * Ejecuta el motor de razonamiento cruzado NEXO ↔ TEC Bii:
 * - Compara embeddings semánticos de entidades TEC Bii con capturas NEXO
 * - Detecta pares con similitud > 0.60
 * - Genera hipótesis con Gemini Flash
 * - Persiste en los documentos Firestore de las entidades
 *
 * Body: {} (vacío — el uid viene del token)
 * Respuesta: CrossDomainResult
 */

import { NextRequest, NextResponse }      from "next/server";
import { getAuth }                         from "firebase-admin/auth";
import { getAdminApp }                     from "@/lib/firebase-admin";
import { runCrossDomainAnalysis }          from "@/lib/tec-bii/cross-domain";
import type { CrossDomainResult }          from "@/lib/tec-bii/cross-domain";

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

// ── Handler ───────────────────────────────────────────────────────────────────

export interface CrossDomainResponse extends CrossDomainResult {
  success: boolean;
  error?:  string;
}

export async function POST(req: NextRequest) {
  const uid = await getUid(req);
  if (!uid) {
    return NextResponse.json<CrossDomainResponse>({
      success:           false,
      error:             "No autorizado",
      pairsDetected:     0,
      hypothesesCreated: 0,
      entitiesUpdated:   0,
      hypotheses:        [],
    }, { status: 401 });
  }

  try {
    const result = await runCrossDomainAnalysis(uid);
    return NextResponse.json<CrossDomainResponse>({ success: true, ...result });
  } catch (err) {
    console.error("[cross-domain]", err);
    return NextResponse.json<CrossDomainResponse>({
      success:           false,
      error:             "Error en el análisis cruzado",
      pairsDetected:     0,
      hypothesesCreated: 0,
      entitiesUpdated:   0,
      hypotheses:        [],
    }, { status: 500 });
  }
}
