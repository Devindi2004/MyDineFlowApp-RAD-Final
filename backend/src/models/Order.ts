import mongoose, { Document, Schema } from "mongoose";

export type OrderStatus = "pending" | "accepted" | "preparing" | "ready" | "served" | "completed" | "cancelled";
export type PaymentMethod = "cash" | "card" | "payhere";
export type PaymentStatus = "pending" | "paid" | "failed";

export interface IOrderItem {
  menuItem: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  restaurantId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  tableId?: mongoose.Types.ObjectId;
  tableNumber: string;
  customerName: string;
  contactNumber: string;
  specialInstructions?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  servedBy?: mongoose.Types.ObjectId;
  servedAt?: Date;
  items: IOrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    menuItem: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    specialInstructions: { type: String },
  },
  { _id: true }
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "preparing", "ready", "served", "completed", "cancelled"],
      default: "pending",
    },
    totalAmount: { type: Number, required: true, min: 0 },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User" },
    tableId: { type: Schema.Types.ObjectId, ref: "Table" },
    tableNumber: { type: String, default: "00" },
    customerName: { type: String, required: true, trim: true },
    contactNumber: { type: String, default: "" },
    specialInstructions: { type: String },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "payhere"],
      default: "cash",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    servedBy: { type: Schema.Types.ObjectId, ref: "User" },
    servedAt: { type: Date },
    items: [orderItemSchema],
  },
  { timestamps: true }
);

orderSchema.index({ restaurantId: 1, status: 1 });
orderSchema.index({ servedBy: 1, servedAt: -1 });
orderSchema.index({ customerId: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ createdAt: -1 });

export const Order = mongoose.model<IOrder>("Order", orderSchema);
