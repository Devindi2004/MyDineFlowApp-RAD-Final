import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { jwtConfig } from "../config/jwt";
import { AuthRequest } from "../middleware/auth";
import { Restaurant } from "../models/Restaurant";
import { StaffAttendance } from "../models/StaffAttendance";
import { User } from "../models/User";
import { sendSuccess, sendError } from "../utils/response";

const attendanceRoles = ["waiter", "chef", "staff", "kitchen"];

function monthFromDate(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function dateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDaysInMonth(month: string): number {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(year, monthIndex, 0).getDate();
}

function calculateWorkedHours(startTime?: string, endTime?: string, breakHours = 0): number {
  if (!startTime || !endTime) return 0;
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const start = startHour + startMinute / 60;
  let end = endHour + endMinute / 60;
  if (end < start) end += 24;
  return Math.max(0, Math.round((end - start - Number(breakHours || 0)) * 100) / 100);
}

function calculateHoursBetween(start?: Date, end?: Date): number {
  if (!start || !end) return 0;
  return Math.max(0, Math.round(((end.getTime() - start.getTime()) / 36e5) * 100) / 100);
}

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function validateAttendanceLocation(
  restaurantId?: unknown,
  latitude?: number,
  longitude?: number
): Promise<{ ok: boolean; distance?: number; message?: string }> {
  if (latitude === undefined || longitude === undefined) return { ok: true };
  if (!restaurantId) return { ok: true };

  const restaurant = await Restaurant.findById(restaurantId).lean();
  if (restaurant?.attendanceLatitude === undefined || restaurant?.attendanceLongitude === undefined) return { ok: true };

  const distance = distanceMeters(latitude, longitude, restaurant.attendanceLatitude, restaurant.attendanceLongitude);
  const radius = Number(restaurant.attendanceRadiusMeters || 100);
  if (distance > radius) {
    return { ok: false, distance, message: `Attendance can only be marked within ${radius}m of the restaurant.` };
  }
  return { ok: true, distance };
}

export function createAttendanceQrPayload(staff: InstanceType<typeof User>): string {
  const token = jwt.sign(
    {
      sub: String(staff._id),
      purpose: "attendance-qr",
      restaurantId: staff.restaurantId ? String(staff.restaurantId) : undefined,
    },
    jwtConfig.accessSecret,
    { expiresIn: "365d" }
  );
  return `DINEFLOW_ATTENDANCE:${token}`;
}

function normalizeAttendanceQrPayload(payload: string): string {
  const text = String(payload || "").trim();
  if (!text) return "";

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "string") return normalizeAttendanceQrPayload(parsed);
    if (parsed?.qrPayload) return normalizeAttendanceQrPayload(String(parsed.qrPayload));
    if (parsed?.attendanceQrPayload) return normalizeAttendanceQrPayload(String(parsed.attendanceQrPayload));
  } catch {
    // Plain QR strings are expected most of the time.
  }

  try {
    const url = new URL(text);
    const qrParam = url.searchParams.get("qr") || url.searchParams.get("qrPayload") || url.searchParams.get("attendanceQrPayload") || url.searchParams.get("token");
    if (qrParam) return normalizeAttendanceQrPayload(qrParam);
  } catch {
    // Not a URL.
  }

  return text;
}

function parseAttendanceQrPayload(payload: string): { staffId: string; restaurantId?: string } | null {
  const normalized = normalizeAttendanceQrPayload(payload);
  const token = normalized.startsWith("DINEFLOW_ATTENDANCE:") ? normalized.replace("DINEFLOW_ATTENDANCE:", "") : normalized;
  try {
    const decoded = jwt.verify(token, jwtConfig.accessSecret) as { sub: string; purpose?: string; restaurantId?: string };
    if (decoded.purpose !== "attendance-qr" || !decoded.sub) return null;
    return { staffId: decoded.sub, restaurantId: decoded.restaurantId };
  } catch {
    return null;
  }
}

async function findStaffByCode(staffCode?: string) {
  const code = String(staffCode || "").trim();
  if (!code) return null;
  const filters: Record<string, unknown>[] = [{ email: code.toLowerCase() }];
  if (mongoose.Types.ObjectId.isValid(code)) filters.push({ _id: code });
  return User.findOne({ role: { $in: attendanceRoles }, $or: filters }).select("+attendancePin");
}

