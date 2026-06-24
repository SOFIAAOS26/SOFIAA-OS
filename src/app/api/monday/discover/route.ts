/**
 * Monday Discovery — TEC BI v1.1
 * GET /api/monday/discover
 *
 * Retorna boards, grupos y columnas de tu cuenta Monday.
 * Úsala para encontrar los IDs que necesitas en .env.local.
 * Solo funciona con MONDAY_API_TOKEN configurado.
 */

import { NextResponse } from "next/server";
import { mondayQuery } from "@/lib/monday/client";

export const dynamic = "force-dynamic";

interface DiscoverData {
  boards: {
    id: string;
    name: string;
    groups: { id: string; title: string }[];
    columns: { id: string; title: string; type: string }[];
  }[];
}

export async function GET() {
  if (!process.env.MONDAY_API_TOKEN) {
    return NextResponse.json({ error: "MONDAY_API_TOKEN no configurado en .env.local" }, { status: 400 });
  }

  try {
    const data = await mondayQuery<DiscoverData>(`{
      boards(limit: 10, order_by: created_at) {
        id
        name
        groups { id title }
        columns { id title type }
      }
    }`);

    if (!data) {
      return NextResponse.json({ error: "MONDAY_ENABLED=false — actívalo primero" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      instrucciones: {
        MONDAY_BOARD_ID: "Copia el 'id' del board que quieres usar",
        MONDAY_GROUP_ID: "Copia el 'id' del grupo destino dentro de ese board",
        MONDAY_COL_ESTADO: "Copia el 'id' de la columna de tipo 'color' o 'status'",
        MONDAY_COL_FECHA:  "Copia el 'id' de la columna de tipo 'date'",
        MONDAY_COL_TIPO:   "Copia el 'id' de la columna de tipo 'text' para el tipo de proyecto",
      },
      boards: data.boards,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
