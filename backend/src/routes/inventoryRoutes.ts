import { Router } from "express";
import {
  getInventory,
  getInventoryAlerts,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from "../controllers/inventoryController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, authorize("admin", "chef", "staff", "kitchen"), getInventory);
router.get("/alerts", authenticate, getInventoryAlerts);
router.post("/", authenticate, authorize("admin"), createInventoryItem);
router.put("/:id", authenticate, authorize("admin"), updateInventoryItem);
router.patch("/:id", authenticate, authorize("admin"), updateInventoryItem);
router.delete("/:id", authenticate, authorize("admin"), deleteInventoryItem);

export default router;
