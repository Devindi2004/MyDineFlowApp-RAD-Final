import { Request, Response, NextFunction } from "express";
import { Reservation } from "../models/Reservation";
import { AuthRequest } from "../middleware/auth";
import { sendSuccess, sendError } from "../utils/response";
import { Restaurant } from "../models/Restaurant";
import { Table } from "../models/Table";
import { Notification } from "../models/Notification";
import { getIO } from "../sockets/socketManager";

function reservationDayRange(date: string | Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function getReservations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const filter: Record<string, unknown> = {};

    if (req.user?.role === "customer") {
      filter.customerId = req.user.id;
    } else if (req.query.restaurantId) {
      filter.restaurantId = req.query.restaurantId;
    }

    const reservations = await Reservation.find(filter)
      .sort({ date: 1 })
      .populate("customerId", "name email")
      .populate("tableId", "tableNumber");

    sendSuccess(res, reservations);
  } catch (err) {
    next(err);
  }
}

export async function getReservationById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate("customerId", "name email")
      .populate("tableId", "tableNumber");

    if (!reservation) {
      sendError(res, "Reservation not found.", 404);
      return;
    }
    sendSuccess(res, reservation);
  } catch (err) {
    next(err);
  }
}

export async function getAvailableTables(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, time, persons, restaurantId: queryRestaurantId } = req.query as {
      date?: string;
      time?: string;
      persons?: string;
      restaurantId?: string;
    };
    const fallbackRestaurant = req.user?.restaurantId
      ? undefined
      : await Restaurant.findOne().select("_id").lean();
    const restaurantId = queryRestaurantId || req.user?.restaurantId || fallbackRestaurant?._id;
    const guestCount = Number(persons || 1);

    if (!date || !time || !guestCount || !restaurantId) {
      sendError(res, "Date, time, guests, and restaurant are required.", 400);
      return;
    }

    const { start, end } = reservationDayRange(date);
    const reserved = await Reservation.find({
      restaurantId,
      date: { $gte: start, $lt: end },
      time,
      status: { $in: ["pending", "confirmed"] },
      tableId: { $exists: true, $ne: null },
    }).select("tableId");
    const reservedTableIds = reserved.map((reservation) => reservation.tableId);

    const tables = await Table.find({
      restaurantId,
      capacity: { $gte: guestCount },
      isOccupied: false,
      _id: { $nin: reservedTableIds },
    }).sort({ capacity: 1, tableNumber: 1 });

    sendSuccess(res, tables);
  } catch (err) {
    next(err);
  }
}

export async function createReservation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const fallbackRestaurant = req.user?.restaurantId
      ? undefined
      : await Restaurant.findOne().select("_id").lean();
    const restaurantId = req.body.restaurantId || req.user?.restaurantId || fallbackRestaurant?._id;

    if (!req.body.date || !req.body.time || !req.body.persons || !req.body.customerName || !req.body.contactNumber || !restaurantId) {
      sendError(res, "Date, time, persons, customer name, contact number, and restaurant are required.", 400);
      return;
    }

    if (req.body.tableId) {
      const { start, end } = reservationDayRange(req.body.date);
      const table = await Table.findOne({
        _id: req.body.tableId,
        restaurantId,
        capacity: { $gte: Number(req.body.persons) },
        isOccupied: false,
      });
      const existingReservation = await Reservation.findOne({
        restaurantId,
        tableId: req.body.tableId,
        date: { $gte: start, $lt: end },
        time: req.body.time,
        status: { $in: ["pending", "confirmed"] },
      });

      if (!table || existingReservation) {
        sendError(res, "Selected table is no longer available. Please choose another table.", 409);
        return;
      }
    }

    const reservation = await Reservation.create({
      ...req.body,
      restaurantId,
      customerId: req.user?.id,
    });

    const adminMessage = `${reservation.customerName} requested a table for ${reservation.persons} guests on ${new Date(reservation.date).toLocaleDateString()} at ${reservation.time}.`;
    await Notification.create({
      title: "New reservation request",
      message: adminMessage,
      audience: "admin",
      restaurantId,
      userId: req.user?.id,
    });

    const io = getIO();
    if (io) {
      io.to("admin").emit("reservation:new", reservation);
      io.to(`restaurant:${restaurantId}`).emit("reservation:new", reservation);
    }

    sendSuccess(res, reservation, "Reservation created.", 201);
  } catch (err) {
    next(err);
  }
}

export async function updateReservation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const before = await Reservation.findById(req.params.id);
    const reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("tableId", "tableNumber");
    if (!reservation) {
      sendError(res, "Reservation not found.", 404);
      return;
    }

    if (req.body.status && req.body.status !== before?.status) {
      const accepted = req.body.status === "confirmed";
      const customerMessage = accepted
        ? `Your reservation for ${new Date(reservation.date).toLocaleDateString()} at ${reservation.time} has been accepted.`
        : `Your reservation for ${new Date(reservation.date).toLocaleDateString()} at ${reservation.time} was ${req.body.status}.`;

      await Notification.create({
        title: accepted ? "Reservation accepted" : "Reservation updated",
        message: customerMessage,
        audience: "customer",
        restaurantId: reservation.restaurantId,
        userId: reservation.customerId,
      });

      const io = getIO();
      if (io) {
        io.to(`user:${reservation.customerId}`).emit("reservation:notification", {
          title: accepted ? "Reservation accepted" : "Reservation updated",
          message: customerMessage,
          reservation,
        });
        io.to("admin").emit("reservation:update", reservation);
      }
    }

    sendSuccess(res, reservation, "Reservation updated.");
  } catch (err) {
    next(err);
  }
}

export async function deleteReservation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const reservation = await Reservation.findByIdAndDelete(req.params.id);
    if (!reservation) {
      sendError(res, "Reservation not found.", 404);
      return;
    }
    sendSuccess(res, null, "Reservation deleted.");
  } catch (err) {
    next(err);
  }
}
