import mongoose, { Document, Schema } from "mongoose";

export interface IInventory extends Document {
  itemName: string;
  quantity: number;
  unit: string;
  lowStockLimit: number;
  dailyUsageEstimate: number;
  restaurantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inventorySchema = new Schema<IInventory>(
  {
    itemName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
    lowStockLimit: { type: Number, required: true, min: 0 },
    dailyUsageEstimate: { type: Number, default: 0, min: 0 },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
  },
  { timestamps: true }
);

inventorySchema.index({ restaurantId: 1 });

export const Inventory = mongoose.model<IInventory>("Inventory", inventorySchema);
