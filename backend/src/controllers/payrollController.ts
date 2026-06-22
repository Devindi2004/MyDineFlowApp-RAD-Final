import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { StaffAttendance } from "../models/StaffAttendance";
import { StaffPayroll } from "../models/StaffPayroll";
import { User } from "../models/User";
import { sendPayslipToWhatsApp } from "../services/whatsappService";
import { sendSuccess, sendError } from "../utils/response";

const payrollRoles = ["waiter", "chef", "staff", "kitchen"];

function calculateTotal(baseSalary = 0, allowances = 0, deductions = 0): number {
  return Math.max(0, Number(baseSalary) + Number(allowances || 0) - Number(deductions || 0));
}

function getDaysInMonth(month: string): number {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(year, monthIndex, 0).getDate();
}

function payrollNumbers(staff: InstanceType<typeof User>, attendance: Array<{ status: string; workingHours?: number; workedHours?: number; overtimeHours?: number }>, month: string) {
  const presentDays = attendance.filter((record) => ["present", "late", "short-leave"].includes(record.status)).length;
  const totalHours = Math.round(attendance.reduce((sum, record) => sum + Number(record.workingHours || record.workedHours || 0), 0) * 100) / 100;
  const overtimeHours = Math.round(attendance.reduce((sum, record) => sum + Number(record.overtimeHours || 0), 0) * 100) / 100;
  const workingDays = getDaysInMonth(month);
  const monthlySalary = Number(staff.monthlySalary || 0);
  const hourlyRate = Number(staff.hourlyRate || 0);
  const overtimeRate = Number(staff.overtimeRate || 0) || hourlyRate * 1.5;
  const basicSalary = staff.salaryType === "hourly"
    ? Math.round((hourlyRate * totalHours) * 100) / 100
    : Math.round(((monthlySalary / Math.max(1, workingDays)) * presentDays) * 100) / 100;
  const overtimeAmount = Math.round((overtimeHours * overtimeRate) * 100) / 100;

  return {
    presentDays,
    totalHours,
    overtimeHours,
    basicSalary,
    overtimeAmount,
    totalSalary: Math.round((basicSalary + overtimeAmount) * 100) / 100,
  };
}

