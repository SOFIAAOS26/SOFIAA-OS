/**
 * SOFIAA Sprint E — FirestoreProvider
 *
 * Implementación del DataProvider para Firestore.
 * Usa get() puntual — sin onSnapshot, sin listeners permanentes.
 *
 * Cada llamada es atómica: consulta → devuelve → limpia.
 * Máximo 50 documentos por consulta para proteger tokens del prompt.
 */

import type { DataProvider } from "@/core/providers/data.provider";

const MAX_RECORDS = 50;

export class FirestoreProvider implements DataProvider {
  readonly type = "firestore" as const;

  async get(
    config:  Record<string, unknown>,
    params?: Record<string, unknown>
  ): Promise<unknown[]> {
    const { db } = await import("@/lib/firebase");
    const {
      collection,
      getDocs,
      query,
      where,
      limit,
      orderBy,
    } = await import("firebase/firestore");

    const col = config.collection as string;
    if (!col) throw new Error("[FirestoreProvider] config.collection es requerido");

    // Construir query base con límite de seguridad
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const constraints: any[] = [limit(MAX_RECORDS)];

    // Filtro por campo si el LLM lo declaró
    if (params?.campo && params?.valor !== undefined) {
      constraints.unshift(where(params.campo as string, "==", params.valor));
    }

    // Ordenar por campo si se especificó
    if (params?.ordenarPor) {
      const dir = (params.orden as string) === "desc" ? "desc" : "asc";
      constraints.unshift(orderBy(params.ordenarPor as string, dir));
    }

    const q = query(collection(db, col), ...constraints);
    const snap = await getDocs(q);

    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
}

export const firestoreProvider = new FirestoreProvider();
