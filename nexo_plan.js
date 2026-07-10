const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  Header, Footer, PageNumber
} = require('/sessions/serene-sharp-cannon/mnt/outputs/npm_global/lib/node_modules/docx');
const fs = require('fs');

const PURPLE = "7C3AED";
const ROSA   = "F472B6";
const AZUL   = "60A5FA";
const LILA   = "A855F7";
const DARK   = "1D1D1F";
const GRAY   = "6B7280";
const WHITE  = "FFFFFF";

const border   = { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" };
const borders  = { top: border, bottom: border, left: border, right: border };

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, font: "Arial", size: 36, bold: true, color: DARK })] });
}
function h2(text, color = PURPLE) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 26, bold: true, color })] });
}
function body(text, opts = {}) {
  return new Paragraph({ spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 21, color: opts.color || DARK, bold: opts.bold || false, italics: opts.italic || false })] });
}
function bullet(text, label = "", labelColor = PURPLE) {
  return new Paragraph({ bullet: { level: 0 }, spacing: { before: 40, after: 40 },
    children: [
      ...(label ? [new TextRun({ text: label, font: "Arial", size: 20, bold: true, color: labelColor }),
                   new TextRun({ text: " — ", font: "Arial", size: 20, color: GRAY })] : []),
      new TextRun({ text, font: "Arial", size: 20, color: DARK })
    ] });
}
function spacer() { return new Paragraph({ children: [new TextRun("")], spacing: { before: 40, after: 40 } }); }
function divider() {
  return new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB", space: 1 } },
    spacing: { before: 180, after: 180 }, children: [new TextRun("")] });
}

