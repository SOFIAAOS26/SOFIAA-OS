/**
 * HERMES — Action Execution Layer v1.0
 * El motor de ejecución de SOFIAA OS.
 *
 * HERMES es la capa que convierte decisiones en hechos.
 * Recibe intenciones de PROMETEO / ATENA / TEC Bii
 * y las ejecuta de forma segura a través de conectores externos.
 *
 * Ciclo de vida de una acción:
 *   propuesta → pendiente_aprobacion → aprobada → ejecutando → completada
 *                                              ↘ rechazada
 *                                                                ↘ fallida
 *
 * Arquitectura de conectores:
 *   Etapa 1 (disponible):  monday, slack, calendario_smm, hermes_interno
 *   Etapa 2 (próximamente): meta_ads, google_ads, whatsapp_business, crm
 *
 * El schema está diseñado para acomodar ambas etapas desde el inicio.
 * Los conectores de Etapa 2 tienen su tipo definido aquí —
 * cuando estén implementados, solo habrá que añadir el conector.
 */

// ── Motor de origen ───────────────────────────────────────────────────────────

/** Motor de SOFIAA que originó la acción */
export type HermesSourceEngine =
  | "prometeo"      // Director Brief, fatiga detectada, recomendación aprobada
  | "atena"         // Resultado de DOE / experimento aprobado
  | "tec_bii"       // Tarea operacional, alerta de capacidad
  | "manual"        // El usuario creó la acción directamente desde la UI
  | "cron";         // El CRON de PROMETEO generó la acción automáticamente

// ── Conectores disponibles ────────────────────────────────────────────────────

/**
 * Tipo de conector — identifica la plataforma externa.
 *
 * ETAPA 1 — implementados en Sprint H-2 / H-3:
 *   monday_cloud, slack, calendario_smm, hermes_interno
 *
 * ETAPA 2 — definidos ahora, implementados cuando se obtengan las API keys:
 *   meta_ads, google_ads, whatsapp_business, mailchimp, hubspot_crm
 *
 * Diseño deliberado: mantener los tipos de Etapa 2 aquí
 * permite que PROMETEO proponga acciones de ads desde ahora,
 * y que HERMES las encole correctamente aunque no pueda ejecutarlas aún.
 */
export type HermesConnectorType =
  // ── Etapa 1 — disponibles ────────────────────────────────────────────────
  | "monday_cloud"        // Monday.com — crear / actualizar items y tareas
  | "slack"               // Slack — notificaciones via Incoming Webhook
  | "calendario_smm"      // Calendario de Marketing Sofia — agendar post
  | "hermes_interno"      // Acciones dentro de SOFIAA OS (Firestore directo)
  // ── Etapa 2 — próximamente ───────────────────────────────────────────────
  | "meta_ads"            // Meta Business Suite — crear / pausar / escalar ads
  | "google_ads"          // Google Ads — campañas, presupuestos
  | "whatsapp_business"   // WhatsApp Business API — mensajes / notificaciones
  | "mailchimp"           // Mailchimp — campañas de email
  | "hubspot_crm";        // HubSpot — actualizar contactos / deals

/** Estado de configuración de un conector en un workspace */
export type HermesConnectorStatus =
  | "activo"              // configurado y probado
  | "pendiente_config"    // reconocido pero sin credenciales
  | "proximamente"        // Etapa 2 — no disponible aún
  | "error";              // error de configuración

// ── Tipos de acciones ─────────────────────────────────────────────────────────

/**
 * Tipo de acción — granular y extensible.
 * Cada tipo mapea 1:1 a un conector + operación.
 *
 * Convención de nombre: {conector}_{operacion}
 */
export type HermesActionType =
  // ── Monday ───────────────────────────────────────────────────────────────
  | "monday_crear_tarea"          // Crear item en un board
  | "monday_actualizar_tarea"     // Actualizar status / columnas de un item
  | "monday_mover_grupo"          // Mover item a otro grupo del board
  // ── Slack ─────────────────────────────────────────────────────────────────
  | "slack_notificar"             // Enviar mensaje a un canal
  | "slack_notificar_urgente"     // Mensaje con @channel / @here
  // ── Calendario SMM ───────────────────────────────────────────────────────
  | "calendario_crear_post"       // Agendar post en el calendario de MktgSofia
  | "calendario_actualizar_post"  // Actualizar estado / copy de un post agendado
  // ── HERMES Interno ───────────────────────────────────────────────────────
  | "interno_actualizar_goal"     // Actualizar valorActual de un BrandGoal
  | "interno_registrar_memoria"   // Registrar aprendizaje en Creative Memory
  // ── Meta Ads (Etapa 2) ───────────────────────────────────────────────────
  | "meta_ads_crear_campana"      // Crear campaña en Meta Business
  | "meta_ads_pausar_campana"     // Pausar campaña activa
  | "meta_ads_escalar_presupuesto"// Aumentar/reducir presupuesto diario
  | "meta_ads_crear_adset"        // Crear adset con segmentación
  // ── Google Ads (Etapa 2) ─────────────────────────────────────────────────
  | "google_ads_crear_campana"    // Crear campaña Search/Display
  | "google_ads_pausar_campana"   // Pausar campaña
  | "google_ads_ajustar_bid"      // Ajustar bid strategy
  // ── WhatsApp (Etapa 2) ───────────────────────────────────────────────────
  | "whatsapp_enviar_mensaje"     // Enviar mensaje template aprobado
  // ── CRM (Etapa 2) ────────────────────────────────────────────────────────
  | "crm_actualizar_contacto"     // Actualizar propiedad de contacto en HubSpot
  | "crm_crear_deal";             // Crear deal en pipeline CRM

