/**
 * HERMES — Extension Tools (Sprint H-5)
 *
 * 4 herramientas que SOFIAA puede invocar desde el chat para reportar
 * el estado del motor de ejecución sin comprometer la seguridad.
 *
 * IMPORTANTE: Estas herramientas son de LECTURA ÚNICAMENTE.
 * HERMES nunca ejecuta acciones desde el chat — solo desde la UI con
 * aprobación explícita del usuario (Human Approval Gate).
 *
 * Herramientas:
 *   1. hermes_resumen      — KPIs globales: pendientes, completadas hoy, fallidas
 *   2. hermes_cola         — acciones pendientes_aprobacion ordenadas por urgencia
 *   3. hermes_historial    — acciones completadas/fallidas/rechazadas recientes
 *   4. hermes_accion_detalle — detalle completo de una acción por ID
 *
 * Estrategia workspaceId: auto-detect el primero si no se provee.
 */

import type { ExtensionToolRegistry, ExtensionContext } from "@/types/sofiaa-platform";
import type { HermesAction, HermesUrgencia } from "@/extensions/hermes/schema";

// ── Helper: Firestore admin ───────────────────────────────────────────────────

async function getDb() {
  const { getFirestore } = await import("firebase-admin/firestore");
  return getFirestore();
}

// ── Helper: resolver workspaceId ──────────────────────────────────────────────

async function resolveWorkspace(provided?: string): Promise<string | null> {
  if (provided?.trim()) return provided.trim();
  const db = await getDb();
  const snap = await db.collection("smm_workspaces").limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].id;
}

// ── Helper: path ──────────────────────────────────────────────────────────────

function queuePath(workspaceId: string) {
  return `smm_workspaces/${workspaceId}/hermes_queue`;
}

// ── Orden de urgencia ─────────────────────────────────────────────────────────

const URGENCIA_ORDER: Record<HermesUrgencia, number> = {
  CRITICA: 0,
  ALTA:    1,
  MEDIA:   2,
  BAJA:    3,
};

// ── Tool: hermes_resumen ──────────────────────────────────────────────────────

async function hermes_resumen(
  args: Record<string, unknown>,
  _ctx: ExtensionContext,
) {
  const workspaceId = await resolveWorkspace(args.workspaceId as string | undefined);
  if (!workspaceId) return { error: "No hay workspaces configurados en HERMES." };

  const db = await getDb();
  const snap = await db.collection(queuePath(workspaceId)).get();

  if (snap.empty) {
    return {
      workspaceId,
      mensaje: "No hay acciones en la cola de HERMES.",
      pendientes: 0,
      completadas: 0,
      fallidas: 0,
      rechazadas: 0,
      total: 0,
    };
  }

  const actions = snap.docs.map((d) => d.data() as Omit<HermesAction, "id">);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const hoyTs = hoy.getTime();

  const pendientes  = actions.filter((a) => a.estado === "pendiente_aprobacion");
  const completadas = actions.filter((a) => a.estado === "completada");
  const fallidas    = actions.filter((a) => a.estado === "fallida");
  const rechazadas  = actions.filter((a) => a.estado === "rechazada");

  const completadasHoy = completadas.filter((a) => (a.completadoAt ?? 0) >= hoyTs);
  const fallidasHoy    = fallidas.filter((a)    => (a.completadoAt ?? a.executedAt ?? 0) >= hoyTs);

  const criticas = pendientes.filter((a) => a.urgencia === "CRITICA");
  const altas    = pendientes.filter((a) => a.urgencia === "ALTA");

  // Conector más usado en completadas
  const connCount: Record<string, number> = {};
  for (const a of completadas) {
    connCount[a.connectorTipo] = (connCount[a.connectorTipo] ?? 0) + 1;
  }
  const connTop = Object.entries(connCount).sort((x, y) => y[1] - x[1])[0]?.[0] ?? "—";

  // Motor más activo
  const engineCount: Record<string, number> = {};
  for (const a of actions) {
    engineCount[a.sourceEngine] = (engineCount[a.sourceEngine] ?? 0) + 1;
  }
  const engineTop = Object.entries(engineCount).sort((x, y) => y[1] - x[1])[0]?.[0] ?? "—";

  const tasaExito = completadas.length > 0
    ? Math.round((completadas.length / (completadas.length + fallidas.length)) * 100)
    : null;

  return {
    workspaceId,
    pendientesAprobacion:    pendientes.length,
    pendientesCriticos:      criticas.length,
    pendientesAltos:         altas.length,
    completadasTotal:        completadas.length,
    completadasHoy:          completadasHoy.length,
    fallidasTotal:           fallidas.length,
    fallidasHoy:             fallidasHoy.length,
    rechazadasTotal:         rechazadas.length,
    total:                   actions.length,
    tasaExitoPct:            tasaExito,
    connectorMasUsado:       connTop,
    motorMasActivo:          engineTop,
    urlCola:                 "/hermes/cola",
    urlHistorial:            "/hermes/historial",
  };
}

