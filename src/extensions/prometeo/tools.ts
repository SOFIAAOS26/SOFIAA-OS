/**
 * PROMETEO — Extension Tools v2 (Sprint P-6)
 *
 * 6 herramientas que SOFIAA puede invocar en el chat para operar
 * como CMO Cognitivo sobre los datos del workspace PROMETEO.
 *
 * Herramientas:
 *   1. consultar_objetivos    — lista BrandGoals activos con progreso KPI
 *   2. consultar_brand_dna    — lee el Brand DNA de un cliente
 *   3. registrar_objetivo     — crea un BrandGoal desde el chat
 *   4. consultar_creative_memory — top creativos por canal/hookType
 *   5. generar_variantes_lab  — genera variantes con Groq (Creative Lab engine)
 *   6. generar_brief_director — genera el brief del Director Autónomo
 *
 * Estrategia workspaceId:
 *   Si el LLM no provee workspaceId, el handler auto-selecciona
 *   el primer workspace disponible en smm_workspaces.
 *
 * Principio: cada handler falla silenciosamente (ok: false + mensaje).
 * El stream de SOFIAA nunca se rompe por un tool que falla.
 */

import type { ExtensionToolRegistry, ExtensionContext } from "@/types/sofiaa-platform";
import type {
  BrandGoal,
  BrandDNA,
  CreativeMemory,
  TipoObjetivo,
  CanalMarketing,
  HookType,
} from "@/extensions/prometeo/schema";

// ── Helper: Firestore admin ───────────────────────────────────────────────────

async function getDb() {
  const { getFirestore } = await import("firebase-admin/firestore");
  return getFirestore();
}

// ── Helper: resolver workspaceId automáticamente ──────────────────────────────

async function resolveWorkspace(provided?: string): Promise<string | null> {
  if (provided && provided.trim()) return provided.trim();

  // Auto-seleccionar el primer workspace disponible
  const db = await getDb();
  const snap = await db.collection("smm_workspaces").limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].id;
}

// ── Path helper ───────────────────────────────────────────────────────────────

