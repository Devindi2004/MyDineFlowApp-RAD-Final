import Link from "next/link";
import type { Metadata } from "next";
import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Settings,
  ShieldCheck,
  Utensils,
  UsersRound,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/data/menu";
import { getAnalytics } from "@/lib/services/analytics-service";
import { getInventoryAlerts } from "@/lib/services/inventory-service";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "DineFlow admin dashboard.",
};

export default async function AdminPage() {
  const [analytics, inventoryAlerts] = await Promise.all([
    getAnalytics("7d"),
    getInventoryAlerts(),
  ]);
  const metricCards = [
    {
      label: "Revenue",
      value: analytics.metrics[0]?.value ?? "LKR 0",
      icon: BarChart3,
    },
    {
      label: "Orders",
      value: analytics.metrics[1]?.value ?? "0",
      icon: ClipboardList,
    },
    {
      label: "Top item",
      value: "Lagoon Crab Kottu",
      icon: Utensils,
    },
    {
      label: "Low stock",
      value: String(inventoryAlerts.length),
      icon: AlertTriangle,
    },
  ];

  return (
    <ProtectedRoute allowedRoles={["admin"]} pathname="/admin">
      <main className="min-h-screen bg-zinc-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(6,78,59,0.34),rgba(24,24,27,0.88),rgba(124,45,18,0.18))] p-5">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-orange-200">
            Owner cockpit
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Admin dashboard</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Revenue, orders, inventory risk, menu performance, and reports.
          </p>
          <Button asChild className="mt-5 bg-emerald-400 text-zinc-950 hover:bg-emerald-300">
            <Link href="/admin/analytics">Open full analytics</Link>
          </Button>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {metricCards.map(({ icon: Icon, label, value }) => (
            <Card key={label} className="rounded-lg border border-white/10 bg-white/[0.035] py-0">
              <CardContent className="p-5">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-200">
                  <Icon className="size-5" />
                </div>
                <p className="mt-5 text-sm text-zinc-400">{label}</p>
                <p className="mt-2 text-xl font-semibold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.7fr]">
          <Card className="rounded-lg border border-white/10 bg-white/[0.035] py-0">
            <CardContent className="p-5">
              <h2 className="font-semibold">Recent orders</h2>
              <div className="mt-4 space-y-3">
                {analytics.recentOrders.map((order) => (
                  <div key={order.id} className="flex justify-between rounded-lg bg-black/20 p-3 text-sm">
                    <span>{order.id} · {order.table}</span>
                    <span className="text-emerald-200">{formatCurrency(order.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg border border-white/10 bg-white/[0.035] py-0">
            <CardContent className="p-5">
              <h2 className="font-semibold">Inventory alerts</h2>
              <div className="mt-4 space-y-3">
                {inventoryAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-lg border border-orange-300/15 bg-orange-400/10 p-3 text-sm">
                    <p className="font-medium text-orange-100">{alert.item}</p>
                    <p className="text-zinc-400">
                      {alert.currentStock} {alert.unit} left
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-lg border border-white/10 bg-white/[0.035] py-0">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-400/10 text-blue-200">
                  <UsersRound className="size-5" />
                </div>
                <div>
                  <h2 className="font-semibold">Role management</h2>
                  <p className="text-sm text-zinc-400">
                    Admin, chef, waiter, and customer permissions are enforced by route guards.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {["Admin", "Chef", "Waiter", "Customer"].map((role) => (
                  <div key={role} className="rounded-lg bg-black/20 p-3">
                    <ShieldCheck className="mb-2 size-4 text-emerald-200" />
                    {role}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg border border-white/10 bg-white/[0.035] py-0">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-orange-400/10 text-orange-200">
                  <Settings className="size-5" />
                </div>
                <div>
                  <h2 className="font-semibold">Restaurant settings</h2>
                  <p className="text-sm text-zinc-400">
                    Service charge, taxes, QR table defaults, and kitchen notification settings.
                  </p>
                </div>
              </div>
              <Button variant="outline" className="mt-5 border-white/10 bg-white/5 text-white hover:bg-white/10">
                Configure settings
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
      </main>
    </ProtectedRoute>
  );
}
