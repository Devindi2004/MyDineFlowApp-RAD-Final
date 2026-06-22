import mongoose, { Document, Schema } from "mongoose";

export interface IReview extends Document {
  rating: number;
  comment: string;
  customerId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
  },
  { timestamps: true }
);

reviewSchema.index({ restaurantId: 1 });
reviewSchema.index({ customerId: 1 });

export const Review = mongoose.model<IReview>("Review", reviewSchema);
