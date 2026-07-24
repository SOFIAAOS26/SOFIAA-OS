/**
 * HERMES × PROMETEO Bridge — Sprint H-2
 *
 * Convierte un DirectorBrief generado por PROMETEO en HermesActions
 * y las escribe en Firestore (Admin SDK) en un batch atómico.
 *
 * Flujo:
 *   Director Brief generado → enqueueBriefActions() → hermes_queue
 *
 * Regla de mapeo:
 *   FATIGA         → slack_notificar_urgente  (Slack)
 *   ESCALAR        → monday_crear_tarea       (Monday.com)
 *   PAUSAR         → monday_crear_tarea       (Monday.com) · urgencia CRITICA
 *   NUEVO_CREATIVO → calendario_crear_post    (Calendario SMM)
 *   CAMBIAR_CANAL  → slack_notificar          (Slack)
 *   oportunidades  → slack_notificar          (Slack) · urgencia BAJA
 *
 * Server-only — usa Firebase Admin SDK.
 */

import { adminDb }    from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { DirectorBrief }                              from "@/extensions/prometeo/schema";
import type { HermesAction, HermesActionType, HermesConnectorType, HermesUrgencia } from "@/extensions/hermes/schema";

// ── Tipos internos ────────────────────────────────────────────────────────────

type RecTipo = DirectorBrief["recomendaciones"][0]["tipo"];
type RecUrgencia = DirectorBrief["recomendaciones"][0]["urgencia"];

interface ConnectorMap {
  connectorTipo:    HermesConnectorType;
  actionTipo:       HermesActionType;
  urgenciaOverride?: HermesUrgencia;
}

// ── Mapeo de tipo de recomendación → conector + acción ───────────────────────

const TIPO_MAP: Record<RecTipo, ConnectorMap> = {
  FATIGA:          { connectorTipo: "slack",          actionTipo: "slack_notificar_urgente" },
  ESCALAR:         { connectorTipo: "monday_cloud",   actionTipo: "monday_crear_tarea" },
  PAUSAR:          { connectorTipo: "monday_cloud",   actionTipo: "monday_crear_tarea", urgenciaOverride: "CRITICA" },
  NUEVO_CREATIVO:  { connectorTipo: "calendario_smm", actionTipo: "calendario_crear_post" },
  CAMBIAR_CANAL:   { connectorTipo: "slack",          actionTipo: "slack_notificar" },
};

// ── Construcción de payload por tipo de acción ───────────────────────────────

function buildPayload(
  rec:        DirectorBrief["recomendaciones"][0],
  actionTipo: HermesActionType
): Record<string, unknown> {
  switch (actionTipo) {
    case "monday_crear_tarea":
      return {
        nombre:  `${rec.tipo}: ${rec.clienteNombre} — ${rec.descripcion.slice(0, 60)}`,
        columnas: { status: rec.urgencia === "ALTA" ? "Stuck" : "Working on it" },
      };

    case "slack_notificar_urgente":
    case "slack_notificar":
      return {
        mensaje: `[${rec.tipo}] ${rec.clienteNombre}: ${rec.descripcion}`,
      };

    case "calendario_crear_post":
      return {
        clienteId:     rec.clienteId,
        clienteNombre: rec.clienteNombre,
        titulo:        `Nuevo creativo — ${rec.clienteNombre}`,
        copy:          rec.descripcion,
        plataforma:    "Instagram",
        formato:       "Reel",
        responsable:   "HERMES / PROMETEO",
      };

    default:
      return { descripcion: rec.descripcion };
  }
}

