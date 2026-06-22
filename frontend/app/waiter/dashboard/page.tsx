import type { Metadata } from "next";
import { WaiterDashboard } from "@/components/dashboard/waiter-dashboard";

export const metadata: Metadata = { title: "Waiter Dashboard" };

export default function WaiterPage() {
  return <WaiterDashboard />;
}
