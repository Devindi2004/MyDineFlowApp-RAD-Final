import { Router } from "express";
import { getTables, getTableById, createTable, updateTable, deleteTable } from "../controllers/tableController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.get("/", getTables);
router.get("/:id", getTableById);
router.post("/", authenticate, authorize("admin"), createTable);
router.put("/:id", authenticate, authorize("admin"), updateTable);
router.patch("/:id", authenticate, authorize("admin", "waiter", "chef", "kitchen"), updateTable);
router.delete("/:id", authenticate, authorize("admin"), deleteTable);

export default router;
