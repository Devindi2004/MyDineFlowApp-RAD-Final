import { Router } from "express";
import { getAnalytics, getSalesReport, getOrdersSummary } from "../controllers/analyticsController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, authorize("admin"), getAnalytics);
router.get("/sales-report", authenticate, authorize("admin"), getSalesReport);
router.get("/orders-summary", authenticate, authorize("admin"), getOrdersSummary);

export default router;
