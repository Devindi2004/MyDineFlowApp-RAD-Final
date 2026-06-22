import { Router } from "express";
import { getOrders, getOrderById, updateOrderStatus } from "../controllers/orderController";
import { getInventory } from "../controllers/inventoryController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate, authorize("admin", "chef", "staff", "kitchen"));

router.get("/orders", getOrders);
router.get("/orders/:id", getOrderById);
router.patch("/orders/:id/status", updateOrderStatus);
router.get("/inventory", getInventory);

export default router;
