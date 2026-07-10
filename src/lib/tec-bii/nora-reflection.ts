/**
 * TEC Bii — N.O.R.A. Reflection Engine (Sprint T2-6)
 * RUMBO A TIER 4
 *
 * N.O.R.A. (Neural Observer & Reasoning Architecture) genera reflexiones
 * cognitivas periódicas sobre el estado del Área de Producción Audiovisual.
 *
 * A diferencia del motor NEXO (que analiza capturas web del usuario),
 * este motor analiza el estado operacional real del área: proyectos,
 * equipo, briefs, hipótesis cruzadas y métricas de carga.
 *
 * Solo corre en contexto servidor.
 */

import { getAdminDb }       from "@/lib/firebase-admin";
import { tecBiiPath }       from "@/lib/tec-bii/collections";
import type { ProyectoV2, EmpleadoV2, BriefV2 } from "@/extensions/tec-bii/schema";
import { callGroq }        from "@/lib/groq";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface NoraPattern {
  tipo:        "carga" | "urgencia" | "talento" | "oportunidad" | "riesgo" | "tendencia";
  descripcion: string;
}

export interface NoraReflection {
  id:            string;
  narrativa:     string;           // párrafo reflexivo en lenguaje natural
  patrones:      NoraPattern[];    // patrones detectados estructurados
  recomendacion: string;           // acción concreta sugerida
  estadoGeneral: "crítico" | "alerta" | "estable" | "óptimo";
  generadoEn:    number;
  contexto: {
    proyectosAnalizados: number;
    empleadosAnalizados: number;
    briefsAnalizados:    number;
    hipotesisActivas:    number;
  };
}

export interface NoraReflectResult {
  reflection:  NoraReflection;
  skipped:     boolean;
  reason?:     string;
  durationMs:  number;
}

// ── Cooldown: máximo una reflexión cada 6h ────────────────────────────────────

const COOLDOWN_HOURS = 6;

async function getLastReflection(uid: string): Promise<NoraReflection | null> {
  const db   = getAdminDb();
  const snap = await db
    .collection(`users/${uid}/tec_bii_reflexiones`)
    .orderBy("generadoEn", "desc")
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0].data() as NoraReflection;
}

// ── Motor principal ───────────────────────────────────────────────────────────