function buildOportunidadPayload(op: DirectorBrief["oportunidades"][0]): Record<string, unknown> {
  return {
    mensaje: `💡 Oportunidad detectada${op.clienteId ? ` para ${op.clienteId}` : ""}: ${op.descripcion} — Potencial: ${op.potencial}`,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapUrgencia(u: RecUrgencia): HermesUrgencia {
  // DirectorBrief urgencias son un subconjunto de HermesUrgencia
  return u as HermesUrgencia;
}

function tituloDeRec(rec: DirectorBrief["recomendaciones"][0]): string {
  const labels: Record<RecTipo, string> = {
    FATIGA:         "⚠️ Fatiga publicitaria",
    ESCALAR:        "📈 Escalar presupuesto",
    PAUSAR:         "⏸️ Pausar campaña",
    NUEVO_CREATIVO: "🎬 Nuevo creativo",
    CAMBIAR_CANAL:  "🔀 Cambiar canal",
  };
  return `${labels[rec.tipo] ?? rec.tipo}: ${rec.clienteNombre}`;
}

function hermesQueue(workspaceId: string) {
  return adminDb
    .collection("smm_workspaces")
    .doc(workspaceId)
    .collection("hermes_queue");
}

// ── Función principal ─────────────────────────────────────────────────────────

/**
 * enqueueBriefActions
 *
 * Recibe un DirectorBrief ya guardado (con id) y encola todas sus
 * recomendaciones y oportunidades como HermesActions en un batch atómico.
 *
 * @returns número de acciones encoladas
 */
export async function enqueueBriefActions(
  workspaceId: string,
  brief: DirectorBrief & { id: string }
): Promise<number> {
  const col   = hermesQueue(workspaceId);
  const batch = adminDb.batch();
  let   count = 0;

  // ── Recomendaciones ───────────────────────────────────────────────────────
  for (const rec of brief.recomendaciones ?? []) {
    const map = TIPO_MAP[rec.tipo];
    if (!map) continue;

    const urgencia: HermesUrgencia = map.urgenciaOverride ?? mapUrgencia(rec.urgencia);
    const payload                  = buildPayload(rec, map.actionTipo);

    const accion: Omit<HermesAction, "id"> = {
      workspaceId,
      sourceEngine:  "prometeo",
      sourceBriefId: brief.id,
      sourceGoalId:  undefined,
      clienteId:     rec.clienteId    || undefined,
      clienteNombre: rec.clienteNombre || undefined,
      tipo:          map.actionTipo,
      connectorTipo: map.connectorTipo,
      payload,
      titulo:        tituloDeRec(rec),
      descripcion:   rec.descripcion,
      justificacion: `Director Autónomo PROMETEO generó esta recomendación (tipo: ${rec.tipo}) ` +
                     `para ${rec.clienteNombre || rec.clienteId}. Urgencia original: ${rec.urgencia}.`,
      urgencia,
      estado:        "pendiente_aprobacion",
      reintentos:    0,
      createdAt:     Date.now(),
    };

    batch.set(col.doc(), {
      ...accion,
      _serverTs: FieldValue.serverTimestamp(),
    });
    count++;
  }

  // ── Oportunidades ─────────────────────────────────────────────────────────
  for (const op of brief.oportunidades ?? []) {
    const accion: Omit<HermesAction, "id"> = {
      workspaceId,
      sourceEngine:  "prometeo",
      sourceBriefId: brief.id,
      clienteId:     op.clienteId || undefined,
      tipo:          "slack_notificar",
      connectorTipo: "slack",
      payload:       buildOportunidadPayload(op),
      titulo:        `💡 Oportunidad${op.clienteId ? `: ${op.clienteId}` : ""}`,
      descripcion:   op.descripcion,
      justificacion: `Oportunidad detectada por Director Autónomo PROMETEO. ` +
                     `Potencial estimado: ${op.potencial}`,
      urgencia:      "BAJA",
      estado:        "pendiente_aprobacion",
      reintentos:    0,
      createdAt:     Date.now(),
    };

    batch.set(col.doc(), {
      ...accion,
      _serverTs: FieldValue.serverTimestamp(),
    });
    count++;
  }

  if (count > 0) await batch.commit();
  return count;
}
