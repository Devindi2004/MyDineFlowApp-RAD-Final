import { Request, Response, NextFunction } from "express";
import { Inventory } from "../models/Inventory";
import { AuthRequest } from "../middleware/auth";
import { sendSuccess, sendError } from "../utils/response";

export async function getInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { restaurantId } = req.query as { restaurantId?: string };
    const filter: Record<string, unknown> = {};
    if (restaurantId) filter.restaurantId = restaurantId;

    const items = await Inventory.find(filter).sort({ itemName: 1 });
    sendSuccess(res, items);
  } catch (err) {
    next(err);
  }
}

export async function getInventoryAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { restaurantId } = req.query as { restaurantId?: string };
    const filter: Record<string, unknown> = {};
    if (restaurantId) filter.restaurantId = restaurantId;

    // Return items where quantity <= lowStockLimit
    const items = await Inventory.find({
      ...filter,
      $expr: { $lte: ["$quantity", "$lowStockLimit"] },
    }).sort({ quantity: 1 });

    const alerts = items.map((item) => ({
      id: String(item._id),
      item: item.itemName,
      name: item.itemName,
      stock: item.quantity,
      currentStock: item.quantity,
      threshold: item.lowStockLimit,
      unit: item.unit,
      severity: item.quantity <= Math.max(1, item.lowStockLimit / 2) ? "critical" : "low",
    }));

    sendSuccess(res, alerts);
  } catch (err) {
    next(err);
  }
}

export async function createInventoryItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await Inventory.create({
      ...req.body,
      restaurantId: req.body.restaurantId ?? req.user?.restaurantId,
    });
    sendSuccess(res, item, "Inventory item created.", 201);
  } catch (err) {
    next(err);
  }
}

export async function updateInventoryItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) {
      sendError(res, "Inventory item not found.", 404);
      return;
    }
    sendSuccess(res, item, "Inventory item updated.");
  } catch (err) {
    next(err);
  }
}

export async function deleteInventoryItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) {
      sendError(res, "Inventory item not found.", 404);
      return;
    }
    sendSuccess(res, null, "Inventory item deleted.");
  } catch (err) {
    next(err);
  }
}
