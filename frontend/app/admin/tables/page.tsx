import type { Metadata } from "next";
import { AdminResourcePage } from "@/components/dashboard/admin-resource-page";

export const metadata: Metadata = { title: "Admin Tables" };

export default function AdminTablesPage() {
  return <AdminResourcePage active="tables" />;
}
