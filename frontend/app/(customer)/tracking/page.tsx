import type { Metadata } from "next";
import { OrderTrackingList } from "@/components/customer/order-tracking-list";

export const metadata: Metadata = {
  title: "Order Tracking",
  description: "Track your DineFlow orders in real time.",
};

export default function TrackingPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 pb-28 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(6,78,59,0.34),rgba(24,24,27,0.88),rgba(124,45,18,0.18))] p-5">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-orange-200">
            Live orders
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Order tracking</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Follow preparation status from kitchen acceptance to table delivery.
          </p>
        </section>

        <OrderTrackingList />
      </div>
    </main>
  );
}
