import { Request, Response, NextFunction } from "express";
import { Order } from "../models/Order";
import { MenuItem } from "../models/MenuItem";
import { AuthRequest } from "../middleware/auth";
import { sendSuccess, sendError } from "../utils/response";
import { generateOrderNumber } from "../utils/orderNumber";
import { getIO } from "../sockets/socketManager";
import { Notification } from "../models/Notification";

export async function getOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { restaurantId, status, customerId } = req.query as {
      restaurantId?: string;
      status?: string;
      customerId?: string;
    };

    const filter: Record<string, unknown> = {};

    // Customers can only see their own orders
    if (req.user?.role === "customer") {
      filter.customerId = req.user.id;
    } else {
      if (restaurantId) filter.restaurantId = restaurantId;
      else if (req.user?.restaurantId) filter.restaurantId = req.user.restaurantId;
      if (customerId) filter.customerId = customerId;
    }

    if (status) filter.status = status;
    if (req.user?.role === "waiter") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(todayStart.getDate() + 1);
      filter.$or = [
        { status: { $nin: ["served", "completed"] } },
        { status: { $in: ["served", "completed"] }, servedBy: req.user.id, servedAt: { $gte: todayStart, $lt: tomorrowStart } },
      ];
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("customerId", "name email")
      .populate("tableId", "tableNumber")
      .populate("servedBy", "name email");

    sendSuccess(res, orders);
  } catch (err) {
    next(err);
  }
}

export async function getOrderById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    // Support lookup by orderNumber or _id
    const order = await Order.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { orderNumber: id }],
    })
      .populate("customerId", "name email")
      .populate("tableId", "tableNumber");

    if (!order) {
      sendError(res, "Order not found.", 404);
      return;
    }

    // Customers can only view their own orders
    const orderCustomerId =
      typeof order.customerId === "object" && "_id" in order.customerId
        ? String(order.customerId._id)
        : String(order.customerId);

    if (req.user?.role === "customer" && orderCustomerId !== req.user.id) {
      sendError(res, "Access denied.", 403);
      return;
    }

    sendSuccess(res, order);
  } catch (err) {
    next(err);
  }
}

export async function createOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      customerName,
      contactNumber,
      tableNumber,
      specialInstructions,
      paymentMethod,
      totalAmount,
      items,
      restaurantId,
    } = req.body as {
      customerName: string;
      contactNumber: string;
      tableNumber: string;
      specialInstructions?: string;
      paymentMethod: string;
      totalAmount: number;
      items: Array<{ menuItem: string; quantity: number; price: number; specialInstructions?: string }>;
      restaurantId?: string;
    };

    // Resolve menu item names for order items
    const resolvedItems = await Promise.all(
      items.map(async (item) => {
        const menuItem = await MenuItem.findById(item.menuItem);
        return {
          menuItem: item.menuItem,
          name: menuItem?.name ?? "Menu item",
          quantity: item.quantity,
          price: item.price,
          specialInstructions: item.specialInstructions,
        };
      })
    );

    // Increment orderCount for each menu item
    await Promise.all(
      items.map((item) =>
        MenuItem.findByIdAndUpdate(item.menuItem, { $inc: { orderCount: item.quantity } })
      )
    );

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      customerName,
      contactNumber,
      tableNumber: tableNumber ?? "00",
      specialInstructions,
      paymentMethod: paymentMethod ?? "cash",
      totalAmount,
      items: resolvedItems,
      restaurantId: restaurantId ?? req.user?.restaurantId,
      customerId: req.user?.id,
      status: "pending",
      paymentStatus: "pending",
    });

    // Emit real-time event to kitchen
    const io = getIO();
    if (io) {
      io.to("kitchen").emit("order:new", order);
      io.to("kitchen").emit("kitchen:alert", order);
      io.to("admin").emit("order:new", order);
      io.to(`restaurant:${order.restaurantId}`).emit("order:new", order);
    }

    sendSuccess(res, order, "Order created.", 201);
  } catch (err) {
    next(err);
  }
}

export async function updateOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!order) {
      sendError(res, "Order not found.", 404);
      return;
    }

    const io = getIO();
    if (io) {
      io.to("kitchen").emit("order:update", order);
      io.to("admin").emit("order:update", order);
      io.to("waiter").emit("order:update", order);
      io.to(`order:${order._id}`).emit("order:update", order);
      io.to(`restaurant:${order.restaurantId}`).emit("order:update", order);
    }

    sendSuccess(res, order, "Order updated.");
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.body as { status: string };
    const allowedStatuses = ["pending", "accepted", "preparing", "ready", "served", "completed", "cancelled"];
    if (!allowedStatuses.includes(status)) {
      sendError(res, "Invalid order status.", 400);
      return;
    }

    const existing = await Order.findById(req.params.id);
    if (!existing) {
      sendError(res, "Order not found.", 404);
      return;
    }

    if (req.user?.restaurantId && String(existing.restaurantId) !== req.user.restaurantId) {
      sendError(res, "Access denied.", 403);
      return;
    }

    const kitchenRoles = ["chef", "staff", "kitchen"];
    if (kitchenRoles.includes(req.user?.role || "") && status === "served") {
      sendError(res, "Only waiters or admins can mark orders as served.", 403);
      return;
    }

    if (req.user?.role === "waiter" && !["served", "completed"].includes(status)) {
      sendError(res, "Waiters can only serve or complete orders.", 403);
      return;
    }

    if (status === "served" && existing.status !== "ready" && req.user?.role !== "admin") {
      sendError(res, "Only ready orders can be marked as served.", 400);
      return;
    }

    if (req.user?.role === "waiter" && status === "completed") {
      if (existing.status !== "served") {
        sendError(res, "Only served orders can be completed.", 400);
        return;
      }
      if (existing.servedBy && String(existing.servedBy) !== req.user.id) {
        sendError(res, "Only the waiter who served this order can complete it.", 403);
        return;
      }
    }

    const patch: Record<string, unknown> = { status };
    if (status === "served") {
      patch.servedBy = req.user?.id;
      patch.servedAt = new Date();
    }

    const order = await Order.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true })
      .populate("servedBy", "name email");

    if (!order) {
      sendError(res, "Order not found.", 404);
      return;
    }

    const io = getIO();
    if (io) {
      io.to("kitchen").emit("order:update", order);
      io.to("admin").emit("order:update", order);
      io.to("waiter").emit("order:update", order);
      io.to(`order:${order._id}`).emit("order:update", order);
      io.to(`order:${order.orderNumber}`).emit("order:update", order);
      io.to(`restaurant:${order.restaurantId}`).emit("order:update", order);
      io.to(`restaurant:${order.restaurantId}`).emit(`order:${status}`, order);
      if (status === "ready") {
        io.to("waiter").emit("order:ready", order);
        io.to("waiter").emit("waiter:alert", order);
      }
      if (status === "served") {
        io.to("waiter").emit("order:served", order);
      }
    }

    if (status === "ready") {
      await Notification.create({
        title: "Order ready",
        message: `${order.orderNumber} is ready for Table ${order.tableNumber}.`,
        audience: "waiter",
        restaurantId: order.restaurantId,
        orderId: order._id,
      });
    }

    sendSuccess(res, order, "Order status updated.");
  } catch (err) {
    next(err);
  }
}

export async function deleteOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      sendError(res, "Order not found.", 404);
      return;
    }
    sendSuccess(res, null, "Order deleted.");
  } catch (err) {
    next(err);
  }
}