export async function runNoraReflection(uid: string, force = false): Promise<NoraReflectResult> {
  const start = Date.now();
  const db    = getAdminDb();

  // Cooldown check
  if (!force) {
    const last = await getLastReflection(uid);
    if (last) {
      const hoursSince = (Date.now() - last.generadoEn) / 3_600_000;
      if (hoursSince < COOLDOWN_HOURS) {
        return {
          reflection:  last,
          skipped:     true,
          reason:      `Reflexión reciente (${hoursSince.toFixed(1)}h atrás)`,
          durationMs:  Date.now() - start,
        };
      }
    }
  }

  // 1. Leer entidades TEC Bii
  const [proySnap, empSnap, briefSnap] = await Promise.all([
    db.collection(tecBiiPath(uid, "proyecto")).orderBy("updatedAt", "desc").limit(20).get(),
    db.collection(tecBiiPath(uid, "empleado")).where("activo", "==", true).limit(15).get(),
    db.collection(tecBiiPath(uid, "brief")).orderBy("updatedAt", "desc").limit(15).get(),
  ]);

  const proyectos = proySnap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProyectoV2);
  const empleados = empSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as EmpleadoV2);
  const briefs    = briefSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as BriefV2);

  // Hipótesis totales
  const hipotesisActivas = proyectos.reduce((s, p) => s + (p.hypotheses?.length ?? 0), 0);

  // Necesitamos algo de datos para reflexionar
  if (proyectos.length === 0 && empleados.length === 0) {
    const empty = buildEmptyReflection(start);
    return { reflection: empty, skipped: true, reason: "Sin datos suficientes", durationMs: Date.now() - start };
  }

  // 2. Construir contexto para Gemini
  const contexto = buildContextString(proyectos, empleados, briefs, hipotesisActivas);

  // 3. Llamar a Groq
  const prompt = `Eres N.O.R.A. (Neural Observer & Reasoning Architecture), el motor de reflexión cognitiva del Área de Producción Audiovisual del Tecnológico de Monterrey Campus Monterrey.

Analizas el estado operacional del área y generas reflexiones profundas, empáticas y accionables sobre la situación del equipo, los proyectos y los patrones emergentes.

ESTADO OPERACIONAL ACTUAL:
${contexto}

Tu reflexión debe:
1. Ser empática con el equipo y respetuosa de la carga de trabajo real
2. Detectar patrones no obvios entre los datos (ejemplo: alta carga + deadline próximo + empleado sin refuerzo)
3. Expresar la narrativa en primera persona como NORA (observadora del sistema)
4. La recomendación debe ser concreta y ejecutable esta semana

Responde EXACTAMENTE con este JSON (sin texto adicional):
{
  "narrativa": "párrafo reflexivo de 3-4 oraciones que describe lo que NORA observa en el área",
  "patrones": [
    { "tipo": "uno de: carga | urgencia | talento | oportunidad | riesgo | tendencia", "descripcion": "descripción concisa del patrón" }
  ],
  "recomendacion": "acción concreta y específica que el área debería tomar esta semana",
  "estadoGeneral": "uno de: crítico | alerta | estable | óptimo"
}`;

  const raw = await callGroq(prompt, { maxTokens: 600, temperature: 0.65, json: true });
  if (!raw) throw new Error("Groq no devolvió respuesta");

  let parsed: {
    narrativa:     string;
    patrones:      NoraPattern[];
    recomendacion: string;
    estadoGeneral: NoraReflection["estadoGeneral"];
  };

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Respuesta Groq inválida: ${raw.slice(0, 200)}`);
  }

  // 4. Construir y persistir la reflexión
  const now        = Date.now();
  const reflection: NoraReflection = {
    id:            `nora-${now}`,
    narrativa:     parsed.narrativa,
    patrones:      (parsed.patrones ?? []).slice(0, 5),
    recomendacion: parsed.recomendacion,
    estadoGeneral: parsed.estadoGeneral ?? "estable",
    generadoEn:    now,
    contexto: {
      proyectosAnalizados: proyectos.length,
      empleadosAnalizados: empleados.length,
      briefsAnalizados:    briefs.length,
      hipotesisActivas,
    },
  };

  await db
    .collection(`users/${uid}/tec_bii_reflexiones`)
    .doc(reflection.id)
    .set(reflection);

  return {
    reflection,
    skipped:    false,
    durationMs: Date.now() - start,
  };
}

// ── Historial ─────────────────────────────────────────────────────────────────

export async function getNoraReflections(uid: string, limit = 5): Promise<NoraReflection[]> {
  const db   = getAdminDb();
  const snap = await db
    .collection(`users/${uid}/tec_bii_reflexiones`)
    .orderBy("generadoEn", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((d) => d.data() as NoraReflection);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildContextString(
  proyectos: ProyectoV2[],
  empleados: EmpleadoV2[],
  briefs:    BriefV2[],
  hipotesis: number,
): string {
  const lines: string[] = [];

  // Proyectos
  lines.push(`PROYECTOS (${proyectos.length} total):`);
  const produccion = proyectos.filter((p) => p.estado === "En producción");
  const revision   = proyectos.filter((p) => p.estado === "En revisión");
  const urgentes   = proyectos.filter((p) => (p.urgencyScore ?? 0) >= 0.7);
  lines.push(`  En producción: ${produccion.length} | En revisión: ${revision.length} | Urgentes: ${urgentes.length}`);
  urgentes.slice(0, 3).forEach((p) =>
    lines.push(`  ⚠ "${p.titulo}" — urgencia ${Math.round((p.urgencyScore ?? 0) * 100)}%, estado: ${p.estado}`)
  );

  // Empleados
  lines.push(`\nEQUIPO ACTIVO (${empleados.length} personas):`);
  const saturados   = empleados.filter((e) => (e.cargaActual ?? 0) >= 0.85);
  const disponibles = empleados.filter((e) => (e.cargaActual ?? 0) < 0.35);
  const cargaAvg    = empleados.length > 0
    ? empleados.reduce((s, e) => s + (e.cargaActual ?? 0), 0) / empleados.length
    : 0;
  lines.push(`  Carga promedio: ${Math.round(cargaAvg * 100)}% | Saturados: ${saturados.length} | Disponibles: ${disponibles.length}`);
  saturados.slice(0, 2).forEach((e) =>
    lines.push(`  🔴 ${e.nombre} (${e.puesto}) — ${Math.round((e.cargaActual ?? 0) * 100)}% carga`)
  );
  if (disponibles.length > 0) {
    lines.push(`  🟢 ${disponibles.map((e) => e.nombre).join(", ")} — disponibles`);
  }

  // Briefs recientes
  if (briefs.length > 0) {
    const pendientes = briefs.filter((b) => b.estado === "Recibido" || b.estado === "En revisión");
    lines.push(`\nBRIEFS (${briefs.length} recientes):`);
    lines.push(`  Pendientes de revisión: ${pendientes.length}`);
    briefs.slice(0, 3).forEach((b) =>
      lines.push(`  "${b.titulo}" — ${b.estado} · score ${b.briefScore ?? "—"}`)
    );
  }

  // Hipótesis cruzadas
  lines.push(`\nHIPÓTESIS CRUZADAS NEXO ↔ TEC Bii: ${hipotesis} activas`);

  return lines.join("\n");
}

function buildEmptyReflection(start: number): NoraReflection {
  return {
    id:            `nora-empty-${Date.now()}`,
    narrativa:     "El área aún no tiene suficientes datos para generar una reflexión cognitiva. Registra proyectos y empleados para que N.O.R.A. pueda comenzar a observar.",
    patrones:      [],
    recomendacion: "Registra al menos un proyecto y un empleado activo para activar el motor de reflexión.",
    estadoGeneral: "estable",
    generadoEn:    start,
    contexto:      { proyectosAnalizados: 0, empleadosAnalizados: 0, briefsAnalizados: 0, hipotesisActivas: 0 },
  };
}
