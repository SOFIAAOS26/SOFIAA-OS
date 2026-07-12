/**
 * ATENA — Extension Tools (Sprint A-4)
 *
 * 5 herramientas que SOFIAA puede invocar para leer datos
 * del motor estadístico desde Firestore.
 *
 * Principio: el LLM nunca calcula — lee resultados pre-computados
 * y los interpreta en lenguaje natural para el usuario.
 */

import type { ExtensionToolRegistry, ExtensionContext } from "@/types/sofiaa-platform";
import { atenaPath }                                    from "@/extensions/atena/schema";

// ── Helper: Firestore admin ───────────────────────────────────────────────────
async function getDb() {
  const { getFirestore } = await import("firebase-admin/firestore");
  return getFirestore();
}

// ── Tool handlers ─────────────────────────────────────────────────────────────

async function consultar_proyecto(
  _args: Record<string, unknown>,
  ctx: ExtensionContext,
) {
  const uid = ctx.userId;
  if (!uid) throw new Error("Usuario no autenticado");

  const db = await getDb();
  const snap = await db
    .collection(atenaPath(uid, "proyectos"))
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snap.empty) {
    return { error: "No hay proyectos ATENA registrados. Ejecuta el seed de demo primero." };
  }

  const doc = snap.docs[0];
  const p = doc.data();

  return {
    id:            doc.id,
    nombre:        p.nombre,
    metodologia:   p.metodologia,
    faseActual:    p.faseActual,
    avance:        p.avance,
    estado:        p.estado,
    area:          p.area,
    planta:        p.planta,
    objetivoSMART: p.objetivoSMART,
    ctq:           p.ctq,
    involucrados:  (p.involucrados as { nombre: string; rolLSS: string; nivelCompromiso: string; departamento?: string }[]).map((s) => ({
      nombre:          s.nombre,
      rolLSS:          s.rolLSS,
      nivelCompromiso: s.nivelCompromiso,
      departamento:    s.departamento,
    })),
    fechaInicio:  p.fechaInicio,
    fechaLimite:  p.fechaLimite,
  };
}

async function ejecutar_analisis(
  _args: Record<string, unknown>,
  ctx: ExtensionContext,
) {
  const uid = ctx.userId;
  if (!uid) throw new Error("Usuario no autenticado");

  const db = await getDb();
  const snap = await db
    .collection(atenaPath(uid, "analisis"))
    .orderBy("computedAt", "desc")
    .limit(1)
    .get();

  if (snap.empty) {
    return { error: "No hay resultados de análisis. El motor estadístico aún no ha procesado datos." };
  }

  const a = snap.docs[0].data();
  return {
    variableDependiente:       a.variableDependiente,
    factores:                  a.factores,
    fStat:                     a.fStat,
    pValue:                    a.pValue,
    significativo:             a.significativo,
    gradosLibertadEntreGrupos: a.gradosLibertadEntreGrupos,
    gradosLibertadIntraGrupos: a.gradosLibertadIntraGrupos,
    nivelConfianza:            a.nivelConfianza,
    mediasPorGrupo:            a.mediasPorGrupo,
    interpretacion:            a.interpretacion,
  };
}

async function consultar_spc(
  _args: Record<string, unknown>,
  ctx: ExtensionContext,
) {
  const uid = ctx.userId;
  if (!uid) throw new Error("Usuario no autenticado");

  const db = await getDb();
  const snap = await db
    .collection(atenaPath(uid, "spc"))
    .orderBy("computedAt", "desc")
    .limit(1)
    .get();

  if (snap.empty) {
    return { error: "No hay datos SPC disponibles." };
  }

  const s = snap.docs[0].data();
  const puntosProblema = (s.puntos as { fueraDeControl: boolean; index: number; valor: number; reglaViolada?: string }[])
    .filter((p) => p.fueraDeControl)
    .map((p) => ({ index: p.index, valor: p.valor, reglaViolada: p.reglaViolada }));

  return {
    variable:                   s.variable,
    unidad:                     s.unidad,
    media:                      s.media,
    stdDev:                     s.stdDev,
    lcs:                        s.lcs,
    lci:                        s.lci,
    cp:                         s.cp,
    cpk:                        s.cpk,
    sigmaLevel:                 s.sigmaLevel,
    violacionesWesternElectric: s.violacionesWesternElectric,
    puntosProblema,
    interpretacion:             s.interpretacion,
    totalPuntos:                (s.puntos as unknown[]).length,
  };
}

