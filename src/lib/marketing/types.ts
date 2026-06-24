// ── Marketing Pro — Tipos TypeScript (multi-tenant) ──────────────
// Estructura Firestore:
//   smm_workspaces/{workspaceId}/clientes/{id}
//   smm_workspaces/{workspaceId}/metricas/{id}
//   smm_workspaces/{workspaceId}/calendario/{id}
//   smm_workspaces/{workspaceId}/finanzas/{id}

import { Timestamp } from "firebase/firestore";

// ── Workspace ─────────────────────────────────────────────────────
export interface SmmWorkspace {
  id:         string;
  nombre:     string;           // "Agencia PASCALL"
  ownerEmail: string;
  plan:       "free" | "pro" | "agency";
  createdAt:  Timestamp;
}

// ── Clientes ──────────────────────────────────────────────────────
export type EstadoCliente = "Activo" | "Pausa" | "Prospecto" | "Ex-cliente";
export type PlataformaSmm = "Instagram" | "Facebook" | "TikTok" | "YouTube" | "LinkedIn" | "Google" | "X" | "Pinterest";

export interface SmmCliente {
  id?:         string;
  nombre:      string;
  industria:   string;
  contacto:    string;
  email:       string;
  telefono:    string;
  plataformas: PlataformaSmm[];
  paqueteMXN:  number;
  estado:      EstadoCliente;
  fechaInicio: Timestamp | null;
  notas:       string;
  scoreEst:    number;          // 1-5 estrellas
  createdAt?:  Timestamp;
  updatedAt?:  Timestamp;
}

// ── Métricas ──────────────────────────────────────────────────────
export type PlataformaMetrica = PlataformaSmm;

export interface SmmMetrica {
  id?:              string;
  clienteId:        string;
  clienteNombre:    string;
  plataforma:       PlataformaMetrica;
  mes:              string;      // "2026-06" (YYYY-MM)
  seguidores:       number;
  nuevosSeguidores: number;
  alcance:          number;
  impresiones:      number;
  engagementPct:    number;     // 0.048 = 4.8%
  publicaciones:    number;
  guardados:        number;
  clicsPerfil:      number;
  invPubli:         number;     // inversión publicitaria
  retorno:          number;     // retorno generado
  leads:            number;
  createdAt?:       Timestamp;
  updatedAt?:       Timestamp;
}

// ── Calendario ────────────────────────────────────────────────────
export type EstadoContenido =
  | "Idea"
  | "En producción"
  | "En revisión"
  | "Aprobado"
  | "Programado"
  | "Publicado";

export type FormatoContenido =
  | "Reel"
  | "Carrusel"
  | "Story"
  | "Post estático"
  | "Live"
  | "TikTok"
  | "Video YT"
  | "Podcast";

export interface SmmCalendario {
  id?:           string;
  clienteId:     string;
  clienteNombre: string;
  titulo:        string;
  copy:          string;
  plataforma:    PlataformaSmm;
  formato:       FormatoContenido;
  estado:        EstadoContenido;
  responsable:   string;
  fecha:         Timestamp | null;
  fechaPubli:    Timestamp | null;
  copyAprobado:  boolean;
  assetsListos:  boolean;
  alcanceReal:   number;
  engagementPct: number;
  createdAt?:    Timestamp;
  updatedAt?:    Timestamp;
}

// ── Finanzas ──────────────────────────────────────────────────────
export interface SmmFinanza {
  id?:           string;
  clienteId:     string;
  clienteNombre: string;
  mes:           string;        // "2026-06"
  honorarios:    number;
  gastos:        number;
  invPubli:      number;
  retorno:       number;
  leads:         number;
  horasMes:      number;
  createdAt?:    Timestamp;
  updatedAt?:    Timestamp;
}

// ── Helpers de UI ─────────────────────────────────────────────────
export const PLATAFORMAS: PlataformaSmm[] = [
  "Instagram", "Facebook", "TikTok", "YouTube", "LinkedIn",
  "Google", "X", "Pinterest",
];
export const ESTADOS_CLIENTE: EstadoCliente[] = [
  "Activo", "Pausa", "Prospecto", "Ex-cliente",
];
export const ESTADOS_CONTENIDO: EstadoContenido[] = [
  "Idea", "En producción", "En revisión", "Aprobado", "Programado", "Publicado",
];
export const FORMATOS_CONTENIDO: FormatoContenido[] = [
  "Reel", "Carrusel", "Story", "Post estático", "Live", "TikTok", "Video YT", "Podcast",
];
export const INDUSTRIAS = [
  "Salud & Belleza", "Gastronomía", "Fitness & Salud", "Moda & Retail",
  "Tecnología", "Educación", "Inmobiliaria", "Legal", "Automotriz",
  "Entretenimiento", "Servicios B2B", "Otro",
];

export const ESTADO_BADGE: Record<EstadoCliente, { bg: string; color: string }> = {
  Activo:       { bg: "rgba(16,185,129,0.12)", color: "#10B981" },
  Pausa:        { bg: "rgba(251,191,36,0.15)", color: "#D97706" },
  Prospecto:    { bg: "rgba(124,58,237,0.12)", color: "#7C3AED" },
  "Ex-cliente": { bg: "rgba(239,68,68,0.12)",  color: "#EF4444" },
};

export const ESTADO_CONTENT_BADGE: Record<EstadoContenido, { bg: string; color: string }> = {
  "Idea":          { bg: "rgba(156,163,175,0.15)", color: "#6B7280" },
  "En producción": { bg: "rgba(59,130,246,0.15)",  color: "#3B82F6" },
  "En revisión":   { bg: "rgba(251,191,36,0.15)",  color: "#D97706" },
  "Aprobado":      { bg: "rgba(16,185,129,0.15)",  color: "#10B981" },
  "Programado":    { bg: "rgba(124,58,237,0.15)",  color: "#7C3AED" },
  "Publicado":     { bg: "rgba(236,72,153,0.15)",  color: "#EC4899" },
};
