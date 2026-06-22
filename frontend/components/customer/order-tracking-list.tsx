"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock3, Loader2, PackageCheck, Utensils } from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/data/menu";
import { getOrders } from "@/lib/services/order-service";
import type { CustomerOrder } from "@/types/order";

export function OrderTrackingList() {
  const { socket } = useSocket();
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["orders", "tracking"],
    queryFn: getOrders,
  });
  const [orders, setOrders] = useState<CustomerOrder[]>([]);

  useEffect(() => {
    setOrders(data.slice(0, 6));
  }, [data]);

  useEffect(() => {
    if (!socket) {
      return;
    }

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

    socket.on("order:update", handleOrderUpdate);

    return () => {
      socket.off("order:update", handleOrderUpdate);
    };
  }, [socket]);

  if (isLoading) {
    return (
      <div className="mt-8 flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-8 text-sm text-zinc-300">
        <Loader2 className="size-4 animate-spin text-emerald-300" />
        Loading live orders
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState
          action={
            <Button
              className="bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
              onClick={() => refetch()}
            >
              Refresh orders
            </Button>
          }
          description="Orders created from checkout will appear here as soon as the kitchen accepts them."
          title="No active orders"
        />
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-4">
      {orders.map((order) => (
        <Card
          key={order.id}
          className="rounded-lg border border-white/10 bg-white/[0.035] py-0"
        >
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm text-zinc-400">
                  {order.tableNumber && `Table ${order.tableNumber}`}
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  {order.orderNumber}
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  {order.items
                    .map((item) => `${item.quantity}x ${item.name}`)
                    .join(", ")}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <StatusBadge status={order.status} />
                <p className="mt-2 text-sm font-semibold text-emerald-200">
                  {formatCurrency(order.totalAmount)}
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-4 gap-2">
              {["new", "preparing", "ready", "completed"].map(
                (status, index) => {
                  const activeIndex = [
                    "new",
                    "preparing",
                    "ready",
                    "completed",
                  ].indexOf(order.status);
                  return (
                    <div
                      key={status}
                      className={
                        index <= activeIndex
                          ? "h-2 rounded-full bg-emerald-400"
                          : "h-2 rounded-full bg-white/10"
                      }
                    />
                  );
                }
              )}
            </div>
            <Button
              asChild
              className="mt-5 min-h-10 bg-orange-400 text-zinc-950 hover:bg-orange-300"
            >
              <Link href={`/tracking/${order.orderNumber}`}>View details</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const icon =
    status === "completed" ? (
      <PackageCheck className="size-4" />
    ) : status === "ready" ? (
      <Utensils className="size-4" />
    ) : (
      <Clock3 className="size-4" />
    );

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-sm capitalize text-emerald-100">
      {icon}
      {status}
    </span>
  );
}
