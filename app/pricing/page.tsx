import type { Metadata } from "next";
import { PLANS } from "@/lib/stripe";
import { isPlanSlug, PLAN_PRICE } from "@/lib/plans";
import PricingPageClient from "./PricingPageClient";
import JsonLd from "@/components/JsonLd";
import { softwareApplicationNode } from "@/lib/softwareApplicationJsonLd";
import { SITE_URL, DEFAULT_OPEN_GRAPH, DEFAULT_TWITTER, DEFAULT_OG_IMAGE } from "@/lib/site";

const TITLE = "Pricing | Packet Day";
const DESCRIPTION =
  `Packet Day pricing: one free packet a month, or unlimited packets for every kid in your family for $${Math.round(PLAN_PRICE.yearly / 12)}/month billed yearly or $${PLAN_PRICE.monthly} month to month.`;

export const metadata: Metadata = {
  // Bare page name here, not TITLE — the layout's "%s | Packet Day" template
  // already appends the brand; using TITLE (which also ends in "Packet Day")
  // would double it up to "Pricing — Packet Day | Packet Day".
  title: "Pricing",
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
    <>
      <JsonLd data={{ "@context": "https://schema.org", ...softwareApplicationNode }} />
      <PricingPageClient
        monthlyPriceId={PLANS.unlimited.monthly.priceId}
        yearlyPriceId={PLANS.unlimited.yearly.priceId}
        initialAnnual={isPlanSlug(plan) ? plan === "yearly" : undefined}
      />
    </>
  );
}
