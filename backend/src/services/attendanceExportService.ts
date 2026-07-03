import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { IStaffAttendance } from "../models/StaffAttendance";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AttendanceRecordRow {
  no: number;
  employeeName: string;
  role: string;
  date: string;
  checkIn: string;
  checkOut: string;
  breakHours: string;
  workingHours: string;
  overtimeHours: string;
  lateMinutes: number;
  status: string;
}

export interface ReportSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  onTime: number;
  halfDay: number;
  avgWorkingHours: string;
  totalOvertimeHours: string;
}

export interface ExportReportData {
  restaurantName: string;
  restaurantAddress: string;
  adminName: string;
  periodLabel: string;
  generatedAt: Date;
  summary: ReportSummary;
  records: AttendanceRecordRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

function fmtTime(date?: Date): string {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function fmtDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Build Report Data ────────────────────────────────────────────────────────

export function buildReportData(
  rawRecords: IStaffAttendance[],
  restaurant: { name: string; address: string },
  admin: { name: string },
  period: { startDate: Date; endDate: Date }
): ExportReportData {
  const records: AttendanceRecordRow[] = rawRecords.map((r, idx) => {
    let lateMinutes = 0;
    if (r.status === "late" && r.checkInTime) {
      const checkIn = new Date(r.checkInTime);
      const cutoff = new Date(checkIn);
      cutoff.setHours(10, 0, 0, 0);
      if (checkIn > cutoff) {
        lateMinutes = Math.round((checkIn.getTime() - cutoff.getTime()) / 60_000);
      }
    }

    return {
      no: idx + 1,
      employeeName: r.staffName,
      role: r.staffRole.charAt(0).toUpperCase() + r.staffRole.slice(1),
      date: fmtDate(r.date),
      checkIn: fmtTime(r.checkInTime),
      checkOut: fmtTime(r.checkOutTime),
      breakHours: fmt(r.breakHours || 0),
      workingHours: fmt(r.workingHours || r.workedHours || 0),
      overtimeHours: fmt(r.overtimeHours || 0),
      lateMinutes,
      status: r.status,
    };
  });

  const total = records.length;
  const present = rawRecords.filter((r) => ["present", "late", "short-leave"].includes(r.status)).length;
  const absent = rawRecords.filter((r) => r.status === "absent").length;
  const late = rawRecords.filter((r) => r.status === "late").length;
  const onTime = rawRecords.filter((r) => r.status === "present").length;
  const halfDay = rawRecords.filter((r) => r.status === "short-leave").length;
  const totalWorkedHrs = records.reduce((s, r) => s + parseFloat(r.workingHours), 0);
  const totalOTHrs = records.reduce((s, r) => s + parseFloat(r.overtimeHours), 0);
  const avgWorkingHours = total > 0 ? fmt(totalWorkedHrs / total) : "0.0";

  const startLabel = period.startDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const endLabel = period.endDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const periodLabel = startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;

  return {
    restaurantName: restaurant.name,
    restaurantAddress: restaurant.address,
    adminName: admin.name,
    periodLabel,
    generatedAt: new Date(),
    summary: { total, present, absent, late, onTime, halfDay, avgWorkingHours, totalOvertimeHours: fmt(totalOTHrs) },
    records,
  };
}

// ─── Excel Generation ─────────────────────────────────────────────────────────

const NAVY = "1A3C5E";
const NAVY_MID = "2D5F8A";
const LIGHT_BLUE = "EBF3FB";
const WHITE = "FFFFFF";
const GRAY_ROW = "F5F8FB";
const BORDER_COLOR = "DDDDDD";

const STATUS_COLORS: Record<string, string> = {
  present: "16A34A",
  absent: "DC2626",
  late: "D97706",
  "short-leave": "7C3AED",
};

type HAlign = "left" | "center" | "right" | "fill" | "justify" | "centerContinuous" | "distributed";

function applyCell(
  cell: ExcelJS.Cell,
  bg: string,
  fontColor: string,
  bold = false,
  align: HAlign = "left",
  fontSize = 10
): void {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${bg}` } };
  cell.font = { bold, size: fontSize, color: { argb: `FF${fontColor}` }, name: "Calibri" };
  cell.alignment = { horizontal: align, vertical: "middle", wrapText: false };
  cell.border = {
    top: { style: "thin", color: { argb: `FF${BORDER_COLOR}` } },
    left: { style: "thin", color: { argb: `FF${BORDER_COLOR}` } },
    bottom: { style: "thin", color: { argb: `FF${BORDER_COLOR}` } },
    right: { style: "thin", color: { argb: `FF${BORDER_COLOR}` } },
  };
}

export async function generateExcelBuffer(data: ExportReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "DineFlow";
  wb.created = data.generatedAt;

  const ws = wb.addWorksheet("Attendance Report", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    properties: { defaultRowHeight: 20 },
  });

  // Column widths (11 cols: A–K)
  ws.columns = [
    { key: "a", width: 6 },
    { key: "b", width: 24 },
    { key: "c", width: 14 },
    { key: "d", width: 14 },
    { key: "e", width: 11 },
    { key: "f", width: 11 },
    { key: "g", width: 10 },
    { key: "h", width: 11 },
    { key: "i", width: 9 },
    { key: "j", width: 10 },
    { key: "k", width: 14 },
  ];

  const LAST = "K";
  const TOTAL_COLS = 11;

  const addMergedRow = (
    text: string,
    bg: string,
    fontColor: string,
    fontSize: number,
    height: number,
    bold = true,
    align: HAlign = "center"
  ): number => {
    const row = ws.addRow([text]);
    const rn = row.number;
    ws.mergeCells(`A${rn}:${LAST}${rn}`);
    row.height = height;
    const cell = ws.getCell(`A${rn}`);
    cell.value = text;
    applyCell(cell, bg, fontColor, bold, align, fontSize);
    cell.border = { bottom: { style: "thin", color: { argb: `FF${BORDER_COLOR}` } } };
    return rn;
  };

  // ── Title rows ──
  addMergedRow("DineFlow Restaurant Management System", NAVY, WHITE, 14, 28, true, "center");
  addMergedRow("Staff Attendance Report", NAVY_MID, WHITE, 12, 24, true, "center");

  // ── Restaurant / Period info row ──
  const infoRow = ws.addRow([
    `Restaurant: ${data.restaurantName}`,
    null, null, null, null, null,
    `Address: ${data.restaurantAddress}`,
    null, null, null, null,
  ]);
  ws.mergeCells(`A${infoRow.number}:F${infoRow.number}`);
  ws.mergeCells(`G${infoRow.number}:${LAST}${infoRow.number}`);
  infoRow.height = 20;
  [ws.getCell(`A${infoRow.number}`), ws.getCell(`G${infoRow.number}`)].forEach((cell) => {
    applyCell(cell, LIGHT_BLUE, NAVY, false, "left", 10);
  });

  const metaRow = ws.addRow([
    `Report Period: ${data.periodLabel}`,
    null, null, null,
    `Generated By: ${data.adminName}`,
    null, null,
    `Generated: ${data.generatedAt.toLocaleString()}`,
    null, null, null,
  ]);
  ws.mergeCells(`A${metaRow.number}:D${metaRow.number}`);
  ws.mergeCells(`E${metaRow.number}:G${metaRow.number}`);
  ws.mergeCells(`H${metaRow.number}:${LAST}${metaRow.number}`);
  metaRow.height = 20;
  [`A${metaRow.number}`, `E${metaRow.number}`, `H${metaRow.number}`].forEach((addr) => {
    applyCell(ws.getCell(addr), LIGHT_BLUE, "444444", false, "left", 9);
  });

  // ── Spacer ──
  ws.addRow([]).height = 6;

  // ── Summary header ──
  addMergedRow("ATTENDANCE SUMMARY", LIGHT_BLUE, NAVY, 10, 22, true, "left");

  // Summary grid: pairs of [label, value] across 6 columns (2 cols per pair, 3 pairs per row)
  const summaryPairs = [
    ["Total Records", data.summary.total],
    ["Present", data.summary.present],
    ["Absent", data.summary.absent],
    ["Late", data.summary.late],
    ["On Time", data.summary.onTime],
    ["Half Day", data.summary.halfDay],
    ["Avg Working Hours", `${data.summary.avgWorkingHours} h`],
    ["Total Overtime", `${data.summary.totalOvertimeHours} h`],
  ];

  for (let i = 0; i < summaryPairs.length; i += 2) {
    const pair1 = summaryPairs[i];
    const pair2 = summaryPairs[i + 1] || ["", ""];
    const row = ws.addRow([pair1[0], pair1[1], "", pair2[0], pair2[1], "", "", "", "", "", ""]);
    row.height = 20;

    // Style each cell manually
    for (let col = 1; col <= TOTAL_COLS; col++) {
      const cell = row.getCell(col);
      const isLabelCol = col === 1 || col === 4;
      const isValueCol = col === 2 || col === 5;
      if (isLabelCol) {
        applyCell(cell, LIGHT_BLUE, NAVY, true, "left", 10);
      } else if (isValueCol) {
        applyCell(cell, WHITE, "1A3C5E", false, "left", 10);
      } else {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FFFFFFFF` } };
      }
    }
  }

  // ── Spacer ──
  ws.addRow([]).height = 6;

  // ── Column headers ──
  const COL_LABELS = ["#", "Employee Name", "Role", "Date", "Check In", "Check Out", "Break (h)", "Working (h)", "OT (h)", "Late (min)", "Status"];
  const headerRow = ws.addRow(COL_LABELS);
  const headerRowNum = headerRow.number;
  headerRow.height = 24;
  headerRow.eachCell((cell, col) => {
    cell.value = COL_LABELS[col - 1];
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${NAVY}` } };
    cell.font = { bold: true, size: 10, color: { argb: `FF${WHITE}` }, name: "Calibri" };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFFFFFFF" } },
      left: { style: "thin", color: { argb: "FF2D5F8A" } },
      bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
      right: { style: "thin", color: { argb: "FF2D5F8A" } },
    };
  });

  // Freeze pane below header row
  ws.views = [{ state: "frozen", ySplit: headerRowNum, activeCell: `A${headerRowNum + 1}` }];

  // ── Data rows ──
  data.records.forEach((rec, idx) => {
    const isEven = idx % 2 === 0;
    const rowBg = isEven ? WHITE : GRAY_ROW;
    const statusHex = STATUS_COLORS[rec.status] || "333333";

    const dataRow = ws.addRow([
      rec.no,
      rec.employeeName,
      rec.role,
      rec.date,
      rec.checkIn,
      rec.checkOut,
      rec.breakHours,
      rec.workingHours,
      rec.overtimeHours,
      rec.lateMinutes > 0 ? rec.lateMinutes : "-",
      rec.status.toUpperCase().replace("-", " "),
    ]);
    dataRow.height = 19;

    dataRow.eachCell({ includeEmpty: true }, (cell, col) => {
      const isStatus = col === 11;
      const isNumber = col >= 7 && col <= 10;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${rowBg}` } };
      cell.font = {
        size: 10,
        name: "Calibri",
        bold: isStatus,
        color: { argb: isStatus ? `FF${statusHex}` : "FF333333" },
      };
      cell.alignment = {
        horizontal: col === 1 || isNumber || isStatus ? "center" : "left",
        vertical: "middle",
      };
      cell.border = {
        top: { style: "thin", color: { argb: `FF${BORDER_COLOR}` } },
        left: { style: "thin", color: { argb: `FF${BORDER_COLOR}` } },
        bottom: { style: "thin", color: { argb: `FF${BORDER_COLOR}` } },
        right: { style: "thin", color: { argb: `FF${BORDER_COLOR}` } },
      };
    });
  });

  // ── Footer row ──
  const footerText = `DineFlow Attendance Report  •  ${data.records.length} records  •  Period: ${data.periodLabel}  •  Generated: ${data.generatedAt.toLocaleString()}`;
  addMergedRow(footerText, NAVY, WHITE, 9, 20, false, "center");

  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

