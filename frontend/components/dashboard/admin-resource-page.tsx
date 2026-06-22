import Link from "next/link";
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  MessageSquareText,
  QrCode,
  Star,
  Utensils,
  UsersRound,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type AdminResourcePageProps = {
  active: "menu" | "tables" | "users" | "orders" | "payments" | "reviews" | "analytics";
};

const resources = {
  menu: {
    title: "Menu management",
    description: "Add dishes, update pricing, group by category, and toggle availability.",
    icon: Utensils,
    stats: ["36 items", "8 categories", "5 unavailable"],
    actions: ["Add menu item", "Update availability", "Review popular items"],
  },
  tables: {
    title: "Tables and QR codes",
    description: "Create table records, manage service status, and generate scan URLs.",
    icon: QrCode,
    stats: ["14 tables", "9 available", "14 QR codes"],
    actions: ["Generate QR code", "Mark table seated", "Reset table"],
  },
  users: {
    title: "Staff and customers",
    description: "Create waiters and kitchen users, review customer profiles, and assign roles.",
    icon: UsersRound,
    stats: ["4 roles", "12 staff", "248 customers"],
    actions: ["Add waiter", "Add kitchen user", "Update role"],
  },
  orders: {
    title: "Order operations",
    description: "Monitor pending, accepted, preparing, ready, and served orders.",
    icon: ClipboardList,
    stats: ["18 pending", "7 ready", "124 completed"],
    actions: ["Open kitchen board", "Filter by table", "Export orders"],
  },
  payments: {
    title: "Payments",
    description: "Track PayHere sandbox payments, cash settlements, and failed transactions.",
    icon: CreditCard,
    stats: ["LKR 184k today", "3 pending", "1 failed"],
    actions: ["View PayHere logs", "Mark cash paid", "Reconcile day"],
  },
  reviews: {
    title: "Reviews",
    description: "Read customer feedback, ratings, and post-meal review notes.",
    icon: Star,
    stats: ["4.7 average", "32 new", "8 needs reply"],
    actions: ["Reply to review", "Flag issue", "Share with kitchen"],
  },
  analytics: {
    title: "Analytics",
    description: "Sales summary, popular items, pending orders, and customer feedback.",
    icon: BarChart3,
    stats: ["LKR 1.2m month", "Kottu top item", "18% repeat guests"],
    actions: ["Open charts", "Compare periods", "Download summary"],
  },
};

const nav = [
  ["Dashboard", "/admin/dashboard"],
  ["Menu", "/admin/menu"],
  ["Tables", "/admin/tables"],
  ["Users", "/admin/users"],
  ["Orders", "/admin/orders"],
  ["Payments", "/admin/payments"],
  ["Reviews", "/admin/reviews"],
  ["Analytics", "/admin/analytics"],
];

export function AdminResourcePage({ active }: AdminResourcePageProps) {
  const resource = resources[active];
  const Icon = resource.icon;

  return (
    <ProtectedRoute allowedRoles={["admin"]} pathname={`/admin/${active}`}>
      <main className="min-h-screen bg-zinc-950 px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <nav className="flex flex-wrap gap-2">
            {nav.map(([label, href]) => (
              <Button
                key={href}
                asChild
                variant="outline"
                className="border-white/10 bg-white/[0.04] text-white hover:bg-white/10"
              >
                <Link href={href}>{label}</Link>
              </Button>
            ))}
          </nav>

          <section className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(5,150,105,0.22),rgba(24,24,27,0.9),rgba(234,88,12,0.16))] p-5">
            <Badge className="border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
              Owner/Admin
            </Badge>
            <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <Icon className="size-7 text-emerald-200" />
                  <h1 className="text-3xl font-semibold">{resource.title}</h1>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
                  {resource.description}
                </p>
              </div>
              <Button className="bg-emerald-400 text-zinc-950 hover:bg-emerald-300">
                Primary action
              </Button>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {resource.stats.map((stat) => (
              <Card key={stat} className="rounded-lg border border-white/10 bg-white/[0.035] py-0">
                <CardContent className="p-5">
                  <p className="text-2xl font-semibold text-emerald-200">{stat}</p>
                  <p className="mt-2 text-sm text-zinc-400">Live management metric</p>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            {resource.actions.map((action) => (
              <Card key={action} className="rounded-lg border border-white/10 bg-zinc-900/75 py-0">
                <CardContent className="p-5">
                  <MessageSquareText className="size-5 text-orange-200" />
                  <h2 className="mt-4 font-semibold">{action}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Connected to the backend API surface for role-protected restaurant operations.
                  </p>
                </CardContent>
              </Card>
            ))}
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
