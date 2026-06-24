/**
 * Monday.com Webhook Endpoint — TEC BI v1.1
 * POST /api/monday/webhook
 *
 * ACTIVACIÓN:
 *   1. .env.local: MONDAY_ENABLED=true, MONDAY_API_TOKEN=..., MONDAY_BOARD_ID=..., MONDAY_COL_ESTADO=...
 *   2. Monday → Admin → Integraciones → Webhooks → Add Webhook
 *      URL: https://tu-app.vercel.app/api/monday/webhook
 *      Eventos: change_column_value (status), item_created
 *
 * SEGURIDAD: Monday envía un challenge inicial — este handler lo responde.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type { MondayWebhookEvent } from "@/lib/monday/types";

export const dynamic = "force-dynamic";

// Estado Monday → TEC BI
const MONDAY_TO_TEC: Record<string, string> = {
  "En espera":    "Recibido",
  "En revisión":  "En revisión",
  "Aprobado":     "Aprobado",
  "En progreso":  "En producción",
  "Listo":        "Entregado",
  "Cancelado":    "Cancelado",
};

export async function POST(req: NextRequest) {
  if (process.env.MONDAY_ENABLED !== "true") {
    return NextResponse.json(
      { error: "Monday adapter desactivado. Activa MONDAY_ENABLED=true en .env.local" },
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

  console.log(`[Monday Webhook] ${event.type} | item ${event.itemId} | col ${event.columnId}`);

  try {
    switch (event.type) {

      case "change_column_value": {
        // Solo nos interesa el cambio de la columna de estado
        if (event.columnId !== process.env.MONDAY_COL_ESTADO) break;

        const newLabel = event.value?.label ?? "";
        const tecEstado = MONDAY_TO_TEC[newLabel];
        if (!tecEstado || !event.itemId) break;

        const mondayItemId = String(event.itemId);

        // Buscar Brief con este mondayItemId
        const briefSnap = await adminDb
          .collection("briefs")
          .where("mondayItemId", "==", mondayItemId)
          .limit(1)
          .get();

        if (!briefSnap.empty) {
          await briefSnap.docs[0].ref.update({
            estado: tecEstado,
            updatedAt: new Date(),
          });
          console.log(`[Monday → Firestore] Brief ${briefSnap.docs[0].id} → ${tecEstado}`);
          break;
        }

        // Buscar Proyecto con este mondayItemId
        const proySnap = await adminDb
          .collection("proyectos")
          .where("mondayItemId", "==", mondayItemId)
          .limit(1)
          .get();

        if (!proySnap.empty) {
          await proySnap.docs[0].ref.update({
            estado: tecEstado,
            updatedAt: new Date(),
          });
          console.log(`[Monday → Firestore] Proyecto ${proySnap.docs[0].id} → ${tecEstado}`);
        }
        break;
      }

      case "create_item":
        // Items creados desde TEC BI ya existen — ignorar para evitar loops
        console.log(`[Monday Webhook] Item ${event.itemId} creado en Monday (ignorado)`);
        break;

      default:
        console.log(`[Monday Webhook] Evento no manejado: ${event.type}`);
    }
  } catch (err) {
    console.error("[Monday Webhook] Error procesando evento:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  return NextResponse.json({ received: true, event: event.type });
}
