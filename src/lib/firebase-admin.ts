/**
 * Firebase Admin SDK — TEC BI v1.1
 *
 * Solo corre en el servidor (API routes / Server Components).
 * NUNCA importar desde componentes cliente.
 *
 * CONFIGURACIÓN en .env.local:
 *   FIREBASE_SERVICE_ACCOUNT_BASE64=<base64 del service account JSON>
 *
 * Cómo obtener el service account:
 *   1. Firebase Console → Project Settings → Service Accounts
 *   2. "Generate new private key" → descarga el JSON
 *   3. Codifica: cat service-account.json | base64 | tr -d '\n'
 *   4. Pega el resultado en FIREBASE_SERVICE_ACCOUNT_BASE64
 */

import { cert, getApps, initializeApp, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let app: App | undefined;
let _adminDb: Firestore | undefined;

function initAdmin(): Firestore {
  if (_adminDb) return _adminDb;

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) {
    throw new Error(
      "[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_BASE64 no está configurado.\n" +
      "Sigue las instrucciones en src/lib/firebase-admin.ts para configurarlo."
    );
  }

  const serviceAccount = JSON.parse(
    Buffer.from(b64, "base64").toString("utf-8")
  ) as Parameters<typeof cert>[0];

  app = getApps().find((a) => a.name === "admin") ??
    initializeApp({ credential: cert(serviceAccount) }, "admin");

  _adminDb = getFirestore(app);
  return _adminDb;
}

export const adminDb = new Proxy({} as Firestore, {
  get(_, prop) {
    return initAdmin()[prop as keyof Firestore];
  },
});

/** Helper funcional — para módulos que prefieren llamada explícita */
export function getAdminDb(): Firestore { return initAdmin(); }

/** Retorna la instancia Admin App (útil para firebase-admin/auth) */
export function getAdminApp(): App {
  initAdmin(); // asegura inicialización
  return app!;
}
