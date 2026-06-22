import mongoose, { Document, Schema } from "mongoose";

export type PayrollStatus = "pending" | "paid" | "cancelled";

export interface IStaffPayroll extends Document {
  staffId: mongoose.Types.ObjectId;
  staffName: string;
  staffRole: string;
  month: string;
  presentDays: number;
  totalHours: number;
  overtimeHours: number;
  basicSalary: number;
  overtimeAmount: number;
  baseSalary: number;
  allowances: number;
  deductions: number;
  totalAmount: number;
  status: PayrollStatus;
  paidAt?: Date;
  whatsappRecipient?: string;
  whatsappSentAt?: Date;
  whatsappMessageId?: string;
  whatsappError?: string;
  whatsappFallbackUrl?: string;
  notes?: string;
  restaurantId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const staffPayrollSchema = new Schema<IStaffPayroll>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    staffName: { type: String, required: true, trim: true },
    staffRole: { type: String, required: true, trim: true },
    month: { type: String, required: true, trim: true },
    presentDays: { type: Number, default: 0, min: 0 },
    totalHours: { type: Number, default: 0, min: 0 },
    overtimeHours: { type: Number, default: 0, min: 0 },
    basicSalary: { type: Number, default: 0, min: 0 },
    overtimeAmount: { type: Number, default: 0, min: 0 },
    baseSalary: { type: Number, required: true, min: 0 },
    allowances: { type: Number, default: 0, min: 0 },
    deductions: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["pending", "paid", "cancelled"], default: "pending" },
    paidAt: { type: Date },
    whatsappRecipient: { type: String, trim: true },
    whatsappSentAt: { type: Date },
    whatsappMessageId: { type: String, trim: true },
    whatsappError: { type: String, trim: true },
    whatsappFallbackUrl: { type: String, trim: true },
    notes: { type: String, trim: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant" },
  },
  { timestamps: true }
);

staffPayrollSchema.index({ restaurantId: 1, month: 1 });
staffPayrollSchema.index({ staffId: 1, month: 1 });

export const StaffPayroll = mongoose.model<IStaffPayroll>("StaffPayroll", staffPayrollSchema);
