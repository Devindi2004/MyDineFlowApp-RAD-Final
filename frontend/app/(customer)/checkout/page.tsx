import type { Metadata } from "next";
import { CheckoutExperience } from "@/components/customer/checkout-experience";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your DineFlow order checkout.",
};

type CheckoutPageProps = {
  searchParams: Promise<{
    table?: string;
  }>;
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;

  return <CheckoutExperience initialTableNumber={params.table ?? "07"} />;
}
