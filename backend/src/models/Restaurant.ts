import mongoose, { Document, Schema } from "mongoose";

export interface IRestaurant extends Document {
  name: string;
  address: string;
  phone: string;
  ownerId: mongoose.Types.ObjectId;
  attendanceLatitude?: number;
  attendanceLongitude?: number;
  attendanceRadiusMeters: number;
  createdAt: Date;
  updatedAt: Date;
}

const restaurantSchema = new Schema<IRestaurant>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    attendanceLatitude: { type: Number },
    attendanceLongitude: { type: Number },
    attendanceRadiusMeters: { type: Number, default: 100, min: 1 },
  },
  { timestamps: true }
);

export const Restaurant = mongoose.model<IRestaurant>("Restaurant", restaurantSchema);
