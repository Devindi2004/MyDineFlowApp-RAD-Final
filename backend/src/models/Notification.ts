import mongoose, { Document, Schema } from "mongoose";

export type NotificationAudience = "admin" | "waiter" | "kitchen" | "customer";

export interface INotification extends Document {
  title: string;
  message: string;
  audience: NotificationAudience;
  restaurantId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    audience: {
      type: String,
      enum: ["admin", "waiter", "kitchen", "customer"],
      required: true,
    },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant" },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ audience: 1, restaurantId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

export const Notification = mongoose.model<INotification>("Notification", notificationSchema);