async function toggleStaffAttendance(
  staff: InstanceType<typeof User>,
  userRestaurantId?: string,
  options: { method?: "manual" | "qr" | "gps" | "qr-gps"; latitude?: number; longitude?: number; action?: "check-in" | "check-out" } = {}
) {
  const now = new Date();
  const today = dateOnly(now);
  const restaurantId = staff.restaurantId ?? userRestaurantId;
  const location = await validateAttendanceLocation(restaurantId, options.latitude, options.longitude);
  if (!location.ok) {
    return { error: location.message || "Attendance location is outside the allowed radius." };
  }

  const existing = await StaffAttendance.findOne({ staffId: staff._id, date: today });
  if (options.action === "check-in" && existing?.checkInTime && !existing.checkOutTime) {
    return { error: "This staff member is already checked in." };
  }
  if (options.action === "check-out" && (!existing?.checkInTime || existing.checkOutTime)) {
    return { error: "This staff member must check in before checking out." };
  }
  if (existing?.checkInTime && !existing.checkOutTime) {
    const workingHours = calculateHoursBetween(existing.checkInTime, now);
    existing.checkOutTime = now;
    existing.endTime = now.toTimeString().slice(0, 5);
    existing.workingHours = workingHours;
    existing.workedHours = workingHours;
    existing.overtimeHours = Math.max(0, workingHours - 8);
    existing.method = options.method || existing.method || "qr";
    existing.latitude = options.latitude;
    existing.longitude = options.longitude;
    existing.distanceMeters = location.distance;
    await existing.save();
    await User.findByIdAndUpdate(staff._id, { attendanceStatus: "checked-out" });
    return { record: existing, action: "checked-out" };
  }

  const status = now.getHours() >= 10 ? "late" : "present";
  const record = await StaffAttendance.findOneAndUpdate(
    { staffId: staff._id, date: today },
    {
      staffId: staff._id,
      staffName: staff.name,
      staffRole: staff.role,
      date: today,
      month: monthFromDate(today),
      status,
      checkInTime: now,
      startTime: now.toTimeString().slice(0, 5),
      method: options.method || "qr",
      latitude: options.latitude,
      longitude: options.longitude,
      distanceMeters: location.distance,
      restaurantId,
    },
    { new: true, upsert: true, runValidators: true }
  );
  await User.findByIdAndUpdate(staff._id, { attendanceStatus: "checked-in" });
  return { record, action: "checked-in" };
}

async function buildAttendanceSummary(staffId: string, month: string) {
  const records = await StaffAttendance.find({ staffId, month }).sort({ date: -1 }).lean();
  const absentDays = records.filter((record) => record.status === "absent").length;
  const shortLeaveHours = records.reduce((sum, record) => sum + Number(record.shortLeaveHours || 0), 0);
  const workedHours = records.reduce((sum, record) => sum + Number(record.workingHours || record.workedHours || 0), 0);
  const overtimeHours = records.reduce((sum, record) => sum + Number(record.overtimeHours || 0), 0);
  const presentDays = records.filter((record) => ["present", "late", "short-leave"].includes(record.status)).length;

  return {
    month,
    workingDays: getDaysInMonth(month),
    presentDays,
    absentDays,
    shortLeaveHours,
    workedHours,
    totalWorkingHours: workedHours,
    overtimeHours,
    records,
  };
}

export async function listAttendance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { staffId, month, range } = req.query as { staffId?: string; month?: string; range?: string };
    const filter: Record<string, unknown> = {};

    if (req.user?.restaurantId) filter.restaurantId = req.user.restaurantId;
    if (staffId) filter.staffId = staffId;
    if (month) filter.month = month;
    if (range === "daily") filter.date = dateOnly(new Date());
    if (range === "weekly") {
      const now = new Date();
      const weekStart = dateOnly(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
      filter.date = { $gte: weekStart };
    }

    const records = await StaffAttendance.find(filter).sort({ date: -1, staffName: 1 }).lean();
    sendSuccess(res, records);
  } catch (err) {
    next(err);
  }
}

export async function getAttendanceSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { staffId, month } = req.query as { staffId?: string; month?: string };
    if (!staffId || !month) {
      sendError(res, "Staff member and month are required.", 400);
      return;
    }

    const summary = await buildAttendanceSummary(staffId, month);
    sendSuccess(res, summary);
  } catch (err) {
    next(err);
  }
}

