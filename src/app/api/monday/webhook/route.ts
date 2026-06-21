/**
 * Monday.com Webhook Endpoint — TEC BI
 * Ruta: POST /api/monday/webhook
 *
 * ESTADO: PREPARADO / INACTIVO
 * Retorna 503 mientras MONDAY_ENABLED=false.
 *
 * CUANDO SE ACTIVE:
 *   1. Configura el webhook en Monday → Admin → API → Webhooks → Add
 *      URL: https://tu-dominio.vercel.app/api/monday/webhook
 *      Eventos recomendados:
 *        - item_created
 *        - change_column_value (para status, fechas, asignaciones)
 *        - create_update (comentarios)
 *
 *   2. Agrega MONDAY_WEBHOOK_SECRET en .env.local (el "challenge" de Monday)
 *
 * SEGURIDAD:
 *   Monday envía un challenge inicial para verificar el endpoint.
 *   Este handler lo responde correctamente.
 */

import { NextRequest, NextResponse } from "next/server";
import type { MondayWebhookEvent } from "@/lib/monday/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  /* ── Verificar que el adaptador está activo ── */
  if (process.env.MONDAY_ENABLED !== "true") {
    return NextResponse.json(
      { error: "Monday adapter está desactivado. Activa MONDAY_ENABLED=true en .env.local" },
      { status: 503 }
    );
  }

  const body = await req.json() as MondayWebhookEvent & { challenge?: string };

  /* ── Challenge de verificación de Monday ── */
  if (body.challenge) {
    return NextResponse.json({ challenge: body.challenge });
  }

  const { event } = body;

  if (!event) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  console.log(`[Monday Webhook] Evento recibido: ${event.type}`, {
    boardId: event.boardId,
    itemId: event.itemId,
    columnId: event.columnId,
    userId: event.userId,
  });

  /* ── Router de eventos ────────────────────────────────────────────
   * Aquí se implementará la lógica de sincronización cuando se active.
   * Cada case actualiza el documento correspondiente en Firestore.
   * ──────────────────────────────────────────────────────────────── */
  switch (event.type) {
    case "create_item":
      // TODO: Crear Brief o Proyecto en Firestore desde Monday
      console.log(`[Monday] Item creado: ${event.itemId} en board ${event.boardId}`);
      break;

    case "change_column_value":
      // TODO: Sincronizar cambio de columna (estado, fecha, etc.) con Firestore
      console.log(`[Monday] Columna ${event.columnId} cambiada en item ${event.itemId}`);
      break;

    case "create_update":
      // TODO: Registrar comentario en el historial del proyecto en Firestore
      console.log(`[Monday] Nuevo comentario en item ${event.itemId}`);
      break;

    default:
      console.log(`[Monday] Evento no manejado: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
