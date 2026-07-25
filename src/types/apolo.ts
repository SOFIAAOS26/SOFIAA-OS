/**
 * APOLO — Client Intelligence & Reporting Engine
 * Sprint AP-0 · Tipos base
 *
 * Generación 2 · El Sol que Ilumina el Olimpo
 * Color de marca: #D97706 (amber solar)
 */

// ── Tipos de reporte ───────────────────────────────────────────────────────────

export type ReportType =
  | "weekly_summary"        // resumen semanal cross-engine
  | "campaign_performance"  // rendimiento de campaña (PROMETEO)
  | "project_status"        // estado de proyectos (TEC Bii)
  | "quality_report"        // reporte de calidad (ATENA)
  | "executive_brief"       // brief ejecutivo cross-engine
  | "strategic_outlook";    // outlook estratégico (ORÁCULO + NEXO)

export type ReportStatus = "draft" | "ready" | "delivered";

export type ExportFormat = "pdf" | "docx";

// ── Bloques de datos ───────────────────────────────────────────────────────────

export interface ApoloDataPoint {
  label:      string;
  value:      string;
  trend?:     "up" | "down" | "stable";
  engine:     string;
  entityId?:  string;
}

export interface ApoloReportSection {
  id:         string;
  title:      string;
  body:       string;            // narrativa generada por Groq
  dataPoints: ApoloDataPoint[];  // datos estructurados del engine
  engine:     string;            // engine de origen principal
  order:      number;
}

// ── Reporte principal ──────────────────────────────────────────────────────────

export interface ApoloReport {
  id:           string;
  userId:       string;
  workspaceId?: string;           // workspace de Marketing Sofia (opcional)
  type:         ReportType;
  title:        string;
  clientName?:  string;
  period: {
    from: number;                 // timestamp inicio del período
    to:   number;                 // timestamp fin del período
  };
  sections:       ApoloReportSection[];
  summary:        string;         // executive summary (Groq, ≤200 palabras)
  status:         ReportStatus;
  themisApproved: boolean;
  themisVerdictId?: string;
  generatedAt:  number;
  deliveredAt?: number;
}

// ── Plantilla personalizable ───────────────────────────────────────────────────

export interface ApoloTemplate {
  id:      string;
  userId:  string;
  name:    string;
  type:    ReportType;
  engines: string[];             // engines que incluir en el reporte
  customBranding?: {
    primaryColor?: string;
    clientName?:   string;
    footerText?:   string;
  };
  createdAt: number;
}

// ── Datos agregados por engine (payload intermedio) ────────────────────────────

export interface AggregatedEngineData {
  userId:  string;
  type:    ReportType;
  period:  { from: number; to: number };
  engines: Record<string, unknown[]>;  // key = engine name, value = raw docs
}

// ── Resumen para inyección en chat ─────────────────────────────────────────────

export interface ApoloContextSummary {
  reportId:    string;
  type:        ReportType;
  title:       string;
  summary:     string;
  period:      { from: number; to: number };
  generatedAt: number;
}
