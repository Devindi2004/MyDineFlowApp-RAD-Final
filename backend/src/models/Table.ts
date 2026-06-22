import mongoose, { Document, Schema } from "mongoose";

export interface ITable extends Document {
  tableNumber: string;
  capacity: number;
  isOccupied: boolean;
  serviceStatus: "available" | "seated" | "ordering" | "served" | "needs-cleaning";
  qrCodeUrl?: string;
  restaurantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const tableSchema = new Schema<ITable>(
  {
    tableNumber: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    isOccupied: { type: Boolean, default: false },
    serviceStatus: {
      type: String,
      enum: ["available", "seated", "ordering", "served", "needs-cleaning"],
      default: "available",
    },
    qrCodeUrl: { type: String, trim: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
  },
  { timestamps: true }
);

tableSchema.index({ restaurantId: 1, tableNumber: 1 }, { unique: true });

export const Table = mongoose.model<ITable>("Table", tableSchema);
