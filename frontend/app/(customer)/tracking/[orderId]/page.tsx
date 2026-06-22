import type { Metadata } from "next";
import { OrderTrackingDetail } from "@/components/customer/order-tracking-detail";

export const metadata: Metadata = {
  title: "Order Details",
  description: "Track a DineFlow order.",
};

type TrackingDetailPageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function TrackingDetailPage({
  params,
}: TrackingDetailPageProps) {
  const { orderId } = await params;

  return <OrderTrackingDetail orderId={orderId} />;
}
