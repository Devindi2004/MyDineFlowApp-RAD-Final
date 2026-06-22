import mongoose, { Document, Schema } from "mongoose";

export interface IReservation extends Document {
  date: Date;
  time: string;
  persons: number;
  status: "pending" | "confirmed" | "cancelled";
  restaurantId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  tableId?: mongoose.Types.ObjectId;
  customerName: string;
  contactNumber: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reservationSchema = new Schema<IReservation>(
  {
    date: { type: Date, required: true },
    time: { type: String, required: true },
    persons: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tableId: { type: Schema.Types.ObjectId, ref: "Table" },
    customerName: { type: String, required: true, trim: true },
    contactNumber: { type: String, required: true, trim: true },
    notes: { type: String },
  },
  { timestamps: true }
);

reservationSchema.index({ restaurantId: 1, date: 1 });
reservationSchema.index({ customerId: 1 });

export const Reservation = mongoose.model<IReservation>("Reservation", reservationSchema);
