/**
 * POST /api/hermes/conectores/test
 *
 * Prueba la conexión de un conector HERMES con sus credenciales actuales.
 * Lee primero env vars, luego Firestore secrets.
 *
 * Headers: Authorization: Bearer <firebase-id-token>
 * Body: { workspaceId: string; tipo: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth }                   from "firebase-admin/auth";
import { getAdminApp }               from "@/lib/firebase-admin";
import {
  resolveMondayToken,
  resolveSlackWebhook,
}                                    from "@/lib/hermes/connector-secrets";

const MONDAY_API = "https://api.monday.com/v2";

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return NextResponse.json({ ok: false, mensaje: "No autorizado" }, { status: 401 });

  try {
    await getAuth(getAdminApp()).verifyIdToken(token);
  } catch {
    return NextResponse.json({ ok: false, mensaje: "Token inválido" }, { status: 401 });
  }

  // ── Body ──────────────────────────────────────────────────────────────────
  let workspaceId: string;
  let tipo:        string;
  try {
    const body = await req.json();
    workspaceId = String(body.workspaceId ?? "").trim();
    tipo        = String(body.tipo ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, mensaje: "Body inválido" }, { status: 400 });
  }

  if (!workspaceId || !tipo) {
    return NextResponse.json({ ok: false, mensaje: "workspaceId y tipo requeridos" }, { status: 400 });
  }

  // ── Probar conexión por tipo ──────────────────────────────────────────────

  try {
    if (tipo === "monday_cloud") {
      const apiToken = await resolveMondayToken(workspaceId);
      if (!apiToken) {
        return NextResponse.json({
          ok:      false,
          mensaje: "No hay API token configurado para Monday.com. Guarda el token primero.",
        });
      }

      const res = await fetch(MONDAY_API, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": apiToken,
          "API-Version": "2024-10",
        },
        body: JSON.stringify({ query: "{ me { name email } }" }),
      });

      if (!res.ok) {
        return NextResponse.json({
          ok:      false,
          mensaje: `Monday respondió con error ${res.status}. Verifica que el token sea válido.`,
        });
      }

      const data = await res.json() as { data?: { me?: { name: string; email: string } }; errors?: { message: string }[] };

      if (data.errors?.length) {
        return NextResponse.json({
          ok:      false,
          mensaje: `Error de Monday: ${data.errors[0].message}`,
        });
      }

      const nombre = data.data?.me?.name ?? "Cuenta";
      return NextResponse.json({
        ok:      true,
        mensaje: `✓ Conexión exitosa — cuenta Monday: ${nombre}`,
      });
    }

    if (tipo === "slack") {
      const webhookUrl = await resolveSlackWebhook(workspaceId);
      if (!webhookUrl) {
        return NextResponse.json({
          ok:      false,
          mensaje: "No hay Webhook URL configurado para Slack. Guarda el webhook primero.",
        });
      }

      const res = await fetch(webhookUrl, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          text: "✅ *HERMES conectado* — Prueba de conexión desde SOFIAA OS. Todo en orden.",
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        return NextResponse.json({
          ok:      false,
          mensaje: `Slack respondió con error ${res.status}: ${body}`,
        });
      }

      return NextResponse.json({
        ok:      true,
        mensaje: "✓ Conexión exitosa — mensaje de prueba enviado a Slack",
      });
    }

    if (tipo === "calendario_smm" || tipo === "hermes_interno") {
      return NextResponse.json({
        ok:      true,
        mensaje: "✓ Conector interno — activo automáticamente vía Firebase",
      });
    }

    return NextResponse.json({
      ok:      false,
      mensaje: `Conector "${tipo}" no soportado en la prueba de conexión.`,
    });

  } catch (err) {
    console.error("[hermes/conectores/test]", err);
    return NextResponse.json({
      ok:      false,
      mensaje: `Error al probar conexión: ${err instanceof Error ? err.message : "Error desconocido"}`,
    });
  }
}
