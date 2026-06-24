import { SofiaExtension } from "../types";

export const marketingSofiaExtension: SofiaExtension = {
  id:          "marketing-sofia",
  name:        "Marketing Pro",
  description: "Plataforma multi-agencia de gestión de clientes, métricas, contenido y finanzas SMM",
  baseRoute:   "/marketing-sofia",

  routes: [
    { path: "/marketing-sofia",                label: "Dashboard",   icon: "📊" },
    { path: "/marketing-sofia/clientes",       label: "Clientes",    icon: "🏢" },
    { path: "/marketing-sofia/metricas",       label: "Métricas",    icon: "📈" },
    { path: "/marketing-sofia/calendario",     label: "Calendario",  icon: "📅" },
    { path: "/marketing-sofia/finanzas",       label: "Finanzas",    icon: "💰" },
    { path: "/marketing-sofia/cotizador",      label: "Cotizador",   icon: "🎯" },
    { path: "/marketing-sofia/copy-hooks",     label: "Copy & Hooks",icon: "✍️" },
    { path: "/marketing-sofia/ideas-hub",      label: "Ideas Hub",   icon: "💡" },
  ],

  contextBlock: `
# EXTENSIÓN ACTIVA: Marketing Pro — Plataforma SMM

Estás asistiendo dentro de la extensión de gestión de marketing de SOFIAA.
Plataforma multi-agencia para gestión de clientes, contenido, métricas y finanzas de Social Media.

## Módulos disponibles
- **Dashboard** — KPIs globales: ROAS, CPL, Engagement, ingresos del mes
- **Clientes** — Cartera de clientes: estado, paquete, plataformas activas
- **Métricas** — KPIs por cuenta y plataforma: alcance, engagement%, seguidores
- **Calendario** — Planificador de contenido multi-cliente con estados de flujo
- **Finanzas** — Honorarios, gastos, ROAS, CPL, margen por cliente
- **Cotizador** — Generador de propuestas y presupuestos para prospectos (SMM + Producción Audiovisual)
- **Copy & Hooks** — Banco de hooks de apertura, frameworks (AIDA/PAS/PASTOR/4Ps) y CTAs por objetivo
- **Ideas Hub** — 35+ ideas de contenido filtradas por industria, formato, objetivo y prioridad

## Frases de navegación
- [NAVIGATE:/marketing-sofia] — ir al Dashboard
- [NAVIGATE:/marketing-sofia/clientes] — ver cartera de clientes
- [NAVIGATE:/marketing-sofia/metricas] — ver métricas por cuenta
- [NAVIGATE:/marketing-sofia/calendario] — abrir calendario editorial
- [NAVIGATE:/marketing-sofia/finanzas] — ver panel financiero
- [NAVIGATE:/marketing-sofia/cotizador] — abrir cotizador
- [NAVIGATE:/marketing-sofia/copy-hooks] — abrir banco de copy y hooks
- [NAVIGATE:/marketing-sofia/ideas-hub] — abrir banco de ideas de contenido

## Conceptos clave SMM
- ROAS = Retorno / Inversión publicitaria (meta: ≥ 3x)
- CPL = Inversión publicitaria / Leads generados (meta: ≤ $100 MXN)
- Engagement Rate = Interacciones / Alcance × 100 (benchmark: ≥ 4% en IG)
- Score Eficiencia = Alcance × Engagement% × Publicaciones
`,

  theme: {
    backgroundGradient:
      "linear-gradient(145deg, #FDFBFF 0%, #FDF0FF 55%, #F5F0FE 100%)",
    accentColor: "rgba(124, 58, 237, 0.4)",
    badgeLabel:  "Marketing Pro",
    badgeColor:  "#7C3AED",
  },

  activationPhrases: [
    "abre marketing", "marketing pro", "marketing sofia",
    "gestión de clientes smm", "dashboard marketing",
    "ver métricas de clientes", "calendario editorial",
    "cotizador smm", "abrir marketing",
  ],
};
