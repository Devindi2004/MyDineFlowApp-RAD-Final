import { Schema, model, models, type HydratedDocument, type Model } from "mongoose";

export type OrderStatus = "pending" | "preparing" | "ready" | "served" | "cancelled";

export type OrderDocument = {
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  restaurantId: string;
  customerId: string;
  tableId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderHydratedDocument = HydratedDocument<OrderDocument>;

const orderSchema = new Schema<OrderDocument>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "preparing", "ready", "served", "cancelled"],
      default: "pending",
      index: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
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

export const OrderModel =
  (models.Order as Model<OrderDocument> | undefined) ??
  model<OrderDocument>("Order", orderSchema);
