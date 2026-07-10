/**
 * TEC Bii — Gemini Refinement Engine (Sprint M-7)
 * RUMBO A TIER 4 — Motor de refinamiento cognitivo batch
 *
 * Orquesta tres operaciones sobre TODOS los usuarios con entidades TEC Bii:
 *
 * 1. RE-PUBLISH STALE — Re-publica entidades cuyo lastCognitiveSync tiene > 24h
 *    o que nunca se publicaron (nexoNodeId vacío). Llama a cognitive-publisher.ts.
 *
 * 2. NORA REFLECTION — Ejecuta N.O.R.A. reflection para cada usuario
 *    (el motor ya tiene cooldown interno de 6h, solo genera si toca).
 *
 * 3. CROSS-DOMAIN — Corre análisis cruzado NEXO ↔ TEC Bii para detectar
 *    nuevas hipótesis (el motor tiene su propia lógica anti-duplicado).
 *
 * Persiste un log de la última ejecución en `tec_bii_refine_logs/{runId}`.
 *
 * Solo corre en contexto servidor.
 */

import { getAdminDb }                       from "@/lib/firebase-admin";
import { publishEntityToGraph, TecBiiEntity } from "@/lib/tec-bii/cognitive-publisher";
import { runNoraReflection }                  from "@/lib/tec-bii/nora-reflection";
import { runCrossDomainAnalysis }             from "@/lib/tec-bii/cross-domain";
import type { TecBiiEntityType }              from "@/extensions/tec-bii/schema";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface UserRefineResult {
  uid:               string;
  republished:       number;   // entidades re-publicadas
  noraSkipped:       boolean;
  noraDurationMs:    number;
  crossDomainPairs:  number;
  crossDomainHyp:    number;
  durationMs:        number;
  error?:            string;
}

export interface RefineResult {
  runId:          string;
  usersProcessed: number;
  totalRepublish: number;
  totalNora:      number;   // usuarios con reflexión nueva
  totalXdPairs:   number;
  totalXdHyp:     number;
  durationMs:     number;
  runAt:          number;
  perUser:        UserRefineResult[];
}

// ── Colecciones de entidades TEC Bii ──────────────────────────────────────────

// Nombres de colección con prefijo tec_bii_ (3 segmentos bajo users/{uid})
const TEC_BII_COLLECTIONS: Record<TecBiiEntityType, string> = {
  proyecto:   "tec_bii_proyectos",
  brief:      "tec_bii_briefs",
  empleado:   "tec_bii_empleados",
  proveedor:  "tec_bii_proveedores",
  cliente:    "tec_bii_clientes",
  evaluacion: "tec_bii_evaluaciones",
};

/** Antigüedad máxima de sync antes de re-publicar (24h en ms) */
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// ── Descubrir UIDs con datos TEC Bii ─────────────────────────────────────────

async function discoverTecBiiUsers(): Promise<string[]> {
  const db   = getAdminDb();
  const uids = new Set<string>();

  // Buscar en proyectos — es la colección más probable con datos
  for (const col of Object.values(TEC_BII_COLLECTIONS)) {
    const snap = await db
      .collectionGroup(col)
      .select()
      .limit(300)
      .get();

    snap.docs.forEach((d) => {
      // Path: users/{uid}/tec_bii_{col}/{docId}
      const parts = d.ref.path.split("/");
      if (parts.length >= 2 && parts[0] === "users") {
        uids.add(parts[1]);
      }
    });
  }

  return Array.from(uids);
}

// ── Re-publicar entidades estancadas ─────────────────────────────────────────

