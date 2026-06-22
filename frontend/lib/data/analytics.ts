import { format, subDays } from "date-fns";
import type {
  AnalyticsDashboardData,
  AnalyticsRange,
  CategorySales,
  CustomerGrowthPoint,
  HourlySales,
  LowStockAlert,
  RecentOrder,
  RevenuePoint,
  TopSellingItem,
} from "@/types/analytics";

export function formatLkr(amount: number) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const topItems: TopSellingItem[] = [
  {
    name: "Lagoon Crab Kottu",
    category: "Sri Lankan",
    quantity: 128,
    revenue: 416000,
  },
  {
    name: "Ceylon Pepper Tenderloin",
    category: "Signature",
    quantity: 86,
    revenue: 417100,
  },
  {
    name: "Saffron Prawn Risotto",
    category: "Seafood",
    quantity: 93,
    revenue: 367350,
  },
  {
    name: "Truffle Mushroom Linguine",
    category: "Mains",
    quantity: 104,
    revenue: 296400,
  },
  {
    name: "Smoked Chicken Bao Trio",
    category: "Mains",
    quantity: 119,
    revenue: 291550,
  },
  {
    name: "Dark Chocolate Fondant",
    category: "Desserts",
    quantity: 142,
    revenue: 220100,
  },
  {
    name: "King Coconut Spritz",
    category: "Drinks",
    quantity: 156,
    revenue: 195000,
  },
  {
    name: "Garden Jackfruit Bowl",
    category: "Sri Lankan",
    quantity: 72,
    revenue: 154800,
  },
  {
    name: "Jaffna Prawn Curry",
    category: "Seafood",
    quantity: 64,
    revenue: 211200,
  },
  {
    name: "Cinnamon Creme Brulee",
    category: "Desserts",
    quantity: 81,
    revenue: 137700,
  },
];

const categorySales: CategorySales[] = [
  { category: "Sri Lankan", revenue: 570800, orders: 200 },
  { category: "Mains", revenue: 587950, orders: 223 },
  { category: "Seafood", revenue: 578550, orders: 157 },
  { category: "Signature", revenue: 417100, orders: 86 },
  { category: "Desserts", revenue: 357800, orders: 223 },
  { category: "Drinks", revenue: 195000, orders: 156 },
];

const hourlySales: HourlySales[] = [
  { hour: "11 AM", revenue: 38500, orders: 14 },
  { hour: "12 PM", revenue: 82400, orders: 31 },
  { hour: "1 PM", revenue: 116800, orders: 42 },
  { hour: "2 PM", revenue: 89400, orders: 33 },
  { hour: "5 PM", revenue: 75600, orders: 26 },
  { hour: "6 PM", revenue: 142500, orders: 48 },
  { hour: "7 PM", revenue: 214900, orders: 68 },
  { hour: "8 PM", revenue: 236400, orders: 72 },
  { hour: "9 PM", revenue: 171300, orders: 51 },
  { hour: "10 PM", revenue: 68200, orders: 19 },
];

const recentOrders: RecentOrder[] = [
  {
    id: "DF-78423",
    table: "Table 05",
    customer: "Nethmi",
    amount: 9450,
    status: "Preparing",
    time: "2 min ago",
  },
  {
    id: "DF-78422",
    table: "Table 11",
    customer: "Kasun",
    amount: 18200,
    status: "Ready",
    time: "5 min ago",
  },
  {
    id: "DF-78421",
    table: "Table 03",
    customer: "Ayesha",
    amount: 6200,
    status: "Served",
    time: "9 min ago",
  },
  {
    id: "DF-78420",
    table: "Table 08",
    customer: "Dinuka",
    amount: 12750,
    status: "New",
    time: "12 min ago",
  },
];

const lowStockAlerts: LowStockAlert[] = [
  { item: "Lagoon crab", remaining: 4, unit: "kg", severity: "critical" },
  { item: "King coconut", remaining: 18, unit: "units", severity: "low" },
  { item: "Beef tenderloin", remaining: 6, unit: "portions", severity: "low" },
  { item: "Single-origin chocolate", remaining: 3, unit: "kg", severity: "critical" },
];

function buildRevenueTrend(days: number): RevenuePoint[] {
  return Array.from({ length: days }).map((_, index) => {
    const date = subDays(new Date(), days - index - 1);
    const weekendLift = [5, 6].includes(date.getDay()) ? 82000 : 0;
    const revenue = 318000 + index * 11200 + weekendLift + (index % 3) * 26000;

    return {
      date: format(date, "MMM d"),
      revenue,
      orders: Math.round(revenue / 4300),
    };
  });
}

function buildCustomerGrowth(days: number): CustomerGrowthPoint[] {
  return Array.from({ length: days }).map((_, index) => {
    const date = subDays(new Date(), days - index - 1);

    return {
      date: format(date, "MMM d"),
      newCustomers: 18 + index * 2 + (index % 4) * 3,
      returningCustomers: 42 + index * 3 + (index % 3) * 7,
    };
  });
}

export function getAnalyticsDashboardData(
  range: AnalyticsRange = "7d"
): AnalyticsDashboardData {
  const days = range === "today" ? 1 : range === "30d" ? 30 : range === "all" ? 45 : 7;
  const revenueTrend = buildRevenueTrend(days);
  const totalRevenue = revenueTrend.reduce((total, point) => total + point.revenue, 0);
  const totalOrders = revenueTrend.reduce((total, point) => total + point.orders, 0);
  const topItem = topItems[0];

  return {
    range,
    generatedAt: new Date().toISOString(),
    metrics: [
      {
        label: "Today's Revenue",
        value: formatLkr(486750),
        delta: "+18.4% vs yesterday",
        tone: "emerald",
      },
      {
        label: "Total Orders",
        value: totalOrders.toLocaleString("en-LK"),
        delta: `${range === "today" ? "Today" : `${days} day total`}`,
        tone: "orange",
      },
      {
        label: "Average Order Value",
        value: formatLkr(Math.round(totalRevenue / totalOrders)),
        delta: "+7.2% vs previous period",
        tone: "blue",
      },
      {
        label: "Peak Hour",
        value: "8 PM",
        delta: "72 orders recorded",
        tone: "rose",
      },
      {
        label: "Top Selling Item",
        value: topItem.name,
        delta: `${topItem.quantity} sold this period`,
        tone: "emerald",
      },
    ],
    revenueTrend,
    salesByCategory: categorySales,
    hourlySales,
    topSellingItems: topItems,
    customerGrowth: buildCustomerGrowth(Math.min(days, 14)),
    recentOrders,
    lowStockAlerts,
    satisfaction: {
      averageRating: 4.8,
      responseCount: 342,
      positivePercent: 94,
    },
  };
}
