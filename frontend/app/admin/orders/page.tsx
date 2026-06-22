import type { Metadata } from "next";
import { AdminResourcePage } from "@/components/dashboard/admin-resource-page";

export const metadata: Metadata = { title: "Admin Orders" };

export default function AdminOrdersPage() {
  return <AdminResourcePage active="orders" />;
}
