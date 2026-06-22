import Link from "next/link";
import type { Metadata } from "next";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  ChefHat,
  Download,
  FileSpreadsheet,
  ReceiptText,
  Star,
  TrendingUp,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AnalyticsCharts } from "@/components/dashboard/analytics-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLkr } from "@/lib/data/analytics";
import { getAnalytics } from "@/lib/services/analytics-service";
import { cn } from "@/lib/utils";
import type { AnalyticsRange } from "@/types/analytics";

export const metadata: Metadata = {
  title: "Admin Analytics",
  description: "DineFlow restaurant owner analytics dashboard.",
};

const rangeOptions: { label: string; value: AnalyticsRange }[] = [
  { label: "Today", value: "today" },
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "All Time", value: "all" },
];

const metricIcons = [TrendingUp, ReceiptText, ArrowUpRight, CalendarDays, ChefHat];

const toneClasses = {
  emerald: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  orange: "border-orange-300/20 bg-orange-300/10 text-orange-200",
  blue: "border-blue-300/20 bg-blue-300/10 text-blue-200",
  rose: "border-rose-300/20 bg-rose-300/10 text-rose-200",
};

type AnalyticsPageProps = {
  searchParams: Promise<{
    range?: string;
  }>;
};

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const params = await searchParams;
  const selectedRange = isAnalyticsRange(params.range) ? params.range : "7d";
  const data = await getAnalytics(selectedRange);

  return (
    <ProtectedRoute allowedRoles={["admin"]} pathname="/admin/analytics">
      <main className="min-h-screen bg-zinc-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="flex flex-col gap-5 rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(6,78,59,0.28),rgba(24,24,27,0.78)_48%,rgba(124,45,18,0.2))] p-5 shadow-2xl shadow-black/20 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
              Owner Dashboard
            </Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">
              Sales Analytics
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
              Revenue, order behavior, inventory risk, customer satisfaction,
              and live service signals for DineFlow restaurant operations.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex rounded-lg border border-white/10 bg-black/25 p-1">
              {rangeOptions.map((option) => (
                <Button
                  key={option.value}
                  asChild
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "min-h-9 rounded-md px-3 text-zinc-300 hover:bg-white/10 hover:text-white",
                    selectedRange === option.value &&
                      "bg-emerald-400 text-zinc-950 hover:bg-emerald-300 hover:text-zinc-950"
                  )}
                >
                  <Link href={`/admin/analytics?range=${option.value}`}>
                    {option.label}
                  </Link>
                </Button>
              ))}
            </div>
            <Button className="min-h-10 bg-orange-400 text-zinc-950 hover:bg-orange-300">
              <Download className="size-4" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              className="min-h-10 border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <FileSpreadsheet className="size-4" />
              Excel
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {data.metrics.map((metric, index) => {
            const Icon = metricIcons[index] ?? TrendingUp;

            return (
              <Card
                key={metric.label}
                className="rounded-lg border border-white/10 bg-white/[0.035] py-0"
              >
                <CardContent className="p-5">
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg border",
                      toneClasses[metric.tone]
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <p className="mt-5 text-sm text-zinc-400">{metric.label}</p>
                  <p className="mt-2 text-2xl font-semibold leading-tight text-white xl:text-xl">
                    {metric.value}
                  </p>
                  <p className="mt-2 text-xs text-emerald-200">{metric.delta}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <AnalyticsCharts data={data} />

        <section className="grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
          <Card className="rounded-lg border border-white/10 bg-white/[0.035] py-0">
            <CardHeader className="border-b border-white/10 px-5 py-4">
              <CardTitle className="text-base font-semibold text-white">
                Recent Orders
              </CardTitle>
              <p className="text-sm text-zinc-400">Live feed from QR ordering</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/10">
                {data.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white">{order.id}</p>
                        <Badge className={cn("text-xs", statusClass(order.status))}>
                          {order.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">
                        {order.table} · {order.customer} · {order.time}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-200">
                      {formatLkr(order.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card className="rounded-lg border border-white/10 bg-white/[0.035] py-0">
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
                  <AlertTriangle className="size-4 text-orange-300" />
                  Low Stock Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {data.lowStockAlerts.map((alert) => (
                  <div
                    key={alert.item}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 p-3"
                  >
                    <div>
                      <p className="font-medium text-white">{alert.item}</p>
                      <p className="text-xs text-zinc-400">
                        {alert.remaining} {alert.unit} remaining
                      </p>
                    </div>
                    <Badge
                      className={
                        alert.severity === "critical"
                          ? "bg-rose-400/15 text-rose-200"
                          : "bg-orange-400/15 text-orange-200"
                      }
                    >
                      {alert.severity}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.045] py-0">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400">Customer Satisfaction</p>
                    <p className="mt-2 text-4xl font-semibold text-white">
                      {data.satisfaction.averageRating}
                    </p>
                  </div>
                  <div className="flex size-14 items-center justify-center rounded-lg bg-orange-400/15 text-orange-200">
                    <Star className="size-7 fill-orange-300" />
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-300">
                  {data.satisfaction.positivePercent}% positive feedback from{" "}
                  {data.satisfaction.responseCount} verified dining responses.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
      </main>
    </ProtectedRoute>
  );
}

function isAnalyticsRange(value: string | undefined): value is AnalyticsRange {
  return value === "today" || value === "7d" || value === "30d" || value === "all";
}

function statusClass(status: string) {
  if (status === "Ready") {
    return "bg-emerald-400/15 text-emerald-200";
  }

  if (status === "Preparing") {
    return "bg-orange-400/15 text-orange-200";
  }

  if (status === "New") {
    return "bg-blue-400/15 text-blue-200";
  }

  return "bg-white/10 text-zinc-300";
}
