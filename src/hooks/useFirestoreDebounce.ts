/**
 * SOFIAA 1.1.4 — Firestore Write Debounce Hook
 *
 * Evita escrituras excesivas en Firestore durante el streaming.
 * El LLM genera tokens a ~50/seg — sin debounce, cada token
 * dispararía un write a Firebase. Con 800ms de espera, solo
 * se escribe cuando el usuario termina de leer/escribir.
 *
 * Uso:
 *   const saveMemory = useFirestoreDebounce(writeToFirestore, 800);
 *   saveMemory(data); // llamar en cada token — solo el último persiste
 */

import { useRef, useCallback } from "react";

/**
 * Retorna una función debounced que envuelve `writer`.
 * Solo ejecuta el write cuando no hay nueva llamada en `delayMs`.
 *
 * @param writer  Función async que persiste en Firestore
 * @param delayMs Tiempo de espera en ms (default: 800)
 */
export function useFirestoreDebounce<T>(
  writer: (data: T) => Promise<void>,
  delayMs: number = 800
): (data: T) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debounced = useCallback(
    (data: T) => {
      // Cancelar el write anterior si aún está pendiente
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Programar el nuevo write
      timerRef.current = setTimeout(() => {
        writer(data).catch((err) =>
          console.error("[SOFIAA][DEBOUNCE] Firestore write failed:", err)
        );
      }, delayMs);
    },
    [writer, delayMs]
  );

  return debounced;
}

/**
 * Versión sin hook (para uso fuera de componentes React).
 * Útil en route.ts o workers donde no hay contexto de React.
 *
 * @param writer  Función async a debounce-ar
 * @param delayMs Tiempo de espera en ms (default: 800)
 */
export function createDebounce<T>(
  writer: (data: T) => Promise<void>,
  delayMs: number = 800
): (data: T) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (data: T) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      writer(data).catch((err) =>
        console.error("[SOFIAA][DEBOUNCE] write failed:", err)
      );
    }, delayMs);
  };
}