// ─── PDF Generation ───────────────────────────────────────────────────────────

const PDF_MARGIN = 40;
const PDF_PAGE_W = 841.89; // A4 landscape
const PDF_PAGE_H = 595.28;
const PDF_USABLE_W = PDF_PAGE_W - PDF_MARGIN * 2;

interface PdfCol {
  label: string;
  width: number;
  align: "left" | "center" | "right";
}

const PDF_COLS: PdfCol[] = [
  { label: "#", width: 25, align: "center" },
  { label: "Employee Name", width: 145, align: "left" },
  { label: "Role", width: 75, align: "left" },
  { label: "Date", width: 80, align: "center" },
  { label: "Check In", width: 65, align: "center" },
  { label: "Check Out", width: 65, align: "center" },
  { label: "Break(h)", width: 50, align: "center" },
  { label: "Work(h)", width: 55, align: "center" },
  { label: "OT(h)", width: 48, align: "center" },
  { label: "Late(m)", width: 52, align: "center" },
  { label: "Status", width: 80, align: "center" },
];

const PDF_STATUS_COLORS: Record<string, string> = {
  present: "#16A34A",
  absent: "#DC2626",
  late: "#D97706",
  "short-leave": "#7C3AED",
};

export async function generatePdfBuffer(data: ExportReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: { top: PDF_MARGIN, bottom: PDF_MARGIN, left: PDF_MARGIN, right: PDF_MARGIN },
      bufferPages: true,
      info: {
        Title: "DineFlow Attendance Report",
        Author: data.adminName,
        Creator: "DineFlow Restaurant Management System",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let currentY = PDF_MARGIN;

    // ── Helper: draw horizontal rule ──
    const hRule = (y: number, color = "#E5E7EB") => {
      doc.save().moveTo(PDF_MARGIN, y).lineTo(PDF_PAGE_W - PDF_MARGIN, y).strokeColor(color).lineWidth(0.5).stroke().restore();
    };

    // ── Helper: draw filled rect ──
    const fillRect = (x: number, y: number, w: number, h: number, color: string) => {
      doc.save().rect(x, y, w, h).fill(color).restore();
    };

    // ── Helper: draw text clipped to width ──
    const drawCell = (
      text: string,
      x: number,
      y: number,
      w: number,
      h: number,
      opts: { align?: "left" | "center" | "right"; color?: string; bold?: boolean; size?: number } = {}
    ) => {
      const pad = 4;
      doc.save()
        .fillColor(opts.color || "#333333")
        .font(opts.bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(opts.size || 8)
        .text(text, x + pad, y + (h - (opts.size || 8)) / 2, {
          width: w - pad * 2,
          align: opts.align || "left",
          lineBreak: false,
          ellipsis: true,
        })
        .restore();
    };

    // ── Page 1: Header ──
    // Dark navy banner
    fillRect(PDF_MARGIN, currentY, PDF_USABLE_W, 72, "#1A3C5E");

    // Logo / brand text
    doc.save().fillColor("#F59E0B").font("Helvetica-Bold").fontSize(9).text("DINEFLOW", PDF_MARGIN + 12, currentY + 10).restore();

    doc.save().fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(18)
      .text("Attendance Report", PDF_MARGIN + 12, currentY + 24).restore();

    doc.save().fillColor("#93C5FD").font("Helvetica").fontSize(8)
      .text(data.restaurantName, PDF_MARGIN + 12, currentY + 50).restore();

    // Right side: period / meta
    const rightX = PDF_PAGE_W - PDF_MARGIN - 220;
    doc.save().fillColor("#BFDBFE").font("Helvetica").fontSize(8).text("REPORT PERIOD", rightX, currentY + 10, { width: 220, align: "right" }).restore();
    doc.save().fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8).text(data.periodLabel, rightX, currentY + 24, { width: 220, align: "right" }).restore();
    doc.save().fillColor("#93C5FD").font("Helvetica").fontSize(7)
      .text(`Generated by: ${data.adminName}  |  ${data.generatedAt.toLocaleString()}`, rightX, currentY + 48, { width: 220, align: "right" })
      .restore();

    currentY += 82;

    // ── Summary section ──
    const summaryCards = [
      { label: "Total Records", value: String(data.summary.total), color: "#1A3C5E", textColor: "#FFFFFF" },
      { label: "Present", value: String(data.summary.present), color: "#15803D", textColor: "#FFFFFF" },
      { label: "Absent", value: String(data.summary.absent), color: "#B91C1C", textColor: "#FFFFFF" },
      { label: "Late", value: String(data.summary.late), color: "#B45309", textColor: "#FFFFFF" },
      { label: "On Time", value: String(data.summary.onTime), color: "#1D4ED8", textColor: "#FFFFFF" },
      { label: "Half Day", value: String(data.summary.halfDay), color: "#6D28D9", textColor: "#FFFFFF" },
      { label: "Avg Work Hrs", value: `${data.summary.avgWorkingHours}h`, color: "#0F766E", textColor: "#FFFFFF" },
      { label: "Total OT Hrs", value: `${data.summary.totalOvertimeHours}h`, color: "#C2410C", textColor: "#FFFFFF" },
    ];

    const cardW = Math.floor(PDF_USABLE_W / summaryCards.length) - 4;
    let cardX = PDF_MARGIN;

    summaryCards.forEach((card) => {
      fillRect(cardX, currentY, cardW, 46, card.color);
      doc.save().fillColor(card.textColor).font("Helvetica-Bold").fontSize(16)
        .text(card.value, cardX, currentY + 8, { width: cardW, align: "center" }).restore();
      doc.save().fillColor(card.textColor).font("Helvetica").fontSize(7)
        .text(card.label, cardX, currentY + 30, { width: cardW, align: "center" }).restore();
      cardX += cardW + 4;
    });

    currentY += 54;

    // ── Simple bar chart: attendance distribution ──
    fillRect(PDF_MARGIN, currentY, PDF_USABLE_W, 1, "#E5E7EB");
    currentY += 8;

    const total = data.summary.total || 1;
    const chartW = PDF_USABLE_W * 0.55;
    const barH = 12;
    const barGap = 6;
    const barData = [
      { label: "Present", count: data.summary.present, color: "#16A34A" },
      { label: "Absent", count: data.summary.absent, color: "#DC2626" },
      { label: "Late", count: data.summary.late, color: "#D97706" },
      { label: "Half Day", count: data.summary.halfDay, color: "#7C3AED" },
    ];

    doc.save().fillColor("#6B7280").font("Helvetica-Bold").fontSize(7)
      .text("ATTENDANCE DISTRIBUTION", PDF_MARGIN, currentY).restore();
    currentY += 10;

    barData.forEach((b) => {
      const pct = b.count / total;
      const barFill = Math.max(4, chartW * pct);
      fillRect(PDF_MARGIN, currentY, chartW, barH, "#F3F4F6");
      fillRect(PDF_MARGIN, currentY, barFill, barH, b.color);
      doc.save().fillColor("#374151").font("Helvetica").fontSize(7)
        .text(`${b.label}  ${b.count} (${Math.round(pct * 100)}%)`, PDF_MARGIN + chartW + 6, currentY + 2)
        .restore();
      currentY += barH + barGap;
    });

    currentY += 4;
    hRule(currentY);
    currentY += 8;

    // ── Table: draw header ──
    const TABLE_ROW_H = 18;
    const TABLE_HEADER_H = 22;

    const drawTableHeader = (y: number) => {
      fillRect(PDF_MARGIN, y, PDF_USABLE_W, TABLE_HEADER_H, "#1A3C5E");
      let x = PDF_MARGIN;
      PDF_COLS.forEach((col) => {
        drawCell(col.label, x, y, col.width, TABLE_HEADER_H, { align: col.align, color: "#FFFFFF", bold: true, size: 7.5 });
        x += col.width;
      });
      return y + TABLE_HEADER_H;
    };

    const drawTableRow = (rec: AttendanceRecordRow, y: number, even: boolean) => {
      fillRect(PDF_MARGIN, y, PDF_USABLE_W, TABLE_ROW_H, even ? "#FFFFFF" : "#F5F8FB");
      const statusColor = PDF_STATUS_COLORS[rec.status] || "#374151";
      const cells = [
        { value: String(rec.no), col: PDF_COLS[0] },
        { value: rec.employeeName, col: PDF_COLS[1] },
        { value: rec.role, col: PDF_COLS[2] },
        { value: rec.date, col: PDF_COLS[3] },
        { value: rec.checkIn, col: PDF_COLS[4] },
        { value: rec.checkOut, col: PDF_COLS[5] },
        { value: rec.breakHours, col: PDF_COLS[6] },
        { value: rec.workingHours, col: PDF_COLS[7] },
        { value: rec.overtimeHours, col: PDF_COLS[8] },
        { value: rec.lateMinutes > 0 ? String(rec.lateMinutes) : "-", col: PDF_COLS[9] },
        { value: rec.status.toUpperCase().replace("-", " "), col: PDF_COLS[10], color: statusColor, bold: true },
      ];
      let x = PDF_MARGIN;
      cells.forEach((c) => {
        drawCell(c.value, x, y, c.col.width, TABLE_ROW_H, {
          align: c.col.align,
          color: (c as { color?: string }).color,
          bold: (c as { bold?: boolean }).bold,
          size: 7.5,
        });
        x += c.col.width;
      });
      // Row border
      doc.save().rect(PDF_MARGIN, y, PDF_USABLE_W, TABLE_ROW_H).strokeColor("#E5E7EB").lineWidth(0.3).stroke().restore();
    };

    const drawPageFooter = (pageNum: number) => {
      const fy = PDF_PAGE_H - PDF_MARGIN + 4;
      hRule(fy - 6, "#1A3C5E");
      doc.save().fillColor("#6B7280").font("Helvetica").fontSize(7)
        .text("DineFlow Restaurant Management System  •  Attendance Report  •  CONFIDENTIAL", PDF_MARGIN, fy, { width: PDF_USABLE_W - 60, align: "left" })
        .restore();
      doc.save().fillColor("#6B7280").font("Helvetica").fontSize(7)
        .text(`Page ${pageNum}`, PDF_PAGE_W - PDF_MARGIN - 60, fy, { width: 60, align: "right" })
        .restore();
    };

    // Draw initial table header
    currentY = drawTableHeader(currentY);

    let pageNum = 1;
    drawPageFooter(pageNum);

    // Draw each record row
    data.records.forEach((rec, idx) => {
      const rowBottom = currentY + TABLE_ROW_H;
      const bottomLimit = PDF_PAGE_H - PDF_MARGIN - 20;

      if (rowBottom > bottomLimit) {
        doc.addPage({ size: "A4", layout: "landscape", margins: { top: PDF_MARGIN, bottom: PDF_MARGIN, left: PDF_MARGIN, right: PDF_MARGIN } });
        pageNum += 1;
        currentY = PDF_MARGIN;
        currentY = drawTableHeader(currentY);
        drawPageFooter(pageNum);
      }

      drawTableRow(rec, currentY, idx % 2 === 0);
      currentY += TABLE_ROW_H;
    });

    // Final footer on last data page
    if (data.records.length === 0) {
      doc.save().fillColor("#6B7280").font("Helvetica").fontSize(9)
        .text("No attendance records found for the selected criteria.", PDF_MARGIN, currentY + 10)
        .restore();
    }

    doc.end();
  });
}
