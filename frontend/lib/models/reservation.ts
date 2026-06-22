import { Schema, model, models, type HydratedDocument, type Model } from "mongoose";

export type ReservationStatus = "pending" | "confirmed" | "seated" | "cancelled";

export type ReservationDocument = {
  date: Date;
  time: string;
  persons: number;
  status: ReservationStatus;
  restaurantId: string;
  customerId: string;
  tableId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ReservationHydratedDocument =
  HydratedDocument<ReservationDocument>;

const reservationSchema = new Schema<ReservationDocument>(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    time: {
      type: String,
      required: true,
      trim: true,
    },
    persons: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "seated", "cancelled"],
      default: "pending",
      index: true,
    },
    restaurantId: {
      type: String,
      required: true,
      trim: true,
      index: true,
      ref: "Restaurant",
    },
    customerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
      ref: "User",
    },
    tableId: {
      type: String,
      required: true,
      trim: true,
      index: true,
      ref: "DiningTable",
    },
  },
  {
    timestamps: true,
  }
);

export const ReservationModel =
  (models.Reservation as Model<ReservationDocument> | undefined) ??
  model<ReservationDocument>("Reservation", reservationSchema);
