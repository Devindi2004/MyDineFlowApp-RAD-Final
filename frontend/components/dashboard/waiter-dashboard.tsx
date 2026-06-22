"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, CheckCircle2, Loader2, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useSocket } from "@/components/providers/socket-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { mockOrders } from "@/lib/data/orders";
import { getOrders, updateOrderStatus } from "@/lib/services/order-service";
import type { CustomerOrder } from "@/types/order";

export function WaiterDashboard() {
  const [orders, setOrders] = useState<CustomerOrder[]>(mockOrders);
  const [loading, setLoading] = useState(true);
  const { connected, socket } = useSocket();

  useEffect(() => {
    let active = true;
    getOrders()
      .then((items) => active && setOrders(items))
      .catch(() => toast.error("Showing waiter fallback orders"))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.emit("join-role", "waiter");
    const handleReady = (order: CustomerOrder) => {
      setOrders((current) => upsertOrder(current, order));
      toast.success("Order ready to serve", {
        description: `${order.orderNumber} for Table ${order.tableNumber}`,
      });
    };
    const handleUpdate = (order: CustomerOrder) => {
      setOrders((current) => upsertOrder(current, order));
    };

    socket.on("order:ready", handleReady);
    socket.on("order:update", handleUpdate);

    return () => {
      socket.off("order:ready", handleReady);
      socket.off("order:update", handleUpdate);
    };
  }, [socket]);

  const readyOrders = useMemo(
    () => orders.filter((order) => order.status === "ready"),
    [orders]
  );

  const servedOrders = useMemo(
    () => orders.filter((order) => order.status === "completed"),
    [orders]
  );

  async function markServed(orderId: string) {
    const updated = await updateOrderStatus(orderId, "completed");
    if (updated) {
      setOrders((current) => upsertOrder(current, updated));
      toast.success("Order marked served");
    }
  }

  return (
    <ProtectedRoute allowedRoles={["admin", "waiter"]} pathname="/waiter/dashboard">
      <main className="min-h-screen bg-zinc-950 px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-5">
          <section className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(5,150,105,0.22),rgba(24,24,27,0.9),rgba(234,88,12,0.16))] p-5">
            <Badge className="border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
              {connected ? "Ready alerts live" : "Fallback mode"}
            </Badge>
            <h1 className="mt-4 text-3xl font-semibold">Waiter dashboard</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Serve ready orders, update table service, and keep guests moving.
            </p>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {([
              ["Ready orders", readyOrders.length, BellRing],
              ["Served today", servedOrders.length, CheckCircle2],
              ["Realtime", connected ? "Live" : "Mock", UtensilsCrossed],
            ] as Array<[string, string | number, LucideIcon]>).map(([label, value, Icon]) => (
              <Card key={String(label)} className="rounded-lg border border-white/10 bg-white/[0.035] py-0">
                <CardContent className="p-5">
                  <Icon className="size-5 text-emerald-200" />
                  <p className="mt-4 text-sm text-zinc-400">{label}</p>
                  <p className="mt-2 text-2xl font-semibold">{value}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          {loading && (
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm text-zinc-300">
              <Loader2 className="size-4 animate-spin text-emerald-300" />
              Loading ready orders
            </div>
          )}

          <section className="grid gap-4 lg:grid-cols-2">
            {readyOrders.map((order) => (
              <Card key={order.id} className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 py-0">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{order.orderNumber}</p>
                      <p className="mt-1 text-sm text-zinc-300">Table {order.tableNumber}</p>
                    </div>
                    <Badge className="bg-emerald-300 text-zinc-950">Ready</Badge>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-zinc-200">
                    {order.items.map((item) => (
                      <p key={item.id}>{item.quantity}x {item.name}</p>
                    ))}
                  </div>
                  <Button
                    className="mt-5 bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
                    onClick={() => markServed(order.id)}
                  >
                    Mark served
                  </Button>
                </CardContent>
              </Card>
            ))}
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}

function upsertOrder(orders: CustomerOrder[], order: CustomerOrder) {
  const exists = orders.some((item) => item.id === order.id || item.orderNumber === order.orderNumber);
  if (!exists) return [order, ...orders];
  return orders.map((item) => (item.id === order.id || item.orderNumber === order.orderNumber ? order : item));
}