async function republishStaleEntities(uid: string): Promise<number> {
  const db    = getAdminDb();
  const now   = Date.now();
  let   count = 0;

  for (const [type, col] of Object.entries(TEC_BII_COLLECTIONS) as [TecBiiEntityType, string][]) {
    const colPath = `users/${uid}/${col}`;
    const snap = await db.collection(colPath).limit(20).get();

    for (const doc of snap.docs) {
      const data = doc.data() as {
        nexoNodeId?:       string;
        lastCognitiveSync?: number;
        nombre?:           string;
        titulo?:           string;
      };

      const isStale = !data.nexoNodeId ||
        !data.lastCognitiveSync ||
        (now - data.lastCognitiveSync) > STALE_THRESHOLD_MS;

      if (isStale) {
        try {
          // Safe cast: doc was read from the correct TEC Bii collection for `type`
          await publishEntityToGraph(uid, type, doc.id, { id: doc.id, ...doc.data() } as TecBiiEntity);
          count++;
        } catch {
          // silencioso — continúa con el siguiente
        }
      }
    }
  }

  return count;
}

// ── Motor principal ───────────────────────────────────────────────────────────

export async function runRefinement(): Promise<RefineResult> {
  const start   = Date.now();
  const runId   = `refine-${start}`;
  const db      = getAdminDb();

  const result: RefineResult = {
    runId,
    usersProcessed: 0,
    totalRepublish: 0,
    totalNora:      0,
    totalXdPairs:   0,
    totalXdHyp:     0,
    durationMs:     0,
    runAt:          start,
    perUser:        [],
  };

  // 1. Descubrir usuarios con datos TEC Bii
  const uids = await discoverTecBiiUsers();
  if (uids.length === 0) {
    result.durationMs = Date.now() - start;
    await persistLog(db, runId, result);
    return result;
  }

  // 2. Procesar cada usuario secuencialmente (evitar rate limits de Gemini)
  for (const uid of uids) {
    const userStart = Date.now();
    const userResult: UserRefineResult = {
      uid,
      republished:      0,
      noraSkipped:      false,
      noraDurationMs:   0,
      crossDomainPairs: 0,
      crossDomainHyp:   0,
      durationMs:       0,
    };

    try {
      // 2a. Re-publicar entidades estancadas
      userResult.republished = await republishStaleEntities(uid);
      result.totalRepublish += userResult.republished;

      // 2b. NORA reflection (respeta cooldown interno de 6h)
      const noraRes = await runNoraReflection(uid, false);
      userResult.noraSkipped  = noraRes.skipped;
      userResult.noraDurationMs = noraRes.durationMs;
      if (!noraRes.skipped) result.totalNora++;

      // 2c. Cross-domain analysis
      const xdRes = await runCrossDomainAnalysis(uid);
      userResult.crossDomainPairs = xdRes.pairsDetected;
      userResult.crossDomainHyp   = xdRes.hypothesesCreated;
      result.totalXdPairs += xdRes.pairsDetected;
      result.totalXdHyp   += xdRes.hypothesesCreated;

    } catch (err) {
      userResult.error = String(err).slice(0, 200);
      console.error(`[tec-bii/refine] uid=${uid} error:`, err);
    }

    userResult.durationMs = Date.now() - userStart;
    result.perUser.push(userResult);
    result.usersProcessed++;
  }

  result.durationMs = Date.now() - start;

  // 3. Persistir log del run
  await persistLog(db, runId, result);

  console.log(
    `[tec-bii/refine] users=${result.usersProcessed} ` +
    `republish=${result.totalRepublish} nora=${result.totalNora} ` +
    `xd_pairs=${result.totalXdPairs} xd_hyp=${result.totalXdHyp} ` +
    `dt=${result.durationMs}ms`
  );

  return result;
}

// ── Persistencia del log ──────────────────────────────────────────────────────

async function persistLog(
  db:    FirebaseFirestore.Firestore,
  runId: string,
  data:  RefineResult,
): Promise<void> {
  try {
    await db.collection("tec_bii_refine_logs").doc(runId).set(data);
  } catch {
    // No bloquear el resultado si falla el log
  }
}

/** Lee el último log de refinamiento para mostrar en el dashboard */
export async function getLastRefineLog(): Promise<RefineResult | null> {
  const db   = getAdminDb();
  const snap = await db
    .collection("tec_bii_refine_logs")
    .orderBy("runAt", "desc")
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0].data() as RefineResult;
}
