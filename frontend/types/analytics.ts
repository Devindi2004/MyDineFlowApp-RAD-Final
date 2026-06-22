export type AnalyticsRange = "today" | "7d" | "30d" | "all";

export type MetricCard = {
  label: string;
  value: string;
  delta: string;
  tone: "emerald" | "orange" | "blue" | "rose";
};

export type RevenuePoint = {
  date: string;
  revenue: number;
  orders: number;
};

export type CategorySales = {
  category: string;
  revenue: number;
  orders: number;
};

export type HourlySales = {
  hour: string;
  revenue: number;
  orders: number;
};

export type TopSellingItem = {
  name: string;
  category: string;
  quantity: number;
  revenue: number;
};

export type CustomerGrowthPoint = {
  date: string;
  newCustomers: number;
  returningCustomers: number;
};

export type RecentOrder = {
  id: string;
  table: string;
  customer: string;
  amount: number;
  status: "New" | "Preparing" | "Ready" | "Served";
  time: string;
};

export type LowStockAlert = {
  item: string;
  remaining: number;
  unit: string;
  severity: "low" | "critical";
};

export type AnalyticsDashboardData = {
  range: AnalyticsRange;
  generatedAt: string;
  metrics: MetricCard[];
  revenueTrend: RevenuePoint[];
  salesByCategory: CategorySales[];
  hourlySales: HourlySales[];
  topSellingItems: TopSellingItem[];
  customerGrowth: CustomerGrowthPoint[];
  recentOrders: RecentOrder[];
  lowStockAlerts: LowStockAlert[];
  satisfaction: {
    averageRating: number;
    responseCount: number;
    positivePercent: number;
  };
};
