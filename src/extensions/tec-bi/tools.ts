/**
 * TEC BI — Tool Handlers
 *
 * Herramientas ejecutables por SOFIAA cuando el LLM las invoca.
 * Cada tool tiene su definición (para el prompt de Groq) y su handler (la acción real).
 *
 * Las acciones de Monday.com usan el adapter ya implementado en src/lib/monday.
 * Las acciones de Firestore usan firebase-admin con import dinámico.
 *
 * Principio LEAN: cada handler falla silenciosamente y loguea el error.
 * El stream del usuario nunca se rompe por un tool que falla.
 */

import type { ExtensionContext, ExtensionToolRegistry } from "@/types/sofiaa-platform";

// ── Definiciones de tools (van al system prompt de Groq) ──────────────────────

const TOOL_DEFS = [
  {
    name: "crear_brief",
    description:
      "Crea un nuevo brief de proyecto en el sistema TEC BI. " +
      "Usar cuando el usuario quiera iniciar un proyecto o documento de trabajo. " +
      "Solicitar: título, tipo (video/evento/campaña), responsable, fecha límite.",
    parameters: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "Título descriptivo del proyecto" },
        tipo: {
          type: "string",
          enum: ["video", "evento", "campaña", "produccion", "otro"],
          description: "Tipo de producción",
        },
        responsable: { type: "string", description: "Nombre del responsable o coordinador" },
        fechaLimite: { type: "string", description: "Fecha límite en formato YYYY-MM-DD" },
        descripcion: { type: "string", description: "Descripción breve del proyecto (opcional)" },
      },
      required: ["titulo", "tipo", "responsable"],
    },
  },
  {
    name: "actualizar_proyecto",
    description:
      "Actualiza el estado o datos de un proyecto existente. " +
      "Usar cuando el usuario indique avance, cambio de estado o reasignación.",
    parameters: {
      type: "object",
      properties: {
        proyectoId: { type: "string", description: "ID del proyecto a actualizar" },
        estado: {
          type: "string",
          enum: ["pendiente", "en_proceso", "revision", "completado", "cancelado"],
          description: "Nuevo estado del proyecto",
        },
        avance: {
          type: "number",
          minimum: 0,
          maximum: 100,
          description: "Porcentaje de avance (0-100)",
        },
        nota: { type: "string", description: "Nota o comentario sobre el cambio (opcional)" },
      },
      required: ["proyectoId"],
    },
  },
  {
    name: "sincronizar_monday",
    description:
      "Sincroniza un proyecto de SOFIAA con el tablero de Monday.com del TEC. " +
      "Usar cuando el usuario pida exportar, sincronizar o reflejar cambios en Monday.",
    parameters: {
      type: "object",
      properties: {
        proyectoId: { type: "string", description: "ID del proyecto en SOFIAA" },
        accion: {
          type: "string",
          enum: ["push", "pull"],
          description:
            "push = enviar cambios de SOFIAA a Monday | pull = traer cambios de Monday a SOFIAA",
        },
      },
      required: ["proyectoId", "accion"],
    },
  },
];

// ── Handlers reales ───────────────────────────────────────────────────────────

async function handleCrearBrief(
  args: Record<string, unknown>,
  ctx: ExtensionContext
): Promise<unknown> {
  const { titulo, tipo, responsable, fechaLimite, descripcion } = args as {
    titulo: string;
    tipo: string;
    responsable: string;
    fechaLimite?: string;
    descripcion?: string;
  };

  try {
    const { getFirestore, Timestamp } = await import("firebase-admin/firestore");
    const db = getFirestore();

    const docRef = db.collection("tec_bi_briefs").doc();
    const brief = {
      id: docRef.id,
      titulo,
      tipo,
      responsable,
      fechaLimite: fechaLimite ?? null,
      descripcion: descripcion ?? "",
      estado: "pendiente",
      avance: 0,
      creadoPor: ctx.userId ?? "sofiaa",
      traceId: ctx.traceId,
      creadoEn: Timestamp.now(),
    };

    await docRef.set(brief);
    console.log(`[TEC-BI][TOOL] crear_brief OK: ${docRef.id} "${titulo}"`);
    return { ok: true, id: docRef.id, titulo };
  } catch (err) {
    console.error("[TEC-BI][TOOL] crear_brief failed:", err);
    return { ok: false, error: "No se pudo crear el brief. Inténtalo desde el módulo de Briefs." };
  }
}