function pPath(workspaceId: string, col: string): string {
  return `smm_workspaces/${workspaceId}/prometeo_${col}`;
}

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOL_DEFS = [
  {
    name: "consultar_objetivos",
    description:
      "Consulta los objetivos estratégicos (BrandGoals) activos del workspace PROMETEO. " +
      "Devuelve: título, tipo, cliente, progreso KPI, canal, presupuesto, días restantes. " +
      "Usar cuando el usuario pregunte sobre objetivos, metas, campañas activas, estado de proyectos de marketing. " +
      "También útil para diagnosticar qué clientes están lejos de su meta.",
    parameters: {
      type: "object",
      properties: {
        workspaceId: { type: "string", description: "ID del workspace (opcional, se auto-detecta)" },
        estado: {
          type: "string",
          enum: ["activo", "pendiente", "logrado", "pausado", "cancelado"],
          description: "Filtrar por estado (omitir para ver activos)",
        },
      },
    },
  },
  {
    name: "consultar_brand_dna",
    description:
      "Lee el Brand DNA de un cliente: arquetipo, personalidad, tono, valores, tabús, promesas, voz. " +
      "Usar SIEMPRE antes de generar copy, hooks o creativos para un cliente. " +
      "Si el usuario menciona un cliente y pide contenido, primero llama este tool.",
    parameters: {
      type: "object",
      properties: {
        workspaceId:   { type: "string", description: "ID del workspace (opcional)" },
        clienteNombre: { type: "string", description: "Nombre del cliente a consultar" },
      },
      required: ["clienteNombre"],
    },
  },
  {
    name: "registrar_objetivo",
    description:
      "Crea un nuevo objetivo estratégico (BrandGoal) en PROMETEO desde el chat. " +
      "Usar cuando el usuario quiera definir una meta de crecimiento para un cliente. " +
      "El Goal Engine del Director Autónomo podrá razonar sobre él.",
    parameters: {
      type: "object",
      properties: {
        workspaceId:    { type: "string", description: "ID del workspace (opcional)" },
        clienteNombre:  { type: "string", description: "Nombre del cliente" },
        titulo:         { type: "string", description: "Título del objetivo (ej: Aumentar ROAS a 4x en 60 días)" },
        tipo: {
          type: "string",
          enum: ["AWARENESS", "CONSIDERACION", "CONVERSION", "RETENCION", "UPSELL"],
          description: "Tipo de objetivo estratégico",
        },
        canal: {
          type: "string",
          enum: ["Instagram", "Facebook", "TikTok", "YouTube", "LinkedIn", "Google", "WhatsApp", "Email"],
          description: "Canal principal de la campaña",
        },
        valorObjetivo: { type: "number", description: "Valor numérico de la meta" },
        unidad:        { type: "string", description: "Unidad de la meta: ROAS, leads, MXN, %" },
        presupuestoMXN:{ type: "number", description: "Presupuesto en MXN (puede ser 0)" },
        fechaLimiteDias: { type: "number", description: "Días desde hoy para la fecha límite (default: 30)" },
        metaKPI:       { type: "string", description: "Descripción de la meta KPI (opcional)" },
      },
      required: ["clienteNombre", "titulo", "tipo", "canal", "valorObjetivo", "unidad"],
    },
  },
  {
    name: "consultar_creative_memory",
    description:
      "Consulta los creativos de mejor performance en la Creative Memory del workspace. " +
      "Devuelve: hookType, ROAS, CTR, CPA, aprendizaje. " +
      "Usar cuando el usuario pregunte qué tipo de creativos funcionan mejor, o antes de recomendar un hook. " +
      "El scoring predictivo del Creative Lab se basa en estos datos.",
    parameters: {
      type: "object",
      properties: {
        workspaceId: { type: "string", description: "ID del workspace (opcional)" },
        canal: {
          type: "string",
          enum: ["Instagram", "Facebook", "TikTok", "YouTube", "LinkedIn", "Google", "WhatsApp", "Email"],
          description: "Filtrar por canal (opcional)",
        },
        limite: { type: "number", description: "Máximo de creativos a devolver (default 8)" },
      },
    },
  },
  {
    name: "generar_variantes_lab",
    description:
      "Genera variantes creativas (hooks + CTAs + ofertas) usando el Creative Lab de PROMETEO. " +
      "El scoring predictivo se basa en la Creative Memory del workspace. " +
      "Usar cuando el usuario pida ideas de creativos, hooks para un cliente, o variantes para una campaña.",
    parameters: {
      type: "object",
      properties: {
        workspaceId: { type: "string", description: "ID del workspace (opcional)" },
        objetivo: {
          type: "string",
          enum: ["AWARENESS", "CONSIDERACION", "CONVERSION", "RETENCION", "UPSELL"],
          description: "Objetivo de la campaña",
        },
        canal: {
          type: "string",
          enum: ["Instagram", "Facebook", "TikTok", "YouTube", "LinkedIn", "Google", "WhatsApp", "Email"],
          description: "Canal de la campaña",
        },
        industria:     { type: "string", description: "Industria del cliente" },
        presupuestoMXN:{ type: "number", description: "Presupuesto disponible en MXN" },
      },
      required: ["objetivo", "canal", "industria"],
    },
  },
  {
    name: "generar_brief_director",
    description:
      "Genera el brief ejecutivo del día del Director Autónomo de PROMETEO. " +
      "Analiza todos los objetivos activos y la Creative Memory para producir recomendaciones priorizadas. " +
      "Usar cuando el usuario pregunte qué debe hacer hoy, cuál es el estado del workspace, " +
      "o pida un diagnóstico rápido de todos sus clientes.",
    parameters: {
      type: "object",
      properties: {
        workspaceId: { type: "string", description: "ID del workspace (opcional)" },
      },
    },
  },
];

// ── Handler: consultar_objetivos ──────────────────────────────────────────────