// ── Estado del ciclo de vida ──────────────────────────────────────────────────

export type HermesActionStatus =
  | "propuesta"             // generada por un motor, no enviada al humano aún
  | "pendiente_aprobacion"  // en cola esperando que el usuario apruebe / rechace
  | "aprobada"              // aprobada, esperando ejecución
  | "ejecutando"            // en proceso de ejecución
  | "completada"            // ejecutada con éxito
  | "fallida"               // intentada pero falló
  | "rechazada";            // rechazada por el usuario

// ── Nivel de urgencia ─────────────────────────────────────────────────────────

export type HermesUrgencia = "BAJA" | "MEDIA" | "ALTA" | "CRITICA";

// ── Conectores — configuración por workspace ──────────────────────────────────

/**
 * Configuración de un conector en un workspace.
 * Las credenciales sensibles NO se guardan aquí —
 * viven en variables de entorno o Firebase Secrets.
 * Solo se guarda metadata de configuración no sensible.
 */
export interface HermesConnectorConfig {
  id:           string;
  workspaceId:  string;
  tipo:         HermesConnectorType;
  nombre:       string;          // etiqueta display: "Monday PASCALL", "Slack #mkt"
  status:       HermesConnectorStatus;
  // Metadata no sensible
  webhookConfigured: boolean;    // si el webhook está registrado
  boardId?:     string;          // Monday: board ID default del workspace
  channelId?:   string;          // Slack: canal default
  adAccountId?: string;          // Meta/Google: ID de cuenta de anuncios (no secreto)
  // Etapa 2: cuando estén disponibles
  etapa:        1 | 2;           // 1 = disponible ahora, 2 = próximamente
  createdAt:    number;
  updatedAt:    number;
}

// ── Payload de cada tipo de acción ───────────────────────────────────────────

/** Payload typed por tipo de acción. Extendible sin romper el esquema. */
export type HermesActionPayload =
  | { tipo: "monday_crear_tarea";           board_id?: string; group_id?: string; nombre: string; descripcion?: string; columnas?: Record<string, string> }
  | { tipo: "monday_actualizar_tarea";      item_id: string; columnas: Record<string, string> }
  | { tipo: "monday_mover_grupo";           item_id: string; group_id: string }
  | { tipo: "slack_notificar";              mensaje: string; canal?: string }
  | { tipo: "slack_notificar_urgente";      mensaje: string; canal?: string; mencion: "@channel" | "@here" }
  | { tipo: "calendario_crear_post";        clienteId: string; titulo: string; copy: string; plataforma: string; fecha: string; formato: string }
  | { tipo: "calendario_actualizar_post";   postId: string; estado: string; copy?: string }
  | { tipo: "interno_actualizar_goal";      goalId: string; nuevoValorActual: number }
  | { tipo: "interno_registrar_memoria";    datos: Record<string, unknown> }
  | { tipo: "meta_ads_crear_campana";       nombre: string; objetivo: string; presupuesto_diario: number; fecha_inicio: string }
  | { tipo: "meta_ads_pausar_campana";      campana_id: string; motivo?: string }
  | { tipo: "meta_ads_escalar_presupuesto"; campana_id: string; nuevo_presupuesto: number }
  | { tipo: "meta_ads_crear_adset";         campana_id: string; nombre: string; segmentacion: Record<string, unknown> }
  | { tipo: "google_ads_crear_campana";     nombre: string; tipo_campana: string; presupuesto_diario: number }
  | { tipo: "google_ads_pausar_campana";    campana_id: string }
  | { tipo: "google_ads_ajustar_bid";       campana_id: string; estrategia: string; valor?: number }
  | { tipo: "whatsapp_enviar_mensaje";      numero: string; template: string; parametros?: string[] }
  | { tipo: "crm_actualizar_contacto";      contacto_id: string; propiedades: Record<string, string> }
  | { tipo: "crm_crear_deal";               nombre: string; monto: number; etapa: string; contacto_id?: string }
  // fallback para tipos futuros no tipados aún
  | { tipo: HermesActionType; [key: string]: unknown };

// ── Resultado de ejecución ────────────────────────────────────────────────────

