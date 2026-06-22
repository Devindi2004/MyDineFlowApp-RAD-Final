import type { CheckoutPayload } from "@/types/order";

export type PaymentResult = {
  ok: boolean;
  provider: "payhere" | "mock";
  transactionId: string;
};

export async function startMockPayHereCheckout(
  payload: CheckoutPayload
): Promise<PaymentResult> {
  if (payload.totalAmount <= 0) {
    return {
      ok: false,
      provider: "mock",
      transactionId: "PAY-INVALID",
    };
  }

  await new Promise((resolve) => window.setTimeout(resolve, 900));

  return {
    ok: true,
    provider: payload.paymentMethod === "payhere" ? "payhere" : "mock",
    transactionId: `PAY-${Date.now()}`,
  };
}
