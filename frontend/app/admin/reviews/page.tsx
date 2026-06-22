import type { Metadata } from "next";
import { AdminResourcePage } from "@/components/dashboard/admin-resource-page";

export const metadata: Metadata = { title: "Admin Reviews" };

export default function AdminReviewsPage() {
  return <AdminResourcePage active="reviews" />;
}
