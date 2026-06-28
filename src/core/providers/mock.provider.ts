/**
 * SOFIAA Sprint E — MockProvider
 *
 * Implementación de DataProvider para testing y demos offline.
 * Carga fixtures predefinidos por colección.
 *
 * Uso: registrar en el Runtime cuando NEXT_PUBLIC_MOCK_CAPABILITIES=true
 */

import type { DataProvider } from "@/core/providers/data.provider";

// ── Fixtures de demo ───────────────────────────────────────────────────────

const MOCK_FIXTURES: Record<string, unknown[]> = {
  clientes_internos: [
    { id: "c1", nombre: "Viakable", estado: "activo",    categoria: "industrial",   contrato_vigente: true },
    { id: "c2", nombre: "Grúas Vialmex", estado: "activo",    categoria: "construcción", contrato_vigente: true },
    { id: "c3", nombre: "ABC Corp",    estado: "inactivo", categoria: "servicios",    contrato_vigente: false },
    { id: "c4", nombre: "NovaTech",    estado: "activo",    categoria: "tecnología",   contrato_vigente: true },
    { id: "c5", nombre: "LogiMax",     estado: "activo",    categoria: "logística",    contrato_vigente: true },
  ],
  proveedores: [
    { id: "p1", nombre: "Acero del Norte",  calificacion: 4.2, activo: true,  alertas: 2 },
    { id: "p2", nombre: "Logística Veloz",  calificacion: 6.8, activo: true,  alertas: 1 },
    { id: "p3", nombre: "Materiales Sur",   calificacion: 8.5, activo: true,  alertas: 0 },
    { id: "p4", nombre: "TecSupplies",      calificacion: 9.1, activo: true,  alertas: 0 },
    { id: "p5", nombre: "Envíos Rápidos",   calificacion: 5.5, activo: false, alertas: 3 },
  ],
  proyectos: [
    { id: "pr1", nombre: "Expansión Planta", roi: 18.5, costo: 450000, sobre_presupuesto: false },
    { id: "pr2", nombre: "Sistema ERP",      roi: 12.0, costo: 280000, sobre_presupuesto: true  },
    { id: "pr3", nombre: "Campaña Q2",       roi: 22.3, costo: 150000, sobre_presupuesto: false },
    { id: "pr4", nombre: "Red Distribución", roi:  9.8, costo: 600000, sobre_presupuesto: true  },
  ],
  empleados: [
    { id: "e1", nombre: "Ana García",    area: "Operaciones", evaluacion: 9.2, ausencias_mes: 0 },
    { id: "e2", nombre: "Luis Torres",   area: "Finanzas",     evaluacion: 7.5, ausencias_mes: 1 },
    { id: "e3", nombre: "María López",   area: "Ventas",       evaluacion: 8.8, ausencias_mes: 0 },
    { id: "e4", nombre: "Pedro Ruiz",    area: "TI",           evaluacion: 5.2, ausencias_mes: 3 },
    { id: "e5", nombre: "Sofía Mendoza", area: "Marketing",    evaluacion: 9.5, ausencias_mes: 0 },
  ],
  briefs: [
    { id: "b1", titulo: "Brief Viakable Q2",  estado: "en_progreso", vencimiento: "2026-07-15" },
    { id: "b2", titulo: "Propuesta ERP",       estado: "completado",  vencimiento: "2026-06-01" },
    { id: "b3", titulo: "Análisis de mercado", estado: "bloqueado",   vencimiento: "2026-06-20" },
    { id: "b4", titulo: "Auditoría interna",   estado: "en_progreso", vencimiento: "2026-08-01" },
  ],
};

// ── Provider ───────────────────────────────────────────────────────────────

export class MockProvider implements DataProvider {
  readonly type = "mock" as const;

  constructor(private fixtures: Record<string, unknown[]> = MOCK_FIXTURES) {}

  async get(
    config:  Record<string, unknown>,
    params?: Record<string, unknown>
  ): Promise<unknown[]> {
    const col = config.collection as string;
    const data = this.fixtures[col] ?? [];

    // Filtrado básico por campo/valor si se proporcionó
    if (params?.campo && params?.valor !== undefined) {
      return data.filter((row) => {
        const r = row as Record<string, unknown>;
        return r[params.campo as string] === params.valor;
      });
    }

    return data;
  }
}

export const mockProvider = new MockProvider();