export async function upsertAttendance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { staffId, date, status, startTime, endTime, breakHours = 0, shortLeaveHours = 0, notes } = req.body as {
      staffId?: string;
      date?: string;
      status?: "present" | "absent" | "late" | "short-leave";
      startTime?: string;
      endTime?: string;
      breakHours?: number;
      shortLeaveHours?: number;
      notes?: string;
    };

    const staff = await User.findById(staffId);
    if (!staff || !attendanceRoles.includes(staff.role)) {
      sendError(res, "Select a valid staff member for attendance.", 400);
      return;
    }

    const restaurantId = staff.restaurantId ?? req.user?.restaurantId;
    if (req.user?.restaurantId && String(restaurantId) !== req.user.restaurantId) {
      sendError(res, "Selected staff member does not belong to your restaurant.", 403);
      return;
    }

    const attendanceDate = new Date(String(date));
    const month = monthFromDate(attendanceDate);
    const workedHours = status === "absent" ? 0 : calculateWorkedHours(startTime, endTime, Number(breakHours || 0));
    const overtimeHours = Math.max(0, workedHours - 8);
    const record = await StaffAttendance.findOneAndUpdate(
      { staffId: staff._id, date: dateOnly(attendanceDate) },
      {
        staffId: staff._id,
        staffName: staff.name,
        staffRole: staff.role,
        date: dateOnly(attendanceDate),
        month,
        status,
        startTime: status === "absent" ? undefined : startTime,
        endTime: status === "absent" ? undefined : endTime,
        breakHours: status === "absent" ? 0 : Number(breakHours || 0),
        workedHours,
        workingHours: workedHours,
        overtimeHours,
        shortLeaveHours: status === "short-leave" ? Number(shortLeaveHours || 0) : 0,
        notes,
        restaurantId,
      },
      { new: true, upsert: true, runValidators: true }
    );

    sendSuccess(res, record, "Attendance saved.", 201);
  } catch (err) {
    next(err);
  }
}

export async function checkIn(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user || !attendanceRoles.includes(req.user.role)) {
      sendError(res, "Only staff can check in.", 403);
      return;
    }

    const staff = await User.findById(req.user.id);
    if (!staff) {
      sendError(res, "Staff member not found.", 404);
      return;
    }

    const { latitude, longitude } = req.body as { latitude?: number; longitude?: number };
    const result = await toggleStaffAttendance(staff, req.user.restaurantId, {
      method: latitude !== undefined && longitude !== undefined ? "gps" : "manual",
      latitude,
      longitude,
    });
    if (result.error) {
      sendError(res, result.error, 403);
      return;
    }
    sendSuccess(res, result.record, result.action === "checked-out" ? "Checked out." : "Checked in.");
  } catch (err) {
    next(err);
  }
}

export async function checkOut(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user || !attendanceRoles.includes(req.user.role)) {
      sendError(res, "Only staff can check out.", 403);
      return;
    }

    const staff = await User.findById(req.user.id);
    if (!staff) {
      sendError(res, "Staff member not found.", 404);
      return;
    }

    const { latitude, longitude } = req.body as { latitude?: number; longitude?: number };
    const record = await StaffAttendance.findOne({ staffId: req.user.id, date: dateOnly(new Date()) });
    if (!record?.checkInTime || record.checkOutTime) {
      sendError(res, "Check in before checking out.", 400);
      return;
    }

    const result = await toggleStaffAttendance(staff, req.user.restaurantId, {
      method: latitude !== undefined && longitude !== undefined ? "gps" : "manual",
      latitude,
      longitude,
    });
    if (result.error) {
      sendError(res, result.error, 403);
      return;
    }
    sendSuccess(res, result.record, "Checked out.");
  } catch (err) {
    next(err);
  }
}

export async function getMyAttendance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, "Not authenticated.", 401);
      return;
    }
    const records = await StaffAttendance.find({ staffId: req.user.id }).sort({ date: -1 }).limit(30).lean();
    sendSuccess(res, records);
  } catch (err) {
    next(err);
  }
}

export async function getMyAttendanceQr(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user || !attendanceRoles.includes(req.user.role)) {
      sendError(res, "Only staff can generate attendance QR codes.", 403);
      return;
    }

    const staff = await User.findById(req.user.id);
    if (!staff) {
      sendError(res, "Staff member not found.", 404);
      return;
    }

    sendSuccess(res, {
      staffId: String(staff._id),
      staffName: staff.name,
      role: staff.role,
      qrPayload: createAttendanceQrPayload(staff),
    });
  } catch (err) {
    next(err);
  }
}

