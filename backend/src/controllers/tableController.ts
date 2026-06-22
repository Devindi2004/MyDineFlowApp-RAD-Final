import { Request, Response, NextFunction } from "express";
import { Table } from "../models/Table";
import { AuthRequest } from "../middleware/auth";
import { sendSuccess, sendError } from "../utils/response";
import { Restaurant } from "../models/Restaurant";

async function generateNextTableNumber(restaurantId: unknown): Promise<string> {
  const tables = await Table.find({ restaurantId }).select("tableNumber").lean();
  const maxNumber = tables.reduce((max, table) => {
    const parsed = Number.parseInt(String(table.tableNumber).replace(/\D/g, ""), 10);
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
  }, 0);
  return String(maxNumber + 1).padStart(2, "0");
}

function tableQrUrl(tableId: unknown): string {
  return `${process.env.CLIENT_URL ?? "http://localhost:3000"}/customer/table/${tableId}`;
}

export async function getTables(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { restaurantId } = req.query as { restaurantId?: string };
    const filter: Record<string, unknown> = {};
    if (restaurantId) filter.restaurantId = restaurantId;

    const tables = await Table.find(filter).sort({ tableNumber: 1 });
    sendSuccess(res, tables);
  } catch (err) {
    next(err);
  }
}

export async function getTableById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) {
      sendError(res, "Table not found.", 404);
      return;
    }
    sendSuccess(res, table);
  } catch (err) {
    next(err);
  }
}

export async function createTable(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const fallbackRestaurant = req.user?.restaurantId
      ? undefined
      : await Restaurant.findOne().select("_id").lean();
    const restaurantId = req.body.restaurantId || req.user?.restaurantId || fallbackRestaurant?._id;

    if (!req.body.capacity || !restaurantId) {
      sendError(res, "Seat capacity and restaurant are required.", 400);
      return;
    }

    const tableNumber = req.body.tableNumber || await generateNextTableNumber(restaurantId);
    const table = await Table.create({ ...req.body, tableNumber, restaurantId });
    if (!table.qrCodeUrl) {
      table.qrCodeUrl = tableQrUrl(table._id);
      await table.save();
    }
    sendSuccess(res, table, "Table created.", 201);
  } catch (err) {
    next(err);
  }
}

export async function updateTable(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const table = await Table.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!table) {
      sendError(res, "Table not found.", 404);
      return;
    }
    sendSuccess(res, table, "Table updated.");
  } catch (err) {
    next(err);
  }
}

export async function deleteTable(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const table = await Table.findByIdAndDelete(req.params.id);
    if (!table) {
      sendError(res, "Table not found.", 404);
      return;
    }
    sendSuccess(res, null, "Table deleted.");
  } catch (err) {
    next(err);
  }
}
