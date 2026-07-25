# ALEJANDRÍA — Guía de Procesamiento de Documentos

> Usa este archivo como referencia para procesar cada documento del corpus SOFIAA.
> El objetivo: convertir documentos en bruto en nodos de conocimiento estructurado
> listos para ser ingestados en el Knowledge Graph de SOFIAA.

---

## 1. Organización de Carpetas

```
/alejandria_corpus/
│
├── /fase_1/                        ← Documentos más recientes (julio 2026 → presente)
│   ├── /sprints/                   ← Reportes de sprint (A-9, P-8, H-4, etc.)
│   ├── /decisiones/                ← Decisiones de arquitectura
│   ├── /brainstorming/             ← Ideas, lluvias, conceptos
│   └── /modulos/                   ← Especificaciones por módulo
│
├── /fase_2/                        ← Documentos anteriores (primer mes)
│   ├── /sprints/
│   ├── /decisiones/
│   ├── /brainstorming/
│   └── /modulos/
│
├── /fase_N/                        ← Agregar fases según antigüedad
│
└── _indice.json                    ← Índice maestro (se genera al final)
```

**Convención de nombres de archivo:**
```
{tipo}_{modulo}_{descripcion_corta}_{fecha}.json

Ejemplos:
sprint_atena_nuevo_proyecto_wizard_20260724.json
decision_nexo_como_backplane_20260720.json
brainstorming_alejandria_autoconocimiento_20260724.json
modulo_hermes_executor_pipeline_20260715.json
```

---

## 2. Schema JSON — Estructura de cada documento procesado

Este es el formato exacto que debe tener cada archivo `.json` de salida.

```json
{
  "id": "string único — usa el nombre del archivo sin extensión",
  "tipo": "sprint | decision_arquitectura | brainstorming | especificacion_modulo | experimento | hito | idea",
  "fecha": "YYYY-MM-DD",
  "fase_corpus": "fase_1 | fase_2 | fase_3",

  "titulo": "Título claro y descriptivo del documento",
  "resumen": "2-4 oraciones que capturan TODO el valor del documento. Esta es la descripción que SOFIAA leerá en contexto. Debe ser densa en información, sin relleno.",

  "modulos_afectados": ["SOFIAA", "NEXO", "PROMETEO", "ATENA", "HERMES", "NORA", "TEC_BII", "ALEJANDRIA", "LIVE_SDK"],

  "sprint_referencia": "A-9 | P-8 | H-4 | null",
  "version_sofiaa": "1.0 | 1.1 | 2.0 | null",

  "decisiones": [
    {
      "decision": "Descripción concisa de qué se decidió",
      "contexto": "Qué problema o necesidad motivó la decisión",
      "alternativas_descartadas": [
        "Alternativa A — por qué se descartó",
        "Alternativa B — por qué se descartó"
      ],
      "justificacion": "Razón principal de la decisión tomada",
      "consecuencias": "Qué cambió en el sistema como resultado"
    }
  ],

  "conceptos_clave": [
    {
      "concepto": "Nombre del concepto (ej: Event Sourcing, CTQ, Knowledge Graph)",
      "definicion": "Qué significa este concepto en el contexto específico de SOFIAA",
      "relacion_modulos": ["NEXO", "NORA"]
    }
  ],

  "hitos": [
    {
      "hito": "Qué se logró o intentó",
      "resultado": "exitoso | fallido | parcial | pendiente",
      "aprendizaje": "Qué se aprendió, qué funcionó o qué falló"
    }
  ],

  "preguntas_que_responde": [
    "¿Por qué existe Alejandría?",
    "¿Cuándo se propuso usar NEXO como backplane?",
    "¿Qué diferencia hay entre Nora y Alejandría?"
  ],

  "tags": ["arquitectura", "memoria", "autoconocimiento", "nexo", "módulo_nuevo"],

  "texto_embedding": "Texto completo y denso en información del documento, optimizado para búsqueda semántica. Máximo 1500 palabras. Eliminar: saludos, frases de relleno, repeticiones, formato decorativo. Conservar: toda la información técnica, decisiones, contexto, nombres propios, números relevantes.",

  "documento_original": "ALEJANDRIA.docx",
  "procesado_por": "claude | gpt-4 | gemini | manual",
  "fecha_procesamiento": "YYYY-MM-DD"
}
```

---

## 3. Tipos de documento y qué extraer de cada uno

| Tipo | Qué enfatizar en la extracción |
|------|-------------------------------|
| `sprint` | Tareas completadas, errores encontrados, decisiones técnicas, archivos modificados |
| `decision_arquitectura` | La decisión en sí, alternativas descartadas, justificación, módulos afectados |
| `brainstorming` | Ideas propuestas, conceptos nuevos, preguntas abiertas, relaciones entre módulos |
| `especificacion_modulo` | Schema de datos, endpoints, flujo de datos, dependencias |
| `experimento` | Hipótesis, método, resultado, aprendizaje |
| `hito` | Qué se alcanzó, fecha, estado del sistema antes/después |
| `idea` | Concepto central, viabilidad percibida, módulos involucrados |