export async function scanAttendanceQr(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user || !attendanceRoles.includes(req.user.role)) {
      sendError(res, "Only staff can mark attendance.", 403);
      return;
    }

    const { qrPayload, latitude, longitude } = req.body as { qrPayload?: string; latitude?: number; longitude?: number };
    if (!qrPayload) {
      sendError(res, "Attendance QR payload is required.", 400);
      return;
    }

    const parsed = parseAttendanceQrPayload(qrPayload);
    if (!parsed || parsed.staffId !== req.user.id) {
      sendError(res, "Invalid attendance QR code for this staff member.", 400);
      return;
    }

    const staff = await User.findById(req.user.id);
    if (!staff) {
      sendError(res, "Staff member not found.", 404);
      return;
    }

    const result = await toggleStaffAttendance(staff, req.user.restaurantId, {
      method: latitude !== undefined && longitude !== undefined ? "qr-gps" : "qr",
      latitude,
      longitude,
    });
    if (result.error) {
      sendError(res, result.error, 403);
      return;
    }

    sendSuccess(res, result.record, result.action === "checked-out" ? "Checked out from QR." : "Checked in from QR.");
  } catch (err) {
    next(err);
  }
}

export async function kioskAttendanceStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { qrPayload } = req.body as { qrPayload?: string };
    let staff: any = null;

    const parsed = qrPayload ? parseAttendanceQrPayload(qrPayload) : null;
    if (!parsed) {
      sendError(res, "Scan a valid staff attendance QR code.", 400);
      return;
    }
    staff = await User.findById(parsed.staffId).select("+attendancePin");

    if (!staff || !attendanceRoles.includes(staff.role)) {
      sendError(res, "Staff member not found.", 404);
      return;
    }

    const today = dateOnly(new Date());
    const record = await StaffAttendance.findOne({ staffId: staff._id, date: today }).lean();
    sendSuccess(res, {
      staff: { id: String(staff._id), name: staff.name, role: staff.role },
      record,
      status: record?.checkInTime && !record.checkOutTime ? "checked-in" : record?.checkOutTime ? "checked-out" : "not-marked",
    });
  } catch (err) {
    next(err);
  }
}

export async function kioskAttendanceLog(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { qrPayload } = req.body as { qrPayload?: string };
    const parsed = qrPayload ? parseAttendanceQrPayload(qrPayload) : null;
    if (!parsed) {
      sendError(res, "Scan a valid staff attendance QR code.", 400);
      return;
    }

    const staff = await User.findById(parsed.staffId).lean();
    if (!staff || !attendanceRoles.includes(staff.role)) {
      sendError(res, "Staff member not found.", 404);
      return;
    }

    const records = await StaffAttendance.find({ staffId: staff._id }).sort({ date: -1, createdAt: -1 }).limit(30).lean();
    sendSuccess(res, {
      staff: { id: String(staff._id), name: staff.name, role: staff.role },
      records,
    });
  } catch (err) {
    next(err);
  }
}

export async function kioskMarkAttendance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { qrPayload, latitude, longitude, action } = req.body as {
      qrPayload?: string;
      latitude?: number;
      longitude?: number;
      action?: "check-in" | "check-out";
    };
    let staff: any = null;
    let method: "manual" | "qr" | "gps" | "qr-gps" = latitude !== undefined && longitude !== undefined ? "qr-gps" : "qr";

    const parsed = qrPayload ? parseAttendanceQrPayload(qrPayload) : null;
    if (!parsed) {
      sendError(res, "Scan a valid staff attendance QR code.", 400);
      return;
    }
    staff = await User.findById(parsed.staffId).select("+attendancePin");

    if (!staff || !attendanceRoles.includes(staff.role)) {
      sendError(res, "Staff member not found.", 404);
      return;
    }

    const result = await toggleStaffAttendance(staff, staff.restaurantId ? String(staff.restaurantId) : undefined, { method, latitude, longitude, action });
    if (result.error) {
      sendError(res, result.error, 403);
      return;
    }

    sendSuccess(res, {
      staff: { id: String(staff._id), name: staff.name, role: staff.role },
      record: result.record,
      action: result.action,
    }, result.action === "checked-out" ? "Checked out." : "Checked in.");
  } catch (err) {
    next(err);
  }
}

export async function deleteAttendance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const record = await StaffAttendance.findByIdAndDelete(req.params.id);
    if (!record) {
      sendError(res, "Attendance record not found.", 404);
      return;
    }

    sendSuccess(res, null, "Attendance deleted.");
  } catch (err) {
    next(err);
  }
}
