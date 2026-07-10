/**
 * TEC Bii — Cognitive Publisher (Sprint T2-1)
 * RUMBO A TIER 4
 *
 * Publica entidades TEC Bii al Experience Graph de N.E.X.O.
 * Por cada entidad creada o actualizada:
 *   1. Genera un resumen en lenguaje natural con Gemini Flash
 *   2. Genera un embedding con gemini-embedding-001 (3072 dims)
 *   3. Construye un NexoNode con source "tec_bii"
 *   4. Upserta el nodo en users/{uid}/nexo_nodes
 *   5. Actualiza el documento TEC Bii con nexoNodeId + aiSummary
 *
 * Solo corre en contexto servidor (usa firebase-admin + Gemini API directa).
 */

import { generateEmbedding }  from "@/lib/nexo/embeddings";
import { upsertNexoNode }     from "@/lib/nexo/firestore";
import { getAdminDb }         from "@/lib/firebase-admin";
import { tecBiiPath }         from "@/lib/tec-bii/collections";
import { callGroq }           from "@/lib/groq";
import type { NexoNode }      from "@/types/nexo";
import {
  NEXO_INITIAL_WEIGHT,
  NEXO_DECAY_RATE,
} from "@/types/nexo";
import type {
  ProyectoV2, BriefV2, EmpleadoV2,
  ProveedorV2, ClienteInternoV2, EvaluacionV2,
  TecBiiEntityType,
} from "@/extensions/tec-bii/schema";
import { calcularImportancia } from "@/extensions/tec-bii/schema";

// ── Tipo unión de entidades ───────────────────────────────────────────────────

export type TecBiiEntity =
  | ProyectoV2 | BriefV2 | EmpleadoV2
  | ProveedorV2 | ClienteInternoV2 | EvaluacionV2;

// ── Resumen con Gemini Flash ──────────────────────────────────────────────────

async function generateEntitySummary(
  entityType: TecBiiEntityType,
  entity:     TecBiiEntity,
): Promise<string> {
  const prompt = buildSummaryPrompt(entityType, entity);
  const result = await callGroq(prompt, { maxTokens: 180, temperature: 0.3 });
  return result?.trim() ?? buildFallbackSummary(entityType, entity);
}

function buildSummaryPrompt(entityType: TecBiiEntityType, entity: TecBiiEntity): string {
  const base = `Genera un resumen conciso (máximo 80 palabras, en español) de esta entidad del sistema de producción audiovisual del TEC de Monterrey. El resumen debe capturar el contexto operacional clave para que una IA pueda razonar sobre esta entidad al contestar preguntas sobre el área.\n\n`;

  switch (entityType) {
    case "proyecto": {
      const p = entity as ProyectoV2;
      return base +
        `PROYECTO: "${p.titulo}"\n` +
        `Estado: ${p.estado} | Urgencia: ${Math.round((p.urgencyScore ?? 0) * 100)}%\n` +
        `Valor estimado: $${(p.valorEstimado ?? 0).toLocaleString("es-MX")} MXN\n` +
        `Tipo asignación: ${p.tipoAsignacion} | Alcance: ${p.tipoAlcance}\n` +
        `Notas: ${p.notas || "—"}`;
    }
    case "brief": {
      const b = entity as BriefV2;
      return base +
        `BRIEF: "${b.titulo}"\n` +
        `Tipo: ${b.tipoProyecto} | Estado: ${b.estado}\n` +
        `Descripción: ${b.descripcion?.slice(0, 200)}\n` +
        `Entregables: ${b.entregables?.join(", ") || "—"}`;
    }
    case "empleado": {
      const e = entity as EmpleadoV2;
      return base +
        `EMPLEADO: ${e.nombre}\n` +
        `Puesto: ${e.puesto} | Departamento: ${e.departamento}\n` +
        `Proyectos totales: ${e.proyectosTotales ?? 0}\n` +
        `Calidad promedio: ${e.calidadPromedio ?? "—"}/5 | Carga actual: ${Math.round((e.cargaActual ?? 0) * 100)}%`;
    }
    case "proveedor": {
      const p = entity as ProveedorV2;
      return base +
        `PROVEEDOR: ${p.nombre}\n` +
        `Tipo de servicio: ${p.tipoServicio}\n` +
        `Proyectos: ${p.proyectosTotales ?? 0} | Confiabilidad: ${Math.round((p.reliabilityScore ?? 0) * 100)}%\n` +
        `Costo promedio: $${(p.costoPromedio ?? 0).toLocaleString("es-MX")} MXN`;
    }
    case "cliente": {
      const c = entity as ClienteInternoV2;
      return base +
        `CLIENTE INTERNO: ${c.departamento}\n` +
        `Responsable: ${c.nombreResponsable} | ${c.campusONacional}\n` +
        `Briefs totales: ${c.briefsTotales ?? 0}\n` +
        `Satisfacción: ${c.satisfaccionPromedio ?? "—"}/5`;
    }
    case "evaluacion": {
      const e = entity as EvaluacionV2;
      return base +
        `EVALUACIÓN — Proyecto: ${e.proyectoId}\n` +
        `Tipo: ${e.tipo} | Valor: $${(e.valorProyecto ?? 0).toLocaleString("es-MX")} MXN\n` +
        `Calidad: ${e.metricas?.calidadGeneral}/5 | Cumplimiento: ${e.cumplimientoTiempo}\n` +
        `Feedback: ${e.feedback?.slice(0, 150) || "—"}`;
    }
  }
}

