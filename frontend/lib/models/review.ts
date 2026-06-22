import { Schema, model, models, type HydratedDocument, type Model } from "mongoose";

export type ReviewDocument = {
  rating: number;
  comment?: string;
  customerId: string;
  orderId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ReviewHydratedDocument = HydratedDocument<ReviewDocument>;

const reviewSchema = new Schema<ReviewDocument>(
  {
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1200,
    },
    customerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
      ref: "User",
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

export const ReviewModel =
  (models.Review as Model<ReviewDocument> | undefined) ??
  model<ReviewDocument>("Review", reviewSchema);
