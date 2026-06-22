import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { jwtConfig } from "../config/jwt";

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HttpServer): SocketIOServer {
  const defaultAllowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003",
  ];

  const configuredOrigins = [process.env.CLIENT_URLS, process.env.CLIENT_URL]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...configuredOrigins]));

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      // Allow unauthenticated connections for public order tracking
      next();
      return;
    }

    try {
      const payload = jwt.verify(token, jwtConfig.accessSecret) as {
        sub: string;
        role: string;
        email: string;
      };
      (socket as Socket & { user?: typeof payload }).user = payload;
      next();
    } catch {
      // Allow connection even with invalid token (graceful degradation)
      next();
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket as Socket & { user?: { sub: string; role: string } }).user;

    if (user) {
      // Auto-join role room
      socket.join(user.role);
      socket.join(`user:${user.sub}`);
      if (user.role === "admin") {
        socket.join("kitchen"); // admins see kitchen events too
      }
    }

    // Client joins a role room explicitly
    socket.on("join-role", (role: string) => {
      socket.join(role);
      if (role === "admin") socket.join("kitchen");
    });

    // Client subscribes to a specific order
    socket.on("join-order", (orderId: string) => {
      socket.join(`order:${orderId}`);
    });

    socket.on("order:subscribe", (payload: { orderNumber: string }) => {
      socket.join(`order:${payload.orderNumber}`);
    });

    socket.on("kitchen:join", (payload: { restaurantId: string }) => {
      socket.join("kitchen");
      socket.join(`restaurant:${payload.restaurantId}`);
    });

    // Kitchen staff updates order status via socket
    socket.on("order:status", async (payload: { orderId: string; status: string }) => {
      try {
        const { Order } = await import("../models/Order");
        const order = await Order.findByIdAndUpdate(
          payload.orderId,
          { status: payload.status },
          { new: true }
        );
        if (order && io) {
          io.to("kitchen").emit("order:update", order);
          io.to("admin").emit("order:update", order);
          io.to("waiter").emit("order:update", order);
          io.to(`order:${payload.orderId}`).emit("order:update", order);
          io.to(`order:${order.orderNumber}`).emit("order:update", order);
          io.to(`restaurant:${order.restaurantId}`).emit("order:update", order);
          io.to(`restaurant:${order.restaurantId}`).emit(`order:${payload.status}`, order);
          if (payload.status === "ready") {
            io.to("waiter").emit("order:ready", order);
            io.to("waiter").emit("waiter:alert", order);
          }
        }
      } catch (err) {
        console.error("Socket order:status error:", err);
      }
    });

    socket.on("disconnect", () => {
      // cleanup handled automatically by socket.io
    });
  });

  // Periodic kitchen ping every 30 seconds
  setInterval(async () => {
    if (!io) return;
    try {
      const { Order } = await import("../models/Order");
      const activeOrders = await Order.countDocuments({
        status: { $in: ["pending", "preparing"] },
      });
      io.to("kitchen").emit("kitchen:ping", { activeOrders });
    } catch {
      // ignore
    }
  }, 30000);

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}
