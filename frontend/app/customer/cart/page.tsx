import type { Metadata } from "next";
import { MenuExperience } from "@/components/customer/menu-experience";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return <MenuExperience />;
}
