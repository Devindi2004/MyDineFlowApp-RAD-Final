import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "QR Scan" };

type ScanPageProps = {
  params: Promise<{ restaurantId: string; tableId: string }>;
};

export default async function ScanPage({ params }: ScanPageProps) {
  const { restaurantId, tableId } = await params;
  redirect(`/customer/menu?restaurant=${encodeURIComponent(restaurantId)}&table=${encodeURIComponent(tableId)}`);
}
