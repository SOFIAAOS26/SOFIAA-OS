/**
 * POST /api/prometeo/publish-brand-dna
 *
 * Publica el Brand DNA de un cliente al grafo N.E.X.O.
 * Requiere: { workspaceId, brandDnaId }
 * Auth: Firebase ID token en Authorization header.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth }        from "firebase-admin/auth";
import { getAdminDb, getAdminApp } from "@/lib/firebase-admin";
import { publishBrandDNA } from "@/lib/prometeo/brand-dna-publisher";
import type { BrandDNA }   from "@/extensions/prometeo/schema";

export async function POST(req: NextRequest) {
  try {
    getAdminApp(); // ensure initialized

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
    const { workspaceId, brandDnaId } = await req.json() as {
      workspaceId: string;
      brandDnaId:  string;
    };

    if (!workspaceId || !brandDnaId) {
      return NextResponse.json({ error: "workspaceId y brandDnaId requeridos" }, { status: 400 });
    }

    // ── Leer Brand DNA de Firestore ───────────────────────────────
    const db  = getAdminDb();
    const ref = db.doc(`smm_workspaces/${workspaceId}/prometeo_brand_dna/${brandDnaId}`);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Brand DNA no encontrado" }, { status: 404 });
    }

    const dna = { id: snap.id, ...snap.data() } as BrandDNA;

    // ── Publicar a N.E.X.O. ───────────────────────────────────────
    const result = await publishBrandDNA(uid, dna);

    // ── Marcar como publicado en Firestore ───────────────────────
    await ref.update({ nexoPublishedAt: Date.now(), nexoNodes: result.nodes });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[PROMETEO][publish-brand-dna]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
