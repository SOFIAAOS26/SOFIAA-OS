/**
 * N.E.X.O. — Biblioteca Context (Sprint M-1B)
 *
 * Lee la colección global sofiaa_biblioteca de Firestore
 * y devuelve un bloque de texto para inyectar en el system prompt de SOFIAA.
 *
 * Solo corre en el servidor (API routes).
 */

import { getAdminDb } from "@/lib/firebase-admin";

interface GlobalBibliotecaDoc {
  id:          string;
  filename:    string;
  title:       string;
  author:      string;
  synopsis:    string;
  topics:      string[];
  language:    string;
  processedAt: number;
}

// Cache en memoria para no leer Firestore en cada request
// Se invalida cada 10 minutos
let _cache: { block: string; expiresAt: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

export async function getBibliotecaContext(): Promise<string> {
  // Devolver caché si está vigente
  if (_cache && Date.now() < _cache.expiresAt) {
    return _cache.block;
  }

  try {
    const db   = getAdminDb();
    const snap = await db
      .collection("sofiaa_biblioteca")
      .orderBy("processedAt", "desc")
      .limit(15)
      .get();

    if (snap.empty) {
      _cache = { block: "", expiresAt: Date.now() + CACHE_TTL_MS };
      return "";
    }

    const docs  = snap.docs.map(d => d.data() as GlobalBibliotecaDoc);
    const lines = docs.map(d => {
      const author = d.author ? ` · ${d.author}` : "";
      return `• "${d.title}"${author} — ${d.synopsis}`;
    });

    const block =
      `\n\nBIBLIOTECA DE SOFIAA — Documentos que has leído e integrado:\n` +
      lines.join("\n") +
      `\n(Cuando sea relevante, usa este conocimiento de forma natural. Menciona el título del documento si lo citas.)`;

    _cache = { block, expiresAt: Date.now() + CACHE_TTL_MS };
    return block;

  } catch {
    // La biblioteca nunca debe romper el chat
    return "";
  }
}