async function handleConsultarObjetivos(
  args: Record<string, unknown>,
  _ctx: ExtensionContext,
): Promise<unknown> {
  const wsId = await resolveWorkspace(args.workspaceId as string | undefined);
  if (!wsId) return { ok: false, error: "No se encontró ningún workspace PROMETEO." };

  const estado = (args.estado as string | undefined) ?? "activo";

  try {
    const db   = await getDb();
    const snap = await db
      .collection(pPath(wsId, "goals"))
      .where("estado", "==", estado)
      .limit(15)
      .get();

    const goals = snap.docs.map((d) => {
      const g = { id: d.id, ...d.data() } as BrandGoal;
      const pct = g.valorObjetivo > 0
        ? Math.round((g.valorActual / g.valorObjetivo) * 100)
        : 0;
      const dias = Math.ceil((g.fechaLimite - Date.now()) / 86_400_000);
      return {
        id:             g.id,
        titulo:         g.titulo,
        cliente:        g.clienteNombre,
        tipo:           g.tipo,
        canal:          g.canal,
        progreso_pct:   pct,
        valorActual:    g.valorActual,
        valorObjetivo:  g.valorObjetivo,
        unidad:         g.unidad,
        presupuesto:    `$${g.presupuestoMXN.toLocaleString()} MXN`,
        dias_restantes: dias,
        alerta:         pct < 30 && dias < 14 ? "⚠ Bajo progreso + poco tiempo" : null,
      };
    });

    return {
      ok:      true,
      total:   goals.length,
      estado,
      objetivos: goals,
    };
  } catch (err) {
    console.error("[PROMETEO][TOOL] consultar_objetivos:", err);
    return { ok: false, error: "No se pudieron cargar los objetivos." };
  }
}

// ── Handler: consultar_brand_dna ──────────────────────────────────────────────

async function handleConsultarBrandDNA(
  args: Record<string, unknown>,
  _ctx: ExtensionContext,
): Promise<unknown> {
  const wsId = await resolveWorkspace(args.workspaceId as string | undefined);
  if (!wsId) return { ok: false, error: "No se encontró ningún workspace." };

  const clienteNombre = (args.clienteNombre as string | undefined)?.toLowerCase().trim();
  if (!clienteNombre) return { ok: false, error: "clienteNombre requerido." };

  try {
    const db   = await getDb();
    const snap = await db.collection(pPath(wsId, "brand_dna")).get();

    const match = snap.docs.find((d) => {
      const nombre = (d.data().clienteNombre as string | undefined)?.toLowerCase() ?? "";
      return nombre.includes(clienteNombre) || clienteNombre.includes(nombre.split(" ")[0]);
    });

    if (!match) {
      return {
        ok:    false,
        error: `No se encontró Brand DNA para "${args.clienteNombre}". Créalo en /prometeo/brand-dna.`,
      };
    }

    const dna = { id: match.id, ...match.data() } as BrandDNA;

    return {
      ok:            true,
      cliente:       dna.clienteNombre,
      arquetipo:     dna.arquetipo,
      personalidad:  dna.personalidad.join(", "),
      tono:          dna.tono,
      lenguaje:      dna.lenguaje,
      nivelTecnico:  `${dna.nivelTecnico}/5`,
      valores:       dna.valores.join(", "),
      tabus:         dna.tabus.join(", ") || "ninguno",
      promesas:      dna.promesas.join(", "),
      cultura:       dna.cultura,
      ejemploOK:     dna.ejemploMensajeOK,
      ejemploMAL:    dna.ejemploMensajeMAL,
      marcasInspiradoras: dna.marcasInspiradoras.join(", "),
    };
  } catch (err) {
    console.error("[PROMETEO][TOOL] consultar_brand_dna:", err);
    return { ok: false, error: "Error al leer el Brand DNA." };
  }
}

// ── Handler: registrar_objetivo ───────────────────────────────────────────────

