/**
 * HERMES — Conector Calendario SMM (Etapa 1)
 *
 * Crea o actualiza entradas en el calendario de Marketing Sofia.
 * Usa Firebase Admin SDK — corre SOLO en el servidor.
 *
 * Acciones soportadas:
 *   calendario_crear_post    → addDoc en smm_workspaces/{wid}/calendario
 *   calendario_actualizar_post → updateDoc del post
 */

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import type { HermesAction, HermesResultado } from "@/extensions/hermes/schema";

function calCol(workspaceId: string) {
  return adminDb.collection("smm_workspaces").doc(workspaceId).collection("calendario");
}

export async function ejecutarCalendarioAction(accion: HermesAction): Promise<HermesResultado> {
  const p           = accion.payload;
  const workspaceId = accion.workspaceId;

  try {
    switch (accion.tipo) {
      case "calendario_crear_post": {
        const clienteId     = String(p.clienteId     ?? accion.clienteId     ?? "");
        const clienteNombre = String(p.clienteNombre ?? accion.clienteNombre ?? "");
        const titulo        = String(p.titulo    ?? "Nuevo post");
        const copy          = String(p.copy      ?? "");
        const plataforma    = String(p.plataforma ?? "Instagram");
        const formato       = String(p.formato   ?? "Post estático");
        const responsable   = String(p.responsable ?? "HERMES");

        if (!clienteId) {
          return { exito: false, mensaje: "clienteId requerido para crear post", errorCode: "MISSING_PARAM" };
        }

        const ref = await calCol(workspaceId).add({
          clienteId,
          clienteNombre,
          titulo,
          copy,
          plataforma,
          formato,
          estado:        "Idea",
          responsable,
          fecha:         null,
          fechaPubli:    null,
          copyAprobado:  false,
          assetsListos:  false,
          alcanceReal:   0,
          engagementPct: 0,
          createdAt:     FieldValue.serverTimestamp(),
          updatedAt:     FieldValue.serverTimestamp(),
        });

        return {
          exito:   true,
          mensaje: `Post "${titulo}" creado en el calendario de ${clienteNombre || clienteId}`,
          datos:   { postId: ref.id, workspaceId },
        };
      }

      case "calendario_actualizar_post": {
        const postId = String(p.postId ?? "");
        if (!postId) return { exito: false, mensaje: "postId requerido", errorCode: "MISSING_PARAM" };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const patch: Record<string, any> = {
          updatedAt: FieldValue.serverTimestamp(),
        };

        if (p.titulo)      patch.titulo     = String(p.titulo);
        if (p.copy)        patch.copy       = String(p.copy);
        if (p.estado)      patch.estado     = String(p.estado);
        if (p.plataforma)  patch.plataforma = String(p.plataforma);
        if (p.responsable) patch.responsable= String(p.responsable);
        if (typeof p.copyAprobado === "boolean")  patch.copyAprobado  = p.copyAprobado;
        if (typeof p.assetsListos === "boolean")  patch.assetsListos  = p.assetsListos;

        await calCol(workspaceId).doc(postId).update(patch);

        return {
          exito:   true,
          mensaje: `Post ${postId} actualizado en el calendario`,
          datos:   { postId },
        };
      }

      default:
        return { exito: false, mensaje: `Tipo no soportado: ${accion.tipo}`, errorCode: "UNSUPPORTED_ACTION" };
    }
  } catch (err) {
    return {
      exito:     false,
      mensaje:   `Error en conector Calendario: ${String(err)}`,
      errorCode: "CONNECTOR_ERROR",
    };
  }
}
