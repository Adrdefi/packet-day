import type { Metadata } from "next";
import { PLANS } from "@/lib/stripe";
import { isPlanSlug } from "@/lib/plans";
import PricingPageClient from "./PricingPageClient";
import { SITE_URL, DEFAULT_OPEN_GRAPH, DEFAULT_TWITTER, DEFAULT_OG_IMAGE } from "@/lib/site";

const TITLE = "Pricing — Packet Day";
const DESCRIPTION =
  "Simple, affordable pricing for homeschool families. Start free, upgrade when you're ready.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/pricing` },
  openGraph: {
    ...DEFAULT_OPEN_GRAPH,
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/pricing`,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    ...DEFAULT_TWITTER,
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
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