export interface HermesResultado {
  exito:       boolean;
  mensaje:     string;           // legible para el usuario
  datos?:      Record<string, unknown>; // respuesta raw del conector
  linkAccion?: string;           // URL para ver el resultado (tarea en Monday, post, etc.)
  errorCode?:  string;           // código de error si falló
}

// ── Acción principal ──────────────────────────────────────────────────────────

/**
 * HermesAction — unidad fundamental de ejecución.
 *
 * Almacenada en: smm_workspaces/{workspaceId}/hermes_queue/{actionId}
 *
 * El payload es tipado, pero se guarda como Record<string, unknown>
 * en Firestore para compatibilidad. El conector lo castea al tipo correcto.
 */
export interface HermesAction {
  id:             string;
  workspaceId:    string;

  // ── Origen ─────────────────────────────────────────────────────────────
  sourceEngine:   HermesSourceEngine;
  sourceBriefId?: string;        // ID del DirectorBrief / insight que originó esto
  sourceGoalId?:  string;        // ID del BrandGoal relacionado
  clienteId?:     string;        // cliente afectado (si aplica)
  clienteNombre?: string;

  // ── Tipo y payload ──────────────────────────────────────────────────────
  tipo:           HermesActionType;
  connectorTipo:  HermesConnectorType; // conector que ejecutará
  payload:        Record<string, unknown>;

  // ── Contexto para el usuario ────────────────────────────────────────────
  titulo:         string;        // descripción corta legible: "Crear tarea en Monday"
  descripcion:    string;        // detalle: "Crear tarea 'Rotar creativos TikTok' en board de ACME"
  justificacion:  string;        // por qué PROMETEO/ATENA recomienda esto
  urgencia:       HermesUrgencia;

  // ── Ciclo de vida ───────────────────────────────────────────────────────
  estado:         HermesActionStatus;
  aprobadoPor?:   string;        // uid del usuario que aprobó/rechazó
  rechazadoPor?:  string;
  motivoRechazo?: string;        // texto libre del usuario al rechazar

  // ── Resultado ───────────────────────────────────────────────────────────
  resultado?:     HermesResultado;
  reintentos:     number;        // veces que se intentó ejecutar (max 3)

  // ── Timestamps ──────────────────────────────────────────────────────────
  createdAt:      number;
  aprobadoAt?:    number;
  executedAt?:    number;
  completadoAt?:  number;
}

// ── Métricas del Centro de Mando ──────────────────────────────────────────────

export interface HermesStats {
  pendientesAprobacion: number;
  completadasHoy:       number;
  fallidasHoy:          number;
  conectoresActivos:    number;
  conectoresProximos:   number;   // Etapa 2 no disponibles aún
  accionesTotales:      number;
}

// ── Colección Firestore ───────────────────────────────────────────────────────

/** Path de la cola de acciones en Firestore */
export function hermesQueuePath(workspaceId: string): string {
  return `smm_workspaces/${workspaceId}/hermes_queue`;
}

/** Path de configuración de conectores */
export function hermesConnectorsPath(workspaceId: string): string {
  return `smm_workspaces/${workspaceId}/hermes_connectors`;
}

// ── Helpers de display ────────────────────────────────────────────────────────

/** Etiquetas legibles para cada tipo de conector */
export const CONNECTOR_LABELS: Record<HermesConnectorType, { nombre: string; icon: string; etapa: 1 | 2 }> = {
  monday_cloud:         { nombre: "Monday.com",            icon: "📋", etapa: 1 },
  slack:                { nombre: "Slack",                  icon: "💬", etapa: 1 },
  calendario_smm:       { nombre: "Calendario Marketing",   icon: "📅", etapa: 1 },
  hermes_interno:       { nombre: "SOFIAA Interno",         icon: "⚡", etapa: 1 },
  meta_ads:             { nombre: "Meta Ads",               icon: "📘", etapa: 2 },
  google_ads:           { nombre: "Google Ads",             icon: "🔍", etapa: 2 },
  whatsapp_business:    { nombre: "WhatsApp Business",      icon: "💚", etapa: 2 },
  mailchimp:            { nombre: "Mailchimp",              icon: "📧", etapa: 2 },
  hubspot_crm:          { nombre: "HubSpot CRM",            icon: "🟠", etapa: 2 },
};

/** Color de urgencia */
export const URGENCIA_COLOR: Record<HermesUrgencia, string> = {
  BAJA:    "#22c55e",
  MEDIA:   "#f59e0b",
  ALTA:    "#f97316",
  CRITICA: "#ef4444",
};

/** Color de estado */
export const ESTADO_COLOR: Record<HermesActionStatus, string> = {
  propuesta:            "#64748b",
  pendiente_aprobacion: "#f59e0b",
  aprobada:             "#6366f1",
  ejecutando:           "#3b82f6",
  completada:           "#22c55e",
  fallida:              "#ef4444",
  rechazada:            "#64748b",
};
