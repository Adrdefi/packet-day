import type { Metadata } from "next";
import { PLANS } from "@/lib/stripe";
import { isPlanSlug } from "@/lib/plans";
import PricingPageClient from "./PricingPageClient";

export const metadata: Metadata = {
  title: "Pricing — Packet Day",
  description:
    "Simple, affordable pricing for homeschool families. Start free, upgrade when you're ready.",
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;

  return (
    <PricingPageClient
      monthlyPriceId={PLANS.unlimited.monthly.priceId}
      yearlyPriceId={PLANS.unlimited.yearly.priceId}
      initialAnnual={isPlanSlug(plan) ? plan === "yearly" : undefined}
    />
  );
}
