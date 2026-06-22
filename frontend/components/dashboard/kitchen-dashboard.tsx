"use client";

import { useEffect, useMemo, useState } from "react";
import { ChefHat, Clock3, Flame, Loader2, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { useSocket } from "@/components/providers/socket-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockOrders } from "@/lib/data/orders";
import { formatCurrency } from "@/lib/data/menu";
import { getOrders, updateOrderStatus } from "@/lib/services/order-service";
import type { CustomerOrder, OrderStatus } from "@/types/order";

const columns: { label: string; status: OrderStatus; icon: typeof Clock3 }[] = [
  { label: "New Orders", status: "new", icon: Clock3 },
  { label: "Accepted", status: "accepted", icon: PackageCheck },
  { label: "Preparing", status: "preparing", icon: Flame },
  { label: "Ready", status: "ready", icon: ChefHat },
];

const nextStatus: Record<OrderStatus, OrderStatus | null> = {
  new: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "completed",
  completed: null,
};

export function KitchenDashboard() {
  const [orders, setOrders] = useState<CustomerOrder[]>(mockOrders);
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { connected, socket } = useSocket();

  useEffect(() => {
    let active = true;

    getOrders()
      .then((items) => {
        if (active) {
          setOrders(items);
        }
      })
      .catch(() => {
        if (active) {
          toast.error("Kitchen orders unavailable", {
            description: "Showing the local kitchen fallback board.",
          });
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!socket) {
      return;
    }

    socket.emit("kitchen:join", { restaurantId: "rest123" });
    const handleNewOrder = (order: CustomerOrder) => {
      setOrders((current) => [order, ...current]);
      playNotification();
      toast.success("New kitchen order", {
        description: `${order.orderNumber} for Table ${order.tableNumber}`,
      });
    };
    const handleOrderUpdate = (updatedOrder: CustomerOrder) => {
      setOrders((current) =>
        current.map((order) =>
          order.id === updatedOrder.id ||
          order.orderNumber === updatedOrder.orderNumber
            ? updatedOrder
            : order
        )
      );
    };

    socket.on("order:new", handleNewOrder);
    socket.on("order:update", handleOrderUpdate);

    return () => {
      socket.off("order:new", handleNewOrder);
      socket.off("order:update", handleOrderUpdate);
    };
  }, [socket]);

  const groupedOrders = useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        orders: orders.filter((order) => order.status === column.status),
      })),
    [orders]
  );

  const moveOrder = async (orderId: string, status: OrderStatus) => {
    const previousOrders = orders;

    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, status } : order
      )
    );

    try {
      const updatedOrder = await updateOrderStatus(orderId, status);

      if (updatedOrder) {
        setOrders((current) =>
          current.map((order) => (order.id === orderId ? updatedOrder : order))
        );
      }

      toast.success("Order status updated", {
        description: `Order moved to ${status}.`,
      });
      socket?.emit("order:status", { orderId, status });
    } catch {
      setOrders(previousOrders);
      toast.error("Unable to update order", {
        description: "The kitchen board was restored to its previous state.",
      });
    }
  };

  const kitchenMetrics = [
    ["Active", orders.filter((order) => order.status !== "completed").length],
    ["Ready", orders.filter((order) => order.status === "ready").length],
    ["Avg prep", "16m"],
    ["Realtime", connected ? "Live" : "Mock"],
  ];

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(6,78,59,0.34),rgba(24,24,27,0.88),rgba(124,45,18,0.18))] p-5">
          <Badge className="border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
            {connected ? "Realtime connected" : "Mock realtime"}
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold">Kitchen dashboard</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Track QR orders from pending to preparing, ready, and completed.
          </p>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-4">
          {kitchenMetrics.map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-lg border border-white/10 bg-white/[0.035] p-4"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                {label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-200">
                {value}
              </p>
            </div>
          ))}
        </section>

        {loading && (
          <div className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm text-zinc-300">
            <Loader2 className="size-4 animate-spin text-emerald-300" />
            Loading kitchen orders from backend
          </div>
        )}

        <section className="mt-5 grid gap-4 xl:grid-cols-4">
          {groupedOrders.map((column) => {
            const Icon = column.icon;

            return (
              <div
                key={column.status}
                className="space-y-3"
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedOrderId) {
                    moveOrder(draggedOrderId, column.status);
                    setDraggedOrderId(null);
                  }
                }}
              >
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-emerald-200" />
                    <h2 className="font-semibold">{column.label}</h2>
                  </div>
                  <span className="rounded-full bg-black/30 px-2 py-1 text-xs text-zinc-300">
                    {column.orders.length}
                  </span>
                </div>

                {column.orders.map((order) => (
                  <Card
                    key={order.id}
                    className="cursor-grab rounded-lg border border-white/10 bg-zinc-900/78 py-0 active:cursor-grabbing"
                    draggable
                    onDragStart={() => setDraggedOrderId(order.id)}
                    onDragEnd={() => setDraggedOrderId(null)}
                  >
                    <CardHeader className="border-b border-white/10 px-4 py-3">
                      <CardTitle className="flex items-center justify-between text-base">
                        <span>{order.orderNumber}</span>
                        <span className="text-sm text-emerald-200">
                          Table {order.tableNumber}
                        </span>
                      </CardTitle>
                      <p className="text-xs text-zinc-400">
                        {getElapsedMinutes(order.createdAt)} min elapsed ·{" "}
                        {order.paymentMethod === "cash" ? "Pay at table" : "Paid"}
                      </p>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="mb-3 flex gap-2">
                        <Badge className={getPriorityClass(order.createdAt)}>
                          {getPriorityLabel(order.createdAt)}
                        </Badge>
                        <Badge className="bg-white/5 text-zinc-300">
                          {order.paymentMethod}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="text-sm text-zinc-300">
                            {item.quantity}x {item.name}
                          </div>
                        ))}
                      </div>
                      {order.specialInstructions && (
                        <p className="mt-3 rounded-md bg-orange-400/10 p-2 text-xs text-orange-100">
                          {order.specialInstructions}
                        </p>
                      )}
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-sm font-semibold text-emerald-200">
                          {formatCurrency(order.totalAmount)}
                        </span>
                        {nextStatus[order.status] && (
                          <Button
                            size="sm"
                            className="bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
                            onClick={() =>
                              moveOrder(order.id, nextStatus[order.status]!)
                            }
                          >
                            Move
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function getElapsedMinutes(createdAt: string) {
  return Math.max(1, Math.round((Date.now() - new Date(createdAt).getTime()) / 60000));
}

function getPriorityLabel(createdAt: string) {
  const minutes = getElapsedMinutes(createdAt);
  if (minutes >= 18) return "Rush";
  if (minutes >= 10) return "Priority";
  return "Normal";
}

function getPriorityClass(createdAt: string) {
  const priority = getPriorityLabel(createdAt);
  if (priority === "Rush") return "bg-rose-400/15 text-rose-200";
  if (priority === "Priority") return "bg-orange-400/15 text-orange-200";
  return "bg-emerald-400/15 text-emerald-200";
}

function playNotification() {
  const audio = new Audio();
  audio.src =
    "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";
  audio.play().catch(() => undefined);

  if ("vibrate" in navigator) {
    navigator.vibrate(80);
  }
}
