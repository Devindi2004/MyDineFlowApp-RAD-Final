import mongoose, { Document, Schema } from "mongoose";

export interface IPayment extends Document {
  amount: number;
  status: "pending" | "paid" | "failed";
  paymentMethod: "cash" | "card" | "payhere";
  orderId: mongoose.Types.ObjectId;
  transactionId?: string;
  payhereData?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    paymentMethod: { type: String, enum: ["cash", "card", "payhere"], required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    transactionId: { type: String },
    payhereData: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

paymentSchema.index({ orderId: 1 });

export const Payment = mongoose.model<IPayment>("Payment", paymentSchema);
