/**
 * TEC Bii — Tool Handlers v2 (Sprint Q-2)
 *
 * Herramientas ejecutables por SOFIAA para el sistema cognitivo TEC Bii v2.
 * Usan paths Firestore v2: users/{uid}/tec_bii_{type_plural}
 *
 * Nuevas vs v1:
 *   - Paths corregidos (v1 usaba colecciones raíz tec_bi_briefs, tec_bi_proyectos)
 *   - consultar_riesgo — alertas predictivas en tiempo real
 *   - generar_analisis — métricas operacionales para que SOFIAA razone
 *   - listar_proyectos — vista rápida con urgencyScore y estado
 *
 * Principio: cada handler falla silenciosamente (ok: false + mensaje).
 * El stream de SOFIAA nunca se rompe por un tool que falla.
 */

import type { ExtensionContext, ExtensionToolRegistry } from "@/types/sofiaa-platform";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Path de colección TEC Bii v2 para firebase-admin */
function tbPath(uid: string, col: string): string {
  return `users/${uid}/tec_bii_${col}`;
}

// ── Definiciones de tools (van al system prompt de Groq) ──────────────────────

const TOOL_DEFS = [
  {
    name: "crear_brief",
    description:
      "Crea un nuevo brief de proyecto en TEC Bii v2 y lo publica en el grafo cognitivo. " +
      "Usar cuando el usuario quiera iniciar un proyecto o solicitud de producción. " +
      "Solicitar: título, tipo (video/evento/campaña/produccion/otro), responsable. " +
      "Fecha límite y descripción son opcionales.",
    parameters: {
      type: "object",
      properties: {
        titulo:      { type: "string", description: "Título descriptivo del proyecto" },
        tipo: {
          type: "string",
          enum: ["video", "evento", "campaña", "produccion", "otro"],
          description: "Tipo de producción",
        },
        responsable:  { type: "string", description: "Nombre del responsable o coordinador" },
        fechaLimite:  { type: "string", description: "Fecha límite en formato YYYY-MM-DD (opcional)" },
        descripcion:  { type: "string", description: "Descripción breve del proyecto (opcional)" },
      },
      required: ["titulo", "tipo", "responsable"],
    },
  },
  {
    name: "actualizar_proyecto",
    description:
      "Actualiza el estado o avance de un proyecto TEC Bii existente. " +
      "Usar cuando el usuario informe progreso, cambio de estado o reasignación.",
    parameters: {
      type: "object",
      properties: {
        proyectoId: { type: "string", description: "ID del proyecto a actualizar" },
        estado: {
          type: "string",
          enum: ["Pendiente", "En producción", "En revisión", "Entregado", "Cancelado"],
          description: "Nuevo estado del proyecto",
        },
        avance: {
          type: "number",
          minimum: 0,
          maximum: 100,
          description: "Porcentaje de avance (0-100)",
        },
        nota: { type: "string", description: "Nota sobre el cambio (opcional)" },
      },
      required: ["proyectoId"],
    },
  },
  {
    name: "listar_proyectos",
    description:
      "Lista proyectos de TEC Bii con estado, urgencyScore y nivel de riesgo. " +
      "Usar cuando el usuario quiera ver qué proyectos hay, cuáles están activos o cuáles están urgentes.",
    parameters: {
      type: "object",
      properties: {
        estado: {
          type: "string",
          enum: ["Pendiente", "En producción", "En revisión", "Entregado", "Cancelado"],
          description: "Filtrar por estado (omitir para ver todos)",
        },
        limite: {
          type: "number",
          description: "Máximo de proyectos a retornar (default 15)",
        },
      },
    },
  },
  {
    name: "consultar_riesgo",
    description:
      "Consulta entidades en riesgo predictivo: empleados y proveedores con alertaRiesgo activa, " +
      "y proyectos activos con assigneeRisk. " +
      "Usar cuando el usuario pregunte por alertas, riesgos, problemas o quién está en riesgo.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "generar_analisis",
    description:
      "Genera un análisis operacional del estado actual de TEC Bii: " +
      "cuenta proyectos, urgentes, riesgos detectados e incluye los proyectos más urgentes. " +
      "Usar cuando el usuario pida un diagnóstico, resumen del área o análisis de la situación.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
];

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleCrearBrief(
  args: Record<string, unknown>,
  ctx: ExtensionContext
): Promise<unknown> {
  const uid = ctx.userId;
  if (!uid) return { ok: false, error: "Sesión requerida para crear un brief." };

  const { titulo, tipo, responsable, fechaLimite, descripcion } = args as {
    titulo:       string;
    tipo:         string;
    responsable:  string;
    fechaLimite?: string;
    descripcion?: string;
  };

  try {
    const { getFirestore, Timestamp } = await import("firebase-admin/firestore");
    const db = getFirestore();

    const docRef = db.collection(tbPath(uid, "briefs")).doc();
    const brief = {
      id:           docRef.id,
      titulo,
      tipo,
      responsable,
      fechaLimite:  fechaLimite ?? null,
      descripcion:  descripcion ?? "",
      estado:       "Recibido",
      importance:   0.5,
      tags:         [],
      linkedNexoNodes: [],
      hypotheses:   [],
      lastCognitiveSync: 0,
      createdAt:    Timestamp.now().toMillis(),
      updatedAt:    Timestamp.now().toMillis(),
      creadoPor:    uid,
      traceId:      ctx.traceId,
    };

    await docRef.set(brief);
    console.log(`[TEC-Bii][TOOL] crear_brief OK: ${docRef.id} "${titulo}"`);
    return { ok: true, id: docRef.id, titulo, estado: "Recibido" };
  } catch (err) {
    console.error("[TEC-Bii][TOOL] crear_brief failed:", err);
    return { ok: false, error: "No se pudo crear el brief. Intenta desde /tec-bii/briefs." };
  }
}

async function handleActualizarProyecto(
  args: Record<string, unknown>,
  ctx: ExtensionContext
): Promise<unknown> {
  const uid = ctx.userId;
  if (!uid) return { ok: false, error: "Sesión requerida." };

  const { proyectoId, estado, avance, nota } = args as {
    proyectoId:  string;
    estado?:     string;
    avance?:     number;
    nota?:       string;
  };

  try {
    const { getFirestore } = await import("firebase-admin/firestore");
    const db = getFirestore();

    const update: Record<string, unknown> = {
      updatedAt: Date.now(),
      traceId:   ctx.traceId,
    };
    if (estado !== undefined) update.estado  = estado;
    if (avance !== undefined) update.avance  = avance;
    if (nota)                 update.ultimaNota = nota;

    await db.collection(tbPath(uid, "proyectos")).doc(proyectoId).update(update);
    console.log(`[TEC-Bii][TOOL] actualizar_proyecto OK: ${proyectoId}`);
    return { ok: true, proyectoId, cambios: { estado, avance } };
  } catch (err) {
    console.error("[TEC-Bii][TOOL] actualizar_proyecto failed:", err);
    return { ok: false, error: "No se pudo actualizar el proyecto. Verifica el ID." };
  }
}

async function handleListarProyectos(
  args: Record<string, unknown>,
  ctx: ExtensionContext
): Promise<unknown> {
  const uid = ctx.userId;
  if (!uid) return { ok: false, error: "Sesión requerida." };

  const { estado, limite } = args as { estado?: string; limite?: number };
  const maxItems = Math.min(limite ?? 15, 30);

  try {
    const { getFirestore } = await import("firebase-admin/firestore");
    const db = getFirestore();

    let q = db
      .collection(tbPath(uid, "proyectos"))
      .orderBy("createdAt", "desc")
      .limit(maxItems);

    if (estado) {
      q = db
        .collection(tbPath(uid, "proyectos"))
        .where("estado", "==", estado)
        .orderBy("createdAt", "desc")
        .limit(maxItems);
    }

    const snap = await q.get();
    const proyectos = snap.docs.map((d) => {
      const data = d.data();
      return {
        id:           d.id,
        titulo:       data.titulo ?? "Sin título",
        estado:       data.estado ?? "Pendiente",
        urgencia:     Math.round((data.urgencyScore ?? 0) * 100),
        riesgo:       data.riskLevel ?? "bajo",
        asigneeRisk:  data.assigneeRisk ?? false,
        valorMXN:     data.valorEstimado ?? 0,
        en_grafo:     !!data.nexoNodeId,
      };
    });

    return {
      ok:        true,
      total:     proyectos.length,
      proyectos,
      filtro:    estado ?? "todos",
    };
  } catch (err) {
    console.error("[TEC-Bii][TOOL] listar_proyectos failed:", err);
    return { ok: false, error: "No se pudieron cargar los proyectos." };
  }
}

async function handleConsultarRiesgo(
  _args: Record<string, unknown>,
  ctx: ExtensionContext
): Promise<unknown> {
  const uid = ctx.userId;
  if (!uid) return { ok: false, error: "Sesión requerida." };

  const ESTADOS_ACTIVOS = ["Pendiente", "En producción", "En revisión"];

  try {
    const { getFirestore } = await import("firebase-admin/firestore");
    const db = getFirestore();

    const [snapEmp, snapProv, snapProy] = await Promise.all([
      db.collection(tbPath(uid, "empleados")).where("alertaRiesgo", "==", true).get(),
      db.collection(tbPath(uid, "proveedores")).where("alertaRiesgo", "==", true).get(),
      db.collection(tbPath(uid, "proyectos")).get(),
    ]);

    const empleadosRiesgo = snapEmp.docs
      .map((d) => d.data())
      .filter((e) => (e.totalEvaluaciones ?? 0) > 0)
      .map((e) => ({
        nombre:          e.nombre,
        calidadPromedio: (e.calidadPromedio ?? 0).toFixed(1),
        cumplimiento:    Math.round((e.cumplimientoRate ?? 0) * 100),
        tendencia:       e.tendenciaCalidad ?? "estable",
        evaluaciones:    e.totalEvaluaciones ?? 0,
      }));

    const proveedoresRiesgo = snapProv.docs
      .map((d) => d.data())
      .filter((p) => (p.totalEvaluaciones ?? 0) > 0)
      .map((p) => ({
        nombre:          p.nombre,
        tipoServicio:    p.tipoServicio,
        calidadPromedio: (p.calidadPromedio ?? 0).toFixed(1),
        cumplimiento:    Math.round((p.cumplimientoRate ?? 0) * 100),
        variacionCosto:  p.variacionCosto ?? 0,
        evaluaciones:    p.totalEvaluaciones ?? 0,
      }));

    const proyectosRiesgo = snapProy.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p: Record<string, unknown>) =>
        p.assigneeRisk === true && ESTADOS_ACTIVOS.includes(p.estado as string)
      )
      .map((p: Record<string, unknown>) => ({
        id:      p.id,
        titulo:  p.titulo,
        estado:  p.estado,
        urgencia: Math.round(((p.urgencyScore as number) ?? 0) * 100),
      }));

    return {
      ok: true,
      empleadosRiesgo,
      proveedoresRiesgo,
      proyectosRiesgo,
      totalAlertas:
        empleadosRiesgo.length + proveedoresRiesgo.length + proyectosRiesgo.length,
    };
  } catch (err) {
    console.error("[TEC-Bii][TOOL] consultar_riesgo failed:", err);
    return { ok: false, error: "No se pudieron cargar las alertas de riesgo." };
  }
}