async function handleRegistrarObjetivo(
  args: Record<string, unknown>,
  _ctx: ExtensionContext,
): Promise<unknown> {
  const wsId = await resolveWorkspace(args.workspaceId as string | undefined);
  if (!wsId) return { ok: false, error: "No se encontró ningún workspace." };

  const {
    clienteNombre, titulo, tipo, canal,
    valorObjetivo, unidad, presupuestoMXN,
    fechaLimiteDias, metaKPI,
  } = args as {
    clienteNombre:   string;
    titulo:          string;
    tipo:            TipoObjetivo;
    canal:           CanalMarketing;
    valorObjetivo:   number;
    unidad:          string;
    presupuestoMXN?: number;
    fechaLimiteDias?: number;
    metaKPI?:        string;
  };

  try {
    const db   = await getDb();
    const dias = fechaLimiteDias ?? 30;

    const goal: Omit<BrandGoal, "id"> = {
      clienteId:      clienteNombre.toLowerCase().replace(/\s+/g, "-"),
      clienteNombre,
      titulo,
      tipo,
      estado:         "activo",
      metaKPI:        metaKPI ?? titulo,
      valorObjetivo,
      valorActual:    0,
      unidad,
      canal,
      presupuestoMXN: presupuestoMXN ?? 0,
      fechaInicio:    Date.now(),
      fechaLimite:    Date.now() + dias * 86_400_000,
      hayPresupuesto: (presupuestoMXN ?? 0) > 0,
      hayInventario:  true,
      hayCapacidad:   true,
      canalOptimo:    canal,
      createdAt:      Date.now(),
      updatedAt:      Date.now(),
    };

    const ref = await db.collection(pPath(wsId, "goals")).add(goal);

    console.log(`[PROMETEO][TOOL] registrar_objetivo OK: ${ref.id} "${titulo}"`);
    return {
      ok:      true,
      id:      ref.id,
      titulo,
      cliente: clienteNombre,
      tipo,
      canal,
      meta:    `${valorObjetivo} ${unidad} en ${dias} días`,
    };
  } catch (err) {
    console.error("[PROMETEO][TOOL] registrar_objetivo:", err);
    return { ok: false, error: "No se pudo crear el objetivo. Intenta desde /prometeo/objetivos." };
  }
}

// ── Handler: consultar_creative_memory ────────────────────────────────────────

async function handleConsultarCreativeMemory(
  args: Record<string, unknown>,
  _ctx: ExtensionContext,
): Promise<unknown> {
  const wsId  = await resolveWorkspace(args.workspaceId as string | undefined);
  if (!wsId) return { ok: false, error: "No se encontró ningún workspace." };

  const canal  = args.canal as CanalMarketing | undefined;
  const limite = Math.min((args.limite as number | undefined) ?? 8, 20);

  try {
    const db = await getDb();
    let q = db
      .collection(pPath(wsId, "creative_memory"))
      .orderBy("performanceScore", "desc")
      .limit(limite);

    if (canal) {
      q = db
        .collection(pPath(wsId, "creative_memory"))
        .where("canal", "==", canal)
        .orderBy("performanceScore", "desc")
        .limit(limite);
    }

    const snap = await q.get();
    const creativos = snap.docs.map((d) => {
      const m = { id: d.id, ...d.data() } as CreativeMemory;
      return {
        hookType:     m.hookType,
        hookTexto:    m.hookTexto.slice(0, 80),
        canal:        m.canal,
        formato:      m.formato,
        score:        m.performanceScore,
        roas:         m.roasLogrado,
        ctr:          `${m.ctr}%`,
        cpa:          `$${m.cpa} MXN`,
        aprendizaje:  m.aprendizaje,
        usarDeNuevo:  m.usarDeNuevo,
      };
    });

    // Calcular hook más efectivo
    const hookStats: Partial<Record<HookType, { total: number; avgRoas: number }>> = {};
    snap.docs.forEach((d) => {
      const m = d.data() as CreativeMemory;
      if (!hookStats[m.hookType]) hookStats[m.hookType] = { total: 0, avgRoas: 0 };
      hookStats[m.hookType]!.total++;
      hookStats[m.hookType]!.avgRoas += m.roasLogrado;
    });
    const topHook = Object.entries(hookStats)
      .map(([k, v]) => ({ hook: k, avgRoas: v.avgRoas / v.total }))
      .sort((a, b) => b.avgRoas - a.avgRoas)[0];

    return {
      ok:       true,
      total:    creativos.length,
      filtro:   canal ?? "todos los canales",
      topHook:  topHook ? `${topHook.hook} (ROAS promedio ${topHook.avgRoas.toFixed(1)}x)` : "—",
      creativos,
    };
  } catch (err) {
    console.error("[PROMETEO][TOOL] consultar_creative_memory:", err);
    return { ok: false, error: "No se pudo cargar la Creative Memory." };
  }
}