---

## 4. Prompt de Procesamiento — Copia y pega esto con cada documento

```
Eres un procesador de conocimiento especializado en el proyecto SOFIAA, un ecosistema de inteligencia artificial modular construido con Next.js, Firebase y Groq.

El sistema tiene los siguientes módulos principales:
- SOFIAA: núcleo de chat e IA principal
- NEXO (N.E.X.O.): sistema nervioso central / knowledge graph / memoria semántica
- PROMETEO: motor de growth intelligence para agencias de marketing
- NORA: sistema de observación y memoria episódica del usuario
- HERMES: motor de automatización y ejecución de acciones
- ATENA: motor de análisis científico (Lean Six Sigma, DMAIC, PMBOK, AMEF, SPC)
- TEC BII: gestión institucional (empleados, proyectos, briefs, evaluaciones)
- ALEJANDRÍA: (en construcción) memoria histórica e ingeniería del proyecto

Tu tarea: procesar el documento adjunto y convertirlo en un nodo de conocimiento estructurado en formato JSON.

Reglas de extracción:
1. El campo "resumen" debe ser denso en información — quien lo lea sin ver el documento original debe entender el 80% del valor.
2. En "decisiones": extrae SOLO decisiones reales (arquitectura, tecnología, diseño). Si el documento no tiene decisiones explícitas, deja el array vacío.
3. En "texto_embedding": reescribe el contenido eliminando relleno, saludos, frases genéricas. Máximo 1500 palabras. Debe leer como conocimiento técnico comprimido.
4. En "preguntas_que_responde": escribe las preguntas literales que alguien podría hacerle a SOFIAA sobre este tema y que este documento respondería.
5. Elige el "tipo" más apropiado: sprint | decision_arquitectura | brainstorming | especificacion_modulo | experimento | hito | idea
6. En "modulos_afectados": incluye solo los módulos que el documento menciona o implica directamente.
7. Si el documento menciona una fecha, úsala en "fecha". Si no, usa la fecha aproximada que infieresde su contenido.
8. En "tags": 4-8 palabras clave técnicas que ayuden a clasificar y encontrar este documento.

Formato de salida: SOLO el JSON válido, sin markdown, sin explicaciones antes o después. El JSON debe ser parseable directamente.

Schema que debes seguir:
{
  "id": "",
  "tipo": "",
  "fecha": "",
  "fase_corpus": "",
  "titulo": "",
  "resumen": "",
  "modulos_afectados": [],
  "sprint_referencia": null,
  "version_sofiaa": null,
  "decisiones": [],
  "conceptos_clave": [],
  "hitos": [],
  "preguntas_que_responde": [],
  "tags": [],
  "texto_embedding": "",
  "documento_original": "",
  "procesado_por": "claude | gpt-4 | gemini",
  "fecha_procesamiento": ""
}

Documento a procesar:
[PEGA AQUÍ EL CONTENIDO DEL DOCUMENTO]
```

---

## 5. Proceso recomendado de trabajo

1. **Organiza primero** — Agrupa todos tus documentos en carpetas por fase (más recientes en fase_1).

2. **Prioriza por valor** — Empieza por documentos de decisiones de arquitectura y sprints clave. Deja los brainstormings para el final.

3. **Procesa en lotes** — Puedes procesar 5-10 documentos en una sesión de chat antes de que un modelo empiece a perder contexto. Guarda cada JSON al momento.

4. **Valida el JSON** — Después de cada procesamiento, verifica que el JSON es válido (usa jsonlint.com o similar) antes de guardarlo.

5. **Construye el índice** — Al terminar cada fase, crea un `_indice.json` con la lista de todos los archivos, sus títulos, tipos y módulos afectados. Esto acelerará la ingestión.

6. **Avísame cuando una fase esté lista** — La ingestión en Firestore la hacemos juntos en un sprint corto: un script Node.js lee los JSONs y los carga como documentos en `users/{uid}/alejandria_nodos`.

---

## 6. Ejemplo — Documento ALEJANDRIA.docx procesado