// ── Tool: hermes_cola ─────────────────────────────────────────────────────────

async function hermes_cola(
  args: Record<string, unknown>,
  _ctx: ExtensionContext,
) {
  const workspaceId = await resolveWorkspace(args.workspaceId as string | undefined);
  if (!workspaceId) return { error: "No hay workspaces configurados en HERMES." };

  const db   = await getDb();
  const snap = await db
    .collection(queuePath(workspaceId))
    .where("estado", "==", "pendiente_aprobacion")
    .get();

  if (snap.empty) {
    return {
      workspaceId,
      mensaje: "No hay acciones pendientes de aprobación. Todo está al día.",
      acciones: [],
    };
  }

  const acciones = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as HermesAction))
    .sort((a, b) => {
      const urgDiff = URGENCIA_ORDER[a.urgencia] - URGENCIA_ORDER[b.urgencia];
      return urgDiff !== 0 ? urgDiff : b.createdAt - a.createdAt;
    })
    .slice(0, 10)
    .map((a) => ({
      id:            a.id,
      urgencia:      a.urgencia,
      titulo:        a.titulo,
      descripcion:   a.descripcion,
      justificacion: a.justificacion,
      conector:      a.connectorTipo,
      motor:         a.sourceEngine,
      cliente:       a.clienteNombre ?? a.clienteId ?? null,
      createdAt:     new Date(a.createdAt).toISOString(),
    }));

  const criticas = acciones.filter((a) => a.urgencia === "CRITICA").length;
  const altas    = acciones.filter((a) => a.urgencia === "ALTA").length;

  return {
    workspaceId,
    totalPendientes:   snap.size,
    mostrandoTop:      acciones.length,
    criticas,
    altas,
    acciones,
    urlCola: "/hermes/cola",
    instruccion: "El usuario debe aprobar cada acción en /hermes/cola. SOFIAA nunca ejecuta acciones directamente.",
  };
}

// ── Tool: hermes_historial ────────────────────────────────────────────────────

async function hermes_historial(
  args: Record<string, unknown>,
  _ctx: ExtensionContext,
) {
  const workspaceId = await resolveWorkspace(args.workspaceId as string | undefined);
  if (!workspaceId) return { error: "No hay workspaces configurados en HERMES." };

  const estado = (args.estado as string | undefined) ?? "completada";
  const limite = Math.min(Number(args.limite ?? 8), 20);

  const db   = await getDb();
  const snap = await db
    .collection(queuePath(workspaceId))
    .where("estado", "==", estado)
    .get();

  if (snap.empty) {
    return {
      workspaceId,
      estado,
      mensaje: `No hay acciones con estado "${estado}".`,
      acciones: [],
    };
  }

  const acciones = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as HermesAction))
    .sort((a, b) => {
      const tsA = a.completadoAt ?? a.executedAt ?? a.createdAt;
      const tsB = b.completadoAt ?? b.executedAt ?? b.createdAt;
      return tsB - tsA;
    })
    .slice(0, limite)
    .map((a) => ({
      id:           a.id,
      estado:       a.estado,
      urgencia:     a.urgencia,
      titulo:       a.titulo,
      conector:     a.connectorTipo,
      motor:        a.sourceEngine,
      cliente:      a.clienteNombre ?? a.clienteId ?? null,
      exitoso:      a.resultado?.exito ?? null,
      mensajeResult: a.resultado?.mensaje ?? null,
      linkAccion:   a.resultado?.linkAccion ?? null,
      fechaFin:     a.completadoAt
        ? new Date(a.completadoAt).toISOString()
        : a.executedAt
        ? new Date(a.executedAt).toISOString()
        : null,
    }));

  return {
    workspaceId,
    estado,
    total:    snap.size,
    mostrando: acciones.length,
    acciones,
    urlHistorial: "/hermes/historial",
  };
}

// ── Tool: hermes_accion_detalle ───────────────────────────────────────────────

