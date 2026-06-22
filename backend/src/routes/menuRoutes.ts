import { Router } from "express";
import {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from "../controllers/menuController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.get("/", getMenuItems);
router.get("/:id", getMenuItemById);
router.post("/", authenticate, authorize("admin"), createMenuItem);
router.put("/:id", authenticate, authorize("admin"), updateMenuItem);
router.patch("/:id", authenticate, authorize("admin"), updateMenuItem);
router.delete("/:id", authenticate, authorize("admin"), deleteMenuItem);

export default router;
