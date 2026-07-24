/**
 * HERMES — Conector SOFIAA Interno (Etapa 1)
 *
 * Ejecuta acciones dentro del propio sistema SOFIAA:
 *   - Actualiza valorActual de un BrandGoal en PROMETEO
 *   - Registra un nuevo CreativeMemory en PROMETEO
 *
 * Usa Firebase Admin SDK — corre SOLO en el servidor.
 *
 * Acciones soportadas:
 *   interno_actualizar_goal     → actualiza valorActual en prometeo_goals
 *   interno_registrar_memoria   → crea CreativeMemory en prometeo_creative_memory
 */

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import type { HermesAction, HermesResultado } from "@/extensions/hermes/schema";
import type { CreativeMemory, HookType, FormatoCreativo, CanalMarketing, TipoObjetivo } from "@/extensions/prometeo/schema";

function prometeoCol(workspaceId: string, sub: string) {
  return adminDb.collection("smm_workspaces").doc(workspaceId).collection(sub);
}

export async function ejecutarInternoAction(accion: HermesAction): Promise<HermesResultado> {
  const p           = accion.payload;
  const workspaceId = accion.workspaceId;

  try {
    switch (accion.tipo) {
      case "interno_actualizar_goal": {
        const goalId      = String(p.goalId ?? "");
        const valorActual = Number(p.valorActual ?? 0);

        if (!goalId) return { exito: false, mensaje: "goalId requerido", errorCode: "MISSING_PARAM" };

        await prometeoCol(workspaceId, "prometeo_goals").doc(goalId).update({
          valorActual,
          updatedAt: Date.now(),
        });

        return {
          exito:   true,
          mensaje: `Goal ${goalId} actualizado: valorActual = ${valorActual}`,
          datos:   { goalId, valorActual },
        };
      }

      case "interno_registrar_memoria": {
        const clienteId = String(p.clienteId ?? accion.clienteId ?? "");
        if (!clienteId) return { exito: false, mensaje: "clienteId requerido", errorCode: "MISSING_PARAM" };

        const memoria: Omit<CreativeMemory, "id"> = {
          clienteId,
          workspaceId,
          hookType:        (p.hookType as HookType)             ?? "PROBLEMA_SOLUCION",
          hookTexto:       String(p.hookTexto      ?? ""),
          scriptTexto:     String(p.scriptTexto    ?? ""),
          formato:         (p.formato as FormatoCreativo)        ?? "VIDEO",
          canal:           (p.canal as CanalMarketing)           ?? "INSTAGRAM",
          roasLogrado:     Number(p.roasLogrado    ?? 0),
          ctr:             Number(p.ctr            ?? 0),
          cpa:             Number(p.cpa            ?? 0),
          alcance:         Number(p.alcance        ?? 0),
          inversion:       Number(p.inversion      ?? 0),
          conversiones:    Number(p.conversiones   ?? 0),
          industria:       String(p.industria      ?? ""),
          objetivoTipo:    (p.objetivoTipo as TipoObjetivo)      ?? "AWARENESS",
          temporada:       p.temporada ? String(p.temporada) : undefined,
          duracionDias:    Number(p.duracionDias   ?? 0),
          performanceScore: Number(p.performanceScore ?? 0),
          aprendizaje:     String(p.aprendizaje    ?? accion.descripcion ?? ""),
          usarDeNuevo:     Boolean(p.usarDeNuevo   ?? true),
          createdAt:       Date.now(),
        };

        const ref = await prometeoCol(workspaceId, "prometeo_creative_memory").add(memoria);

        return {
          exito:   true,
          mensaje: `Creative Memory registrada (ID: ${ref.id})`,
          datos:   { memoriaId: ref.id, clienteId },
        };
      }

      default:
        return { exito: false, mensaje: `Tipo no soportado: ${accion.tipo}`, errorCode: "UNSUPPORTED_ACTION" };
    }
  } catch (err) {
    return {
      exito:     false,
      mensaje:   `Error en conector Interno: ${String(err)}`,
      errorCode: "CONNECTOR_ERROR",
    };
  }
}