```json
{
  "id": "brainstorming_alejandria_autoconocimiento_20260724",
  "tipo": "brainstorming",
  "fecha": "2026-07-24",
  "fase_corpus": "fase_1",
  "titulo": "Alejandría — Plan de Autoconocimiento de SOFIAA",
  "resumen": "Propuesta de un módulo llamado Alejandría para dotar a SOFIAA de memoria histórica de ingeniería. Identifica que SOFIAA desconoce su propia arquitectura y sus módulos. Propone estructurar 2,000+ páginas de documentación como un Knowledge Graph de decisiones, hitos y evolución. Define la anatomía funcional de SOFIAA: Prometeo (corteza ejecutiva), Nora (memoria episódica), Alejandría (memoria histórica), Hermes (comunicación/acción), Live SDK (presencia), Nexo (sistema nervioso/backplane).",
  "modulos_afectados": ["SOFIAA", "NEXO", "PROMETEO", "NORA", "HERMES", "ALEJANDRIA", "LIVE_SDK"],
  "sprint_referencia": null,
  "version_sofiaa": null,
  "decisiones": [
    {
      "decision": "Alejandría no será un módulo completamente nuevo sino una extensión del Knowledge Graph de NEXO con tipos de nodo diferenciados",
      "contexto": "NEXO ya tiene la infraestructura de grafos semánticos. Crear un sistema paralelo duplicaría trabajo.",
      "alternativas_descartadas": [
        "Procesar documentos con Groq directamente — descartado por límites de tokens y costo",
        "Almacenar documentos raw en Firestore — descartado porque no permite búsqueda semántica eficiente"
      ],
      "justificacion": "Reutilizar NEXO evita duplicar infraestructura y aprovecha el sistema de embeddings ya implementado",
      "consecuencias": "Alejandría requiere un nuevo tipo de nodo 'engineering' vs 'user_context' en el schema de NEXO"
    }
  ],
  "conceptos_clave": [
    {
      "concepto": "Memoria de Ingeniería",
      "definicion": "Capacidad de SOFIAA para recordar las decisiones técnicas de su propio desarrollo, incluyendo alternativas descartadas y justificaciones",
      "relacion_modulos": ["ALEJANDRIA", "NEXO"]
    },
    {
      "concepto": "Event Sourcing",
      "definicion": "Arquitectura donde cada acción del sistema queda registrada como evento inmutable, creando un timeline completo de la vida de SOFIAA",
      "relacion_modulos": ["NEXO", "HERMES", "PROMETEO"]
    }
  ],
  "hitos": [
    {
      "hito": "Identificación del gap: SOFIAA no conoce sus propias extensiones (ATENA, PROMETEO, HERMES, TEC BII)",
      "resultado": "pendiente",
      "aprendizaje": "El sistema prompt actual no incluye inventario de módulos — se requiere actualización urgente como Fase 0"
    }
  ],
  "preguntas_que_responde": [
    "¿Qué es Alejandría?",
    "¿Por qué SOFIAA no conoce sus propias capacidades?",
    "¿Cuál es la diferencia entre Nora y Alejandría?",
    "¿Qué función cumple cada módulo de SOFIAA?",
    "¿Cómo se propone estructurar la documentación histórica de SOFIAA?",
    "¿Cuándo se propuso usar NEXO como sistema nervioso central?"
  ],
  "tags": ["alejandria", "autoconocimiento", "memoria-ingenieria", "nexo-backplane", "anatomia-sofiaa", "knowledge-graph", "event-sourcing"],
  "texto_embedding": "Alejandría es un plan para dar a SOFIAA memoria histórica de ingeniería. SOFIAA actualmente desconoce sus propios módulos (ATENA, PROMETEO, HERMES, TEC BII) porque su system prompt no ha sido actualizado. El plan propone procesar más de 2000 páginas de documentación existente en un Knowledge Graph estructurado con nodos de tipo DecisionArquitectura, SprintHito y EvolucionModulo. Cada decisión técnica se almacena con: qué se decidió, contexto, alternativas descartadas, justificación y consecuencias. Esto permite que SOFIAA responda preguntas como: por qué se descartó Redis, cuándo nació Hermes, qué arquitectura tenía el sistema antes del EventBus. La anatomía funcional de SOFIAA: Prometeo es la corteza ejecutiva que razona, Nora es la memoria episódica del usuario, Alejandría es la memoria histórica del proyecto, Hermes es comunicación y ejecución de acciones, Live SDK es la presencia física en Unreal Engine, NEXO es el sistema nervioso que conecta todos los módulos. NEXO como backplane implica que ningún módulo conoce directamente a los demás — todos hablan a través de NEXO. Esto permite agregar nuevos módulos sin rediseñar la arquitectura. El event sourcing aplicado a NEXO crearía un timeline completo: cada acción de HERMES, cada análisis de PROMETEO, cada conversación quedaría registrada como evento inmutable. Alejandría es implementable como extensión de NEXO con tipos de nodo diferenciados en lugar de un sistema paralelo. La fase inmediata es actualizar el system prompt de SOFIAA con inventario de extensiones.",
  "documento_original": "ALEJANDRIA.docx",
  "procesado_por": "claude",
  "fecha_procesamiento": "2026-07-24"
}
```
