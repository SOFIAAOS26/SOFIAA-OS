import { SofiaExtension } from "../types";

export const nexoExtension: SofiaExtension = {
  id:          "nexo",
  name:        "N.E.X.O.",
  description: "Nexus Extension de Conocimiento y Operaciones — captura contexto real del usuario desde el navegador y alimenta la memoria de SOFIAA",
  baseRoute:   "/nexo",

  routes: [
    { path: "/nexo",           label: "Capturar",    icon: "⚡" },
    { path: "/nexo/mi-grafo",  label: "Mi Grafo",    icon: "🧠" },
  ],

  contextBlock: `
# MÓDULO ACTIVO: N.E.X.O. — Nexus de Conocimiento

El usuario está en el panel N.E.X.O. Puede ver y gestionar su grafo de conocimiento personal.
N.E.X.O. captura contenido desde Chrome o móvil, lo procesa y alimenta la memoria de SOFIAA.

## Comandos de navegación
- [NAVIGATE:/nexo] — ir al panel de captura
- [NAVIGATE:/nexo/mi-grafo] — ver el grafo personal del usuario
`,

  theme: {
    backgroundGradient:
      "linear-gradient(145deg, #0F0B1E 0%, #1A0F2E 55%, #0F1628 100%)",
    accentColor: "rgba(168, 85, 247, 0.4)",
    badgeLabel:  "N.E.X.O.",
    badgeColor:  "#A855F7",
  },

  activationPhrases: [
    "abre nexo", "nexo", "mi grafo", "lo que recuerdas de mí",
    "qué sabes de mí", "mis capturas", "capturar página",
    "abrir nexo", "ver mi perfil",
  ],
};
