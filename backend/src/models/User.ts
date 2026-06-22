import mongoose, { Document, Schema } from "mongoose";

export type UserRole = "customer" | "waiter" | "chef" | "staff" | "kitchen" | "admin";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  whatsappNumber?: string;
  role: UserRole;
  address?: string;
  salaryType: "monthly" | "hourly";
  monthlySalary: number;
  dailyRate: number;
  hourlyRate: number;
  overtimeRate: number;
  attendancePin?: string;
  attendanceStatus: "checked-out" | "checked-in";
  loyaltyPoints: number;
  restaurantId?: mongoose.Types.ObjectId;
  refreshTokenHash?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    whatsappNumber: { type: String, trim: true },
    role: {
      type: String,
      enum: ["customer", "waiter", "chef", "staff", "kitchen", "admin"],
      default: "customer",
    },
    address: { type: String, trim: true },
    salaryType: { type: String, enum: ["monthly", "hourly"], default: "monthly" },
    monthlySalary: { type: Number, default: 0, min: 0 },
    dailyRate: { type: Number, default: 0, min: 0 },
    hourlyRate: { type: Number, default: 0, min: 0 },
    overtimeRate: { type: Number, default: 0, min: 0 },
    attendancePin: { type: String, trim: true, select: false },
    attendanceStatus: { type: String, enum: ["checked-out", "checked-in"], default: "checked-out" },
    loyaltyPoints: { type: Number, default: 0 },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant" },
    refreshTokenHash: { type: String, select: false },
    isEmailVerified: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });

export const User = mongoose.model<IUser>("User", userSchema);
