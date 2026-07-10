/**
 * TEC Bii — Extension Manifest (RUMBO A TIER 4)
 *
 * Versión 2.0.0 — Cognitiva e inteligente.
 * TEC BI v1 queda como BETA en /tec-bi (solo lectura, desconectada del registry).
 *
 * TEC Bii es un ciudadano del Experience Graph:
 * publica entidades como nodos, razona con NEXO y el Perfil Cognitivo.
 */

import { SofiaExtension } from "../types";

export const tecBiiExtension: SofiaExtension = {
  id:          "tec-bii",
  name:        "TEC Bii",
  description: "Inteligencia operacional cognitiva — Área de Producción Audiovisual TEC Monterrey",
  baseRoute:   "/tec-bii",

  routes: [
    { path: "/tec-bii",              label: "Centro de Mando",  icon: "🧠" },
    { path: "/tec-bii/proyectos",    label: "Proyectos",        icon: "🎬" },
    { path: "/tec-bii/briefs",       label: "Briefs",           icon: "📋" },
    { path: "/tec-bii/equipo",       label: "Equipo",           icon: "👥" },
    { path: "/tec-bii/proveedores",  label: "Proveedores",      icon: "🏢" },
    { path: "/tec-bii/clientes",     label: "Clientes",         icon: "🎓" },
    { path: "/tec-bii/evaluaciones", label: "Evaluaciones",     icon: "⭐" },
    { path: "/tec-bii/analisis",     label: "Análisis",         icon: "📊" },
    { path: "/tec-bii/roi",          label: "ROI",              icon: "💰" },
    { path: "/tec-bii/inteligencia", label: "Inteligencia",     icon: "✦" },
  ],

  contextBlock: `
# EXTENSIÓN ACTIVA: TEC Bii — Inteligencia Operacional Cognitiva

Tienes acceso al sistema de inteligencia de la producción audiovisual del Tecnológico de Monterrey. Esta es la versión 2.0 cognitiva: cada entidad del sistema está conectada al Experience Graph y al motor semántico de N.E.X.O.

## Diferencia clave vs TEC BI v1
TEC Bii no es un CRUD. Cada proyecto, brief y persona publicada en el sistema genera un nodo en el grafo cognitivo. Puedes razonar sobre conexiones entre dominios: capturas de NEXO + proyectos activos + perfil del usuario.

## Módulos disponibles
- **Centro de Mando** (/tec-bii): insights cognitivos en tiempo real, proyectos en riesgo, alertas proactivas
- **Proyectos** (/tec-bii/proyectos): tracking con urgencyScore, riskLevel y conexiones NEXO
- **Briefs** (/tec-bii/briefs): solicitudes enriquecidas con IA, Brief Score v2, generación desde conversación
- **Equipo** (/tec-bii/equipo): empleados con SkillProfile generado desde historial
- **Proveedores** (/tec-bii/proveedores): track record, predicción de costo, reliabilityScore
- **Clientes** (/tec-bii/clientes): departamentos del TEC, historial y satisfacción
- **Evaluaciones** (/tec-bii/evaluaciones): calificación con análisis cognitivo
- **Análisis** (/tec-bii/analisis): análisis de costos, horas, calidad y cumplimiento de tiempos
- **ROI** (/tec-bii/roi): simulador de retorno sobre inversión con parámetros ajustables
- **Inteligencia** (/tec-bii/inteligencia): hipótesis cruzadas, patrones detectados, reflexiones N.O.R.A.

## Tus capacidades en este contexto
- Puedes generar un brief completo desde una conversación: el usuario te describe el proyecto y tú lo estructuras
- Puedes analizar qué proyectos están en riesgo comparando deadlines, carga del equipo e historial
- Puedes identificar conexiones entre capturas de NEXO y proyectos activos (razonamiento cruzado)
- Puedes recomendar asignación de proyectos basándote en habilidades, carga y historial de calidad
- Puedes detectar patrones: proveedores con tendencia negativa, clientes que siempre llegan tarde, etc.

## Usuarios del sistema
- Abrahan Cruz Urrutia (admin): acceso total
- Director del Área: acceso total excepto configuración
- Vicepresidenta del TEC: solo lectura — dashboard y reportes

## Navegación
Usa [NAVIGATE:/tec-bii/proyectos] y similares. Para volver al chat principal: [NAVIGATE:/]

## Frases de activación
"tec bii", "sistema cognitivo", "centro de mando", "proyectos del tec", "inteligencia operacional"
`.trim(),

  theme: {
    backgroundGradient: "linear-gradient(145deg, #0A0A12 0%, #0F0B1E 50%, #0A1020 100%)",
    accentColor:        "rgba(99, 102, 241, 0.5)",
    badgeLabel:         "TEC Bii",
    badgeColor:         "#6366F1",
  },

  activationPhrases: [
    "tec bii", "tecbii", "centro de mando", "sistema cognitivo",
    "proyectos tec", "inteligencia operacional", "produccion audiovisual tec",
    "briefs tec", "equipo tec", "modo tec bii",
  ],
};
