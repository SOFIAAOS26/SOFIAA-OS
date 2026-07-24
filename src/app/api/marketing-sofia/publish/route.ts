/**
 * POST /api/marketing-sofia/publish
 *
 * Publica un cliente o métrica de Marketing Sofia al grafo N.E.X.O.
 * Se llama server-side al crear/actualizar clientes o métricas.
 *
 * Body: { workspaceId, type: "cliente" | "metrica", data: SmmCliente | SmmMetrica }
 * Auth: Firebase ID token en Authorization header.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth }                   from "firebase-admin/auth";
import { getAdminApp }               from "@/lib/firebase-admin";
import { publishClienteToNexo, publishMetricaToNexo } from "@/lib/marketing/nexo-publisher";
import type { SmmCliente, SmmMetrica }                from "@/lib/marketing/types";

export async function POST(req: NextRequest) {
  try {
    getAdminApp();

    // ── Auth ──────────────────────────────────────────────────────
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "No auth token" }, { status: 401 });

    let uid: string;
    try {
      const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    // ── Body ──────────────────────────────────────────────────────
    const { workspaceId, type, data } = await req.json() as {
      workspaceId: string;
      type:        "cliente" | "metrica";
      data:        SmmCliente | SmmMetrica;
    };

    if (!workspaceId || !type || !data) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    // ── Publicar al grafo ─────────────────────────────────────────
    let nodeId: string;
    if (type === "cliente") {
      nodeId = await publishClienteToNexo(uid, workspaceId, data as SmmCliente);
    } else {
      nodeId = await publishMetricaToNexo(uid, workspaceId, data as SmmMetrica);
    }

    return NextResponse.json({ ok: true, nodeId });
  } catch (err) {
    console.error("[MKT-SOFIA][publish]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
