import type { Metadata } from "next";
import { AdminResourcePage } from "@/components/dashboard/admin-resource-page";

export const metadata: Metadata = { title: "Admin Payments" };

export default function AdminPaymentsPage() {
  return <AdminResourcePage active="payments" />;
}
