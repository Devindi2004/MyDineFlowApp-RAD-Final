import { Request, Response, NextFunction } from "express";
import { Order } from "../models/Order";
import { MenuItem } from "../models/MenuItem";
import { Inventory } from "../models/Inventory";
import { AuthRequest } from "../middleware/auth";
import { sendSuccess } from "../utils/response";

function getDateRange(range: string): Date {
  const now = new Date();
  switch (range) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(0); // all time
  }
}

export async function getAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const range = (req.query.range as string) ?? "7d";
    const restaurantId = req.query.restaurantId as string | undefined;
    const since = getDateRange(range);

    const orderFilter: Record<string, unknown> = {
      createdAt: { $gte: since },
      status: { $ne: "cancelled" },
    };
    if (restaurantId) orderFilter.restaurantId = restaurantId;

    // Revenue and order count
    const [revenueAgg] = await Order.aggregate([
      { $match: orderFilter },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: "$totalAmount" },
        },
      },
    ]);

    const revenue = revenueAgg?.revenue ?? 0;
    const totalOrders = revenueAgg?.totalOrders ?? 0;
    const averageOrderValue = revenueAgg?.avgOrderValue ?? 0;

    // Revenue trend by day
    const chartData = await Order.aggregate([
      { $match: orderFilter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", revenue: 1, orders: 1, _id: 0 } },
    ]);

    // Top selling foods
    const topSellingFoods = await Order.aggregate([
      { $match: orderFilter },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.menuItem",
          name: { $first: "$items.name" },
          quantitySold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      { $sort: { quantitySold: -1 } },
      { $limit: 5 },
    ]);

    // Recent orders
    const recentOrders = await Order.find(restaurantId ? { restaurantId } : {})
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("customerId", "name")
      .lean();

    // Low stock alerts
    const lowStockFilter: Record<string, unknown> = {
      $expr: { $lte: ["$quantity", "$lowStockLimit"] },
    };
    if (restaurantId) lowStockFilter.restaurantId = restaurantId;

    const lowStockItems = await Inventory.find(lowStockFilter).limit(10).lean();

    const lowStockAlerts = lowStockItems.map((item) => ({
      name: item.itemName,
      stock: item.quantity,
      threshold: item.lowStockLimit,
      unit: item.unit,
    }));

    sendSuccess(res, {
      analytics: {
        revenue,
        totalOrders,
        averageOrderValue,
        chartData,
        topSellingFoods,
        recentOrders: recentOrders.map((o) => ({
          _id: o._id,
          orderNumber: o.orderNumber,
          status: o.status,
          totalAmount: o.totalAmount,
          tableNumber: o.tableNumber,
          customerName: o.customerName,
          customer: o.customerId,
          createdAt: o.createdAt,
        })),
        lowStockAlerts,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getSalesReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.query.restaurantId as string | undefined;
    const filter: Record<string, unknown> = { status: { $ne: "cancelled" } };
    if (restaurantId) filter.restaurantId = restaurantId;

    const salesByCategory = await Order.aggregate([
      { $match: filter },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "menuitems",
          localField: "items.menuItem",
          foreignField: "_id",
          as: "menuItemData",
        },
      },
      { $unwind: { path: "$menuItemData", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$menuItemData.category",
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          quantity: { $sum: "$items.quantity" },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    sendSuccess(res, { salesByCategory });
  } catch (err) {
    next(err);
  }
}

export async function getOrdersSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurantId = req.query.restaurantId as string | undefined;
    const filter: Record<string, unknown> = {};
    if (restaurantId) filter.restaurantId = restaurantId;

    const summary = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    sendSuccess(res, { summary });
  } catch (err) {
    next(err);
  }
}