async function handleActualizarProyecto(
  args: Record<string, unknown>,
  ctx: ExtensionContext
): Promise<unknown> {
  const { proyectoId, estado, avance, nota } = args as {
    proyectoId: string;
    estado?: string;
    avance?: number;
    nota?: string;
  };

  try {
    const { getFirestore, Timestamp } = await import("firebase-admin/firestore");
    const db = getFirestore();

    const update: Record<string, unknown> = {
      actualizadoEn: Timestamp.now(),
      traceId: ctx.traceId,
    };
    if (estado !== undefined) update.estado = estado;
    if (avance !== undefined) update.avance = avance;
    if (nota) update.ultimaNota = nota;

    await db.collection("tec_bi_proyectos").doc(proyectoId).update(update);
    console.log(`[TEC-BI][TOOL] actualizar_proyecto OK: ${proyectoId}`);
    return { ok: true, proyectoId, cambios: { estado, avance } };
  } catch (err) {
    console.error("[TEC-BI][TOOL] actualizar_proyecto failed:", err);
    return { ok: false, error: "No se pudo actualizar el proyecto. Verifica el ID." };
  }
}

async function handleSincronizarMonday(
  args: Record<string, unknown>,
  ctx: ExtensionContext
): Promise<unknown> {
  const { proyectoId, accion } = args as {
    proyectoId: string;
    accion: "push" | "pull";
  };

  try {
    // Importación dinámica del Monday adapter (src/lib/monday/)
    const { pushProyectoToMonday, syncEstadoToMonday } = await import("@/lib/monday/sync");

    let result: unknown;
    if (accion === "push") {
      // push: enviar el proyecto a Monday como nuevo item
      const { getFirestore } = await import("firebase-admin/firestore");
      const db = getFirestore();
      const snap = await db.collection("tec_bi_proyectos").doc(proyectoId).get();
      const proyecto = snap.data();
      if (!proyecto) throw new Error(`Proyecto ${proyectoId} no encontrado`);
      result = await pushProyectoToMonday({
        titulo: proyecto.nombre ?? proyecto.titulo ?? proyectoId,
        estado: proyecto.estado ?? "pendiente",
        valorEstimado: proyecto.valorEstimado,
      });
    } else {
      // pull: actualizar estado desde Monday hacia Firestore
      result = await syncEstadoToMonday(proyectoId, "en_proceso");
    }

    console.log(`[TEC-BI][TOOL] sincronizar_monday ${accion} OK: ${proyectoId}`);
    return { ok: true, proyectoId, accion, result };
  } catch (err) {
    console.error("[TEC-BI][TOOL] sincronizar_monday failed:", err);
    return {
      ok: false,
      error: "Sincronización con Monday.com falló. Verifica la conexión en Configuración.",
    };
  }
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

async function tecBiToolHandler(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ExtensionContext
): Promise<unknown> {
  switch (toolName) {
    case "crear_brief":
      return handleCrearBrief(args, ctx);
    case "actualizar_proyecto":
      return handleActualizarProyecto(args, ctx);
    case "sincronizar_monday":
      return handleSincronizarMonday(args, ctx);
    default:
      console.warn(`[TEC-BI][TOOL] unknown tool: ${toolName}`);
      return { ok: false, error: `Herramienta desconocida: ${toolName}` };
  }
}

// ── Export del registry de tools ──────────────────────────────────────────────

export const tecBiTools: ExtensionToolRegistry = {
  tools: TOOL_DEFS,
  handler: tecBiToolHandler,
};
