import mongoose, { Document, Schema } from "mongoose";

export type AttendanceStatus = "present" | "absent" | "late" | "short-leave";

export interface IStaffAttendance extends Document {
  staffId: mongoose.Types.ObjectId;
  staffName: string;
  staffRole: string;
  date: Date;
  month: string;
  status: AttendanceStatus;
  checkInTime?: Date;
  checkOutTime?: Date;
  startTime?: string;
  endTime?: string;
  breakHours: number;
  workedHours: number;
  workingHours: number;
  overtimeHours: number;
  shortLeaveHours: number;
  method: "manual" | "qr" | "gps" | "qr-gps";
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  notes?: string;
  restaurantId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const staffAttendanceSchema = new Schema<IStaffAttendance>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    staffName: { type: String, required: true, trim: true },
    staffRole: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    month: { type: String, required: true, trim: true },
    status: { type: String, enum: ["present", "absent", "late", "short-leave"], required: true },
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    startTime: { type: String, trim: true },
    endTime: { type: String, trim: true },
    breakHours: { type: Number, default: 0, min: 0 },
    workedHours: { type: Number, default: 0, min: 0 },
    workingHours: { type: Number, default: 0, min: 0 },
    overtimeHours: { type: Number, default: 0, min: 0 },
    shortLeaveHours: { type: Number, default: 0, min: 0 },
    method: { type: String, enum: ["manual", "qr", "gps", "qr-gps"], default: "manual" },
    latitude: { type: Number },
    longitude: { type: Number },
    distanceMeters: { type: Number, min: 0 },
    notes: { type: String, trim: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant" },
  },
  { timestamps: true }
);

staffAttendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });
staffAttendanceSchema.index({ restaurantId: 1, month: 1 });

export const StaffAttendance = mongoose.model<IStaffAttendance>("StaffAttendance", staffAttendanceSchema);