function buildFallbackSummary(entityType: TecBiiEntityType, entity: TecBiiEntity): string {
  switch (entityType) {
    case "proyecto":   return `Proyecto: ${(entity as ProyectoV2).titulo} — ${(entity as ProyectoV2).estado}`;
    case "brief":      return `Brief: ${(entity as BriefV2).titulo} — ${(entity as BriefV2).tipoProyecto}`;
    case "empleado":   return `Empleado: ${(entity as EmpleadoV2).nombre} — ${(entity as EmpleadoV2).puesto}`;
    case "proveedor":  return `Proveedor: ${(entity as ProveedorV2).nombre} — ${(entity as ProveedorV2).tipoServicio}`;
    case "cliente":    return `Cliente: ${(entity as ClienteInternoV2).departamento}`;
    case "evaluacion": return `Evaluación del proyecto ${(entity as EvaluacionV2).proyectoId}`;
  }
}

// ── Título legible para el LLM ────────────────────────────────────────────────

function getEntityTitle(entityType: TecBiiEntityType, entity: TecBiiEntity): string {
  switch (entityType) {
    case "proyecto":   return `[TEC·Proyecto] ${(entity as ProyectoV2).titulo}`;
    case "brief":      return `[TEC·Brief] ${(entity as BriefV2).titulo}`;
    case "empleado":   return `[TEC·Empleado] ${(entity as EmpleadoV2).nombre}`;
    case "proveedor":  return `[TEC·Proveedor] ${(entity as ProveedorV2).nombre}`;
    case "cliente":    return `[TEC·Cliente] ${(entity as ClienteInternoV2).departamento}`;
    case "evaluacion": return `[TEC·Evaluación] ${(entity as EvaluacionV2).proyectoId}`;
  }
}

// ── Importancia para el grafo ─────────────────────────────────────────────────

function computeImportance(entityType: TecBiiEntityType, entity: TecBiiEntity): number {
  if (entityType === "proyecto") return calcularImportancia(entity as ProyectoV2);
  if (entityType === "brief")    return Math.min(1, (entity as BriefV2).urgencyScore ?? 0.5);
  if (entityType === "empleado") return 0.55;   // personas son relevantes de base
  if (entityType === "proveedor") return 0.5;
  if (entityType === "cliente")   return 0.5;
  if (entityType === "evaluacion") return 0.45;
  return 0.5;
}

// ── Auto-tags ─────────────────────────────────────────────────────────────────

function buildTags(entityType: TecBiiEntityType, entity: TecBiiEntity): string[] {
  const tags: string[] = [entityType, "tec-bii"];
  switch (entityType) {
    case "proyecto": {
      const p = entity as ProyectoV2;
      if (p.estado)         tags.push(p.estado.toLowerCase().replace(/ /g, "-"));
      if (p.tipoAsignacion) tags.push(p.tipoAsignacion.toLowerCase());
      if ((p.urgencyScore ?? 0) > 0.7) tags.push("urgente");
      break;
    }
    case "brief": {
      const b = entity as BriefV2;
      if (b.tipoProyecto) tags.push(b.tipoProyecto.toLowerCase().replace(/ /g, "-"));
      if (b.estado)       tags.push(b.estado.toLowerCase().replace(/ /g, "-"));
      break;
    }
    case "empleado": {
      const e = entity as EmpleadoV2;
      if (e.puesto) tags.push(e.puesto.toLowerCase().replace(/ /g, "-"));
      break;
    }
    case "proveedor": {
      const p = entity as ProveedorV2;
      if (p.tipoServicio) tags.push(p.tipoServicio.toLowerCase().replace(/ /g, "-"));
      break;
    }
  }
  return tags;
}

// ── Publisher principal ───────────────────────────────────────────────────────

export interface PublishResult {
  nexoNodeId: string;
  aiSummary:  string;
}

/**
 * Publica una entidad TEC Bii al Experience Graph.
 *
 * @param uid        UID del usuario — scoping del grafo
 * @param entityType Tipo de entidad TEC Bii
 * @param entityId   ID del documento en Firestore
 * @param entity     Datos actuales de la entidad
 */
export async function publishEntityToGraph(
  uid:        string,
  entityType: TecBiiEntityType,
  entityId:   string,
  entity:     TecBiiEntity,
): Promise<PublishResult> {
  const now        = Date.now();
  const nodeId     = `tec-bii:${entityType}:${entityId}`;
  const title      = getEntityTitle(entityType, entity);
  const aiSummary  = await generateEntitySummary(entityType, entity);
  const embedding  = await generateEmbedding(`${title}. ${aiSummary}`);
  const importance = computeImportance(entityType, entity);

  const node: NexoNode = {
    id:             nodeId,
    type:           "captured",
    category:       "work",
    title,
    summary:        aiSummary,
    entities:       {},
    url:            null,
    imageUrl:       null,
    source:         "tec_bii",
    weight:         Math.max(NEXO_INITIAL_WEIGHT, importance),
    importanceScore: importance,
    decayRate:      0.03,          // TEC Bii decae más lento que capturas web
    lastReinforced: now,
    capturedAt:     now,
    createdAt:      now,
    ...(embedding ? { embedding } : {}),
  };

  await upsertNexoNode(uid, node);

  // Actualizar el documento TEC Bii con cognitiveFootprint
  try {
    const db = getAdminDb();
    await db
      .collection(tecBiiPath(uid, entityType))
      .doc(entityId)
      .update({
        nexoNodeId:        nodeId,
        aiSummary,
        lastCognitiveSync: now,
        ...((!entity.tags || entity.tags.length === 0)
          ? { tags: buildTags(entityType, entity) }
          : {}),
      });
  } catch {
    // El documento puede no existir todavía en race conditions — ignorar
  }

  return { nexoNodeId: nodeId, aiSummary };
}
