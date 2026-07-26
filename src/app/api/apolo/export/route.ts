/**
 * POST /api/apolo/export
 *
 * Genera y devuelve un reporte APOLO como archivo descargable.
 * Formatos soportados: pdf | docx
 *
 * Body: { reportId: string; format: "pdf" | "docx" }
 * Response: binary file stream con headers de descarga
 *
 * Sprint AP-4: Export Engine
 * Auth: Firebase ID token en Authorization: Bearer {token}
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb, getAdminApp }      from "@/lib/firebase-admin";
import { getAuth }                   from "firebase-admin/auth";
import type { ApoloReport }          from "@/types/apolo";

// ── Auth ──────────────────────────────────────────────────────────────────────

async function verifyToken(req: NextRequest): Promise<string | null> {
  const h     = req.headers.get("Authorization") ?? "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

// ── POST /api/apolo/export ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const userId = await verifyToken(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { reportId?: string; format?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { reportId, format } = body;
  if (!reportId) return NextResponse.json({ error: "reportId requerido" }, { status: 400 });
  if (!format || !["pdf", "docx"].includes(format)) {
    return NextResponse.json({ error: "format debe ser 'pdf' o 'docx'" }, { status: 400 });
  }

  // Leer reporte de Firestore
  const snap = await adminDb
    .collection(`users/${userId}/apolo_reports`)
    .doc(reportId)
    .get();

  if (!snap.exists) return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });

  const report = snap.data() as ApoloReport;

  try {
    if (format === "docx") {
      const buffer   = await generateDocx(report);
      const filename = safeFilename(report.title) + ".docx";
      return new NextResponse(buffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type":        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length":      String(buffer.length),
        },
      });
    } else {
      const buffer   = await generatePdf(report);
      const filename = safeFilename(report.title) + ".pdf";
      return new NextResponse(buffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type":        "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length":      String((buffer as ArrayBuffer).byteLength ?? 0),
        },
      });
    }
  } catch (err) {
    console.error("[APOLO][export] error:", err);
    return NextResponse.json({ error: "Error al generar el archivo" }, { status: 500 });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeFilename(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9\s\-_áéíóúÁÉÍÓÚñÑ·]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

function periodLabel(period: { from: number; to: number }): string {
  const fmt = (ts: number) =>
    new Date(ts).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  return `${fmt(period.from)} – ${fmt(period.to)}`;
}

// ── DOCX Generator ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DocxChild = any;

async function generateDocx(report: ApoloReport): Promise<Buffer> {
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel,
    AlignmentType, Table, TableRow, TableCell, WidthType, ShadingType,
  } = await import("docx");

  const AMBER = "D97706";
  const GRAY  = "78716c";
  const WHITE = "FFFFFF";

  const bodyPara = (text: string): DocxChild =>
    new Paragraph({
      children: [new TextRun({ text: text || " ", size: 22, color: "1a1a1a" })],
      spacing: { after: 120 },
    });

  const trendStr = (t?: string) =>
    t === "up" ? "↑" : t === "down" ? "↓" : t === "stable" ? "→" : "";

  // ── Portada ──────────────────────────────────────────────────────────────
  const coverChildren: DocxChild[] = [
    new Paragraph({ text: "", spacing: { after: 1400 } }),
    new Paragraph({
      children: [new TextRun({ text: "☀ APOLO", bold: true, size: 28, color: AMBER, font: "Calibri" })],
      alignment: AlignmentType.CENTER, spacing: { after: 300 },
    }),
    new Paragraph({
      children: [new TextRun({ text: report.title, bold: true, size: 44, color: "111111", font: "Calibri" })],
      alignment: AlignmentType.CENTER, spacing: { after: 200 },
    }),
  ];

  if (report.clientName) {
    coverChildren.push(new Paragraph({
      children: [new TextRun({ text: `Cliente: ${report.clientName}`, size: 26, color: GRAY, font: "Calibri" })],
      alignment: AlignmentType.CENTER, spacing: { after: 120 },
    }));
  }

  coverChildren.push(
    new Paragraph({
      children: [new TextRun({ text: periodLabel(report.period), size: 24, color: GRAY, font: "Calibri" })],
      alignment: AlignmentType.CENTER, spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: `Generado el ${new Date(report.generatedAt).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
        size: 20, color: "aaaaaa", font: "Calibri",
      })],
      alignment: AlignmentType.CENTER,
    }),
  );

  if (report.themisApproved) {
    coverChildren.push(
      new Paragraph({ text: "", spacing: { after: 300 } }),
      new Paragraph({
        children: [new TextRun({ text: "✓ Aprobado por THEMIS", size: 20, color: "22c55e", bold: true, font: "Calibri" })],
        alignment: AlignmentType.CENTER,
      }),
    );
  }

  // ── Resumen ejecutivo ────────────────────────────────────────────────────
  const summaryChildren: DocxChild[] = [
    new Paragraph({ text: "Resumen Ejecutivo", heading: HeadingLevel.HEADING_1, spacing: { after: 200, before: 200 } }),
    bodyPara(report.summary),
  ];

  // ── Secciones ────────────────────────────────────────────────────────────
  const sorted = [...(report.sections ?? [])].sort((a, b) => a.order - b.order);

  const sectionBlocks: DocxChild[][] = sorted.map(sec => {
    const children: DocxChild[] = [
      new Paragraph({ text: sec.title, heading: HeadingLevel.HEADING_2, spacing: { after: 160, before: 300 } }),
    ];

    if (sec.body) {
      sec.body.split(/\n+/).filter((p: string) => p.trim()).forEach((p: string) => children.push(bodyPara(p.trim())));
    }

    if (sec.dataPoints.length > 0) {
      children.push(new Paragraph({ text: "Métricas", heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 120 } }));

      const mkCell = (text: string, fill: string, width: number, bold = false) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, size: 20, bold, color: fill === AMBER ? WHITE : "1a1a1a" })] })],
          shading: { type: ShadingType.CLEAR, fill },
          width: { size: width, type: WidthType.DXA },
        });

      const rows = [
        new TableRow({ children: [mkCell("Indicador", AMBER, 6000, true), mkCell("Valor", AMBER, 3000, true), mkCell("Tendencia", AMBER, 1500, true)] }),
        ...sec.dataPoints.map((dp: { label: string; value: string; trend?: string }, i: number) => {
          const fill = i % 2 === 0 ? "f9f9f9" : WHITE;
          return new TableRow({ children: [mkCell(dp.label, fill, 6000), mkCell(dp.value, fill, 3000, true), mkCell(trendStr(dp.trend), fill, 1500)] });
        }),
      ];

      children.push(new Table({ rows, width: { size: 10500, type: WidthType.DXA } }));
    }

    return children;
  });

  // ── Construir documento ──────────────────────────────────────────────────
  const docSections = [
    { children: coverChildren },
    { children: summaryChildren },
    ...sectionBlocks.map(ch => ({ children: ch })),
  ];

  const doc = new Document({ sections: docSections });
  return Packer.toBuffer(doc);
}

// ── PDF Generator ─────────────────────────────────────────────────────────────

async function generatePdf(report: ApoloReport): Promise<ArrayBuffer> {
  const { jsPDF } = await import("jspdf");

  const doc    = new jsPDF({ unit: "mm", format: "a4" });
  const pw     = doc.internal.pageSize.getWidth();
  const ph     = doc.internal.pageSize.getHeight();
  const ML     = 18;   // margin left
  const MR     = 18;   // margin right
  const TW     = pw - ML - MR;
  let   y      = 24;

  // ── Funciones de layout ────────────────────────────────────────────────
  const newPage = () => {
    doc.addPage();
    y = 20;
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 120, 60);
    doc.text("APOLO · Client Intelligence & Reporting Engine · SOFIAA OS", ML, ph - 10);
    doc.text(report.title.slice(0, 60), pw - MR, ph - 10, { align: "right" });
    doc.setTextColor(30, 30, 30);
  };

  const checkY = (needed: number) => {
    if (y + needed > ph - 18) newPage();
  };

  // ── Portada ─────────────────────────────────────────────────────────────
  // Fondo header
  doc.setFillColor(217, 119, 6);
  doc.rect(0, 0, pw, 42, "F");

  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("☀  APOLO", ML, 16);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Client Intelligence & Reporting Engine", ML, 22);

  // Título del reporte
  y = 58;
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  const titleLines = doc.splitTextToSize(report.title, TW) as string[];
  doc.text(titleLines, ML, y);
  y += titleLines.length * 10 + 4;

  if (report.clientName) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 113, 108);
    doc.text(`Cliente: ${report.clientName}`, ML, y);
    y += 7;
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 113, 108);
  doc.text(periodLabel(report.period), ML, y);
  y += 7;
  doc.text(
    `Generado el ${new Date(report.generatedAt).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}`,
    ML, y
  );
  y += 10;

  if (report.themisApproved) {
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("✓ Aprobado por THEMIS", ML, y);
    y += 10;
  }

  // ── Resumen ejecutivo ────────────────────────────────────────────────────
  y += 6;
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.5);
  doc.line(ML, y, pw - MR, y);
  y += 6;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Resumen Ejecutivo", ML, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  const summaryLines = doc.splitTextToSize(report.summary ?? "", TW) as string[];
  checkY(summaryLines.length * 5 + 4);
  doc.text(summaryLines, ML, y);
  y += summaryLines.length * 5 + 10;

  // ── Secciones ────────────────────────────────────────────────────────────
  const sorted = [...(report.sections ?? [])].sort((a, b) => a.order - b.order);

  for (const sec of sorted) {
    checkY(20);
    // Barra de engine
    const engColors: Record<string, number[]> = {
      oraculo: [124, 58, 237], prometeo: [249, 115, 22], tec_bii: [6, 182, 212],
      atena:   [168, 85, 247], nexo:     [16, 185, 129],
    };
    const [r, g, b] = engColors[sec.engine] ?? [217, 119, 6];
    doc.setFillColor(r, g, b);
    doc.rect(ML, y, 3, 8, "F");

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(sec.title, ML + 6, y + 5.5);
    y += 14;

    // Narrativa
    if (sec.body) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      const paras = sec.body.split(/\n+/).filter(p => p.trim());
      for (const para of paras) {
        const lines = doc.splitTextToSize(para.trim(), TW) as string[];
        checkY(lines.length * 5 + 4);
        doc.text(lines, ML, y);
        y += lines.length * 5 + 4;
      }
      y += 2;
    }

    // Tabla de métricas
    if (sec.dataPoints.length > 0) {
      checkY(14 + sec.dataPoints.length * 7);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(120, 113, 108);
      doc.text("MÉTRICAS", ML, y);
      y += 6;

      const C1 = TW * 0.55;
      const C2 = TW * 0.30;
      const C3 = TW * 0.15;

      // Cabecera tabla
      doc.setFillColor(217, 119, 6);
      doc.rect(ML, y, TW, 7, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("Indicador", ML + 2, y + 5);
      doc.text("Valor",     ML + C1 + 2, y + 5);
      doc.text("Tend.",     ML + C1 + C2 + 2, y + 5);
      y += 7;

      // Filas
      for (let i = 0; i < sec.dataPoints.length; i++) {
        const dp = sec.dataPoints[i];
        checkY(7);
        if (i % 2 === 0) {
          doc.setFillColor(249, 245, 235);
          doc.rect(ML, y, TW, 7, "F");
        }
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);

        const labelLines = doc.splitTextToSize(dp.label, C1 - 4) as string[];
        doc.text(labelLines[0] ?? "", ML + 2, y + 5);
        doc.text(dp.value.slice(0, 30), ML + C1 + 2, y + 5);

        const trendStr = dp.trend === "up" ? "↑" : dp.trend === "down" ? "↓" : dp.trend === "stable" ? "→" : "";
        if (dp.trend === "up")     doc.setTextColor(34, 197, 94);
        if (dp.trend === "down")   doc.setTextColor(239, 68, 68);
        if (dp.trend === "stable") doc.setTextColor(100, 116, 139);
        doc.text(trendStr, ML + C1 + C2 + 2, y + 5);
        doc.setTextColor(30, 30, 30);
        y += 7;
      }
      y += 8;
    }
  }

  // Footer en última página
  doc.setFontSize(8);
  doc.setTextColor(150, 120, 60);
  doc.text("APOLO · Client Intelligence & Reporting Engine · SOFIAA OS", ML, ph - 10);
  doc.text(report.title.slice(0, 60), pw - MR, ph - 10, { align: "right" });

  return doc.output("arraybuffer");
}