async function ver_amef(
  args: Record<string, unknown>,
  ctx: ExtensionContext,
) {
  const uid = ctx.userId;
  if (!uid) throw new Error("Usuario no autenticado");

  const db = await getDb();
  let q = db.collection(atenaPath(uid, "amef")).orderBy("npr", "desc");

  // Filtro opcional: solo críticos
  if (args.soloNprCritico === true) {
    q = db.collection(atenaPath(uid, "amef"))
      .where("critico", "==", true)
      .orderBy("npr", "desc") as typeof q;
  }

  const snap = await q.limit(10).get();
  if (snap.empty) {
    return { error: "No hay datos AMEF disponibles." };
  }

  const items = snap.docs.map((d) => {
    const f = d.data();
    return {
      numeracion:      f.numeracion,
      pasoDelProceso:  f.pasoDelProceso,
      modoDeFalla:     f.modoDeFalla,
      efectoDelFallo:  f.efectoDelFallo,
      severidad:       f.severidad,
      ocurrencia:      f.ocurrencia,
      deteccion:       f.deteccion,
      npr:             f.npr,
      critico:         f.critico,
      accionCorrectiva: f.accionCorrectiva,
      responsable:     f.responsable,
      estado:          f.estado,
    };
  });

  const criticos   = items.filter((i) => i.critico);
  const abiertos   = items.filter((i) => i.estado === "abierto" || i.estado === "en_proceso");
  const nprPromedio = Math.round(items.reduce((s, i) => s + i.npr, 0) / items.length);

  return {
    resumen: {
      totalModos:    items.length,
      criticos:      criticos.length,
      abiertos:      abiertos.length,
      nprPromedio,
      nprMaximo:     items[0]?.npr,
    },
    modosDeFalla: items,
  };
}

async function consultar_financiero(
  _args: Record<string, unknown>,
  ctx: ExtensionContext,
) {
  const uid = ctx.userId;
  if (!uid) throw new Error("Usuario no autenticado");

  const db = await getDb();
  const snap = await db
    .collection(atenaPath(uid, "financiero"))
    .orderBy("computedAt", "desc")
    .limit(1)
    .get();

  if (snap.empty) {
    return { error: "No hay proyección financiera disponible." };
  }

  const f = snap.docs[0].data();
  return {
    costoActualAnual:      f.costoActualAnual,
    costoProyectadoAnual:  f.costoProyectadoAnual,
    costoImplementacion:   f.costoImplementacion,
    ahorroBrutoAnual:      f.ahorroBrutoAnual,
    ahorroNetoAnual:       f.ahorroNetoAnual,
    van:                   f.van,
    tir:                   f.tir,
    periodoRetornoMeses:   f.periodoRetornoMeses,
    tasaDescuento:         f.tasaDescuento,
    moneda:                f.moneda,
    monteCarlo:            f.monteCarlo,
    flujoDeCaja:           f.flujoDeCaja,
  };
}

// ── Registry ──────────────────────────────────────────────────────────────────

export const atenaTools: ExtensionToolRegistry = {
  tools: [
    {
      name:        "consultar_proyecto",
      description: "Retorna el estado actual del proyecto DMAIC activo: fase, avance, CTQ variables, equipo (Black Belt, Champion, Process Owner) y objetivo SMART.",
      parameters: {
        type:       "object",
        properties: {},
        required:   [],
      },
    },
    {
      name:        "ejecutar_analisis",
      description: "Retorna los resultados del análisis estadístico ANOVA pre-computado por el motor: F-statistic, p-value, medias por grupo/línea, grados de libertad e interpretación matemática.",
      parameters: {
        type:       "object",
        properties: {},
        required:   [],
      },
    },
    {
      name:        "consultar_spc",
      description: "Retorna el estado del Control Estadístico de Procesos (SPC): media, σ, LCS, LCI, índices Cp/Cpk, nivel sigma, violaciones Western Electric y puntos fuera de control.",
      parameters: {
        type:       "object",
        properties: {},
        required:   [],
      },
    },
    {
      name:        "ver_amef",
      description: "Retorna la matriz AMEF ordenada por NPR descendente. Identifica modos de falla críticos (NPR>200) y acciones correctivas pendientes.",
      parameters: {
        type:       "object",
        properties: {
          soloNprCritico: {
            type:        "boolean",
            description: "Si true, retorna solo los modos de falla con NPR > 200 (críticos).",
          },
        },
        required: [],
      },
    },
    {
      name:        "consultar_financiero",
      description: "Retorna la proyección financiera del proyecto: VAN, TIR, período de retorno, simulación Monte Carlo (P10/P50/P90) y flujo de caja mensual acumulado.",
      parameters: {
        type:       "object",
        properties: {},
        required:   [],
      },
    },
  ],

  handler: async (toolName, args, ctx) => {
    switch (toolName) {
      case "consultar_proyecto":  return consultar_proyecto(args, ctx);
      case "ejecutar_analisis":   return ejecutar_analisis(args, ctx);
      case "consultar_spc":       return consultar_spc(args, ctx);
      case "ver_amef":            return ver_amef(args, ctx);
      case "consultar_financiero": return consultar_financiero(args, ctx);
      default:
        throw new Error(`[ATENA] Tool desconocida: ${toolName}`);
    }
  },
};
