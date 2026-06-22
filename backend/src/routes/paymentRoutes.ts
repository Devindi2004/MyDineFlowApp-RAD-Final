import { Router } from "express";
import { createPayment, payhereNotify, getPaymentByOrder } from "../controllers/paymentController";
import { authenticate } from "../middleware/auth";
import { Payment } from "../models/Payment";

const router = Router();

router.get("/", authenticate, async (_req, res, next) => {
  try {
    const payments = await Payment.find({}).sort({ createdAt: -1 }).populate("orderId", "orderNumber customerName");
    res.json({ success: true, message: "Success", data: payments });
  } catch (err) {
    next(err);
  }
});
router.post("/", authenticate, createPayment);
router.post("/create", authenticate, createPayment);
router.post("/payhere/notify", payhereNotify);
router.get("/order/:orderId", authenticate, getPaymentByOrder);

export default router;
