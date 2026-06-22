import type { Metadata } from "next";
import { AdminResourcePage } from "@/components/dashboard/admin-resource-page";

export const metadata: Metadata = { title: "Admin Users" };

export default function AdminUsersPage() {
  return <AdminResourcePage active="users" />;
}
