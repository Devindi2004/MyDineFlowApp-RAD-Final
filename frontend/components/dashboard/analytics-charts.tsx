"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLkr } from "@/lib/data/analytics";
import type { AnalyticsDashboardData } from "@/types/analytics";

const chartColors = ["#34d399", "#fb923c", "#60a5fa", "#f472b6", "#a78bfa", "#facc15"];

type AnalyticsChartsProps = {
  data: AnalyticsDashboardData;
};

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <ChartCard
        className="xl:col-span-8"
        title="Revenue Trend"
        description="Last period revenue and order volume"
      >
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data.revenueTrend} margin={{ left: 0, right: 12 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.34} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} stroke="#a1a1aa" />
            <YAxis
              tickLine={false}
              axisLine={false}
              stroke="#a1a1aa"
              tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#34d399"
              strokeWidth={3}
              fill="url(#revenueGradient)"
              activeDot={{ r: 5, fill: "#fb923c", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        className="xl:col-span-4"
        title="Sales by Category"
        description="Revenue contribution by menu family"
      >
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={data.salesByCategory}
              dataKey="revenue"
              nameKey="category"
              innerRadius={70}
              outerRadius={112}
              paddingAngle={3}
            >
              {data.salesByCategory.map((entry, index) => (
                <Cell
                  key={entry.category}
                  fill={chartColors[index % chartColors.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
            <Legend
              iconType="circle"
              wrapperStyle={{ color: "#d4d4d8", fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        className="xl:col-span-6"
        title="Hourly Sales"
        description="Service rhythm across lunch and dinner"
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.hourlySales}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="hour" tickLine={false} axisLine={false} stroke="#a1a1aa" />
            <YAxis tickLine={false} axisLine={false} stroke="#a1a1aa" />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="orders" radius={[6, 6, 0, 0]} fill="#fb923c" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        className="xl:col-span-6"
        title="Customer Growth"
        description="New and returning guest momentum"
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.customerGrowth} margin={{ right: 12 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} stroke="#a1a1aa" />
            <YAxis tickLine={false} axisLine={false} stroke="#a1a1aa" />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ color: "#d4d4d8", fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="newCustomers"
              stroke="#34d399"
              strokeWidth={3}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="returningCustomers"
              stroke="#60a5fa"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        className="xl:col-span-12"
        title="Top 10 Selling Items"
        description="Quantity sold by item for the selected period"
      >
        <ResponsiveContainer width="100%" height={360}>
          <BarChart
            data={data.topSellingItems}
            layout="vertical"
            margin={{ left: 24, right: 16 }}
          >
            <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} stroke="#a1a1aa" />
            <YAxis
              dataKey="name"
              type="category"
              width={150}
              tickLine={false}
              axisLine={false}
              stroke="#d4d4d8"
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="quantity" radius={[0, 6, 6, 0]}>
              {data.topSellingItems.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={chartColors[index % chartColors.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

type ChartCardProps = {
  children: React.ReactNode;
  className?: string;
  description: string;
  title: string;
};

function ChartCard({ children, className, description, title }: ChartCardProps) {
  return (
    <Card className={`rounded-lg border border-white/10 bg-white/[0.035] py-0 ${className ?? ""}`}>
      <CardHeader className="border-b border-white/10 px-5 py-4">
        <CardTitle className="text-base font-semibold text-white">{title}</CardTitle>
        <p className="text-sm text-zinc-400">{description}</p>
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

type TooltipPayload = {
  name: string;
  value: number;
  payload?: Record<string, unknown>;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-white/10 bg-zinc-950/95 p-3 text-sm shadow-2xl">
      {label && <p className="mb-2 font-medium text-white">{label}</p>}
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={item.name} className="flex min-w-40 justify-between gap-4 text-zinc-300">
            <span className="capitalize">{item.name.replace(/([A-Z])/g, " $1")}</span>
            <span className="font-semibold text-emerald-200">
              {item.name.toLowerCase().includes("revenue")
                ? formatLkr(item.value)
                : item.value.toLocaleString("en-LK")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
