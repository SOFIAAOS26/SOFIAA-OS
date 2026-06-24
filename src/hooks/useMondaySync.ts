/**
 * useMondaySync — TEC BI v1.1
 * Llama a /api/monday/push después de crear un Brief o Proyecto.
 * Si MONDAY_ENABLED=false (o la API no responde), falla silenciosamente.
 */

export function useMondaySync() {
  const push = async (payload: {
    type: "brief" | "proyecto";
    docId: string;
    titulo: string;
    estado: string;
    tipoProyecto?: string;
    fechaLimite?: string;
    valorEstimado?: number;
  }) => {
    try {
      await fetch("/api/monday/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // Monday sync no bloquea el flujo principal
      console.warn("[useMondaySync] Sync silenciado — Monday no disponible");
    }
  };

  return { push };
}
