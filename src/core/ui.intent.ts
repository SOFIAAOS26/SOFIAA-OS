// ── UI Intent Detector — infiere qué componente Generative UI mostrar
// basado en el mensaje del usuario y/o la respuesta del modelo.
// Más confiable que depender de tokens en el output del LLM.

import type { UIBlock } from "@/types/generative-ui";

interface IntentRule {
  match: (userMsg: string, assistantResp: string) => boolean;
  block: (userMsg: string, assistantResp: string) => UIBlock;
}

const rules: IntentRule[] = [
  // ── ¿Qué puedes hacer? / capacidades generales ───────────────────────────
  {
    match: (u) => /qué (puedes|haces|sabes|tienes)|que (puedes|haces|sabes|tienes)|capacidades|para qué sirves|cómo (me ayudas|puedes ayudar)|como (me ayudas|puedes ayudar)|opciones|funciones/i.test(u),
    block: () => ({
      type: "quick_actions",
      actions: [
        { label: "TEC BI",           msg: "Cuéntame sobre TEC BI",          icon: "🏛" },
        { label: "Marketing Sofia",  msg: "¿Qué es Marketing Sofia?",        icon: "📱" },
        { label: "JP Memorial",      msg: "¿Qué es JP Memorial?",           icon: "💙" },
        { label: "Servicios SOFIAA", msg: "¿Qué servicios ofrece SOFIAA?",  icon: "⚡" },
      ],
    }),
  },

  // ── Extensiones / qué extensiones hay ───────────────────────────────────
  {
    match: (u) => /extensi[oó]n|extensiones|see |sofiaa extension|módulos|plataforma/i.test(u),
    block: () => ({
      type: "quick_actions",
      actions: [
        { label: "Ver TEC BI",          msg: "Llévame a TEC BI",           icon: "🏛" },
        { label: "Ver Marketing Sofia", msg: "Abrir Marketing Sofia",       icon: "📱" },
        { label: "JP Memorial",         msg: "Abrir JP Memorial",           icon: "💙" },
      ],
    }),
  },

  // ── TEC BI mencionado ────────────────────────────────────────────────────
  {
    match: (u, a) => /tec.?bi|tec bi|brief|proyectos|roi|evaluaci[oó]n/i.test(u) && !/navegar|ir a|abrir/i.test(u),
    block: () => ({
      type: "extension_card",
      icon: "🏛",
      name: "TEC BI",
      desc: "Gestión de proyectos, briefs, evaluaciones y simulador de ROI institucional",
      path: "/tec-bi",
    }),
  },

  // ── Marketing Sofia mencionada ───────────────────────────────────────────
  {
    match: (u) => /marketing sofia|marketing pro|smm|roas|cpl|agencia|clientes de marketing|cotizador|campaña/i.test(u) && !/navegar|ir a|abrir/i.test(u),
    block: () => ({
      type: "extension_card",
      icon: "📱",
      name: "Marketing Sofia",
      desc: "Dashboard de agencia SMM — clientes, métricas, cotizador y calendario editorial",
      path: "/marketing-sofia",
    }),
  },

  // ── JP Memorial mencionado ───────────────────────────────────────────────
  {
    match: (u) => /jp memorial|memorial|jardines de juan pablo|servicio funerar|capilla/i.test(u) && !/navegar|ir a|abrir/i.test(u),
    block: () => ({
      type: "extension_card",
      icon: "💙",
      name: "JP Memorial",
      desc: "Plataforma de memoria emocional e inteligencia de acompañamiento",
      path: "/jp-memorial",
    }),
  },

  // ── Contacto / hablar con alguien ───────────────────────────────────────
  {
    match: (u) => /contacto|contactar|hablar con|escribirles|correo|whatsapp|teléfono|presupuesto|cotizar/i.test(u),
    block: () => ({
      type: "info_card",
      icon: "📬",
      title: "¿Hablamos?",
      text: "Puedes contactar al equipo de SOFIAA LAB directamente desde la sección de Contacto.",
      variant: "purple",
    }),
  },

  // ── Workspace / cómo crear workspace ────────────────────────────────────
  {
    match: (u) => /workspace|espacio de trabajo|agencia nueva|crear.*agencia/i.test(u),
    block: () => ({
      type: "info_card",
      icon: "🏢",
      title: "Multi-workspace",
      text: "En Marketing Sofia puedes crear múltiples workspaces — uno por agencia — desde el selector en la barra superior.",
      variant: "default",
    }),
  },

  // ── Respuesta con lista de pasos / instrucciones ─────────────────────────
  {
    match: (u, a) => (a.match(/\d\./g) ?? []).length >= 3 && a.length > 300,
    block: () => ({
      type: "quick_actions",
      actions: [
        { label: "Ir a la plataforma", msg: "¿Cómo entro a la plataforma?", icon: "🚀" },
        { label: "Tengo dudas",        msg: "Tengo más preguntas",           icon: "💬" },
      ],
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