async function hermes_accion_detalle(
  args: Record<string, unknown>,
  _ctx: ExtensionContext,
) {
  const workspaceId = await resolveWorkspace(args.workspaceId as string | undefined);
  if (!workspaceId) return { error: "No hay workspaces configurados en HERMES." };

  const actionId = String(args.actionId ?? "").trim();
  if (!actionId) return { error: "Se requiere actionId para consultar el detalle de una acción." };

  const db  = await getDb();
  const ref = db.doc(`${queuePath(workspaceId)}/${actionId}`);
  const doc = await ref.get();

  if (!doc.exists) {
    return { error: `Acción ${actionId} no encontrada en el workspace ${workspaceId}.` };
  }

  const a = { id: doc.id, ...doc.data() } as HermesAction;
  return {
    id:            a.id,
    estado:        a.estado,
    urgencia:      a.urgencia,
    titulo:        a.titulo,
    descripcion:   a.descripcion,
    justificacion: a.justificacion,
    tipo:          a.tipo,
    conector:      a.connectorTipo,
    motor:         a.sourceEngine,
    cliente:       a.clienteNombre ?? a.clienteId ?? null,
    sourceBriefId: a.sourceBriefId ?? null,
    sourceGoalId:  a.sourceGoalId ?? null,
    reintentos:    a.reintentos,
    resultado:     a.resultado ?? null,
    payload:       a.payload,
    creadoAt:      new Date(a.createdAt).toISOString(),
    aprobadoAt:    a.aprobadoAt  ? new Date(a.aprobadoAt).toISOString()  : null,
    completadoAt:  a.completadoAt ? new Date(a.completadoAt).toISOString() : null,
    motivoRechazo: a.motivoRechazo ?? null,
  };
}

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOL_DEFS = [
  {
    name: "hermes_resumen",
    description:
      "Retorna un resumen ejecutivo del motor de ejecución HERMES: acciones pendientes de aprobación " +
      "(total, críticas, altas), completadas hoy, fallidas, tasa de éxito, conector y motor más activos. " +
      "Usar cuando el usuario pregunte cuántas acciones hay pendientes, qué ejecutó HERMES hoy, " +
      "o el estado general del motor de ejecución.",
    parameters: {
      type: "object",
      properties: {
        workspaceId: { type: "string", description: "ID del workspace (opcional, se auto-detecta)" },
      },
      required: [],
    },
  },
  {
    name: "hermes_cola",
    description:
      "Lista las acciones pendientes de aprobación en HERMES, ordenadas de mayor a menor urgencia " +
      "(CRITICA → ALTA → MEDIA → BAJA). Incluye título, descripción, justificación del motor, " +
      "conector objetivo y cliente afectado. " +
      "Usar cuando el usuario pregunte qué acciones están esperando aprobación, qué decidió PROMETEO, " +
      "qué detectó ATENA, o qué necesita revisión urgente.",
    parameters: {
      type: "object",
      properties: {
        workspaceId: { type: "string", description: "ID del workspace (opcional, se auto-detecta)" },
      },
      required: [],
    },
  },
  {
    name: "hermes_historial",
    description:
      "Retorna las acciones más recientes de HERMES por estado: completada, fallida o rechazada. " +
      "Incluye resultado de ejecución, enlace a la tarea/post creado, y timestamps. " +
      "Usar cuando el usuario pregunte qué ejecutó HERMES, si una acción tuvo éxito, " +
      "por qué falló algo, o qué acciones rechazó.",
    parameters: {
      type: "object",
      properties: {
        workspaceId: {
          type: "string",
          description: "ID del workspace (opcional, se auto-detecta)",
        },
        estado: {
          type: "string",
          enum: ["completada", "fallida", "rechazada", "ejecutando", "aprobada"],
          description: "Estado de las acciones a consultar (default: completada)",
        },
        limite: {
          type: "number",
          description: "Máximo de acciones a retornar (default: 8, max: 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "hermes_accion_detalle",
    description:
      "Retorna el detalle completo de una acción de HERMES por su ID: payload completo, " +
      "resultado de ejecución, historial de reintentos, y razón de rechazo si aplica. " +
      "Usar cuando el usuario mencione un ID específico o quiera profundizar en una acción particular.",
    parameters: {
      type: "object",
      properties: {
        workspaceId: {
          type: "string",
          description: "ID del workspace (opcional, se auto-detecta)",
        },
        actionId: {
          type: "string",
          description: "ID de la acción en Firestore (requerido)",
        },
      },
      required: ["actionId"],
    },
  },
];

// ── Registry ──────────────────────────────────────────────────────────────────

export const hermesTools: ExtensionToolRegistry = {
  tools: TOOL_DEFS,

  handler: async (toolName, args, ctx) => {
    switch (toolName) {
      case "hermes_resumen":        return hermes_resumen(args, ctx);
      case "hermes_cola":           return hermes_cola(args, ctx);
      case "hermes_historial":      return hermes_historial(args, ctx);
      case "hermes_accion_detalle": return hermes_accion_detalle(args, ctx);
      default:
        throw new Error(`[HERMES] Tool desconocida: ${toolName}`);
    }
  },
};
