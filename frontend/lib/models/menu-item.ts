import { Schema, model, models, type HydratedDocument, type Model } from "mongoose";

export type MenuItemDocument = {
  name: string;
  price: number;
  category: string;
  isAvailable: boolean;
  restaurantId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type MenuItemHydratedDocument = HydratedDocument<MenuItemDocument>;

const menuItemSchema = new Schema<MenuItemDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    restaurantId: {
      type: String,
      required: true,
      trim: true,
      index: true,
      ref: "Restaurant",
    },
  },
  {
    timestamps: true,
  }
);

menuItemSchema.index({ restaurantId: 1, name: 1 }, { unique: true });

export const MenuItemModel =
  (models.MenuItem as Model<MenuItemDocument> | undefined) ??
  model<MenuItemDocument>("MenuItem", menuItemSchema);
