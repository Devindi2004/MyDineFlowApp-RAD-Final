import mongoose, { Document, Schema } from "mongoose";

export type MenuCategory = "Signature" | "Mains" | "Sri Lankan" | "Seafood" | "Desserts" | "Drinks";
export type SpiceLevel = "mild" | "medium" | "hot";
export type DietaryTag = "chef-pick" | "gluten-free" | "high-protein" | "signature" | "vegan" | "vegetarian";

export interface IMenuItem extends Document {
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  imageUrl: string;
  isAvailable: boolean;
  restaurantId: mongoose.Types.ObjectId;
  spiceLevel: SpiceLevel;
  tags: DietaryTag[];
  prepTime: number;
  calories: number;
  orderCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const menuItemSchema = new Schema<IMenuItem>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: ["Signature", "Mains", "Sri Lankan", "Seafood", "Desserts", "Drinks"],
      required: true,
    },
    imageUrl: { type: String, default: "" },
    isAvailable: { type: Boolean, default: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    spiceLevel: { type: String, enum: ["mild", "medium", "hot"], default: "mild" },
    tags: [{ type: String, enum: ["chef-pick", "gluten-free", "high-protein", "signature", "vegan", "vegetarian"] }],
    prepTime: { type: Number, default: 15 },
    calories: { type: Number, default: 0 },
    orderCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

menuItemSchema.index({ restaurantId: 1, category: 1 });
menuItemSchema.index({ name: "text", description: "text" });

export const MenuItem = mongoose.model<IMenuItem>("MenuItem", menuItemSchema);
