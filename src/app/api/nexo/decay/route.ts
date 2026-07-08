/**
 * N.E.X.O. — GET /api/nexo/decay
 * Vercel Cron Job — corre diariamente a las 3:00 AM MX (UTC-6)
 *
 * Configurar en vercel.json:
 * {
 *   "crons": [{ "path": "/api/nexo/decay", "schedule": "0 9 * * *" }]
 * }
 * (9 AM UTC = 3 AM CST México)
 *
 * Aplica decaimiento exponencial a TODOS los usuarios con nodos N.E.X.O.
 * Elimina nodos con peso < 0.05 (olvido definitivo).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb }                 from "@/lib/firebase-admin";
import { applyNexoDecay, logNexoEvent, nexoNodesCol } from "@/lib/nexo/firestore";

export const runtime = "nodejs"; // Necesita Admin SDK
export const maxDuration = 60;   // Cron puede tardar más que edge functions

export async function GET(req: NextRequest) {
  // Verificar que venga del cron de Vercel (o de admin local)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const start = Date.now();
  const db    = getAdminDb();

  // Obtener todos los usuarios con nodos N.E.X.O.
  // Buscamos colecciones que coincidan con users/*/nexo_nodes
  let totalDecayed = 0;
  let totalPruned  = 0;
  let usersProcessed = 0;

  try {
    // Collectiongroup query para encontrar todos los nexo_nodes activos
    const allNodesSnap = await db.collectionGroup("nexo_nodes").select().limit(500).get();

    // Extraer UIDs únicos
    const uids = new Set<string>();
    allNodesSnap.docs.forEach(d => {
      // Path: users/{uid}/nexo_nodes/{nodeId}
      const parts = d.ref.path.split("/");
      if (parts.length >= 2) uids.add(parts[1]);
    });

    // Aplicar decay por usuario
    for (const uid of uids) {
      const result = await applyNexoDecay(uid);
      totalDecayed  += result.decayed;
      totalPruned   += result.pruned;
      usersProcessed++;

      // Log evento de decay en N.O.R.A
      if (result.pruned > 0) {
        await logNexoEvent(uid, {
          id:              `decay:${Date.now()}:${uid.slice(0, 8)}`,
          userId:          uid,
          nodeId:          "batch",
          action:          "pruned",
          source:          "manual",
          category:        "other",
          importanceScore: 0,
          tokensUsed:      0,
          durationMs:      0,
          timestamp:       Date.now(),
        });
      }
    }

    const durationMs = Date.now() - start;
    console.log(`[N.E.X.O. decay] users=${usersProcessed} decayed=${totalDecayed} pruned=${totalPruned} dt=${durationMs}ms`);

    return NextResponse.json({
      success:        true,
      usersProcessed,
      totalDecayed,
      totalPruned,
      durationMs,
      runAt:          new Date().toISOString(),
    });

  } catch (error) {
    console.error("[N.E.X.O. decay] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
