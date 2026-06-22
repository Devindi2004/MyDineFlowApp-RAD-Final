import { Schema, model, models, type HydratedDocument, type Model } from "mongoose";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PaymentMethod = "payhere" | "card" | "cash";

export type PaymentDocument = {
  amount: number;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  orderId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PaymentHydratedDocument = HydratedDocument<PaymentDocument>;

const paymentSchema = new Schema<PaymentDocument>(
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["payhere", "card", "cash"],
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
      ref: "Order",
    },
  },
  {
    timestamps: true,
  }
);

export const PaymentModel =
  (models.Payment as Model<PaymentDocument> | undefined) ??
  model<PaymentDocument>("Payment", paymentSchema);
