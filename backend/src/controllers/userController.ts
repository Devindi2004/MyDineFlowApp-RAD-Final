import { Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { AuthRequest } from "../middleware/auth";
import { createAttendanceQrPayload } from "./attendanceController";
import { User, UserRole } from "../models/User";
import { sendSuccess, sendError } from "../utils/response";

const staffRoles: UserRole[] = ["admin", "waiter", "chef", "staff", "kitchen"];

function optionalText(value?: string): string | undefined {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function publicUser(user: InstanceType<typeof User>) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    whatsappNumber: user.whatsappNumber,
    role: user.role,
    salaryType: user.salaryType,
    monthlySalary: user.monthlySalary,
    dailyRate: user.dailyRate,
    hourlyRate: user.hourlyRate,
    overtimeRate: user.overtimeRate,
    attendanceQrPayload: staffRoles.includes(user.role) && user.role !== "admin" ? createAttendanceQrPayload(user) : undefined,
    attendanceStatus: user.attendanceStatus,
    restaurantId: user.restaurantId ? String(user.restaurantId) : undefined,
    loyaltyPoints: user.loyaltyPoints,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
  };
}

export async function listUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { role, restaurantId } = req.query as { role?: UserRole; restaurantId?: string };
    const filter: Record<string, unknown> = {};

    if (role) filter.role = role;
    if (restaurantId) filter.restaurantId = restaurantId;
    else if (req.user?.restaurantId) filter.restaurantId = req.user.restaurantId;

    const users = await User.find(filter).sort({ createdAt: -1 });
    sendSuccess(res, users.map(publicUser));
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password, phone, whatsappNumber, role, restaurantId, salaryType = "monthly", monthlySalary = 0, dailyRate = 0, hourlyRate = 0, overtimeRate = 0, attendancePin } = req.body as {
      name: string;
      email: string;
      password: string;
      phone?: string;
      whatsappNumber?: string;
      role: UserRole;
      restaurantId?: string;
      salaryType?: "monthly" | "hourly";
      monthlySalary?: number;
      dailyRate?: number;
      hourlyRate?: number;
      overtimeRate?: number;
      attendancePin?: string;
    };

    if (!staffRoles.includes(role)) {
      sendError(res, "Admins can create admin, waiter, chef, staff, or kitchen users only.", 400);
      return;
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      sendError(res, "Email is already registered.", 409);
      return;
    }

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      phone: optionalText(phone),
      whatsappNumber: optionalText(whatsappNumber),
      role,
      salaryType,
      monthlySalary: Number(monthlySalary || 0),
      dailyRate: Number(dailyRate || 0),
      hourlyRate: Number(hourlyRate || 0),
      overtimeRate: Number(overtimeRate || 0),
      attendancePin: optionalText(attendancePin),
      restaurantId: restaurantId ?? req.user?.restaurantId,
      password: await bcrypt.hash(password, 12),
      isEmailVerified: true,
    });

    sendSuccess(res, publicUser(user), "User created.", 201);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const update = { ...req.body };
    if (update.password) {
      update.password = await bcrypt.hash(String(update.password), 12);
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!user) {
      sendError(res, "User not found.", 404);
      return;
    }

    sendSuccess(res, publicUser(user), "User updated.");
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      sendError(res, "User not found.", 404);
      return;
    }

    sendSuccess(res, null, "User deleted.");
  } catch (err) {
    next(err);
  }
}
