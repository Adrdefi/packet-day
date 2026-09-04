import type { Metadata } from "next";
import { PLANS } from "@/lib/stripe";
import PricingPageClient from "./PricingPageClient";

export const metadata: Metadata = {
  title: "Pricing — Packet Day",
  description:
    "Simple, affordable pricing for homeschool families. Start free, upgrade when you're ready.",
};

export default function PricingPage() {
  return (
    <PricingPageClient
      monthlyPriceId={PLANS.unlimited.monthly.priceId}
      yearlyPriceId={PLANS.unlimited.yearly.priceId}
    />
  );
}
