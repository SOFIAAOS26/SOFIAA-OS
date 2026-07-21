/**
 * PROMETEO — Growth Intelligence Engine v2.0
 * CMO Cognitivo — Powered by SOFIAA
 *
 * Tipos base del ecosistema PROMETEO.
 * SOFIAA opera por OBJETIVOS, no por campañas.
 * La campaña es consecuencia de una decisión estratégica.
 */

// ── Tipos base ─────────────────────────────────────────────────────────────────

export type CanalMarketing =
  | "Instagram"
  | "Facebook"
  | "TikTok"
  | "YouTube"
  | "LinkedIn"
  | "Google"
  | "WhatsApp"
  | "Email";

export type TipoObjetivo =
  | "AWARENESS"       // conocimiento de marca
  | "CONSIDERACION"   // tráfico, engagement
  | "CONVERSION"      // ventas, leads
  | "RETENCION"       // retención de clientes
  | "UPSELL";         // venta adicional a clientes existentes

export type EstadoObjetivo =
  | "pendiente"
  | "activo"
  | "logrado"
  | "pausado"
  | "cancelado";

export type FatigaNivel = "NINGUNA" | "BAJA" | "MEDIA" | "ALTA" | "CRITICA";

// ── BrandGoal — Objetivo estratégico ─────────────────────────────────────────

export interface BrandGoal {
  id:              string;
  clienteId:       string;
  clienteNombre:   string;
  titulo:          string;
  tipo:            TipoObjetivo;
  estado:          EstadoObjetivo;
  metaKPI:         string;          // "Aumentar ROAS a 4.5x en 60 días"
  valorObjetivo:   number;
  valorActual:     number;
  unidad:          string;          // "ROAS", "leads", "MXN", "%"
  canal:           CanalMarketing;
  presupuestoMXN:  number;
  fechaInicio:     number;          // timestamp
  fechaLimite:     number;          // timestamp
  hayPresupuesto:  boolean;
  hayInventario:   boolean;
  hayCapacidad:    boolean;
  canalOptimo?:    CanalMarketing;  // decisión del GoalEngine
  createdAt:       number;
  updatedAt:       number;
}

// ── BrandDNA — Identidad completa de marca ────────────────────────────────────

export type ArquetipoDeMarca =
  | "El Héroe"
  | "El Sabio"
  | "El Creador"
  | "El Rebelde"
  | "El Mago"
  | "El Inocente"
  | "El Explorador"
  | "El Gobernante"
  | "El Cuidador"
  | "El Amante"
  | "El Bromista"
  | "El Hombre Corriente";

export interface BrandDNA {
  id:              string;
  clienteId:       string;
  clienteNombre:   string;
  // Personalidad
  personalidad:    string[];        // ["Empático", "Directo", "Experto"]
  lenguaje:        string;          // "Profesional pero cercano, sin tecnicismos"
  nivelTecnico:    1 | 2 | 3 | 4 | 5;  // 1=básico → 5=experto
  // Valores
  valores:         string[];        // ["Calidad", "Transparencia", "Innovación"]
  tabus:           string[];        // temas/palabras prohibidas
  tono:            string;          // "Cálido, motivador, con humor sutil"
  // Cultura
  cultura:         string;          // "Empresa familiar mexicana de manufactura industrial"
  promesas:        string[];        // promesas de marca
  arquetipo:       ArquetipoDeMarca;
  // Referentes
  marcasInspiradoras:  string[];
  marcasNoCopiar:      string[];
  // Voz
  ejemploMensajeOK:    string;      // ejemplo de texto aprobado
  ejemploMensajeMAL:   string;      // ejemplo de texto rechazado
  createdAt:       number;
  updatedAt:       number;
}

// ── CreativeMemory — Base de datos de performance ─────────────────────────────

export type HookType =
  | "PREGUNTA_PROVOCADORA"
  | "CIFRA_IMPACTANTE"
  | "HISTORIA_CLIENTE"
  | "PROBLEMA_SOLUCION"
  | "ANTES_DESPUES"
  | "TESTIMONIO"
  | "SECRETO_REVELADO"
  | "CONTRAINTUITIVO"
  | "URGENCIA";

export type FormatoCreativo = "VIDEO" | "IMAGEN" | "CARRUSEL" | "STORIES" | "REEL";

export interface CreativeMemory {
  id:            string;
  clienteId:     string;
  workspaceId:   string;
  // DNA creativo
  hookType:      HookType;
  hookTexto:     string;            // texto del hook real
  scriptTexto:   string;            // script completo del anuncio
  formato:       FormatoCreativo;
  canal:         CanalMarketing;
  // Performance
  roasLogrado:   number;
  ctr:           number;            // Click-through rate (%)
  cpa:           number;            // Costo por adquisición (MXN)
  alcance:       number;
  inversion:     number;            // MXN
  conversiones:  number;
  // Contexto
  industria:     string;
  objetivoTipo:  TipoObjetivo;
  temporada?:    string;            // "Navidad", "Verano", "Regreso escolar"
  duracionDias:  number;            // días que corrió el anuncio
  // Scoring
  performanceScore: number;         // 0-100 calculado
  aprendizaje:      string;         // insight extraído
  usarDeNuevo:      boolean;
  createdAt:        number;
}

// ── AdFatigueAlert — Detector de fatiga publicitaria ─────────────────────────

