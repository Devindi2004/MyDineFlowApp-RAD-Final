import { Router } from "express";
import { getAttendanceSummary, getMyAttendance, getMyAttendanceQr, kioskAttendanceLog, kioskAttendanceStatus, kioskMarkAttendance, listAttendance } from "../controllers/attendanceController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate, authorize("admin"));
router.get("/", listAttendance);
router.get("/summary", getAttendanceSummary);

export default router;

export const staffAttendanceRouter = Router();
staffAttendanceRouter.use(authenticate, authorize("waiter", "chef", "staff", "kitchen"));
staffAttendanceRouter.get("/me", getMyAttendance);
staffAttendanceRouter.get("/qr", getMyAttendanceQr);

export const kioskAttendanceRouter = Router();
kioskAttendanceRouter.post("/status", kioskAttendanceStatus);
kioskAttendanceRouter.post("/mark", kioskMarkAttendance);
kioskAttendanceRouter.post("/log", kioskAttendanceLog);