// ── Handler: generar_variantes_lab ────────────────────────────────────────────

async function handleGenerarVariantesLab(
  args: Record<string, unknown>,
  _ctx: ExtensionContext,
): Promise<unknown> {
  const wsId = await resolveWorkspace(args.workspaceId as string | undefined);
  if (!wsId) return { ok: false, error: "No se encontró ningún workspace." };

  const { objetivo, canal, industria, presupuestoMXN } = args as {
    objetivo:        TipoObjetivo;
    canal:           CanalMarketing;
    industria:       string;
    presupuestoMXN?: number;
  };

  try {
    // Leer Creative Memory para scoring contextual
    const db      = await getDb();
    const memSnap = await db
      .collection(pPath(wsId, "creative_memory"))
      .orderBy("performanceScore", "desc")
      .limit(15)
      .get();

    const memories = memSnap.docs.map((d) => d.data() as CreativeMemory);

    // Patrones ganadores para el prompt
    const patrones = memories
      .filter((m) => m.usarDeNuevo && m.performanceScore >= 60)
      .slice(0, 3)
      .map((m) => `${m.hookType}: "${m.hookTexto.slice(0, 50)}" — ROAS ${m.roasLogrado}x`)
      .join("\n");

    const { callGroq } = await import("@/lib/groq");

    const prompt = `Eres experto en publicidad digital para ${industria}.
Objetivo: ${objetivo} | Canal: ${canal}${presupuestoMXN ? ` | Presupuesto: $${presupuestoMXN.toLocaleString()} MXN` : ""}
${patrones ? `\nPatrones ganadores del historial:\n${patrones}\n` : ""}
Genera 3 variantes creativas poderosas. Responde solo JSON:
{
  "variantes": [
    {
      "hookType": "TIPO_HOOK",
      "hookTexto": "texto del hook (máx 80 chars)",
      "ctaTexto": "CTA (máx 25 chars)",
      "oferta": "propuesta de valor (máx 60 chars)",
      "scorePredictivoRoas": 7.5
    }
  ]
}`;

    const raw = await callGroq(prompt, { maxTokens: 600, temperature: 0.75, json: true });

    if (!raw) {
      return {
        ok:       false,
        error:    "Groq no disponible. Usa el Creative Lab en /prometeo/creative-lab para generar variantes.",
      };
    }

    const parsed = JSON.parse(raw) as { variantes: unknown[] };

    return {
      ok:       true,
      objetivo,
      canal,
      industria,
      variantes: parsed.variantes,
      nota:      "Usa /prometeo/creative-lab para guardar estas variantes en tu sesión.",
    };
  } catch (err) {
    console.error("[PROMETEO][TOOL] generar_variantes_lab:", err);
    return { ok: false, error: "Error generando variantes. Prueba desde /prometeo/creative-lab." };
  }
}

// ── Handler: generar_brief_director ──────────────────────────────────────────

