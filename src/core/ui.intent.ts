// ── UI Intent Detector — infiere qué componente Generative UI mostrar
// basado en el mensaje del usuario y/o la respuesta del modelo.

import type { UIBlock } from "@/types/generative-ui";

interface IntentRule {
  match: (userMsg: string, assistantResp: string) => boolean;
  block: (userMsg: string, assistantResp: string) => UIBlock;
}

// helpers
const u = (pattern: RegExp) => (msg: string) => pattern.test(msg);
const noNav = (msg: string) => !/navegar|ir a|abrir|llévame|llevar/i.test(msg);

const rules: IntentRule[] = [

  // ── SALUDOS / primera interacción ────────────────────────────────────────
  {
    match: (msg) => /^(hola|hi|hey|buenos días|buenas tardes|buenas noches|qué tal|como estas|cómo estás|buen día)[\s!.]*$/i.test(msg.trim()),
    block: () => ({
      type: "quick_actions",
      actions: [
        { label: "¿Qué es SOFIAA?",      msg: "¿Qué es SOFIAA y qué puedo hacer aquí?", icon: "✨" },
        { label: "Ver extensiones",       msg: "¿Qué extensiones tiene SOFIAA?",          icon: "⚡" },
        { label: "Quiero una extensión",  msg: "Quiero una extensión para mi negocio",    icon: "🚀" },
        { label: "Contactar al equipo",   msg: "¿Cómo puedo contactar a SOFIAA LAB?",    icon: "📬" },
      ],
    }),
  },

  // ── QUÉ PUEDES HACER / capacidades ──────────────────────────────────────
  {
    match: (msg) => /qué (puedes|haces|sabes|tienes|ofrece)|que (puedes|haces|sabes|tienes|ofrece)|capacidades|para qué sirves|cómo (me ayudas|puedes ayudar)|como (me ayudas|puedes ayudar)|ayudarme con|en qué.*ayudas/i.test(msg),
    block: () => ({
      type: "quick_actions",
      actions: [
        { label: "TEC BI",           msg: "Cuéntame sobre TEC BI",         icon: "🏛" },
        { label: "Marketing Sofia",  msg: "¿Qué es Marketing Sofia?",       icon: "📱" },
        { label: "JP Memorial",      msg: "¿Qué es JP Memorial?",          icon: "💙" },
        { label: "Servicios SOFIAA", msg: "¿Qué servicios ofrece SOFIAA?", icon: "⚡" },
      ],
    }),
  },

  // ── EXTENSIONES / SEE ────────────────────────────────────────────────────
  {
    match: (msg) => /extensi[oó]n(es)?|see |sofiaa extension|módulos disponibles|plataforma modular/i.test(msg),
    block: () => ({
      type: "quick_actions",
      actions: [
        { label: "Ver TEC BI",          msg: "Llévame a TEC BI",      icon: "🏛" },
        { label: "Marketing Sofia",     msg: "Abrir Marketing Sofia", icon: "📱" },
        { label: "JP Memorial",         msg: "Abrir JP Memorial",     icon: "💙" },
      ],
    }),
  },

  // ── TEC BI — brief / canvas ──────────────────────────────────────────────
  {
    match: (msg) => /brief|brief canvas|brief score|captura.*solicitud|solicitud.*video/i.test(msg) && noNav(msg),
    block: () => ({
      type: "extension_card",
      icon: "📋",
      name: "Brief Canvas — TEC BI",
      desc: "Sistema de captura estructurada con Brief Score automático. Detecta briefs deficientes antes de que generen costo.",
      path: "/tec-bi/briefs",
    }),
  },

  // ── TEC BI — ROI / simulador ─────────────────────────────────────────────
  {
    match: (msg) => /roi|retorno.*inversi[oó]n|simulador|ahorro.*anual|impacto.*institucional|cuánto.*ahorra/i.test(msg) && noNav(msg),
    block: () => ({
      type: "extension_card",
      icon: "📊",
      name: "Simulador de Impacto — TEC BI",
      desc: "Cuantifica el costo real de los briefs deficientes y proyecta el ahorro anual de implementar el sistema.",
      path: "/tec-bi/roi",
    }),
  },

  // ── TEC BI — proyectos / monday ──────────────────────────────────────────
  {
    match: (msg) => /proyectos|monday\.?com|sincronizaci[oó]n|gestión.*proyecto|flujo.*trabajo|kanban/i.test(msg) && noNav(msg),
    block: () => ({
      type: "extension_card",
      icon: "🏛",
      name: "TEC BI — Proyectos",
      desc: "CRUD completo con sincronización bidireccional en tiempo real con Monday.com vía webhook.",
      path: "/tec-bi/proyectos",
    }),
  },

  // ── TEC BI — evaluaciones ────────────────────────────────────────────────
  {
    match: (msg) => /evaluaci[oó]n(es)?|desempe[nñ]o|calificaci[oó]n|scoring.*colaborador/i.test(msg) && noNav(msg),
    block: () => ({
      type: "extension_card",
      icon: "⭐",
      name: "Evaluaciones — TEC BI",
      desc: "Evalúa proyectos y colaboradores con scoring automatizado e historial acumulado.",
      path: "/tec-bi/evaluaciones",
    }),
  },

  // ── TEC BI — directorio / empleados ─────────────────────────────────────
  {
    match: (msg) => /empleados?|directorio|proveedores?|equipo.*tec|colaboradores?|personal/i.test(msg) && noNav(msg),
    block: () => ({
      type: "extension_card",
      icon: "👥",
      name: "Directorio — TEC BI",
      desc: "Gestión de empleados, proveedores y clientes internos con roles y niveles de acceso.",
      path: "/tec-bi",
    }),
  },

  // ── TEC BI — general ─────────────────────────────────────────────────────
  {
    match: (msg) => /tec.?bi|tec bi|tecnol[oó]gico.*monterrey|divisi[oó]n.*video/i.test(msg) && noNav(msg),
    block: () => ({
      type: "extension_card",
      icon: "🏛",
      name: "TEC BI",
      desc: "Gestión de proyectos, briefs, evaluaciones y simulador de ROI institucional.",
      path: "/tec-bi",
    }),
  },

  // ── MARKETING — copy & hooks ─────────────────────────────────────────────
  {
    match: (msg) => /copy|hooks?|redacci[oó]n|copywriting|aida|pas |pastor|4ps|cta(s)?|caption/i.test(msg) && noNav(msg),
    block: () => ({
      type: "extension_card",
      icon: "✍️",
      name: "Copy & Hooks — Marketing Sofia",
      desc: "Banco de hooks, frameworks AIDA/PAS/PASTOR/4Ps y CTAs listos para copiar.",
      path: "/marketing-sofia/copy-hooks",
    }),
  },

  // ── MARKETING — ideas de contenido ──────────────────────────────────────
  {
    match: (msg) => /ideas.*contenido|contenido.*ideas|ideas.*post|ideas.*redes|ideas.*publicaci[oó]n|ideas hub/i.test(msg) && noNav(msg),
    block: () => ({
      type: "extension_card",
      icon: "💡",
      name: "Ideas Hub — Marketing Sofia",
      desc: "35+ ideas de contenido con filtros por industria, formato, objetivo y prioridad.",
      path: "/marketing-sofia/ideas-hub",
    }),
  },

  // ── MARKETING — cotizador / producción audiovisual ───────────────────────
  {
    match: (msg) => /cotiza(r|ci[oó]n)|producci[oó]n.*audio|video.*precio|precio.*video|fotograf[íi]a.*precio|cuánto.*cuesta.*video|presupuesto.*producci[oó]n/i.test(msg) && noNav(msg),
    block: () => ({
      type: "extension_card",
      icon: "🎬",
      name: "Cotizador Audiovisual — Marketing Sofia",
      desc: "27 servicios de video, post-producción y fotografía con precios 2026, utilidad 10% e IVA desglosado.",
      path: "/marketing-sofia/cotizador",
    }),
  },

  // ── MARKETING — métricas / KPIs ──────────────────────────────────────────
  {
    match: (msg) => /m[eé]tricas?|kpi(s)?|estad[íi]sticas?|analytics|alcance|engagement|seguidores|rendimiento.*cuenta/i.test(msg) && noNav(msg),
    block: () => ({
      type: "extension_card",
      icon: "📈",
      name: "Métricas — Marketing Sofia",
      desc: "KPIs por cliente y plataforma: alcance, engagement, leads, CPL y ROAS con historial mensual.",
      path: "/marketing-sofia/metricas",
    }),
  },

  // ── MARKETING — calendario editorial ────────────────────────────────────
  {
    match: (msg) => /calendario|editorial|planificador|programar.*post|agenda.*contenido|publicaci[oó]n.*fecha/i.test(msg) && noNav(msg),
    block: () => ({
      type: "extension_card",
      icon: "📅",
      name: "Calendario Editorial — Marketing Sofia",
      desc: "Planificador multi-cliente con flujo Idea → Producción → Revisión → Publicado.",
      path: "/marketing-sofia/calendario",
    }),
  },

  // ── MARKETING — finanzas / ingresos ──────────────────────────────────────
  {
    match: (msg) => /finanzas|ingresos|gastos|facturaci[oó]n|honorarios|margen|rentabilidad.*agencia/i.test(msg) && noNav(msg),
    block: () => ({
      type: "extension_card",
      icon: "💰",
      name: "Finanzas — Marketing Sofia",
      desc: "Registro de honorarios, gastos e inversión publicitaria con cálculo de margen neto por cliente.",
      path: "/marketing-sofia/finanzas",
    }),
  },

  // ── MARKETING — general ──────────────────────────────────────────────────
  {
    match: (msg) => /marketing sofia|marketing pro|smm|roas|cpl|agencia.*social|redes sociales.*gesti[oó]n|clientes.*marketing/i.test(msg) && noNav(msg),
    block: () => ({
      type: "extension_card",
      icon: "📱",
      name: "Marketing Sofia",
      desc: "Dashboard completo para agencias SMM — clientes, métricas, cotizador y calendario.",
      path: "/marketing-sofia",
    }),
  },

  // ── JP MEMORIAL ───────────────────────────────────────────────────────────
  {
    match: (msg) => /jp memorial|jardines.*juan pablo|memorial|servicio.*funerar|capilla|p[eé]rdida.*ser querido|luto/i.test(msg) && noNav(msg),
    block: () => ({
      type: "extension_card",
      icon: "💙",
      name: "JP Memorial",
      desc: "Plataforma de memoria emocional e inteligencia de acompañamiento para honrar a quienes importaron.",
      path: "/jp-memorial",
    }),
  },

  // ── QUIÉNES SON / EQUIPO / ABRAHAN ──────────────────────────────────────
  {
    match: (msg) => /qui[eé]nes son|el equipo|abrahan|fundador|sofiaa lab|historia.*sofiaa|crearon/i.test(msg),
    block: () => ({
      type: "quick_actions",
      actions: [
        { label: "Quiénes somos",  msg: "Llévame a la sección de quiénes somos", icon: "👤" },
        { label: "Servicios",      msg: "¿Qué servicios ofrece SOFIAA LAB?",     icon: "⚡" },
        { label: "Contacto",       msg: "¿Cómo los contacto?",                   icon: "📬" },
      ],
    }),
  },

  // ── SERVICIOS / PRECIOS / CUÁNTO CUESTA UNA EXTENSIÓN ───────────────────
  {
    match: (msg) => /servicios|cu[aá]nto cuesta|precio.*extensi[oó]n|tarifa|paquetes.*sofiaa|planes/i.test(msg),
    block: () => ({
      type: "quick_actions",
      actions: [
        { label: "Ver servicios",        msg: "Llévame a la sección de servicios", icon: "⚡" },
        { label: "Quiero una extensión", msg: "Quiero una extensión para mi empresa", icon: "🚀" },
        { label: "Contactar",            msg: "¿Cómo contacto al equipo?",          icon: "📬" },
      ],
    }),
  },

  // ── CONTACTO ─────────────────────────────────────────────────────────────
  {
    match: (msg) => /contacto|contactar|hablar con|escribirles|correo|whatsapp|tel[eé]fono|agendar.*reuni[oó]n/i.test(msg),
    block: () => ({
      type: "info_card",
      icon: "📬",
      title: "¿Hablamos?",
      text: "Contáctanos desde la sección de Contacto — ahí encuentras redes, correo y disponibilidad del equipo.",
      variant: "purple",
    }),
  },

  // ── FIREBASE / DATOS EN TIEMPO REAL ─────────────────────────────────────
  {
    match: (msg) => /firebase|firestore|tiempo real|base de datos|autenticaci[oó]n/i.test(msg),
    block: () => ({
      type: "info_card",
      icon: "🔥",
      title: "Firebase en SOFIAA",
      text: "Todas las extensiones usan Firebase Firestore para datos en tiempo real y Firebase Auth para control de acceso por roles (RBAC).",
      variant: "default",
    }),
  },

  // ── WORKSPACE / MULTI-TENANT ─────────────────────────────────────────────
  {
    match: (msg) => /workspace|espacio de trabajo|agencia nueva|multi.*tenant|crear.*agencia|nueva.*agencia/i.test(msg),
    block: () => ({
      type: "info_card",
      icon: "🏢",
      title: "Multi-workspace",
      text: "Cada agencia tiene su propio workspace con datos completamente aislados. Crea y cambia entre workspaces desde el selector en la barra superior de Marketing Sofia.",
      variant: "default",
    }),
  },

  // ── DARK MODE ────────────────────────────────────────────────────────────
  {
    match: (msg) => /modo oscuro|dark mode|tema oscuro|cambiar.*tema/i.test(msg),
    block: () => ({
      type: "info_card",
      icon: "🌙",
      title: "Modo oscuro",
      text: "Escribe \"modo oscuro\" o \"dark mode\" en el chat y SOFIAA cambia el tema automáticamente.",
      variant: "default",
    }),
  },

  // ── REDES SOCIALES / INSTAGRAM / TIKTOK ─────────────────────────────────
  {
    match: (msg) => /instagram|tiktok|facebook|youtube|linkedin|redes sociales|social media/i.test(msg) && noNav(msg),
    block: () => ({
      type: "extension_card",
      icon: "📱",
      name: "Marketing Sofia",
      desc: "Gestiona tus cuentas de Instagram, TikTok, Facebook y más desde un solo dashboard.",
      path: "/marketing-sofia",
    }),
  },

  // ── GRACIAS / CIERRE ─────────────────────────────────────────────────────
  {
    match: (msg) => /^(gracias|muchas gracias|thank you|thanks|perfecto|excelente|genial|listo|ok gracias|okey gracias)[\s!.]*$/i.test(msg.trim()),
    block: () => ({
      type: "quick_actions",
      actions: [
        { label: "Otra pregunta",        msg: "Tengo otra pregunta",                    icon: "💬" },
        { label: "Ver plataforma",       msg: "¿Qué extensiones puedo explorar?",       icon: "⚡" },
        { label: "Quiero una extensión", msg: "Quiero una extensión para mi negocio",   icon: "🚀" },
      ],
    }),
  },

  // ── RESPUESTA LARGA CON PASOS NUMERADOS ─────────────────────────────────
  {
    match: (_, a) => (a.match(/^\d+\./gm) ?? []).length >= 3 && a.length > 400,
    block: () => ({
      type: "quick_actions",
      actions: [
        { label: "Ir a la plataforma", msg: "¿Cómo entro a la plataforma?", icon: "🚀" },
        { label: "Tengo más dudas",    msg: "Tengo más preguntas",           icon: "💬" },
      ],
    }),
  },

  // ── DIFERENCIACIÓN vs IA Comercial ────────────────────────────────────────
  {
    match: (msg) => /diferenci|por qué sofiaa|vs chatgpt|vs gemini|vs claude|mejor que|supera|ventaja|infraestructura.*chatbot|chatbot.*infraestructura|pilares|gobernanza|soberan|ix-os|jamás podrán|comparativ/i.test(msg) && noNav(msg),
    block: () => ({
      type: "extension_card",
      icon: "⚡",
      name: "Por qué SOFIAA",
      desc: "Infraestructura vs chatbot — los 4 pilares y tabla comparativa",
      path: "/por-que-sofiaa",
    }),
  },

];

/**
 * Detecta qué UIBlock mostrar dado el mensaje del usuario y la respuesta del asistente.
 * Retorna null si ninguna regla aplica.
 */
export function detectUIBlock(userMsg: string, assistantResp: string): UIBlock | null {
  for (const rule of rules) {
    if (rule.match(userMsg, assistantResp)) {
      return rule.block(userMsg, assistantResp);
    }
  }
  return null;
}
