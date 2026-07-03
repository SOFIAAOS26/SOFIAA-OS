/**
 * SOFIAA Sprint H-2 — Memory Store
 *
 * Abstracción de persistencia para la memoria a largo plazo.
 *
 * Patrón dual-write:
 *   - Lee de localStorage (siempre disponible, sin latencia)
 *   - Escribe a localStorage + Firestore (async, best-effort)
 *   - Al autenticarse: pull Firestore → localStorage (sync)
 *
 * Beneficios:
 *   - Funciona offline (localStorage)
 *   - Persiste entre dispositivos (Firestore)
 *   - Sin cambios en AdminPanel ni en el flujo de lectura de page.tsx
 *
 * Ruta Firestore: users/{userId}/memory/long_term
 * Campo: content (string)
 */

const LS_KEY     = "sofiaa_long_memory";
const FS_DOC_ID  = "long_term";
const FS_FIELD   = "content";

// ── Helpers Firestore ──────────────────────────────────────────────────────

async function getFirestoreMemoryDoc(userId: string) {
  const { db } = await import("@/lib/firebase");
  const { doc } = await import("firebase/firestore");
  return doc(db, "users", userId, "memory", FS_DOC_ID);
}

// ── API pública ────────────────────────────────────────────────────────────

/**
 * Al autenticarse: baja la memoria de Firestore y actualiza localStorage.
 * Llama esto una sola vez después del login.
 */
export async function syncMemoryFromFirestore(userId: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { getDoc } = await import("firebase/firestore");
    const ref  = await getFirestoreMemoryDoc(userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const remote = snap.get(FS_FIELD) as string | undefined;
      if (remote && remote.trim()) {
        // Firestore gana — es la fuente de verdad multi-dispositivo
        localStorage.setItem(LS_KEY, remote);
        console.info("[SOFIAA][Memory] sincronizado desde Firestore");
      }
    }
    // Si no existe en Firestore pero sí en localStorage → subir
    else {
      const local = localStorage.getItem(LS_KEY);
      if (local) {
        await pushMemoryToFirestore(userId, local);
        console.info("[SOFIAA][Memory] memoria local subida a Firestore");
      }
    }
  } catch (err) {
    // No crítico — fallback a localStorage
    console.warn("[SOFIAA][Memory] sync fallo, usando localStorage:", err);
  }
}

/**
 * Escribe memoria en localStorage inmediatamente
 * y replica a Firestore de forma asíncrona (best-effort).
 */
export function writeLongMemory(userId: string | null, content: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, content);
  if (userId) {
    pushMemoryToFirestore(userId, content).catch(() => {});
  }
}

/**
 * Lee la memoria del localStorage (ya sincronizado con Firestore).
 */
export function readLongMemory(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LS_KEY) ?? "";
}

/**
 * Añade texto a la memoria existente.
 */
export function appendLongMemory(userId: string | null, addition: string): void {
  const existing = readLongMemory();
  const updated  = existing ? `${existing}\n${addition}` : addition;
  writeLongMemory(userId, updated);
}

/**
 * Borra la memoria local y en Firestore.
 */
export async function clearLongMemory(userId: string | null): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.removeItem(LS_KEY);
  }
  if (userId) {
    try {
      const { deleteDoc } = await import("firebase/firestore");
      const ref = await getFirestoreMemoryDoc(userId);
      await deleteDoc(ref);
    } catch {
      // best-effort
    }
  }
}

// ── Firestore write (interno) ──────────────────────────────────────────────

async function pushMemoryToFirestore(userId: string, content: string): Promise<void> {
  const { setDoc, serverTimestamp } = await import("firebase/firestore");
  const ref = await getFirestoreMemoryDoc(userId);
  await setDoc(ref, {
    [FS_FIELD]:  content,
    updatedAt:   serverTimestamp(),
  }, { merge: true });
}
