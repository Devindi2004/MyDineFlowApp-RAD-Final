import { Schema, model, models, type HydratedDocument, type Model } from "mongoose";

export type LoyaltyDocument = {
  customerId: string;
  points: number;
  tier: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LoyaltyHydratedDocument = HydratedDocument<LoyaltyDocument>;

const loyaltySchema = new Schema<LoyaltyDocument>(
  {
    customerId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      ref: "User",
    },
    points: {
      type: Number,
      default: 0,
      min: 0,
    },
    tier: {
      type: String,
      default: "Bronze",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const LoyaltyModel =
  (models.Loyalty as Model<LoyaltyDocument> | undefined) ??
  model<LoyaltyDocument>("Loyalty", loyaltySchema);
