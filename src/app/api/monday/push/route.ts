/**
 * POST /api/monday/push
 * Recibe datos de un Brief o Proyecto recién creado desde el cliente,
 * lo crea en Monday y retorna el mondayItemId para guardarlo en Firestore.
 */

import { NextRequest, NextResponse } from "next/server";
import { pushBriefToMonday, pushProyectoToMonday } from "@/lib/monday/sync";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

interface PushPayload {
  type: "brief" | "proyecto";
  docId: string;
  titulo: string;
  estado: string;
  tipoProyecto?: string;
  fechaLimite?: string;
  valorEstimado?: number;
}

export async function POST(req: NextRequest) {
  if (process.env.MONDAY_ENABLED !== "true") {
    return NextResponse.json({ skipped: true, reason: "MONDAY_ENABLED=false" });
  }

  let payload: PushPayload;
  try {
    payload = await req.json() as PushPayload;
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const { type, docId, titulo, estado, tipoProyecto, fechaLimite, valorEstimado } = payload;

  try {
    const result = type === "brief"
      ? await pushBriefToMonday({ titulo, estado, tipoProyecto: tipoProyecto ?? "", fechaLimite })
      : await pushProyectoToMonday({ titulo, estado, valorEstimado });

    if (result.success && result.mondayItemId) {
      // Guardar mondayItemId en Firestore
      const col = type === "brief" ? "briefs" : "proyectos";
      await adminDb.collection(col).doc(docId).update({
        mondayItemId: result.mondayItemId,
      });
      console.log(`[Monday Push] ${type} ${docId} → Monday item ${result.mondayItemId}`);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[Monday Push] Error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
