import type { CartItem } from "@/types/menu";

export type OrderStatus = "new" | "accepted" | "preparing" | "ready" | "completed";

export type OrderLineItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
};

export type CustomerOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  tableNumber: string;
  customerName: string;
  contactNumber: string;
  specialInstructions?: string;
  paymentMethod: "payhere" | "card" | "cash";
  paymentStatus?: "pending" | "paid" | "failed";
  totalAmount: number;
  createdAt: string;
  items: OrderLineItem[];
};

export type CheckoutPayload = {
  customerName: string;
  contactNumber: string;
  tableNumber: string;
  specialInstructions?: string;
  paymentMethod: "payhere" | "card" | "cash";
  items: CartItem[];
  totalAmount: number;
};
