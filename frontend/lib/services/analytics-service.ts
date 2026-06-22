import { api, isApiUnavailable, unwrapApiData } from "@/lib/api";
import { formatLkr, getAnalyticsDashboardData } from "@/lib/data/analytics";
import type { AnalyticsDashboardData, AnalyticsRange } from "@/types/analytics";

export async function getAnalytics(range: AnalyticsRange = "7d") {
  try {
    const response = await api.get<unknown>(`/analytics?range=${range}`);
    return normalizeAnalytics(unwrapApiData(response.data), range);
  } catch (error) {
    if (isApiUnavailable(error)) {
      return getAnalyticsDashboardData(range);
    }
    return getAnalyticsDashboardData(range);
  }
}

function normalizeAnalytics(payload: unknown, range: AnalyticsRange): AnalyticsDashboardData {
  const fallback = getAnalyticsDashboardData(range);
  const record = payload as { analytics?: Record<string, unknown> } | Record<string, unknown>;
  const analytics = ("analytics" in record ? record.analytics : record) as Record<string, unknown>;

  if (!analytics || typeof analytics !== "object") {
    return fallback;
  }

  const revenue = numberValue(analytics.revenue);
  const totalOrders = numberValue(analytics.totalOrders);
  const averageOrderValue = numberValue(analytics.averageOrderValue);
  const chartData = Array.isArray(analytics.chartData) ? analytics.chartData : [];
  const topSellingFoods = Array.isArray(analytics.topSellingFoods)
    ? analytics.topSellingFoods
    : [];
  const recentOrders = Array.isArray(analytics.recentOrders) ? analytics.recentOrders : [];
  const lowStockAlerts = Array.isArray(analytics.lowStockAlerts)
    ? analytics.lowStockAlerts
    : [];

  return {
    ...fallback,
    generatedAt: new Date().toISOString(),
    metrics: [
      {
        label: "Revenue",
        value: formatLkr(revenue),
        delta: "From completed and active orders",
        tone: "emerald",
      },
      {
        label: "Orders",
        value: String(totalOrders),
        delta: "Real MongoDB order count",
        tone: "blue",
      },
      {
        label: "Average Order",
        value: formatLkr(averageOrderValue),
        delta: "Average basket value",
        tone: "orange",
      },
      ...fallback.metrics.slice(3),
    ],
    revenueTrend:
      chartData.length > 0
        ? chartData.map((point) => {
            const item = point as Record<string, unknown>;
            return {
              date: stringValue(item.date) ?? "",
              revenue: numberValue(item.revenue),
              orders: numberValue(item.orders),
            };
          })
        : fallback.revenueTrend,
    topSellingItems:
      topSellingFoods.length > 0
        ? topSellingFoods.map((item) => {
            const food = item as Record<string, unknown>;
            return {
              name: stringValue(food.name) ?? "Menu item",
              category: stringValue(food.category) ?? "Menu",
              quantity: numberValue(food.quantitySold),
              revenue: numberValue(food.revenue),
            };
          })
        : fallback.topSellingItems,
    recentOrders:
      recentOrders.length > 0
        ? recentOrders.map((item) => {
            const order = item as Record<string, unknown>;
            const customer = order.customer as Record<string, unknown> | undefined;
            return {
              id: stringValue(order.orderNumber) ?? stringValue(order._id) ?? "Order",
              table: `Table ${stringValue(order.tableNumber) ?? "00"}`,
              customer:
                stringValue(order.customerName) ?? stringValue(customer?.name) ?? "Guest",
              amount: numberValue(order.totalAmount),
              status: normalizeStatus(stringValue(order.status)),
              time: stringValue(order.createdAt)
                ? new Date(String(order.createdAt)).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Now",
            };
          })
        : fallback.recentOrders,
    lowStockAlerts:
      lowStockAlerts.length > 0
        ? lowStockAlerts.map((item) => {
            const alert = item as Record<string, unknown>;
            const stock = numberValue(alert.stock);
            const threshold = numberValue(alert.threshold);
            return {
              item: stringValue(alert.name) ?? stringValue(alert.item) ?? "Inventory item",
              remaining: stock,
              unit: stringValue(alert.unit) ?? "units",
              severity: stock <= Math.max(1, threshold / 2) ? "critical" : "low",
            };
          })
        : fallback.lowStockAlerts,
  };
}

function normalizeStatus(value: string | undefined): "New" | "Preparing" | "Ready" | "Served" {
  if (value === "preparing") return "Preparing";
  if (value === "ready") return "Ready";
  if (value === "completed") return "Served";
  return "New";
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
