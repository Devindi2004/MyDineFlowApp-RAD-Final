import type { CustomerOrder } from "@/types/order";

export type ServerToClientEvents = {
  "order-created": (order: CustomerOrder) => void;
  "order-status-updated": (order: CustomerOrder) => void;
  "payment-updated": (order: CustomerOrder) => void;
  "order:new": (order: CustomerOrder) => void;
  "order:update": (order: CustomerOrder) => void;
  "order:ready": (order: CustomerOrder) => void;
  "kitchen:ping": (payload: { activeOrders: number }) => void;
};

export type ClientToServerEvents = {
  "join-role": (role: string) => void;
  "join-order": (orderId: string) => void;
  "order:subscribe": (payload: { orderNumber: string }) => void;
  "kitchen:join": (payload: { restaurantId: string }) => void;
  "order:status": (payload: { orderId: string; status: string }) => void;
};
