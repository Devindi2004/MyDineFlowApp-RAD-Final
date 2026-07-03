import mongoose from "mongoose";
import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { StaffAttendance } from "../models/StaffAttendance";
import { Restaurant } from "../models/Restaurant";
import { User } from "../models/User";
import { AttendanceReportHistory } from "../models/AttendanceReportHistory";
import { buildReportData, generateExcelBuffer, generatePdfBuffer } from "../services/attendanceExportService";
import { sendError } from "../utils/response";

const ALLOWED_FORMATS = ["xlsx", "pdf"] as const;
const ALLOWED_STATUSES = ["present", "absent", "late", "short-leave"] as const;
const ALLOWED_ROLES = ["waiter", "chef", "staff", "kitchen"] as const;

export async function exportAttendanceReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { format, startDate, endDate, role, employeeId, status } = req.body as {
      format?: string;
      startDate?: string;
      endDate?: string;
      role?: string;
      employeeId?: string;
      status?: string;
    };

    // ── Validate format ──
    if (!format || !ALLOWED_FORMATS.includes(format as typeof ALLOWED_FORMATS[number])) {
      sendError(res, "Invalid format. Allowed: xlsx, pdf.", 400);
      return;
    }

    // ── Validate dates ──
    if (!startDate || !endDate) {
      sendError(res, "startDate and endDate are required.", 400);
      return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      sendError(res, "Invalid date format.", 400);
      return;
    }
    if (start > end) {
      sendError(res, "startDate must be before or equal to endDate.", 400);
      return;
    }

    // ── Validate optional filters ──
    if (role && !ALLOWED_ROLES.includes(role as typeof ALLOWED_ROLES[number])) {
      sendError(res, "Invalid role filter.", 400);
      return;
    }
    if (status && !ALLOWED_STATUSES.includes(status as typeof ALLOWED_STATUSES[number])) {
      sendError(res, "Invalid status filter.", 400);
      return;
    }
    if (employeeId && !mongoose.Types.ObjectId.isValid(employeeId)) {
      sendError(res, "Invalid employeeId.", 400);
      return;
    }

    // ── Build MongoDB filter ──
    const filter: Record<string, unknown> = {
      date: { $gte: start, $lte: end },
    };
    if (req.user?.restaurantId) filter.restaurantId = req.user.restaurantId;
    if (role) filter.staffRole = role;
    if (employeeId) filter.staffId = new mongoose.Types.ObjectId(employeeId);
    if (status) filter.status = status;

    // ── Query attendance records ──
    const rawRecords = await StaffAttendance.find(filter)
      .sort({ date: 1, staffName: 1 })
      .lean();

    // ── Fetch supporting data ──
    const [restaurant, admin] = await Promise.all([
      req.user?.restaurantId ? Restaurant.findById(req.user.restaurantId).lean() : null,
      User.findById(req.user?.id).lean(),
    ]);

    const restaurantInfo = {
      name: restaurant?.name ?? "DineFlow Restaurant",
      address: restaurant?.address ?? "N/A",
    };
    const adminInfo = {
      name: admin?.name ?? req.user?.email ?? "Admin",
    };

    // ── Build report data ──
    const reportData = buildReportData(rawRecords as unknown as Parameters<typeof buildReportData>[0], restaurantInfo, adminInfo, { startDate: start, endDate: end });

    // ── Generate file buffer ──
    const dateStr = start.toISOString().slice(0, 10);
    let fileBuffer: Buffer;
    let contentType: string;
    let fileName: string;

    if (format === "xlsx") {
      fileBuffer = await generateExcelBuffer(reportData);
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      fileName = `Attendance_Report_${dateStr}.xlsx`;
    } else {
      fileBuffer = await generatePdfBuffer(reportData);
      contentType = "application/pdf";
      fileName = `Attendance_Report_${dateStr}.pdf`;
    }

    // ── Save export history (fire-and-forget, don't block response) ──
    AttendanceReportHistory.create({
      adminId: req.user?.id,
      adminName: admin?.name ?? "Admin",
      adminEmail: req.user?.email ?? "",
      format,
      startDate: start,
      endDate: end,
      filters: {
        role: role || undefined,
        employeeId: employeeId || undefined,
        status: status || undefined,
      },
      recordCount: rawRecords.length,
      ipAddress: req.ip ?? (req.socket?.remoteAddress ?? "unknown"),
      restaurantId: req.user?.restaurantId,
    }).catch(() => {
      // History save failure should not block the download
    });

    // ── Send file ──
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", fileBuffer.length);
    res.setHeader("X-Report-Records", String(rawRecords.length));
    res.send(fileBuffer);
  } catch (err) {
    next(err);
  }
}
