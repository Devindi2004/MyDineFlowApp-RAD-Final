import { Router } from "express";
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
} from "../controllers/orderController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, getOrders);
router.get("/my", authenticate, getOrders);
router.get("/:id", authenticate, getOrderById);
router.post("/", authenticate, createOrder);
router.put("/:id", authenticate, authorize("admin", "chef", "staff", "waiter", "kitchen"), updateOrder);
router.patch("/:id/status", authenticate, authorize("admin", "chef", "staff", "waiter", "kitchen"), updateOrderStatus);
router.delete("/:id", authenticate, authorize("admin"), deleteOrder);

export default router;
