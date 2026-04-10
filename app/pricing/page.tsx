import type { Metadata } from "next";
import PricingPageClient from "./PricingPageClient";

export const metadata: Metadata = {
  title: "Pricing — Packet Day",
  description:
    "Simple, affordable pricing for homeschool families. Start free, upgrade when you're ready.",
};

export default function PricingPage() {
  const annualPriceId = process.env.STRIPE_ANNUAL_PRICE_ID ?? "";
  const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID ?? "";

  return (
    <PricingPageClient
      annualPriceId={annualPriceId}
      monthlyPriceId={monthlyPriceId}
    />
  );
}
