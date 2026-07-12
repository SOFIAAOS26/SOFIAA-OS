/**
 * Monday.com Webhook Endpoint — TEC Bii v2 (Sprint Q-3)
 * POST /api/monday/webhook
 *
 * ACTIVACIÓN:
 *   1. .env.local / Vercel:
 *        MONDAY_ENABLED=true
 *        MONDAY_API_TOKEN=...
 *        MONDAY_BOARD_ID=...
 *        MONDAY_COL_ESTADO=...   ← ID de la columna de estado en Monday
 *        MONDAY_OWNER_UID=...    ← UID de Firebase del propietario de los datos TEC Bii
 *   2. Monday → Admin → Integraciones → Webhooks → Add Webhook
 *      URL: https://tu-app.vercel.app/api/monday/webhook
 *      Eventos: change_column_value (status), item_created
 *
 * CAMBIOS v2 (Q-3):
 *   - Paths Firestore: v1 (raíz) → v2 (users/{uid}/tec_bii_*)
 *   - Cognitive publish: fire-and-forget a NEXO tras cada update
 *   - Guard: requiere MONDAY_OWNER_UID configurado
 *
 * SEGURIDAD: Monday envía un challenge inicial — este handler lo responde.
 */

import { NextRequest, NextResponse }       from "next/server";
import { adminDb }                          from "@/lib/firebase-admin";
import { publishEntityToGraph }             from "@/lib/tec-bii/cognitive-publisher";
import type { MondayWebhookEvent }          from "@/lib/monday/types";
import type { BriefV2, ProyectoV2 }        from "@/extensions/tec-bii/schema";

export const dynamic = "force-dynamic";

// ── Estado Monday → TEC Bii v2 ────────────────────────────────────────────────
const MONDAY_TO_TEC: Record<string, string> = {
  "En espera":   "Recibido",
  "En revisión": "En revisión",
  "Aprobado":    "Aprobado",
  "En progreso": "En producción",
  "Listo":       "Entregado",
  "Cancelado":   "Cancelado",
};

// ── Ruta de colección TEC Bii v2 ──────────────────────────────────────────────
function tbPath(uid: string, col: string): string {
  return `users/${uid}/tec_bii_${col}`;
}

export async function POST(req: NextRequest) {
  if (process.env.MONDAY_ENABLED !== "true") {
    return NextResponse.json(
      { error: "Monday adapter desactivado. Activa MONDAY_ENABLED=true" },
      { status: 503 }
    );
  }

  // UID del propietario de los datos TEC Bii v2
  const uid = process.env.MONDAY_OWNER_UID ?? "";
  if (!uid) {
    console.error("[Monday Webhook] MONDAY_OWNER_UID no configurado — actualiza Vercel env vars");
    return NextResponse.json(
      { error: "MONDAY_OWNER_UID requerido para TEC Bii v2" },
      { status: 503 }
    );
  }

  let body: MondayWebhookEvent & { challenge?: string };
  try {
    body = await req.json() as MondayWebhookEvent & { challenge?: string };
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  // ── Challenge de verificación de Monday ──────────────────────────────────
  if (body.challenge) {
    console.log("[Monday Webhook] Challenge respondido");
    return NextResponse.json({ challenge: body.challenge });
  }

  const { event } = body;
  if (!event) return NextResponse.json({ error: "Sin evento" }, { status: 400 });

  console.log(`[Monday Webhook v2] ${event.type} | item ${event.itemId} | col ${event.columnId} | uid ${uid}`);

  try {
    switch (event.type) {

      case "change_column_value": {
        // Solo nos interesa la columna de estado
        if (event.columnId !== process.env.MONDAY_COL_ESTADO) break;

        const newLabel  = event.value?.label ?? "";
        const tecEstado = MONDAY_TO_TEC[newLabel];
        if (!tecEstado || !event.itemId) break;

        const mondayItemId = String(event.itemId);
        const now          = Date.now();

        // ── Buscar Brief en v2 ─────────────────────────────────────────────
        const briefSnap = await adminDb
          .collection(tbPath(uid, "briefs"))
          .where("mondayItemId", "==", mondayItemId)
          .limit(1)
          .get();

        if (!briefSnap.empty) {
          const briefDoc = briefSnap.docs[0];
          await briefDoc.ref.update({ estado: tecEstado, updatedAt: now });
          console.log(`[Monday → Firestore v2] Brief ${briefDoc.id} → ${tecEstado}`);

          // Cognitive re-publish → NEXO (fire-and-forget)
          const updatedBrief = { id: briefDoc.id, ...briefDoc.data(), estado: tecEstado, updatedAt: now } as BriefV2;
          publishEntityToGraph(uid, "brief", briefDoc.id, updatedBrief).catch((err) =>
            console.error("[Monday Webhook] NEXO publish brief failed:", err)
          );
          break;
        }

        // ── Buscar Proyecto en v2 ──────────────────────────────────────────
        const proySnap = await adminDb
          .collection(tbPath(uid, "proyectos"))
          .where("mondayItemId", "==", mondayItemId)
          .limit(1)
          .get();

        if (!proySnap.empty) {
          const proyDoc = proySnap.docs[0];
          await proyDoc.ref.update({ estado: tecEstado, updatedAt: now });
          console.log(`[Monday → Firestore v2] Proyecto ${proyDoc.id} → ${tecEstado}`);

          // Cognitive re-publish → NEXO (fire-and-forget)
          const updatedProy = { id: proyDoc.id, ...proyDoc.data(), estado: tecEstado, updatedAt: now } as ProyectoV2;
          publishEntityToGraph(uid, "proyecto", proyDoc.id, updatedProy).catch((err) =>
            console.error("[Monday Webhook] NEXO publish proyecto failed:", err)
          );
        }
        break;
      }

      case "create_item":
        // Items creados desde TEC Bii ya existen — ignorar para evitar loops
        console.log(`[Monday Webhook v2] Item ${event.itemId} creado en Monday (ignorado)`);
        break;

      default:
        console.log(`[Monday Webhook v2] Evento no manejado: ${event.type}`);
    }
  } catch (err) {
    console.error("[Monday Webhook v2] Error procesando evento:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  return NextResponse.json({ received: true, event: event.type });
}
