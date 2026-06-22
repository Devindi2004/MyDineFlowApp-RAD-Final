import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { Payment } from "../models/Payment";
import { Order } from "../models/Order";
import { AuthRequest } from "../middleware/auth";
import { sendSuccess, sendError } from "../utils/response";
import { getIO } from "../sockets/socketManager";

const PAYHERE_SANDBOX_URL = "https://sandbox.payhere.lk/pay/checkout";
const PAYHERE_LIVE_URL = "https://www.payhere.lk/pay/checkout";

function md5(value: string): string {
  return crypto.createHash("md5").update(value).digest("hex").toUpperCase();
}

function moneyAmount(value: number): string {
  return Number(value || 0).toFixed(2);
}

function backendBaseUrl(req: Request): string {
  return process.env.API_PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
}

function clientBaseUrl(): string {
  return process.env.CLIENT_URL || "http://localhost:3000";
}

function payhereCheckoutUrl(): string {
  return process.env.PAYHERE_SANDBOX === "false" ? PAYHERE_LIVE_URL : PAYHERE_SANDBOX_URL;
}

export async function createPayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orderId, paymentMethod, amount } = req.body as {
      orderId: string;
      paymentMethod: string;
      amount: number;
    };

    const order = await Order.findById(orderId);
    if (!order) {
      sendError(res, "Order not found.", 404);
      return;
    }

    const payment = await Payment.findOneAndUpdate(
      { orderId },
      { orderId, paymentMethod, amount, status: "pending" },
      { new: true, upsert: true, runValidators: true }
    );

    // For cash/card payments, mark as paid immediately (mock flow)
    if (paymentMethod === "cash" || paymentMethod === "card") {
      payment.status = "paid";
      payment.transactionId = `TXN-${Date.now()}`;
      await payment.save();

      await Order.findByIdAndUpdate(orderId, { paymentStatus: "paid" });

      const io = getIO();
      if (io) {
        const updatedOrder = await Order.findById(orderId);
        if (updatedOrder) {
          io.to(`order:${orderId}`).emit("payment-updated", updatedOrder);
          io.to(`order:${orderId}`).emit("payment:updated", updatedOrder);
          io.to(`order:${updatedOrder.orderNumber}`).emit("payment-updated", updatedOrder);
          io.to(`order:${updatedOrder.orderNumber}`).emit("payment:updated", updatedOrder);
        }
      }
    }

    // For PayHere, return payment data for frontend redirect
    if (paymentMethod === "payhere") {
      const merchantId = process.env.PAYHERE_MERCHANT_ID ?? "";
      const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET ?? "";
      const orderId_str = String(order._id);
      const amount_str = moneyAmount(amount);
      const currency = "LKR";
      const clientUrl = clientBaseUrl();

      if (!merchantId || !merchantSecret) {
        sendError(res, "PayHere merchant credentials are not configured.", 503);
        return;
      }

      // Generate PayHere hash: MD5(merchant_id + order_id + amount + currency + MD5(merchant_secret).toUpperCase())
      const secretHash = md5(merchantSecret);
      const hash = md5(`${merchantId}${orderId_str}${amount_str}${currency}${secretHash}`);

      sendSuccess(res, {
        payment,
        checkoutUrl: payhereCheckoutUrl(),
        payhereData: {
          merchant_id: merchantId,
          return_url: `${clientUrl}/customer/payment/${order._id}?status=return`,
          cancel_url: `${clientUrl}/customer/payment/${order._id}?status=cancel`,
          notify_url: `${backendBaseUrl(req)}/api/v1/payments/payhere/notify`,
          order_id: orderId_str,
          items: `DineFlow order ${order.orderNumber}`,
          currency,
          amount: amount_str,
          first_name: order.customerName.split(" ")[0] ?? "Customer",
          last_name: order.customerName.split(" ").slice(1).join(" ") || ".",
          email: "customer@dineflow.local",
          phone: order.contactNumber || "0000000000",
          address: "DineFlow Restaurant",
          city: "Colombo",
          country: "Sri Lanka",
          custom_1: order.orderNumber,
          custom_2: String(order.customerId || ""),
          hash,
        },
      }, "Payment initiated.");
      return;
    }

    sendSuccess(res, { payment }, "Payment processed.");
  } catch (err) {
    next(err);
  }
}

export async function payhereNotify(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { order_id, status_code, payment_id, md5sig } = req.body as {
      order_id: string;
      status_code: string;
      payment_id: string;
      md5sig: string;
    };

    // Verify PayHere signature
    const merchantId = process.env.PAYHERE_MERCHANT_ID ?? "";
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET ?? "";
    const amount = moneyAmount(Number(req.body.payhere_amount || 0));
    const currency = req.body.payhere_currency as string;

    if (!merchantId || !merchantSecret) {
      res.status(503).send("PayHere credentials are not configured");
      return;
    }

    const secretHash = md5(merchantSecret);
    const localSig = md5(`${merchantId}${order_id}${amount}${currency}${status_code}${secretHash}`);

    if (localSig !== String(md5sig || "").toUpperCase()) {
      res.status(400).send("Invalid signature");
      return;
    }

    const isPaid = status_code === "2";

    await Payment.findOneAndUpdate(
      { orderId: order_id },
      {
        status: isPaid ? "paid" : "failed",
        transactionId: payment_id,
        payhereData: req.body,
      }
    );

    if (isPaid) {
      const order = await Order.findByIdAndUpdate(order_id, { paymentStatus: "paid" }, { new: true });
      const io = getIO();
      if (io && order) {
        io.to(`order:${order_id}`).emit("payment-updated", order);
        io.to(`order:${order_id}`).emit("payment:updated", order);
        io.to(`order:${order.orderNumber}`).emit("payment-updated", order);
        io.to(`order:${order.orderNumber}`).emit("payment:updated", order);
      }
    } else {
      await Order.findByIdAndUpdate(order_id, { paymentStatus: "failed" });
    }

    res.status(200).send("OK");
  } catch (err) {
    next(err);
  }
}

export async function getPaymentByOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payment = await Payment.findOne({ orderId: req.params.orderId });
    if (!payment) {
      sendError(res, "Payment not found.", 404);
      return;
    }
    sendSuccess(res, payment);
  } catch (err) {
    next(err);
  }
}
