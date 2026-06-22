import { Router } from "express";
import {
  getReservations,
  getReservationById,
  getAvailableTables,
  createReservation,
  updateReservation,
  deleteReservation,
} from "../controllers/reservationController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, getReservations);
router.get("/available-tables", authenticate, getAvailableTables);
router.get("/:id", authenticate, getReservationById);
router.post("/", authenticate, createReservation);
router.put("/:id", authenticate, authorize("admin", "waiter", "staff"), updateReservation);
router.patch("/:id", authenticate, authorize("admin", "waiter", "staff"), updateReservation);
router.delete("/:id", authenticate, authorize("admin"), deleteReservation);

export default router;