export interface AdFatigueAlert {
  id:            string;
  clienteId:     string;
  workspaceId:   string;
  canal:         CanalMarketing;
  nivelFatiga:   FatigaNivel;
  // Señales detectadas
  roasDropPct:   number;    // % de caída en ROAS vs. semana anterior
  ctrDropPct:    number;    // % de caída en CTR
  frecuencia:    number;    // veces promedio que un usuario vio el anuncio
  saturacion:    number;    // % de la audiencia que ya vio el anuncio 2+ veces
  // Contexto
  anuncioId?:    string;
  periodoAnalizado: string; // "2024-W45"
  recomendacion: string;    // acción sugerida por el Director Autónomo
  accionada:     boolean;   // si el usuario ya tomó acción
  createdAt:     number;
}

// ── CampaignCreative — Asset creativo individual ──────────────────────────────

export interface CampaignCreative {
  id:            string;
  clienteId:     string;
  workspaceId:   string;
  goalId?:       string;    // vinculado a BrandGoal
  // Contenido
  titulo:        string;
  hookTexto:     string;
  hookType:      HookType;
  ctaTexto:      string;
  copyCuerpo:    string;
  // Configuración
  formato:       FormatoCreativo;
  canal:         CanalMarketing;
  duracionSeg?:  number;    // para videos
  // Genome (Creative Genome decomposition)
  genome?: {
    emocion:        string;   // "Esperanza", "FOMO", "Curiosidad"
    patron:         string;   // "Relatable fail → reveal → CTA"
    colorPalette:   string;   // "Cálido, naranja, blanco"
    audio?:         string;   // "Trending, sin lyrics"
    ritmo:          string;   // "Rápido, cortes cada 2s"
    personaje?:     string;   // "Experto con bata", "Usuario real"
  };
  // Estado
  estado:        "borrador" | "aprobado" | "publicado" | "pausado" | "archivado";
  // Performance (post-publicación)
  roasReal?:     number;
  ctrReal?:      number;
  cpaReal?:      number;
  createdAt:     number;
  updatedAt:     number;
}

// ── GoalState — Árbol de decisiones del Goal Engine ──────────────────────────

export interface GoalDecision {
  pregunta:   string;
  respuesta:  boolean;
  siguiente:  string;   // nombre del siguiente nodo
}

export interface GoalState {
  id:              string;
  clienteId:       string;
  goalId:          string;
  // Árbol de decisiones
  nodoActual:      string;    // "inicio" | "verificar_presupuesto" | "elegir_canal" | etc.
  decisiones:      GoalDecision[];
  // Resultado
  canalRecomendado?:  CanalMarketing;
  estrategia?:        string;   // descripción de la estrategia recomendada
  presupuestoSugerido?: number;
  creativasGeneradas:   number;  // cuántas creativas generó el lab
  // Meta
  completado:      boolean;
  createdAt:       number;
  updatedAt:       number;
}

// ── DirectorBrief — Brief matutino del Director Autónomo ─────────────────────

export interface DirectorBrief {
  id:            string;
  workspaceId:   string;
  fecha:         string;   // "2024-11-15"
  // Resumen ejecutivo
  totalClientes:     number;
  clientesConFatiga: number;
  clientesSinMeta:   number;
  inversionSemana:   number;  // MXN
  roasPromedio:      number;
  // Alertas prioritarias
  alertasCriticas:   AdFatigueAlert[];
  // Recomendaciones del día
  recomendaciones: Array<{
    clienteId:      string;
    clienteNombre:  string;
    tipo:           "FATIGA" | "ESCALAR" | "PAUSAR" | "NUEVO_CREATIVO" | "CAMBIAR_CANAL";
    descripcion:    string;
    urgencia:       "BAJA" | "MEDIA" | "ALTA";
    accionada:      boolean;
  }>;
  // Oportunidades detectadas
  oportunidades: Array<{
    clienteId:    string;
    descripcion:  string;
    potencial:    string;   // "ROAS estimado 4.2x"
  }>;
  generadoAt:    number;
}

// ── CreativeLab — Sesión de generación de variantes ──────────────────────────

export interface CreativeVariant {
  id:              string;
  hookTexto:       string;
  hookType:        HookType;
  ctaTexto:        string;
  oferta:          string;
  scorePredictivoRoas: number;   // 0-10 estimado
  scorePredictivoEngagement: number;
  selected:        boolean;
}

export interface CreativeLab {
  id:              string;
  clienteId:       string;
  workspaceId:     string;
  goalId?:         string;
  // Configuración de la sesión
  objetivo:        TipoObjetivo;
  canal:           CanalMarketing;
  industria:       string;
  presupuestoMXN:  number;
  // Generación
  hooksGenerados:  number;    // e.g. 20
  ctasGenerados:   number;    // e.g. 15
  ofertasGeneradas: number;   // e.g. 5
  variantes:       CreativeVariant[];
  // Seleccionadas
  variantesSeleccionadas: CreativeVariant[];
  // Meta
  estado:          "generando" | "listo" | "exportado";
  createdAt:       number;
  updatedAt:       number;
}

// ── Colecciones Firestore ─────────────────────────────────────────────────────
// Patrón: smm_workspaces/{workspaceId}/prometeo_{col}

export type PrometeoCollection =
  | "goals"
  | "brand_dna"
  | "creative_memory"
  | "fatigue_alerts"
  | "campaign_creatives"
  | "goal_states"
  | "director_briefs"
  | "creative_labs";

/** Helper de path — sub-colecciones dentro del workspace existente */
export function prometeoPath(workspaceId: string, col: PrometeoCollection): string {
  return `smm_workspaces/${workspaceId}/prometeo_${col}`;
}