async function handleGenerarAnalisis(
  _args: Record<string, unknown>,
  ctx: ExtensionContext
): Promise<unknown> {
  const uid = ctx.userId;
  if (!uid) return { ok: false, error: "Sesión requerida." };

  try {
    const { getFirestore } = await import("firebase-admin/firestore");
    const db = getFirestore();

    const [snapProy, snapEmp, snapProv] = await Promise.all([
      db.collection(tbPath(uid, "proyectos")).orderBy("createdAt", "desc").limit(30).get(),
      db.collection(tbPath(uid, "empleados")).get(),
      db.collection(tbPath(uid, "proveedores")).get(),
    ]);

    const proyectos  = snapProy.docs.map((d) => d.data());
    const empleados  = snapEmp.docs.map((d)  => d.data());
    const proveedores = snapProv.docs.map((d) => d.data());

    const activos   = proyectos.filter((p) => p.estado === "En producción");
    const revision  = proyectos.filter((p) => p.estado === "En revisión");
    const pendientes = proyectos.filter((p) => p.estado === "Pendiente");
    const urgentes  = proyectos.filter((p) => (p.urgencyScore ?? 0) >= 0.7);
    const enGrafo   = proyectos.filter((p) => !!p.nexoNodeId);
    const conRiesgoAsignado = proyectos.filter(
      (p) => p.assigneeRisk === true &&
        ["Pendiente", "En producción", "En revisión"].includes(p.estado)
    );

    const empRiesgo = empleados.filter((e) => e.alertaRiesgo === true);
    const provRiesgo = proveedores.filter((p) => p.alertaRiesgo === true);

    const topUrgentes = urgentes
      .sort((a, b) => (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0))
      .slice(0, 5)
      .map((p) => ({
        titulo:   p.titulo,
        urgencia: Math.round((p.urgencyScore ?? 0) * 100),
        estado:   p.estado,
      }));

    const valorTotal = activos.reduce(
      (sum, p) => sum + (p.valorEstimado ?? 0), 0
    );

    return {
      ok:               true,
      resumen_numerico: {
        total_proyectos:       proyectos.length,
        en_produccion:         activos.length,
        en_revision:           revision.length,
        pendientes:            pendientes.length,
        urgentes:              urgentes.length,
        en_grafo_cognitivo:    enGrafo.length,
        proyectos_en_riesgo:   conRiesgoAsignado.length,
        empleados_en_riesgo:   empRiesgo.length,
        proveedores_en_riesgo: provRiesgo.length,
        valor_activo_mxn:      valorTotal,
      },
      top_urgentes: topUrgentes,
      alertas: {
        hay_riesgos: conRiesgoAsignado.length > 0 || empRiesgo.length > 0 || provRiesgo.length > 0,
        descripcion: empRiesgo.length > 0
          ? `${empRiesgo.length} empleado(s) y ${provRiesgo.length} proveedor(es) en alerta predictiva.`
          : provRiesgo.length > 0
          ? `${provRiesgo.length} proveedor(es) en alerta predictiva.`
          : "Sin alertas activas.",
      },
    };
  } catch (err) {
    console.error("[TEC-Bii][TOOL] generar_analisis failed:", err);
    return { ok: false, error: "No se pudo generar el análisis." };
  }
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

async function tecBiiToolHandler(
  toolName: string,
  args:     Record<string, unknown>,
  ctx:      ExtensionContext
): Promise<unknown> {
  switch (toolName) {
    case "crear_brief":         return handleCrearBrief(args, ctx);
    case "actualizar_proyecto": return handleActualizarProyecto(args, ctx);
    case "listar_proyectos":    return handleListarProyectos(args, ctx);
    case "consultar_riesgo":    return handleConsultarRiesgo(args, ctx);
    case "generar_analisis":    return handleGenerarAnalisis(args, ctx);
    default:
      console.warn(`[TEC-Bii][TOOL] unknown tool: ${toolName}`);
      return { ok: false, error: `Herramienta desconocida: ${toolName}` };
  }
}

// ── Export ────────────────────────────────────────────────────────────────────

export const tecBiiTools: ExtensionToolRegistry = {
  tools:   TOOL_DEFS,
  handler: tecBiiToolHandler,
};
