"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock3, Loader2 } from "lucide-react";
import { useSocket } from "@/components/providers/socket-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/data/menu";
import { getOrderById } from "@/lib/services/order-service";
import type { CustomerOrder } from "@/types/order";

type OrderTrackingDetailProps = {
  orderId: string;
};

export function OrderTrackingDetail({ orderId }: OrderTrackingDetailProps) {
  const { socket } = useSocket();
  const { data, isLoading } = useQuery({
    queryKey: ["orders", orderId],
    queryFn: () => getOrderById(orderId),
  });
  const [order, setOrder] = useState<CustomerOrder | null>(null);

  useEffect(() => {
    if (data) {
      setOrder(data);
    }
  }, [data]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    socket.emit("order:subscribe", { orderNumber: orderId });

    const handleOrderUpdate = (updatedOrder: CustomerOrder) => {
      if (
        updatedOrder.orderNumber === orderId ||
        updatedOrder.id === orderId ||
        updatedOrder.id === order?.id
      ) {
        setOrder(updatedOrder);
      }
    };

    socket.on("order:update", handleOrderUpdate);

    return () => {
      socket.off("order:update", handleOrderUpdate);
    };
  }, [order?.id, orderId, socket]);

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 pb-28 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Button asChild variant="ghost" className="mb-4 text-zinc-300">
          <Link href="/tracking">
            <ArrowLeft className="size-4" />
            Back to orders
          </Link>
        </Button>

        {isLoading || !order ? (
          <div className="flex min-h-80 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] text-zinc-300">
            <Loader2 className="size-4 animate-spin text-emerald-300" />
            Loading order status
          </div>
        ) : (
          <Card className="rounded-lg border border-white/10 bg-white/[0.035] py-0">
            <CardHeader className="border-b border-white/10 px-5 py-4">
              <CardTitle>{order.orderNumber}</CardTitle>
              <p className="text-sm text-zinc-400">
                Table {order.tableNumber} · {order.customerName}
              </p>
            </CardHeader>
            <CardContent className="p-5">
              <div className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.045] p-4">
                <div className="flex items-center gap-3">
                  <Clock3 className="size-5 text-emerald-200" />
                  <div>
                    <p className="font-semibold capitalize">{order.status}</p>
                    <p className="text-sm text-zinc-400">
                      Kitchen status updates stream here in real time.
                    </p>
                  </div>
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
              <div className="mt-5 space-y-3">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between rounded-lg border border-white/10 bg-black/20 p-3"
                  >
                    <span>
                      {item.quantity}x {item.name}
                    </span>
                    <span className="text-emerald-200">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex justify-between border-t border-white/10 pt-4 font-semibold">
                <span>Total</span>
                <span className="text-emerald-200">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