function sprintTable(sprint, color, weeks, goal, deliverables, risk) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2200, 7160],
    rows: [
      new TableRow({ children: [
        new TableCell({ columnSpan: 2, borders, shading: { fill: color, type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: 160, right: 160 }, width: { size: 9360, type: WidthType.DXA },
          children: [new Paragraph({ children: [
            new TextRun({ text: sprint + "  ·  ", font: "Arial", size: 24, bold: true, color: WHITE }),
            new TextRun({ text: weeks, font: "Arial", size: 20, color: "E0D9FF" })
          ]})] })
      ]}),
      ...([["OBJETIVO", goal], ["ENTREGABLES", deliverables], ["RIESGO / NOTA", risk]].map(([label, content], i) =>
        new TableRow({ children: [
          new TableCell({ borders, shading: { fill: "F9F7FF", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 160, right: 160 }, width: { size: 2200, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun({ text: label, font: "Arial", size: 17, bold: true, color: GRAY })] })] }),
          new TableCell({ borders, margins: { top: 80, bottom: 80, left: 160, right: 160 }, width: { size: 7160, type: WidthType.DXA },
            children: Array.isArray(content)
              ? content.map(d => new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: d, font: "Arial", size: 20, color: DARK })] }))
              : [new Paragraph({ children: [new TextRun({ text: content, font: "Arial", size: 20, color: i === 2 ? GRAY : DARK, italics: i === 2 })] })]
          })
        ]})
      ))
    ]
  });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 21 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: DARK },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: PURPLE },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
    ]
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: "E5E7EB", space: 1 } },
      children: [new TextRun({ text: "N.E.X.O. — Plan de Sprints · SOFIAA LAB · 2026", font: "Arial", size: 18, color: GRAY })]
    })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "SOFIAA LAB — Confidencial · Pág. ", font: "Arial", size: 18, color: GRAY }),
        new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: GRAY }),
        new TextRun({ text: " / ", font: "Arial", size: 18, color: GRAY }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 18, color: GRAY }),
      ]
    })] }) },
    children: [

      // ── PORTADA ──────────────────────────────────────────────────
      new Paragraph({ spacing: { before: 480, after: 60 },
        children: [new TextRun({ text: "N.E.X.O.", font: "Arial", size: 80, bold: true, color: PURPLE })] }),
      new Paragraph({ spacing: { before: 0, after: 60 },
        children: [new TextRun({ text: "Nexus Extension de Conocimiento y Operaciones", font: "Arial", size: 28, color: GRAY })] }),
      new Paragraph({ spacing: { before: 0, after: 320 },
        children: [new TextRun({ text: "Plan Logístico y de Sprints — SOFIAA LAB · Julio 2026", font: "Arial", size: 21, color: GRAY, italics: true })] }),

      new Table({
        width: { size: 9360, type: WidthType.DXA }, columnWidths: [2340, 2340, 2340, 2340],
        rows: [new TableRow({ children: [
          ...[
            ["8 Sprints", "~10 semanas", PURPLE],
            ["3 Fases", "Captura · Proceso · UX", LILA],
            ["0 Refactors", "100% sobre stack existente", ROSA],
            ["1 Objetivo", "SOFIAA te conoce de verdad", AZUL],
          ].map(([title, sub, color]) => new TableCell({
            borders, shading: { fill: color, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 140, right: 140 }, width: { size: 2340, type: WidthType.DXA },
            children: [
              new Paragraph({ children: [new TextRun({ text: title, font: "Arial", size: 22, bold: true, color: WHITE })] }),
              new Paragraph({ children: [new TextRun({ text: sub, font: "Arial", size: 17, color: "EDE9FE" })] })
            ]
          }))
        ]})]
      }),

      divider(),

      // ── 1. QUÉ ES NEXO ─────────────────────────────────────────
      h1("1. ¿Qué es N.E.X.O.?"),
      body("N.E.X.O. es la capa de ingesta de contexto real de SOFIAA. Convierte cualquier cosa que el usuario ve en internet — un restaurante en Instagram, un artículo, un producto, un video — en conocimiento estructurado que SOFIAA entiende, recuerda y usa proactivamente."),
      spacer(),
      body("No es un guardado de links. Es la diferencia entre tener 500 bookmarks que nunca vuelves a abrir y tener un perfil semántico vivo que se afina solo con el tiempo gracias al algoritmo de decaimiento."),
      spacer(),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1560, 1560, 1560, 1560, 1560, 1560],
        rows: [new TableRow({ children: [
          ...[["CAPTURAR",PURPLE],["COMPRENDER",LILA],["ENRIQUECER",ROSA],["DECAER",AZUL],["RECORDAR","10B981"],["ACTUAR",DARK]]
            .map(([label, color]) => new TableCell({
              borders, shading: { fill: color, type: ShadingType.CLEAR },
              margins: { top: 100, bottom: 100, left: 60, right: 60 }, width: { size: 1560, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: label, font: "Arial", size: 19, bold: true, color: WHITE })] })]
            }))
        ]})]
      }),

      divider(),

      // ── 2. ARQUITECTURA ────────────────────────────────────────
      h1("2. Arquitectura Técnica"),
      h2("Capa 1 — Captura"),
      bullet("Chrome Extension Manifest V3 — lee el DOM ya renderizado en el navegador del usuario. Sin scraping externo, sin riesgo de bloqueo ni violación de ToS.", "Canal principal", PURPLE),
      bullet("PWA Share Target — el usuario comparte desde Instagram, Maps o cualquier app móvil directamente a SOFIAA.", "Canal mobile", ROSA),
      bullet("Screenshot en el chat de SOFIAA → Gemini Vision — el método más robusto para contenido visual.", "Fallback visual", AZUL),
      spacer(),
      h2("Capa 2 — Procesamiento"),
      bullet("Nueva herramienta en el Agent Runtime: extract_social_metadata(url, text, imageUrl?)", "Tool", PURPLE),
      bullet("Gemini Flash para clasificación de categoría y score de importancia 0-1. Costo ~$0.0003 por captura de texto.", "Clasificación", LILA),
      bullet("Gemini Vision solo cuando hay imagen adjunta. Costo ~$0.002 por imagen.", "Visión", ROSA),
      spacer(),
      h2("Capa 3 — Memoria con Decaimiento"),
      bullet("ExperienceGraph existente extendido con: weight, lastReinforced, decayRate, tags, source.", "Storage", PURPLE),
      bullet("Función: peso × e^(−0.05 × días_sin_referencia). Un nodo pierde 65% en 21 días y es eliminado a los ~60 días.", "Decay", LILA),
      bullet("Vercel Cron Job diario a las 3 AM — aplica decay y elimina nodos con peso < 0.05.", "Cron", ROSA),
      bullet("Refuerzo activo: cada vez que SOFIAA referencia un nodo en conversación, peso se resetea.", "Refuerzo", AZUL),
      spacer(),
      h2("Integración con SOFIAA Core"),
      body("N.E.X.O. NUNCA toca la capa de personalidad de SOFIAA. Solo enriquece la capa de conocimiento contextual por usuario. La privacidad está garantizada por diseño: cada grafo vive en users/{uid}/experience_graph/ — es estructuralmente imposible que el contexto de un usuario llegue a otro."),
      spacer(),
      bullet("Top-5 nodos de mayor peso inyectados al system prompt al inicio de cada conversación (~200 tokens).", "Inyección", PURPLE),
      bullet("Modo-aware: en extensiones profesionales (TEC BI, Marketing Sofia) el contexto personal NO se inyecta.", "Privacidad", AZUL),

      divider(),

      // ── 3. STACK ───────────────────────────────────────────────
      h1("3. Stack Tecnológico"),
      spacer(),
      new Table({
        width: { size: 9360, type: WidthType.DXA }, columnWidths: [2600, 6760],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders, shading: { fill: PURPLE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, width: { size: 2600, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: "CAPA", font: "Arial", size: 18, bold: true, color: WHITE })] })] }),
            new TableCell({ borders, shading: { fill: PURPLE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, width: { size: 6760, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: "TECNOLOGÍA", font: "Arial", size: 18, bold: true, color: WHITE })] })] }),
          ]}),
          ...[
            ["Captura Desktop",  "Chrome Extension Manifest V3 · Content Script · Popup UI", PURPLE],
            ["Captura Mobile",   "PWA Share Target API · Service Worker", LILA],
            ["Captura Visual",   "Gemini 1.5 Flash Vision — ya integrado en Capability Runtime", ROSA],
            ["Procesamiento",    "Agent Runtime ReAct existente · nueva tool: extract_social_metadata", AZUL],
            ["Clasificación",    "Gemini Flash (~500 tokens/captura) · Groq Llama como fallback", "10B981"],
            ["Base de datos",    "Firestore users/{uid}/experience_graph/ — ya existe", PURPLE],
            ["Decay Engine",     "Vercel Cron Job diario · función exponencial λ=0.05", LILA],
            ["Context Inject",   "getNexoContext(uid) → top-5 nodos → system prompt de SOFIAA", ROSA],
            ["Action Cards",     "React / Tailwind · IntentDrivenUI existente · 5 plantillas nuevas", AZUL],
            ["Enriquecimiento",  "Google Places API (restaurantes) · Perplexity Sonar (Phase 2)", "10B981"],
          ].map(([layer, tech, color], i) => new TableRow({ children: [
            new TableCell({ borders, shading: { fill: color, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, width: { size: 2600, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: layer, font: "Arial", size: 20, bold: true, color: WHITE })] })] }),
            new TableCell({ borders, shading: { fill: i % 2 === 0 ? "FAFAFA" : "F9F7FF", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, width: { size: 6760, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: tech, font: "Arial", size: 20, color: DARK })] })] }),
          ]}))
        ]
      }),

      divider(),

      // ── 4. SPRINTS ─────────────────────────────────────────────
      h1("4. Plan de Sprints"),
      spacer(),

      h2("FASE 1 — Arquitectura Base  (Sprints N-0 a N-2)", DARK),
      spacer(),

      sprintTable(
        "Sprint N-0 · Contratos y Fundación", PURPLE, "1 semana",
        "Definir todos los tipos, esquemas y contratos de datos antes de escribir una línea de lógica.",
        [
          "Tipos TypeScript: NexoCapture, NexoNode, NexoEvent, NexoIngestPayload",
          "Schema Firestore: users/{uid}/experience_graph/{nodeId} con campos weight, lastReinforced, decayRate, tags, source",
          "Endpoint esqueleto: POST /api/nexo/ingest — valida payload, retorna 200",
          "Registrar nexo-extension en ExtensionRegistry de SOFIAA como SEE",
          "Manifest de extensión en sofiaa-os (misma estructura que marketing-sofia)",
        ],
        "Sprint cero — si los contratos cambian después, todo lo que sigue rompe. Dedicar el tiempo necesario aquí ahorra dos semanas adelante."
      ),
      spacer(),

      sprintTable(
        "Sprint N-1 · Chrome Extension MVP", "6D28D9", "1 semana",
        "Extensión de Chrome funcional que autentica con Firebase y envía una captura de página real a SOFIAA.",
        [
          "Manifest V3: permisos activeTab, storage, identity",
          "Content script: extrae URL, título, texto visible, imágenes principales del DOM",
          "Popup UI: botón 'Enviar a SOFIAA' + indicador de estado (conectado / sin sesión)",
          "Firebase Auth desde la extensión: usa el mismo UID que la sesión activa de SOFIAA",
          "POST real a /api/nexo/ingest con payload estructurado",
          "Test end-to-end: capturar página → evento visible en Firestore console",
        ],
        "La extensión lee el DOM ya renderizado en el navegador del usuario — sin scraping externo, sin proxies, sin riesgo de ToS."
      ),
      spacer(),

      sprintTable(
        "Sprint N-2 · Pipeline de Ingesta", "7C3AED", "1 semana",
        "El endpoint procesa el payload completo: clasifica, puntúa importancia, extrae entidades y persiste en el ExperienceGraph.",
        [
          "Handler completo en /api/nexo/ingest: recibe → valida → clasifica → persiste",
          "Clasificación vía Gemini Flash: categoría (food / work / travel / shopping / research), score 0-1",
          "Extracción de entidades: lugar, persona, producto, precio, hashtags, URLs",
          "Nueva tool en Agent Runtime: extract_social_metadata(url, text, imageUrl?)",
          "Gemini Vision para imágenes/screenshots — solo cuando hay imagen adjunta",
          "Dual-write: localStorage (respuesta inmediata) + Firestore (async)",
          "Log en pipeline_events de N.O.R.A para trazabilidad completa",
        ],
        "Costo estimado por ingesta de texto: ~$0.0003 USD. Con imagen: ~$0.002 USD. Negligible hasta miles de capturas por día."
      ),

      spacer(),
      h2("FASE 2 — Inteligencia y Memoria  (Sprints N-3 a N-5)", DARK),
      spacer(),

      sprintTable(
        "Sprint N-3 · Decay Engine", ROSA, "1 semana",
        "El algoritmo de decaimiento convierte el ExperienceGraph de un archivo muerto a una memoria viva que refleja los intereses reales del usuario.",
        [
          "Función applyDecay(node): peso × e^(−0.05 × días_sin_referencia)",
          "Vercel Cron Job: GET /api/nexo/decay — corre diariamente a las 3:00 AM MX",
          "Pruning automático: elimina nodos con peso < 0.05 (desaparecen del grafo)",
          "reinforceNode(uid, nodeId): resetea lastReinforced al timestamp actual",
          "Trigger de refuerzo en route.ts cuando el LLM referencia un nodo en conversación",
          "Test: nodo sin referencia en 21 días pierde ≥ 60% — nodo referenciado resetea a 1.0",
        ],
        "λ=0.05: 65% de pérdida a 21 días, eliminación a ~60 días. Ajustable por categoría — work puede decaer más lento que food."
      ),
      spacer(),

      sprintTable(
        "Sprint N-4 · Context Injection — SOFIAA te Conoce", LILA, "1 semana",
        "SOFIAA puede referenciar proactivamente los intereses y contexto del usuario en conversaciones naturales.",
        [
          "getNexoContext(uid, topic?): retorna top-5 nodos ordenados por peso × relevancia al tema",
          "Inyección al system prompt: bloque 'CONTEXTO DEL USUARIO' con nodos comprimidos (~200 tokens)",
          "Modo-aware: NO inyectar contexto personal en extensiones profesionales activas",
          "SOFIAA puede decir 'sé que te gusta la comida japonesa, hay uno nuevo en tu zona' de forma natural",
          "Indicador opcional en UI: ícono de que SOFIAA tiene contexto cargado",
          "Test de personalización: misma pregunta con y sin grafo — diferencia notable en respuesta",
        ],
        "Este es el sprint donde N.E.X.O. se siente real. El usuario nota por primera vez que SOFIAA lo conoce sin que él haya dicho nada en esa sesión."
      ),
      spacer(),

      sprintTable(
        "Sprint N-5 · Action Cards", AZUL, "2 semanas",
        "Plantillas de componentes visuales que el Intent Engine selecciona para presentar la información capturada de forma accionable, no como texto plano.",
        [
          "RestaurantCard: nombre, foto, horarios (Google Places), mapa, botón de llamada, distancia a próxima reunión",
          "ArticleCard: título, resumen en 3 puntos, ideas aplicables, conexiones con nodos relacionados del grafo",
          "ProductCard: imagen, precio, comparación con productos similares vistos anteriormente",
          "PlaceCard: ubicación, actividades, clima, restaurantes guardados en la zona",
          "GenericCard: fallback bien diseñado para cualquier captura que no matchee las anteriores",
          "Integración con IntentDrivenUI existente — el orquestador elige qué card y qué variables llenar",
          "Google Places API para enriquecer RestaurantCard con datos en tiempo real",
        ],
        "Las cards no se generan de texto — son componentes React con datos estructurados. El LLM solo decide cuál card y qué variables inyectar."
      ),

      spacer(),
      h2("FASE 3 — Expansión y Privacidad  (Sprints N-6 a N-8)", DARK),
      spacer(),

      sprintTable(
        "Sprint N-6 · PWA Share Target Mobile", "10B981", "1 semana",
        "El usuario comparte cualquier contenido desde Instagram, TikTok, Maps, Safari directamente a SOFIAA desde su teléfono.",
        [
          "manifest.json: share_target con action, method, params (title, text, url)",
          "Service Worker: intercepta el share event y redirige a /nexo/share",
          "Página /nexo/share en Next.js: procesa el contenido recibido y lanza pipeline",
          "Misma pipeline de ingesta N-2 — reutilización total del backend",
          "UI de confirmación: 'Capturado ✓ — SOFIAA lo recordará'",
          "Funciona nativamente en Android Chrome — iOS con limitaciones conocidas documentadas",
        ],
        "Share Target es nativa del SO — el usuario da acceso voluntariamente desde el botón Compartir. Sin scraping, sin APIs de terceros en este sprint."
      ),
      spacer(),

      sprintTable(
        "Sprint N-7 · Panel de Privacidad — Mi Grafo", LILA, "1 semana",
        "El usuario tiene control total sobre su grafo: puede ver qué recuerda SOFIAA, editar y eliminar nodos. La transparencia genera confianza.",
        [
          "Página /nexo/mi-grafo: lista de nodos ordenados por peso — más importantes primero",
          "Visualización de clusters de intereses detectados automáticamente",
          "Botón eliminar nodo individual con confirmación — desaparece en < 3s",
          "'Limpiar todo mi historial de N.E.X.O.' con doble confirmación",
          "Exportar grafo como JSON (portabilidad y transparencia de datos)",
          "Indicador de actividad: '47 experiencias activas · 23 eliminadas por decaimiento este mes'",
        ],
        "La privacidad no es opcional. El usuario debe poder ver y controlar exactamente qué sabe SOFIAA de él. Este sprint puede ser el más diferenciador de cara al usuario."
      ),
      spacer(),

      sprintTable(
        "Sprint N-8 · Enriquecimiento Avanzado (Phase 2)", GRAY, "1-2 semanas",
        "Añadir fuentes externas para que SOFIAA no solo recuerde sino que contextualice con información actual del mundo real.",
        [
          "Perplexity Sonar API: '¿Sigue abierto este lugar? ¿Cambió el precio? ¿Hay quejas recientes?'",
          "Conexiones automáticas entre nodos: 'Este restaurante queda cerca de tu reunión del viernes a las 14h'",
          "Alertas proactivas opcionales: 'El lugar que guardaste está en tendencia esta semana'",
          "Score de relevancia temporal: nodos recientes suben de peso temporalmente al ser capturados",
        ],
        "Sprint opcional para lanzamiento. N.E.X.O. ya es poderoso en N-7. Perplexity añade datos vivos pero tiene costo por consulta — activar cuando el volumen lo justifique."
      ),

      divider(),

      // ── 5. CRITERIOS ───────────────────────────────────────────
      h1("5. Criterios de Éxito"),
      spacer(),
      new Table({
        width: { size: 9360, type: WidthType.DXA }, columnWidths: [1440, 4680, 3240],
        rows: [
          new TableRow({ children: [
            ...[["SPRINT", 1440], ["CRITERIO DE ÉXITO", 4680], ["CÓMO VERIFICAR", 3240]].map(([label, size]) =>
              new TableCell({ borders, shading: { fill: PURPLE, type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 }, width: { size, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: label, font: "Arial", size: 18, bold: true, color: WHITE })] })] }))
          ]}),
          ...[
            ["N-0", "Tipos compilados sin errores, endpoint retorna 200", "next build pasa sin errores TS"],
            ["N-1", "Captura de página llega a Firestore en < 3 segundos", "Ver evento en Firestore console"],
            ["N-2", "Score de importancia correcto en 9 de 10 capturas de prueba", "Test con 10 URLs variadas"],
            ["N-3", "Nodo sin referencia 21 días pierde ≥ 60% de peso", "Test con fechas simuladas en staging"],
            ["N-4", "SOFIAA menciona datos del grafo sin que el usuario los haya mencionado", "Conversación de prueba natural"],
            ["N-5", "RestaurantCard y ArticleCard sin errores en producción Vercel", "Test visual en dispositivo real"],
            ["N-6", "Share desde Instagram Android llega a Firestore en < 5s", "Test en dispositivo Android real"],
            ["N-7", "Eliminar nodo individual y desaparece del grafo en < 3s", "Test de privacidad end-to-end"],
          ].map(([sprint, criterio, verif], i) => new TableRow({ children: [
            new TableCell({ borders, shading: { fill: i % 2 === 0 ? "FAFAFA" : "F3F0FF", type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 }, width: { size: 1440, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: sprint, font: "Arial", size: 20, bold: true, color: PURPLE })] })] }),
            new TableCell({ borders, shading: { fill: i % 2 === 0 ? "FAFAFA" : "F3F0FF", type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 }, width: { size: 4680, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: criterio, font: "Arial", size: 20, color: DARK })] })] }),
            new TableCell({ borders, shading: { fill: i % 2 === 0 ? "FAFAFA" : "F3F0FF", type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 }, width: { size: 3240, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: verif, font: "Arial", size: 20, color: GRAY, italics: true })] })] }),
          ]}))
        ]
      }),

      divider(),

      // ── 6. NOTA FINAL ──────────────────────────────────────────
      h1("6. Nota Final"),
      body("N.E.X.O. no es un módulo más de SOFIAA. Es la pieza que convierte a SOFIAA de una herramienta muy sofisticada en un sistema que genuinamente conoce a su usuario."),
      spacer(),
      body("La clave arquitectónica más importante: N.E.X.O. nunca toca la capa de personalidad de SOFIAA — solo enriquece su conocimiento contextual por usuario. La esencia, el criterio, la empatía y la autonomía de SOFIAA crecen precisamente porque ahora tiene contexto real sobre la persona con quien habla."),
      spacer(),
      body("El ExperienceGraph ya existe. El Agent Runtime ya existe. La infraestructura de Firestore ya existe. Lo que N.E.X.O. añade es el canal de entrada — la puerta por donde el mundo real entra a SOFIAA."),
      spacer(),
      new Paragraph({ spacing: { before: 240, after: 80 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "SOFIAA LAB · 2026 · Documento Confidencial", font: "Arial", size: 20, color: GRAY, italics: true })] }),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/sessions/serene-sharp-cannon/mnt/sofiaa-os/NEXO_Sprint_Plan.docx', buf);
  console.log('OK');
});
