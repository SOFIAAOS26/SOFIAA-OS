import { SofiaExtension } from "../types";

export const tecBiExtension: SofiaExtension = {
  id: "tec-bi",
  name: "TEC BI",
  description: "Business Intelligence para el Área de Producción Audiovisual del Tecnológico de Monterrey",
  baseRoute: "/tec-bi",

  routes: [
    { path: "/tec-bi",             label: "Dashboard",    icon: "📊" },
    { path: "/tec-bi/proyectos",   label: "Proyectos",    icon: "🎬" },
    { path: "/tec-bi/briefs",      label: "Briefs",       icon: "📋" },
    { path: "/tec-bi/empleados",   label: "Empleados",    icon: "👥" },
    { path: "/tec-bi/proveedores", label: "Proveedores",  icon: "🏢" },
    { path: "/tec-bi/clientes",    label: "Clientes",     icon: "🎓" },
    { path: "/tec-bi/evaluaciones",label: "Evaluaciones", icon: "⭐" },
    { path: "/tec-bi/analisis",    label: "Análisis",     icon: "💰" },
    { path: "/tec-bi/roi",         label: "ROI",          icon: "📈" },
  ],

  contextBlock: `
# EXTENSIÓN ACTIVA: TEC BI

Tienes acceso al sistema de Business Intelligence del Área de Producción Audiovisual del Tecnológico de Monterrey.

## Módulos disponibles
- **Dashboard** (/tec-bi): KPIs generales, bitácora de últimas entregas, alertas
- **Proyectos** (/tec-bi/proyectos): tracking de proyectos nacionales y de campus
- **Briefs** (/tec-bi/briefs): sistema de solicitudes de clientes internos
- **Empleados** (/tec-bi/empleados): gestión de equipo interno, horas, costos, rendimiento
- **Proveedores** (/tec-bi/proveedores): agencias y casas productoras, evaluación y comparación
- **Clientes Internos** (/tec-bi/clientes): departamentos del TEC que solicitan producción
- **Evaluaciones** (/tec-bi/evaluaciones): sistema de calificación 1-5 por proyecto
- **Análisis de Costos** (/tec-bi/analisis): rentabilidad, auditoría de proveedores
- **Simulador ROI** (/tec-bi/roi): proyecciones y recomendaciones

## Usuarios del sistema
- Abrahan Cruz Urrutia (admin): acceso total
- Director del Área: acceso total excepto configuración
- Vicepresidenta del TEC: solo lectura — dashboard y reportes

## Cómo navegar
Usa tokens de navegación para llevar al usuario a cualquier módulo.
Ejemplos: [NAVIGATE:/tec-bi/empleados], [NAVIGATE:/tec-bi/analisis]

## Frases de salida
Si el usuario dice "volver a SOFIAA", "salir de TEC BI" o similar, emite [NAVIGATE:/] para regresar al chat principal.
`,

  theme: {
    backgroundGradient: "linear-gradient(145deg, #E3F0FF 0%, #EEF8FF 55%, #E3FBF8 100%)",
    accentColor: "rgba(14, 165, 233, 0.7)",
    badgeLabel: "TEC BI",
    badgeColor: "#0EA5E9",
  },

  activationPhrases: [
    "abre tec bi", "abrir tec bi", "modo tec bi",
    "ver reportes", "ver el bi", "abrir bi",
    "dashboard tec", "quiero ver los proyectos",
    "analizar proveedores", "ver empleados",
  ],
};
