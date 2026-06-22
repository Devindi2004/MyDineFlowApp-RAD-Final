import { Request, Response, NextFunction } from "express";
import { MenuItem } from "../models/MenuItem";
import { AuthRequest } from "../middleware/auth";
import { sendSuccess, sendError } from "../utils/response";
import { Restaurant } from "../models/Restaurant";

export async function getMenuItems(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { restaurantId, category } = req.query as { restaurantId?: string; category?: string };

    const filter: Record<string, unknown> = {};
    if (restaurantId) filter.restaurantId = restaurantId;
    if (category && category !== "All") filter.category = category;

    const items = await MenuItem.find(filter).sort({ orderCount: -1, createdAt: -1 });
    sendSuccess(res, items);
  } catch (err) {
    next(err);
  }
}

export async function getMenuItemById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      sendError(res, "Menu item not found.", 404);
      return;
    }
    sendSuccess(res, item);
  } catch (err) {
    next(err);
  }
}

export async function createMenuItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const fallbackRestaurant = req.user?.restaurantId
      ? undefined
      : await Restaurant.findOne().select("_id").lean();
    const restaurantId = req.body.restaurantId || req.user?.restaurantId || fallbackRestaurant?._id;

    if (!req.body.name || !req.body.description || !req.body.price || !req.body.category || !restaurantId) {
      sendError(res, "Name, description, price, category, and restaurant are required.", 400);
      return;
    }

    const item = await MenuItem.create({ ...req.body, restaurantId });
    sendSuccess(res, item, "Menu item created.", 201);
  } catch (err) {
    next(err);
  }
}

export async function updateMenuItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) {
      sendError(res, "Menu item not found.", 404);
      return;
    }
    sendSuccess(res, item, "Menu item updated.");
  } catch (err) {
    next(err);
  }
}

export async function deleteMenuItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) {
      sendError(res, "Menu item not found.", 404);
      return;
    }
    sendSuccess(res, null, "Menu item deleted.");
  } catch (err) {
    next(err);
  }
}
