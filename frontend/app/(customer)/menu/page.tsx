import type { Metadata } from "next";
import { MenuExperience } from "@/components/customer/menu-experience";

export const metadata: Metadata = {
  title: "Digital QR Menu",
  description:
    "Browse DineFlow's AI-powered QR menu with recommendations, smart filters, and cart checkout.",
};

type MenuPageProps = {
  searchParams: Promise<{
    restaurant?: string;
    table?: string;
  }>;
};

export default async function MenuPage({ searchParams }: MenuPageProps) {
  const params = await searchParams;

  return (
    <MenuExperience
      initialRestaurantId={params.restaurant}
      initialTableNumber={params.table}
    />
  );
}
