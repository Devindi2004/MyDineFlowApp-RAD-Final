import mongoose, { Document, Schema } from "mongoose";

export interface ILoyalty extends Document {
  customerId: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  points: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  lastEarnedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const loyaltySchema = new Schema<ILoyalty>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    points: { type: Number, default: 0, min: 0 },
    tier: {
      type: String,
      enum: ["bronze", "silver", "gold", "platinum"],
      default: "bronze",
    },
    lastEarnedAt: { type: Date },
  },
  { timestamps: true }
);

loyaltySchema.index({ customerId: 1, restaurantId: 1 }, { unique: true });

export const Loyalty = mongoose.model<ILoyalty>("Loyalty", loyaltySchema);
