"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { z } from "zod";
import { CreditCard, Loader2, ReceiptText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCart, type PaymentMethod } from "@/hooks/use-cart";
import { formatCurrency } from "@/lib/data/menu";
import { createOrder } from "@/lib/services/order-service";
import { api, getApiErrorMessage, unwrapApiData } from "@/lib/api";

declare global {
  interface Window {
    payhere?: {
      startPayment: (payment: Record<string, unknown>) => void;
      onCompleted?: (orderId: string) => void;
      onDismissed?: () => void;
      onError?: (error: string) => void;
    };
  }
}

const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, "Name is required."),
  contactNumber: z.string().trim().min(7, "Contact number is required."),
  tableNumber: z.string().trim().min(1, "Table number is required."),
  specialInstructions: z.string().trim().optional(),
  paymentMethod: z.enum(["payhere", "card", "cash"]),
});

type CheckoutExperienceProps = {
  initialTableNumber?: string;
};

export function CheckoutExperience({
  initialTableNumber = "07",
}: CheckoutExperienceProps) {
  const router = useRouter();
  const cart = useCart();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const draft = {
    ...cart.checkoutDraft,
    tableNo: cart.checkoutDraft.tableNo || initialTableNumber,
  };

  const isEmpty = cart.items.length === 0;
  const tableNumber = useMemo(
    () => String(draft.tableNo || initialTableNumber).padStart(2, "0"),
    [draft.tableNo, initialTableNumber]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    if (isEmpty) {
      toast.error("Your cart is empty", {
        description: "Add dishes from the menu before checkout.",
      });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const parsed = checkoutSchema.safeParse({
      customerName: formData.get("customerName"),
      contactNumber: formData.get("contactNumber"),
      tableNumber: formData.get("tableNumber"),
      specialInstructions: formData.get("specialInstructions"),
      paymentMethod: formData.get("paymentMethod"),
    });

    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          Object.entries(parsed.error.flatten().fieldErrors).map(([key, value]) => [
            key,
            value?.[0] ?? "Invalid value.",
          ])
        )
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        customerName: parsed.data.customerName,
        contactNumber: parsed.data.contactNumber,
        tableNumber: parsed.data.tableNumber.padStart(2, "0"),
        specialInstructions: parsed.data.specialInstructions,
        paymentMethod: parsed.data.paymentMethod,
        items: cart.items,
        totalAmount: cart.summary.total,
      };

      const order = await createOrder(payload);

      if (parsed.data.paymentMethod === "payhere") {
        if (!window.payhere) {
          throw new Error("PayHere is still loading. Please try again.");
        }

        const paymentResponse = await api.post<unknown>("/payments/payhere/init", {
          orderId: order.id,
        });
        const payment = unwrapApiData(paymentResponse.data) as Record<string, unknown>;

        window.payhere.onCompleted = (payhereOrderId) => {
          cart.clearCart();
          cart.resetCheckoutDraft();
          toast.success("Payment completed", {
            description: `${order.orderNumber} is now live in tracking.`,
          });
          router.push(`/tracking/${payhereOrderId || order.id}`);
        };
        window.payhere.onDismissed = () => {
          toast.info("Payment cancelled", {
            description: "Your order is saved with pending payment.",
          });
          router.push(`/tracking/${order.id}`);
        };
        window.payhere.onError = (error) => {
          toast.error("Payment failed", {
            description: error || "Please try again or choose cash.",
          });
        };
        window.payhere.startPayment(payment);
      } else {
        cart.clearCart();
        cart.resetCheckoutDraft();
        toast.success("Order confirmed", {
          description: `${order.orderNumber} is now live in kitchen tracking.`,
        });
        router.push(`/tracking/${order.id}`);
      }
    } catch (error) {
      toast.error("Checkout failed", {
        description: getApiErrorMessage(error, "Please try again or choose another payment method."),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 pb-28 text-white sm:px-6 lg:px-8">
      <form
        onSubmit={handleSubmit}
        className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1fr_420px]"
      >
        <section className="space-y-5">
          <div className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(6,78,59,0.36),rgba(24,24,27,0.86)_55%,rgba(124,45,18,0.2))] p-5">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-orange-200">
              Secure checkout
            </p>
            <h1 className="mt-3 text-3xl font-semibold">Complete your order</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Review your table, contact details, payment method, and order notes.
            </p>
          </div>

          <Card className="rounded-lg border border-white/10 bg-white/[0.035] py-0">
            <CardHeader className="border-b border-white/10 px-5 py-4">
              <CardTitle>Customer details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
              <Field error={errors.customerName} label="Name">
                <Input
                  name="customerName"
                  defaultValue={draft.customerName}
                  onChange={(event) =>
                    cart.setCheckoutDraft({ customerName: event.target.value })
                  }
                  className="min-h-11 border-white/10 bg-white/[0.04] text-white"
                  placeholder="Your name"
                />
              </Field>
              <Field error={errors.tableNumber} label="Table number">
                <Input
                  name="tableNumber"
                  defaultValue={tableNumber}
                  onChange={(event) =>
                    cart.setCheckoutDraft({ tableNo: event.target.value })
                  }
                  className="min-h-11 border-white/10 bg-white/[0.04] text-white"
                />
              </Field>
              <Field error={errors.contactNumber} label="Contact number">
                <Input
                  name="contactNumber"
                  defaultValue={draft.contactNumber}
                  onChange={(event) =>
                    cart.setCheckoutDraft({ contactNumber: event.target.value })
                  }
                  className="min-h-11 border-white/10 bg-white/[0.04] text-white"
                  placeholder="+94 77 123 4567"
                />
              </Field>
              <Field label="Special instructions">
                <Input
                  name="specialInstructions"
                  defaultValue={draft.specialInstructions}
                  onChange={(event) =>
                    cart.setCheckoutDraft({
                      specialInstructions: event.target.value,
                    })
                  }
                  className="min-h-11 border-white/10 bg-white/[0.04] text-white"
                  placeholder="Less chilli, allergies, timing..."
                />
              </Field>
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-white/10 bg-white/[0.035] py-0">
            <CardHeader className="border-b border-white/10 px-5 py-4">
              <CardTitle>Payment method</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 sm:grid-cols-3">
              {(["payhere", "card", "cash"] satisfies PaymentMethod[]).map(
                (method) => (
                  <label
                    key={method}
                    className="flex min-h-20 cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-4 capitalize text-zinc-200 has-[:checked]:border-emerald-300/50 has-[:checked]:bg-emerald-400/10"
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method}
                      defaultChecked={draft.paymentMethod === method}
                      onChange={() => cart.setCheckoutDraft({ paymentMethod: method })}
                      className="accent-emerald-400"
                    />
                    <CreditCard className="size-4 text-emerald-200" />
                    {method === "cash" ? "Cash" : method}
                  </label>
                )
              )}
            </CardContent>
          </Card>
        </section>

        <aside className="lg:sticky lg:top-5 lg:self-start">
          <Card className="rounded-lg border border-white/10 bg-zinc-900/78 py-0">
            <CardHeader className="border-b border-white/10 px-5 py-4">
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="size-5 text-emerald-200" />
                Order summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {isEmpty ? (
                <p className="text-sm text-zinc-400">Your cart is empty.</p>
              ) : (
                <div className="space-y-3">
                  {cart.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-[56px_1fr] gap-3">
                      <div className="relative size-14 overflow-hidden rounded-md">
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{item.name}</p>
                        <p className="text-xs text-zinc-400">
                          {item.quantity} x {formatCurrency(item.price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
                <Row label="Subtotal" value={formatCurrency(cart.summary.subtotal)} />
                <Row label="Service" value={formatCurrency(cart.summary.serviceCharge)} />
                <Row label="Tax" value={formatCurrency(cart.summary.tax)} />
                <Row
                  label="Total"
                  value={formatCurrency(cart.summary.total)}
                  strong
                />
              </div>
              <Button
                className="mt-5 min-h-11 w-full bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
                disabled={loading || isEmpty}
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                Pay and place order
              </Button>
            </CardContent>
          </Card>
        </aside>
      </form>
    </main>
  );
}

function Field({
  children,
  error,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-zinc-200">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose-200">{error}</span>}
    </label>
  );
}

function Row({
  label,
  strong,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div className={strong ? "flex justify-between pt-2 text-base font-semibold" : "flex justify-between text-zinc-400"}>
      <span>{label}</span>
      <span className={strong ? "text-emerald-200" : ""}>{value}</span>
    </div>
  );
}
