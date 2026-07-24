/**
 * POST /api/atena/generar-proyecto
 *
 * Genera un plan de proyecto completo usando Groq (llama-3.3-70b-versatile).
 * Metodologías: PMBOK, Lean Six Sigma DMAIC/DMADV, Poka-Yoke, Kaizen.
 *
 * Body: { nombre, area, metodologia, problema, objetivo, duracionMeses, presupuesto }
 * Response: { generated: ProyectoGenerado }
 *
 * No requiere auth — la IA devuelve datos al cliente para revisión antes de guardar.
 */

import { NextRequest, NextResponse } from "next/server";
import { callGroq }                  from "@/lib/groq";

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    nombre?:        string;
    area?:          string;
    metodologia?:   "DMAIC" | "DMADV";
    problema?:      string;
    objetivo?:      string;
    duracionMeses?: number;
    presupuesto?:   number;
  };

  const { nombre, area, metodologia, problema, objetivo, duracionMeses, presupuesto } = body;

  if (!nombre?.trim() || !problema?.trim()) {
    return NextResponse.json(
      { error: "nombre y problema son campos requeridos" },
      { status: 400 },
    );
  }

  const metodo     = metodologia ?? "DMAIC";
  const meses      = duracionMeses ?? 6;
  const semanas    = meses * 4;
  const fases      = metodo === "DMADV"
    ? "DEFINE, MEASURE, ANALYZE, DESIGN, VERIFY"
    : "DEFINE, MEASURE, ANALYZE, IMPROVE, CONTROL";

  const prompt = `Eres ATENA, motor de inteligencia científica especializado en:
- PMBOK 7a edición: acta de constitución, WBS, gestión de riesgos, stakeholders
- Lean Six Sigma ${metodo}: CTQ, VOC, MSA, FMEA, SPC, Sigma Level, DPMO
- Poka-Yoke: dispositivos anti-error, sensores de presencia, controles visuales, sistemas baka-yoke
- Kaizen: eventos Gemba, 5S, SMED, Kanban, círculos de calidad, mejora rápida
- Teoría de Restricciones (TOC): cuello de botella, buffer, drum-buffer-rope

Genera un plan de proyecto completo en JSON para:

NOMBRE: ${nombre}
ÁREA/PROCESO: ${area ?? "General"}
METODOLOGÍA: ${metodo} (fases: ${fases})
PROBLEMA DETECTADO: ${problema}
OBJETIVO DESEADO: ${objetivo ?? "Mejorar los indicadores del proceso"}
DURACIÓN: ${meses} meses (${semanas} semanas)
PRESUPUESTO ESTIMADO: $${presupuesto ?? 0} MXN

Devuelve SOLO JSON válido con esta estructura exacta:
{
  "charter": {
    "objetivoSMART": "Objetivo específico medible alcanzable relevante temporal — 2-3 oraciones con métricas concretas y fecha límite",
    "alcance": "Descripción del alcance: qué procesos incluye, qué líneas/áreas/productos cubre",
    "limites": "Límites: qué queda fuera del proyecto, restricciones de presupuesto/tiempo/recursos",
    "ctq": [
      { "nombre": "Variable CTQ", "unidad": "unidad de medida", "valorActual": 0, "valorObjetivo": 0, "lsl": 0, "usl": 0 }
    ]
  },
  "hitos": [
    { "fase": "DEFINE", "nombre": "Nombre del hito", "descripcion": "Qué se hace y por qué", "entregable": "Documento/resultado concreto", "semana": 1, "tipo": "PUERTA" }
  ],
  "riesgos": [
    { "descripcion": "Descripción del riesgo específico", "probabilidad": "ALTA", "impacto": "ALTO", "tipo": "TECNICO", "mitigacion": "Acción concreta de mitigación", "pokayoke": "Mecanismo poka-yoke específico: sensor/visual/físico que previene el error" }
  ],
  "amefInicial": [
    { "pasoDelProceso": "Paso del proceso", "modoDeFalla": "Cómo falla exactamente", "efectoDelFallo": "Impacto en cliente/proceso", "causaRaiz": "Causa raíz (5 Porqués)", "controlesActuales": "Controles existentes hoy", "severidad": 7, "ocurrencia": 5, "deteccion": 6, "accionCorrectiva": "Acción correctiva recomendada con responsable" }
  ],
  "kaizenEvents": [
    { "nombre": "Nombre del Kaizen", "fase": "IMPROVE", "descripcion": "Objetivo y metodología del evento", "duracionDias": 5, "metricaObjetivo": "Métrica con valor objetivo numérico" }
  ]
}

Cantidades requeridas:
- CTQ: 3-5 variables críticas para la calidad con valores numéricos realistas
- Hitos: 10-15 hitos distribuidos en ${semanas} semanas (2-3 por fase ${metodo})
- Riesgos: 5-8 riesgos con poka-yokes MUY específicos al proceso (no genéricos)
- AMEF: 4-6 ítems; severidad/ocurrencia/detección entre 1-10, realistas para el sector
- Kaizen: 2-3 eventos en fase IMPROVE con métricas concretas

Usa terminología LSS técnica y real. Todos los números deben ser realistas para el área/proceso descrito.`;

  const raw = await callGroq(prompt, {
    maxTokens:   3500,
    temperature: 0.65,
    json:        true,
  });

  if (!raw) {
    return NextResponse.json(
      { error: "Error al conectar con el motor de IA. Verifica GROQ_API_KEY." },
      { status: 500 },
    );
  }

  try {
    const generated = JSON.parse(raw);
    return NextResponse.json({ generated });
  } catch {
    return NextResponse.json(
      { error: "La IA devolvió una respuesta no estructurada. Intenta de nuevo." },
      { status: 500 },
    );
  }
}
