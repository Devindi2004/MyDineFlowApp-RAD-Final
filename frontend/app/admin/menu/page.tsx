import type { Metadata } from "next";
import { AdminResourcePage } from "@/components/dashboard/admin-resource-page";

export const metadata: Metadata = { title: "Admin Menu" };

export default function AdminMenuPage() {
  return <AdminResourcePage active="menu" />;
}
