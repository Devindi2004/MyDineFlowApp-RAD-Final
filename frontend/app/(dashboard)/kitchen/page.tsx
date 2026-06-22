import type { Metadata } from "next";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { KitchenDashboard } from "@/components/dashboard/kitchen-dashboard";

export const metadata: Metadata = {
  title: "Kitchen Dashboard",
  description: "DineFlow kitchen order management dashboard.",
};

export default function KitchenPage() {
  return (
    <ProtectedRoute
      allowedRoles={["admin", "chef", "waiter", "kitchen"]}
      pathname="/kitchen"
    >
      <KitchenDashboard />
    </ProtectedRoute>
  );
}
