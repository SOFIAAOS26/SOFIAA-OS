/**
 * N.E.X.O. — POST /api/nexo/pdf (Sprint M-1)
 * Recibe un PDF como multipart/form-data, lo procesa con Gemini y crea NexoNodes.
 *
 * DELETE /api/nexo/pdf?docId={id} — elimina el documento y sus nodos.
 *
 * Límite: PDFs hasta ~4MB en Vercel Hobby, ~10MB en Pro.
 * Para documentos más grandes → usar Gemini File API (Sprint M-1+).
 *
 * Headers requeridos:
 *   Authorization: Bearer {Firebase ID token}
 *
 * FormData (POST):
 *   file: File (application/pdf)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth }                    from "firebase-admin/auth";
import { getAdminApp }                from "@/lib/firebase-admin";
import { processPdf, deleteBibliotecaDoc } from "@/lib/nexo/pdf";

export const runtime     = "nodejs";
export const maxDuration = 60;   // el procesamiento puede tardar

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getUid(req: NextRequest): Promise<string | null> {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;
    const auth    = getAuth(getAdminApp());
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

// ── POST — subir y procesar PDF ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const start = Date.now();

  // 1. Autenticación
  const uid = await getUid(req);
  if (!uid) return err("No autorizado", 401);

  // 2. Leer FormData
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return err("Error leyendo el formulario");
  }

  const file = formData.get("file") as File | null;
  if (!file) return err("Campo 'file' requerido");
  if (file.type !== "application/pdf") return err("Solo se aceptan archivos PDF");

  const MAX_MB  = 10;
  const MAX_BYTES = MAX_MB * 1024 * 1024;
  if (file.size > MAX_BYTES) return err(`El PDF no puede superar ${MAX_MB}MB`);

  // 3. Convertir a base64
  let pdfBase64: string;
  try {
    const buffer = await file.arrayBuffer();
    pdfBase64    = Buffer.from(buffer).toString("base64");
  } catch {
    return err("Error leyendo el archivo");
  }

  // 4. Procesar con Gemini
  try {
    const result = await processPdf({
      uid,
      filename:  file.name,
      sizeBytes: file.size,
      pdfBase64,
    });

    return NextResponse.json({
      success:      true,
      docId:        result.docId,
      title:        result.title,
      author:       result.author,
      nodesCreated: result.nodesCreated,
      durationMs:   Date.now() - start,
    });

  } catch (error) {
    console.error("[M-1 PDF] Error procesando:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// ── DELETE — eliminar documento ───────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const uid = await getUid(req);
  if (!uid) return err("No autorizado", 401);

  const docId = new URL(req.url).searchParams.get("docId");
  if (!docId) return err("Parámetro docId requerido");

  try {
    await deleteBibliotecaDoc(uid, docId);
    return NextResponse.json({ success: true, docId });
  } catch (error) {
    console.error("[M-1 PDF] Error borrando:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
