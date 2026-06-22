import { Schema, model, models, type HydratedDocument, type Model } from "mongoose";

export type OrderItemDocument = {
  quantity: number;
  specialInstructions?: string;
  orderId: string;
  menuItemId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderItemHydratedDocument = HydratedDocument<OrderItemDocument>;

const orderItemSchema = new Schema<OrderItemDocument>(
  {
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    specialInstructions: {
      type: String,
      trim: true,
    },
    orderId: {
      type: String,
      required: true,
      trim: true,
      index: true,
      ref: "Order",
    },
    menuItemId: {
      type: String,
      required: true,
      trim: true,
      index: true,
      ref: "MenuItem",
    },
  },
  {
    timestamps: true,
  }
);

orderItemSchema.index({ orderId: 1, menuItemId: 1 });

export const OrderItemModel =
  (models.OrderItem as Model<OrderItemDocument> | undefined) ??
  model<OrderItemDocument>("OrderItem", orderItemSchema);
