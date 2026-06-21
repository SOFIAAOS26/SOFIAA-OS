/* eslint-disable @typescript-eslint/no-explicit-any */

const MXN = new Intl.NumberFormat("es-MX", {
  style: "currency", currency: "MXN", maximumFractionDigits: 0,
});

function header(doc: any, title: string) {
  // Fondo azul claro en la parte superior
  doc.setFillColor(14, 165, 233);
  doc.rect(0, 0, 210, 22, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("SOFIAA · TEC BI", 14, 10);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(title, 14, 16);

  const fecha = new Date().toLocaleDateString("es-MX", {
    year: "numeric", month: "long", day: "numeric",
  });
  doc.text(fecha, 196, 16, { align: "right" });

  doc.setTextColor(0, 0, 0);
  return 30; // y cursor después del header
}

function kpiRow(doc: any, y: number, kpis: { label: string; value: string; color?: [number,number,number] }[]) {
  const colW = 180 / kpis.length;
  kpis.forEach((k, i) => {
    const x = 14 + i * colW;
    doc.setFillColor(245, 251, 255);
    doc.roundedRect(x, y, colW - 4, 18, 2, 2, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(130, 130, 130);
    doc.text(k.label.toUpperCase(), x + 4, y + 6);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    const [r, g, b] = k.color ?? [29, 29, 31];
    doc.setTextColor(r, g, b);
    doc.text(k.value, x + 4, y + 14);
  });
  doc.setTextColor(0, 0, 0);
  return y + 24;
}

export async function exportAnalisisPDF(data: {
  costoInterno: number;
  costoExterno: number;
  valorTotal: number;
  rentabilidadGlobal: string | null;
  proyectos: { titulo: string; costo: number; valor: number; rentabilidad: number; tipo: string }[];
  auditoria: { nombre: string; proyectos: number; costoPromedio: number; calidadPromedio: number; rentabilidadPromedio: number }[];
}) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF();
  let y = header(doc, "Reporte de Análisis de Costos");

  y = kpiRow(doc, y, [
    { label: "Costo Interno",    value: MXN.format(data.costoInterno),  color: [123, 79, 232] },
    { label: "Costo Externo",    value: MXN.format(data.costoExterno),  color: [255, 159, 10] },
    { label: "Valor Generado",   value: MXN.format(data.valorTotal),    color: [52, 199, 89] },
    { label: "Rentabilidad",     value: data.rentabilidadGlobal ? `${data.rentabilidadGlobal}%` : "—",
      color: data.rentabilidadGlobal && Number(data.rentabilidadGlobal) >= 0 ? [52,199,89] : [255,59,48] },
  ]);

  // Tabla proyectos
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(14, 165, 233);
  doc.text("RENTABILIDAD POR PROYECTO", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Proyecto", "Tipo", "Costo", "Valor", "Rentabilidad"]],
    body: data.proyectos.map((p) => [
      p.titulo,
      p.tipo,
      MXN.format(p.costo),
      MXN.format(p.valor),
      `${p.rentabilidad >= 0 ? "+" : ""}${p.rentabilidad.toFixed(1)}%`,
    ]),
    headStyles: { fillColor: [14, 165, 233], fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 251, 255] },
    columnStyles: { 4: { halign: "right" } },
    margin: { left: 14, right: 14 },
    didParseCell: (hookData: any) => {
      if (hookData.column.index === 4 && hookData.section === "body") {
        const val = hookData.cell.raw as string;
        hookData.cell.styles.textColor = val.startsWith("+") ? [52, 199, 89] : [255, 59, 48];
        hookData.cell.styles.fontStyle = "bold";
      }
    },
  });

  if (data.auditoria.length > 0) {
    const afterY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(14, 165, 233);
    doc.text("AUDITORÍA DE PROVEEDORES", 14, afterY);

    autoTable(doc, {
      startY: afterY + 4,
      head: [["Proveedor", "Proyectos", "Costo Prom.", "Calidad", "Rentabilidad"]],
      body: data.auditoria.map((a) => [
        a.nombre,
        String(a.proyectos),
        MXN.format(a.costoPromedio),
        `${a.calidadPromedio} ★`,
        `${a.rentabilidadPromedio >= 0 ? "+" : ""}${a.rentabilidadPromedio.toFixed(1)}%`,
      ]),
      headStyles: { fillColor: [14, 165, 233], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 251, 255] },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text(`SOFIAA TEC BI — Generado el ${new Date().toLocaleString("es-MX")}`, 14, 290);
    doc.text(`Página ${i} / ${pageCount}`, 196, 290, { align: "right" });
  }

  doc.save(`analisis-tec-bi-${Date.now()}.pdf`);
}

export async function exportEvaluacionesPDF(data: {
  evaluaciones: {
    proyecto: string;
    tipo: string;
    evaluado: string;
    calidad: number;
    costo: number | null;
    tiempo: string;
    unidades: number;
    versiones: number;
  }[];
  avgCalidad: string;
  pctATiempo: number | null;
  total: number;
}) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape" });
  let y = header(doc, "Reporte de Evaluaciones");

  y = kpiRow(doc, y, [
    { label: "Total evaluaciones", value: String(data.total), color: [14, 165, 233] },
    { label: "Calidad promedio",   value: `${data.avgCalidad} ★`, color: [255, 159, 10] },
    { label: "A tiempo",           value: data.pctATiempo !== null ? `${data.pctATiempo}%` : "—", color: [52, 199, 89] },
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Proyecto", "Tipo", "Evaluado", "Calidad", "Costo", "Tiempo", "Unidades", "Versiones"]],
    body: data.evaluaciones.map((e) => [
      e.proyecto,
      e.tipo,
      e.evaluado,
      `${e.calidad} ★`,
      e.costo ? MXN.format(e.costo) : "—",
      e.tiempo,
      String(e.unidades),
      String(e.versiones),
    ]),
    headStyles: { fillColor: [14, 165, 233], fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 251, 255] },
    margin: { left: 14, right: 14 },
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text(`SOFIAA TEC BI — Generado el ${new Date().toLocaleString("es-MX")}`, 14, 200);
    doc.text(`Página ${i} / ${pageCount}`, 283, 200, { align: "right" });
  }

  doc.save(`evaluaciones-tec-bi-${Date.now()}.pdf`);
}
