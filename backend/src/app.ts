import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/authRoutes";
import menuRoutes from "./routes/menuRoutes";
import orderRoutes from "./routes/orderRoutes";
import reservationRoutes from "./routes/reservationRoutes";
import reviewRoutes from "./routes/reviewRoutes";
import tableRoutes from "./routes/tableRoutes";
import inventoryRoutes from "./routes/inventoryRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import aiRoutes from "./routes/aiRoutes";
import userRoutes from "./routes/userRoutes";
import waiterRoutes from "./routes/waiterRoutes";
import kitchenRoutes from "./routes/kitchenRoutes";
import payrollRoutes from "./routes/payrollRoutes";
import attendanceRoutes, { kioskAttendanceRouter, staffAttendanceRouter } from "./routes/attendanceRoutes";

import { errorHandler, notFound } from "./middleware/errorHandler";

const app = express();

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

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS.`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// CORS
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});
app.use("/api", limiter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ success: true, message: "DineFlow API is running.", timestamp: new Date().toISOString() });
});

// API routes
const API = "/api/v1";
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/menu`, menuRoutes);
app.use(`${API}/orders`, orderRoutes);
app.use(`${API}/reservations`, reservationRoutes);
app.use(`${API}/reviews`, reviewRoutes);
app.use(`${API}/tables`, tableRoutes);
app.use(`${API}/inventory`, inventoryRoutes);
app.use(`${API}/analytics`, analyticsRoutes);
app.use(`${API}/admin`, analyticsRoutes); // alias for /admin/analytics etc.
app.use(`${API}/payments`, paymentRoutes);
app.use(`${API}/ai`, aiRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/waiter`, waiterRoutes);
app.use(`${API}/kitchen`, kitchenRoutes);

app.use(`${API}/admin/analytics`, analyticsRoutes);
app.use(`${API}/admin/users`, userRoutes);
app.use(`${API}/admin/staff`, userRoutes);
app.use(`${API}/admin/menu`, menuRoutes);
app.use(`${API}/admin/tables`, tableRoutes);
app.use(`${API}/admin/orders`, orderRoutes);
app.use(`${API}/admin/payments`, paymentRoutes);
app.use(`${API}/admin/payroll`, payrollRoutes);
app.use(`${API}/admin/attendance`, attendanceRoutes);
app.use(`${API}/staff/attendance`, staffAttendanceRouter);
app.use(`${API}/attendance-kiosk`, kioskAttendanceRouter);
app.use(`${API}/admin/reviews`, reviewRoutes);
app.use(`${API}/admin/reservations`, reservationRoutes);
app.use(`${API}/admin/inventory`, inventoryRoutes);

// 404 and error handlers
app.use(notFound);
app.use(errorHandler);

export default app;
