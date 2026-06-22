import { Schema, model, models, type HydratedDocument, type Model } from "mongoose";

export type RestaurantDocument = {
  name: string;
  address: string;
  phone: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type RestaurantHydratedDocument = HydratedDocument<RestaurantDocument>;

const restaurantSchema = new Schema<RestaurantDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    ownerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export const RestaurantModel =
  (models.Restaurant as Model<RestaurantDocument> | undefined) ??
  model<RestaurantDocument>("Restaurant", restaurantSchema);
