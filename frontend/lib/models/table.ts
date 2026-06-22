import { Schema, models, model, type HydratedDocument, type Model } from "mongoose";
import type { DiningTable } from "@/types/table";

export type DiningTableDocument = Omit<
  DiningTable,
  "id" | "createdAt" | "updatedAt" | "qrCodeUrl"
> & {
  createdAt: Date;
  updatedAt: Date;
};

export type DiningTableHydratedDocument =
  HydratedDocument<DiningTableDocument>;

const diningTableSchema = new Schema<DiningTableDocument>(
  {
    tableNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 30,
    },
    isOccupied: {
      type: Boolean,
      default: false,
    },
    restaurantId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

diningTableSchema.index(
  { restaurantId: 1, tableNumber: 1 },
  { unique: true }
);

export const DiningTableModel =
  (models.DiningTable as Model<DiningTableDocument> | undefined) ??
  model<DiningTableDocument>("DiningTable", diningTableSchema);