async function handleGenerarBriefDirector(
  args: Record<string, unknown>,
  _ctx: ExtensionContext,
): Promise<unknown> {
  const wsId = await resolveWorkspace(args.workspaceId as string | undefined);
  if (!wsId) return { ok: false, error: "No se encontró ningún workspace." };

  try {
    const db = await getDb();

    // Leer goals activos
    const goalsSnap = await db
      .collection(pPath(wsId, "goals"))
      .where("estado", "==", "activo")
      .limit(15)
      .get();
    const goals = goalsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as BrandGoal));

    // Leer Creative Memory top
    const memSnap = await db
      .collection(pPath(wsId, "creative_memory"))
      .orderBy("performanceScore", "desc")
      .limit(10)
      .get();
    const memories = memSnap.docs.map((d) => d.data() as CreativeMemory);

    // Análisis básico
    const clientesActivos  = [...new Set(goals.map((g) => g.clienteNombre))];
    const clientesBajoPct  = goals.filter((g) => {
      const pct = g.valorObjetivo > 0 ? (g.valorActual / g.valorObjetivo) * 100 : 0;
      return pct < 30;
    });
    const clientesUrgentes = goals.filter((g) => {
      const dias = Math.ceil((g.fechaLimite - Date.now()) / 86_400_000);
      return dias < 7 && g.estado === "activo";
    });

    const avgRoas = memories.length
      ? (memories.reduce((s, m) => s + m.roasLogrado, 0) / memories.length).toFixed(1)
      : "—";

    const { callGroq } = await import("@/lib/groq");

    const resumenGoals = goals.slice(0, 6).map((g) => {
      const pct  = g.valorObjetivo > 0 ? Math.round((g.valorActual / g.valorObjetivo) * 100) : 0;
      const dias = Math.ceil((g.fechaLimite - Date.now()) / 86_400_000);
      return `• ${g.clienteNombre}: ${g.tipo} en ${g.canal} — ${pct}% meta, ${dias}d restantes`;
    }).join("\n");

    const prompt = `Director Autónomo PROMETEO. Hoy: ${new Date().toLocaleDateString("es-MX")}.

CLIENTES: ${clientesActivos.join(", ") || "ninguno"}
ROAS promedio del workspace: ${avgRoas}x
OBJETIVOS ACTIVOS:\n${resumenGoals || "Sin objetivos activos."}
URGENTES (<7 días): ${clientesUrgentes.map((g) => g.clienteNombre).join(", ") || "ninguno"}
BAJO PROGRESO (<30%): ${clientesBajoPct.map((g) => g.clienteNombre).join(", ") || "ninguno"}

Genera el brief ejecutivo del día en JSON:
{
  "resumen": "resumen en 2 oraciones del estado del workspace",
  "recomendaciones": [
    { "cliente": "nombre", "accion": "ESCALAR|PAUSAR|NUEVO_CREATIVO|CAMBIAR_CANAL|FATIGA", "descripcion": "acción concreta", "urgencia": "ALTA|MEDIA|BAJA" }
  ],
  "oportunidades": [
    { "cliente": "nombre", "descripcion": "oportunidad", "potencial": "impacto estimado" }
  ]
}
Máx 4 recomendaciones, 2 oportunidades.`;

    const raw = await callGroq(prompt, { maxTokens: 800, temperature: 0.35, json: true });

    if (!raw) {
      return {
        ok:       true,
        resumen:  `${clientesActivos.length} clientes activos. ROAS promedio: ${avgRoas}x.`,
        urgentes: clientesUrgentes.map((g) => g.clienteNombre),
        bajoPct:  clientesBajoPct.map((g) => g.clienteNombre),
        nota:     "Para el brief completo, ve a /prometeo/director → Generar Brief del Día.",
      };
    }

    const brief = JSON.parse(raw) as {
      resumen:          string;
      recomendaciones:  { cliente: string; accion: string; descripcion: string; urgencia: string }[];
      oportunidades:    { cliente: string; descripcion: string; potencial: string }[];
    };

    return {
      ok:              true,
      fecha:           new Date().toLocaleDateString("es-MX"),
      clientesActivos: clientesActivos.length,
      roasPromedio:    `${avgRoas}x`,
      ...brief,
    };
  } catch (err) {
    console.error("[PROMETEO][TOOL] generar_brief_director:", err);
    return { ok: false, error: "No se pudo generar el brief. Ve a /prometeo/director." };
  }
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

async function prometeoToolHandler(
  toolName: string,
  args:     Record<string, unknown>,
  ctx:      ExtensionContext,
): Promise<unknown> {
  switch (toolName) {
    case "consultar_objetivos":      return handleConsultarObjetivos(args, ctx);
    case "consultar_brand_dna":      return handleConsultarBrandDNA(args, ctx);
    case "registrar_objetivo":       return handleRegistrarObjetivo(args, ctx);
    case "consultar_creative_memory":return handleConsultarCreativeMemory(args, ctx);
    case "generar_variantes_lab":    return handleGenerarVariantesLab(args, ctx);
    case "generar_brief_director":   return handleGenerarBriefDirector(args, ctx);
    default:
      console.warn(`[PROMETEO][TOOL] unknown tool: ${toolName}`);
      return { ok: false, error: `Herramienta desconocida: ${toolName}` };
  }
}

// ── Export ────────────────────────────────────────────────────────────────────

export const prometeoTools: ExtensionToolRegistry = {
  tools:   TOOL_DEFS,
  handler: prometeoToolHandler,
};
