import { NextResponse } from "next/server";
import { PLANS } from "@/lib/stripe";

/**
 * Read-only price ID lookup. app/page.tsx and app/pricing/page.tsx are
 * server components that already read these from PLANS and pass them down
 * as props to PricingSection / PricingPageClient. app/generate/page.tsx has
 * no server-component wrapper to do the same, so UpgradeModal fetches this
 * itself instead. Not a secret — these two IDs already reach the browser
 * through those existing props today; this just gives a client-only
 * surface the same values without restructuring its route.
 */
export async function GET() {
  return NextResponse.json({
    monthlyPriceId: PLANS.unlimited.monthly.priceId,
    yearlyPriceId: PLANS.unlimited.yearly.priceId,
  });
}