function escapePdfText(value: unknown): string {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function moneyText(value = 0): string {
  return `LKR ${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function monthText(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(year, monthIndex - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function pdfText(text: unknown, x: number, y: number, size = 10, font = "F1", color = "0.12 0.10 0.07"): string {
  return `${color} rg BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`;
}

function pdfRect(x: number, y: number, width: number, height: number, color: string, stroke = ""): string {
  return `${color} rg ${stroke ? `${stroke} RG ` : ""}${x} ${y} ${width} ${height} re ${stroke ? "B" : "f"}`;
}

function pdfLine(x1: number, y1: number, x2: number, y2: number, color = "0.84 0.78 0.64", width = 1): string {
  return `${color} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`;
}

function createSimplePdf(commands: string[]): Buffer {
  const content = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 6 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf);
}

function createPayslipPdf(payroll: {
  _id?: unknown;
  staffId?: unknown;
  staffName: string;
  staffRole: string;
  month: string;
  presentDays: number;
  totalHours: number;
  overtimeHours: number;
  basicSalary: number;
  overtimeAmount: number;
  allowances?: number;
  deductions?: number;
  baseSalary?: number;
  totalAmount: number;
  status: string;
  paidAt?: Date;
  whatsappRecipient?: string;
  whatsappSentAt?: Date;
}, staff?: { email?: string; phone?: string; whatsappNumber?: string; salaryType?: string; monthlySalary?: number; dailyRate?: number; hourlyRate?: number; overtimeRate?: number }): Buffer {
  const issuedAt = new Date();
  const paidAt = payroll.paidAt ? new Date(payroll.paidAt) : undefined;
  const payrollId = String(payroll._id || "").slice(-8).toUpperCase() || "DINEFLOW";
  const staffId = String(payroll.staffId || "").slice(-8).toUpperCase() || "-";
  const netSalary = Number(payroll.totalAmount || 0);
  const grossPay = Number(payroll.basicSalary || 0) + Number(payroll.overtimeAmount || 0) + Number(payroll.allowances || 0);
  const commands = [
    pdfRect(0, 0, 595, 842, "1 0.972 0.882"),
    pdfRect(0, 770, 595, 72, "0.37 0.27 0.14"),
    pdfRect(36, 692, 523, 92, "1 1 1", "0.84 0.78 0.64"),
    pdfText("DineFlow", 48, 802, 24, "F2", "1 0.96 0.72"),
    pdfText("Restaurant Management", 50, 784, 10, "F1", "1 1 1"),
    pdfText("ADVANCED SALARY SLIP", 350, 806, 18, "F2", "1 1 1"),
    pdfText(`Slip No: PAY-${payrollId}`, 352, 786, 9, "F1", "1 0.96 0.72"),

    pdfText(payroll.staffName, 56, 744, 22, "F2", "0.03 0.22 0.16"),
    pdfText(`${payroll.staffRole.toUpperCase()} STAFF`, 58, 724, 10, "F2", "0.49 0.32 0.12"),
    pdfText(`Month: ${monthText(payroll.month)}`, 360, 748, 11, "F2", "0.12 0.10 0.07"),
    pdfText(`Status: ${payroll.status.toUpperCase()}`, 360, 730, 10, "F2", payroll.status === "paid" ? "0 0.48 0.32" : "0.70 0.42 0"),
    pdfText(`Generated: ${issuedAt.toLocaleString("en-US")}`, 360, 712, 9, "F1", "0.37 0.35 0.30"),

    pdfRect(36, 610, 250, 66, "0.91 0.97 0.94", "0.78 0.88 0.82"),
    pdfRect(309, 610, 250, 66, "1 0.985 0.92", "0.84 0.78 0.64"),
    pdfText("STAFF DETAILS", 50, 656, 10, "F2", "0 0.48 0.32"),
    pdfText(`Staff ID: ${staffId}`, 50, 638, 9),
    pdfText(`Email: ${staff?.email || "-"}`, 50, 622, 9),
    pdfText(`Phone: ${staff?.phone || "-"}`, 50, 606, 9),
    pdfText("SALARY PROFILE", 324, 656, 10, "F2", "0 0.48 0.32"),
    pdfText(`Type: ${staff?.salaryType || "monthly"}`, 324, 638, 9),
    pdfText(`Monthly: ${moneyText(staff?.monthlySalary || payroll.baseSalary || 0)}`, 324, 622, 9),
    pdfText(`Hourly: ${moneyText(staff?.hourlyRate || 0)} | OT: ${moneyText(staff?.overtimeRate || 0)}`, 324, 606, 9),

    pdfText("ATTENDANCE SUMMARY", 40, 574, 12, "F2", "0.03 0.22 0.16"),
    pdfLine(36, 562, 559, 562),
    pdfRect(36, 510, 120, 38, "1 1 1", "0.84 0.78 0.64"),
    pdfRect(167, 510, 120, 38, "1 1 1", "0.84 0.78 0.64"),
    pdfRect(298, 510, 120, 38, "1 1 1", "0.84 0.78 0.64"),
    pdfRect(429, 510, 130, 38, "1 1 1", "0.84 0.78 0.64"),
    pdfText("PRESENT DAYS", 48, 535, 8, "F2", "0.37 0.35 0.30"),
    pdfText(`${payroll.presentDays || 0}`, 48, 518, 13, "F2"),
    pdfText("TOTAL HOURS", 179, 535, 8, "F2", "0.37 0.35 0.30"),
    pdfText(`${Number(payroll.totalHours || 0).toFixed(2)}h`, 179, 518, 13, "F2"),
    pdfText("OVERTIME HOURS", 310, 535, 8, "F2", "0.37 0.35 0.30"),
    pdfText(`${Number(payroll.overtimeHours || 0).toFixed(2)}h`, 310, 518, 13, "F2"),
    pdfText("PAID DATE/TIME", 441, 535, 8, "F2", "0.37 0.35 0.30"),
    pdfText(paidAt ? paidAt.toLocaleString("en-US") : "Not paid yet", 441, 518, 9, "F2"),

    pdfText("EARNINGS", 40, 474, 12, "F2", "0.03 0.22 0.16"),
    pdfText("DEDUCTIONS", 326, 474, 12, "F2", "0.03 0.22 0.16"),
    pdfLine(36, 462, 270, 462),
    pdfLine(322, 462, 559, 462),
    pdfText("Basic salary", 44, 438, 10),
    pdfText(moneyText(payroll.basicSalary), 190, 438, 10, "F2"),
    pdfText("Overtime amount", 44, 414, 10),
    pdfText(moneyText(payroll.overtimeAmount), 190, 414, 10, "F2"),
    pdfText("Allowances", 44, 390, 10),
    pdfText(moneyText(payroll.allowances || 0), 190, 390, 10, "F2"),
    pdfText("Total earnings", 44, 358, 11, "F2", "0 0.48 0.32"),
    pdfText(moneyText(grossPay), 190, 358, 11, "F2", "0 0.48 0.32"),

    pdfText("Attendance / other deductions", 330, 438, 10),
    pdfText(moneyText(payroll.deductions || 0), 482, 438, 10, "F2"),
    pdfText("Loans / advances", 330, 414, 10),
    pdfText(moneyText(0), 482, 414, 10, "F2"),
    pdfText("Total deductions", 330, 358, 11, "F2", "0.76 0.16 0.12"),
    pdfText(moneyText(payroll.deductions || 0), 482, 358, 11, "F2", "0.76 0.16 0.12"),

    pdfRect(36, 260, 523, 68, "0.86 0.96 0.91", "0.60 0.86 0.72"),
    pdfText("NET SALARY PAID", 56, 300, 12, "F2", "0 0.48 0.32"),
    pdfText(moneyText(netSalary), 350, 292, 28, "F2", "0 0.48 0.32"),

    pdfText("PAYMENT & WHATSAPP DELIVERY", 40, 224, 12, "F2", "0.03 0.22 0.16"),
    pdfLine(36, 212, 559, 212),
    pdfText(`Payment status: ${payroll.status.toUpperCase()}`, 44, 190, 10),
    pdfText(`WhatsApp recipient: ${payroll.whatsappRecipient || staff?.whatsappNumber || staff?.phone || "-"}`, 44, 170, 10),
    pdfText(`WhatsApp sent: ${payroll.whatsappSentAt ? new Date(payroll.whatsappSentAt).toLocaleString("en-US") : "Pending / manual"}`, 44, 150, 10),
    pdfText("Prepared by DineFlow Payroll System", 44, 104, 10, "F2", "0.37 0.35 0.30"),
    pdfLine(380, 118, 540, 118, "0.37 0.35 0.30"),
    pdfText("Authorized signature", 402, 100, 9, "F1", "0.37 0.35 0.30"),
    pdfText("This is a computer generated salary slip.", 40, 52, 8, "F1", "0.50 0.47 0.40"),
  ];

  return createSimplePdf(commands);
}

async function sendPayrollPayslipDocument(payrollId: string) {
  const payroll = await StaffPayroll.findById(payrollId);
  if (!payroll) return null;

  const staff = await User.findById(payroll.staffId).lean();
  const staffWhatsAppNumber = staff?.whatsappNumber || staff?.phone || "";
  if (!staffWhatsAppNumber) {
    return StaffPayroll.findByIdAndUpdate(
      payroll._id,
      {
        whatsappRecipient: undefined,
        whatsappError: `Staff WhatsApp number is missing. Add a WhatsApp number for ${payroll.staffName} in Admin > Users.`,
        whatsappFallbackUrl: undefined,
      },
      { new: true, runValidators: true }
    );
  }

  const pdf = createPayslipPdf(payroll, staff || undefined);
  const whatsapp = await sendPayslipToWhatsApp({
    to: staffWhatsAppNumber,
    staffName: payroll.staffName,
    month: payroll.month,
    totalSalary: payroll.totalAmount,
    pdf,
  });

  return StaffPayroll.findByIdAndUpdate(
    payroll._id,
    whatsapp.messageId
      ? {
        whatsappRecipient: whatsapp.recipient,
        whatsappSentAt: new Date(),
        whatsappMessageId: whatsapp.messageId,
        whatsappError: undefined,
        whatsappFallbackUrl: undefined,
      }
      : {
        whatsappRecipient: whatsapp.recipient,
        whatsappError: whatsapp.error || "WhatsApp payslip was not sent.",
        whatsappFallbackUrl: whatsapp.fallbackUrl,
      },
    { new: true, runValidators: true }
  );
}

export async function listPayroll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month, status, role } = req.query as { month?: string; status?: string; role?: string };
    const filter: Record<string, unknown> = {};

    if (req.user?.restaurantId) filter.restaurantId = req.user.restaurantId;
    if (month) filter.month = month;
    if (status) filter.status = status;
    if (role) filter.staffRole = role;

    const payroll = await StaffPayroll.find(filter).sort({ month: -1, staffName: 1 }).lean();
    sendSuccess(res, payroll);
  } catch (err) {
    next(err);
  }
}

export async function createPayroll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { staffId, month, baseSalary, allowances = 0, deductions = 0, notes } = req.body as {
      staffId?: string;
      month?: string;
      baseSalary?: number;
      allowances?: number;
      deductions?: number;
      notes?: string;
    };

    const staff = await User.findById(staffId);
    if (!staff || !payrollRoles.includes(staff.role)) {
      sendError(res, "Select a valid staff member for payroll.", 400);
      return;
    }

    const restaurantId = staff.restaurantId ?? req.user?.restaurantId;
    if (req.user?.restaurantId && String(restaurantId) !== req.user.restaurantId) {
      sendError(res, "Selected staff member does not belong to your restaurant.", 403);
      return;
    }

    const payroll = await StaffPayroll.create({
      staffId: staff._id,
      staffName: staff.name,
      staffRole: staff.role,
      month,
      presentDays: 0,
      totalHours: 0,
      overtimeHours: 0,
      basicSalary: Number(baseSalary || 0),
      overtimeAmount: 0,
      baseSalary: Number(baseSalary || 0),
      allowances: Number(allowances || 0),
      deductions: Number(deductions || 0),
      totalAmount: calculateTotal(Number(baseSalary || 0), Number(allowances || 0), Number(deductions || 0)),
      notes,
      restaurantId,
    });

    sendSuccess(res, payroll, "Payroll record created.", 201);
  } catch (err) {
    next(err);
  }
}

export async function generatePayroll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month, staffId } = req.body as { month?: string; staffId?: string };
    if (!month) {
      sendError(res, "Payroll month is required.", 400);
      return;
    }

    const staffFilter: Record<string, unknown> = { role: { $in: payrollRoles } };
    if (staffId) staffFilter._id = staffId;
    if (req.user?.restaurantId) staffFilter.restaurantId = req.user.restaurantId;

    const staffMembers = await User.find(staffFilter);
    const records = [];
    for (const staff of staffMembers) {
      const attendance = await StaffAttendance.find({ staffId: staff._id, month }).lean();
      const numbers = payrollNumbers(staff, attendance, month);
      const payroll = await StaffPayroll.findOneAndUpdate(
        { staffId: staff._id, month },
        {
          staffId: staff._id,
          staffName: staff.name,
          staffRole: staff.role,
          month,
          presentDays: numbers.presentDays,
          totalHours: numbers.totalHours,
          overtimeHours: numbers.overtimeHours,
          basicSalary: numbers.basicSalary,
          overtimeAmount: numbers.overtimeAmount,
          baseSalary: Number(staff.monthlySalary || 0),
          allowances: 0,
          deductions: 0,
          totalAmount: numbers.totalSalary,
          restaurantId: staff.restaurantId ?? req.user?.restaurantId,
          notes: `Auto-generated from attendance for ${month}.`,
        },
        { new: true, upsert: true, runValidators: true }
      );
      records.push(payroll);
    }

    sendSuccess(res, records, "Payroll generated.");
  } catch (err) {
    next(err);
  }
}

export async function updatePayroll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await StaffPayroll.findById(req.params.id);
    if (!existing) {
      sendError(res, "Payroll record not found.", 404);
      return;
    }

    if (req.user?.restaurantId && existing.restaurantId && String(existing.restaurantId) !== req.user.restaurantId) {
      sendError(res, "Access denied.", 403);
      return;
    }

    const update = { ...req.body };
    const baseSalary = update.baseSalary ?? existing.baseSalary;
    const allowances = update.allowances ?? existing.allowances;
    const deductions = update.deductions ?? existing.deductions;
    update.totalAmount = calculateTotal(baseSalary, allowances, deductions);

    const payroll = await StaffPayroll.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    sendSuccess(res, payroll, "Payroll record updated.");
  } catch (err) {
    next(err);
  }
}

export async function markPayrollPaid(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await StaffPayroll.findById(req.params.id);
    if (!existing) {
      sendError(res, "Payroll record not found.", 404);
      return;
    }

    if (req.user?.restaurantId && existing.restaurantId && String(existing.restaurantId) !== req.user.restaurantId) {
      sendError(res, "Access denied.", 403);
      return;
    }

    let payroll = await StaffPayroll.findByIdAndUpdate(
      req.params.id,
      { status: "paid", paidAt: new Date(), whatsappError: undefined, whatsappFallbackUrl: undefined },
      { new: true, runValidators: true }
    );

    if (payroll) payroll = await sendPayrollPayslipDocument(String(payroll._id));

    sendSuccess(res, payroll, "Payroll marked as paid.");
  } catch (err) {
    next(err);
  }
}

export async function sendPayrollPayslip(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await StaffPayroll.findById(req.params.id);
    if (!existing) {
      sendError(res, "Payroll record not found.", 404);
      return;
    }

    if (req.user?.restaurantId && existing.restaurantId && String(existing.restaurantId) !== req.user.restaurantId) {
      sendError(res, "Access denied.", 403);
      return;
    }

    const payroll = await sendPayrollPayslipDocument(req.params.id);
    const message = payroll?.whatsappSentAt
      ? "Payslip PDF sent to staff WhatsApp."
      : payroll?.whatsappError || "WhatsApp payslip was not sent.";
    sendSuccess(res, payroll, message);
  } catch (err) {
    next(err);
  }
}

export async function deletePayroll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await StaffPayroll.findById(req.params.id);
    if (!existing) {
      sendError(res, "Payroll record not found.", 404);
      return;
    }

    if (req.user?.restaurantId && existing.restaurantId && String(existing.restaurantId) !== req.user.restaurantId) {
      sendError(res, "Access denied.", 403);
      return;
    }

    await StaffPayroll.findByIdAndDelete(req.params.id);
    sendSuccess(res, null, "Payroll record deleted.");
  } catch (err) {
    next(err);
  }
}

export async function downloadPayslip(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const payroll = await StaffPayroll.findById(req.params.id).lean();
    if (!payroll) {
      sendError(res, "Payroll record not found.", 404);
      return;
    }

    if (req.user?.restaurantId && payroll.restaurantId && String(payroll.restaurantId) !== req.user.restaurantId) {
      sendError(res, "Access denied.", 403);
      return;
    }

    const staff = await User.findById(payroll.staffId).lean();
    const pdf = createPayslipPdf(payroll, staff || undefined);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="payslip-${payroll.staffName}-${payroll.month}.pdf"`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
}
