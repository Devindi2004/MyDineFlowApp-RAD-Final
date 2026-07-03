import mongoose, { Document, Schema } from "mongoose";

export interface IAttendanceReportHistory extends Document {
  adminId: mongoose.Types.ObjectId;
  adminName: string;
  adminEmail: string;
  format: "xlsx" | "pdf";
  startDate: Date;
  endDate: Date;
  filters: {
    role?: string;
    employeeId?: string;
    status?: string;
  };
  recordCount: number;
  ipAddress?: string;
  restaurantId?: mongoose.Types.ObjectId;
  exportedAt: Date;
}

const attendanceReportHistorySchema = new Schema<IAttendanceReportHistory>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    adminName: { type: String, required: true, trim: true },
    adminEmail: { type: String, required: true, trim: true },
    format: { type: String, enum: ["xlsx", "pdf"], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    filters: {
      role: { type: String, trim: true },
      employeeId: { type: String, trim: true },
      status: { type: String, trim: true },
    },
    recordCount: { type: Number, default: 0, min: 0 },
    ipAddress: { type: String, trim: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant" },
    exportedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

attendanceReportHistorySchema.index({ adminId: 1, exportedAt: -1 });
attendanceReportHistorySchema.index({ restaurantId: 1, exportedAt: -1 });

export const AttendanceReportHistory = mongoose.model<IAttendanceReportHistory>(
  "AttendanceReportHistory",
  attendanceReportHistorySchema
);
