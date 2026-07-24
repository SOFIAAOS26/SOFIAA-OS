/**
 * ALEJANDRÍA — GET /api/alejandria/stats
 * Sprint AJ-5 · Estadísticas del corpus para la UI
 *
 * Response: AlejandriaStats
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth }                   from "firebase-admin/auth";
import { getAdminApp }               from "@/lib/firebase-admin";
import { getAlejandriaStats }        from "@/lib/alejandria/firestore";

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

export async function GET(req: NextRequest) {
  const uid = await getUid(req);
  if (!uid) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }

  const stats = await getAlejandriaStats(uid);
  return NextResponse.json({ success: true, stats });
}
