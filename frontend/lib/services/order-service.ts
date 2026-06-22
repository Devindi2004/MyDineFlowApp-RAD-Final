import { api, isApiUnavailable, unwrapApiData } from "@/lib/api";
import { mockOrders } from "@/lib/data/orders";
import type { CheckoutPayload, CustomerOrder, OrderStatus } from "@/types/order";

export async function getOrders() {
  try {
    const response = await api.get<unknown>("/orders");
    const payload = unwrapApiData(response.data);
    const items = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { orders?: unknown[] })?.orders)
        ? (payload as { orders: unknown[] }).orders
        : [];

    return items.map(normalizeOrder);
  } catch (error) {
    if (isApiUnavailable(error)) {
      return mockOrders;
    }
    return mockOrders;
  }
}

export async function getOrderById(orderId: string) {
  try {
    const response = await api.get<unknown>(`/orders/${encodeURIComponent(orderId)}`);
    return normalizeOrder(unwrapApiData(response.data));
  } catch {
    return (
      mockOrders.find(
        (order) => order.id === orderId || order.orderNumber === orderId
      ) ?? mockOrders[0]
    );
  }
}

export async function createOrder(payload: CheckoutPayload) {
  try {
    const response = await api.post<unknown>("/orders", {
      customerName: payload.customerName,
      contactNumber: payload.contactNumber,
      tableNumber: payload.tableNumber,
      specialInstructions: payload.specialInstructions,
      paymentMethod: payload.paymentMethod,
      totalAmount: payload.totalAmount,
      items: payload.items.map((item) => ({
        menuItem: item.id,
        quantity: item.quantity,
        price: item.price,
        specialInstructions: item.notes,
      })),
    });

    return normalizeOrder(unwrapApiData(response.data));
  } catch (error) {
    if (!isApiUnavailable(error)) {
      throw error;
    }
    const orderNumber = `DF-${Math.floor(Math.random() * 90000) + 10000}`;
    return {
      id: `ord-${Date.now()}`,
      orderNumber,
      status: "new" as OrderStatus,
      tableNumber: payload.tableNumber,
      customerName: payload.customerName,
      contactNumber: payload.contactNumber,
      specialInstructions: payload.specialInstructions,
      paymentMethod: payload.paymentMethod,
      totalAmount: payload.totalAmount,
      createdAt: new Date().toISOString(),
      items: payload.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        specialInstructions: item.notes,
      })),
    };
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  try {
    const response = await api.patch<unknown>(`/orders/${orderId}/status`, { status });
    return normalizeOrder(unwrapApiData(response.data));
  } catch {
    return mockOrders.find((order) => order.id === orderId) ?? null;
  }
}

export function normalizeOrder(payload: unknown): CustomerOrder {
  const record = payload as Record<string, unknown>;
  const rawItems = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.orderItems)
      ? record.orderItems
      : [];

  return {
    id: stringValue(record.id) ?? stringValue(record._id) ?? cryptoId(),
    orderNumber:
      stringValue(record.orderNumber) ??
      stringValue(record.number) ??
      `DF-${Math.floor(Math.random() * 90000) + 10000}`,
    status: normalizeStatus(stringValue(record.status)),
    tableNumber:
      stringValue(record.tableNumber) ??
      stringValue((record.table as Record<string, unknown> | undefined)?.tableNumber) ??
      "00",
    customerName:
      stringValue(record.customerName) ??
      stringValue((record.customer as Record<string, unknown> | undefined)?.name) ??
      "Guest",
    contactNumber: stringValue(record.contactNumber) ?? "",
    specialInstructions: stringValue(record.specialInstructions),
    paymentMethod:
      stringValue(record.paymentMethod) === "payhere" ||
      stringValue(record.paymentMethod) === "card" ||
      stringValue(record.paymentMethod) === "cash"
        ? (stringValue(record.paymentMethod) as CustomerOrder["paymentMethod"])
        : "cash",
    paymentStatus:
      stringValue(record.paymentStatus) === "paid" ||
      stringValue(record.paymentStatus) === "failed" ||
      stringValue(record.paymentStatus) === "pending"
        ? (stringValue(record.paymentStatus) as CustomerOrder["paymentStatus"])
        : "pending",
    totalAmount:
      numberValue(record.totalAmount) ??
      numberValue(record.total) ??
      numberValue(record.amount) ??
      0,
    createdAt: stringValue(record.createdAt) ?? new Date().toISOString(),
    items: rawItems.map((item) => {
      const line = item as Record<string, unknown>;
      const menuItem = line.menuItem as Record<string, unknown> | undefined;

      return {
        id: stringValue(line.id) ?? stringValue(line._id) ?? cryptoId(),
        name:
          stringValue(line.name) ??
          stringValue(menuItem?.name) ??
          "Menu item",
        quantity: numberValue(line.quantity) ?? 1,
        price: numberValue(line.price) ?? numberValue(menuItem?.price) ?? 0,
        specialInstructions: stringValue(line.specialInstructions),
      };
    }),
  };
}

function normalizeStatus(value: string | undefined): OrderStatus {
  const lower = value?.toLowerCase();

  if (lower === "pending" || lower === "new") {
    return "new";
  }

  if (lower === "accepted") {
    return "accepted";
  }

  if (lower === "preparing" || lower === "in_progress") {
    return "preparing";
  }

  if (lower === "ready") {
    return "ready";
  }

  if (lower === "completed" || lower === "served") {
    return "completed";
  }

  return "new";
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function cryptoId() {
  return `ord-${Math.random().toString(36).slice(2, 10)}`;
}
