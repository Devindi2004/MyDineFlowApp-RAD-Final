import { Router } from "express";
import { getOrders, createOrder, getOrderById, updateOrderStatus } from "../controllers/orderController";
import { getTables, updateTable } from "../controllers/tableController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate, authorize("admin", "waiter"));

router.get("/orders", getOrders);
router.get("/orders/:id", getOrderById);
router.post("/orders", createOrder);
router.patch("/orders/:id/served", (req, _res, next) => {
  req.body.status = "served";
  next();
}, updateOrderStatus);
router.patch("/orders/:id/completed", (req, _res, next) => {
  req.body.status = "completed";
  next();
}, updateOrderStatus);
router.get("/tables", getTables);
router.patch("/tables/:id/status", updateTable);

export default router;
