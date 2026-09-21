import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/stripe";
import { isPaidStatus } from "@/lib/isPaid";

/**
 * Price ID lookup plus a fresh isPaid read, for UpgradeModal. app/page.tsx
 * and app/pricing/page.tsx are server components that already read the
 * price IDs from PLANS and pass them down as props to PricingSection /
 * PricingPageClient. app/generate/page.tsx has no server-component wrapper
 * to do the same, so UpgradeModal fetches this itself instead. The price
 * IDs aren't a secret — they already reach the browser through those
 * existing props today. isPaid is: this is the server-side gate that makes
 * every UpgradeModal trigger (including the generate page's, which only
 * has client-held subscription state to go on) ultimately answer to a
 * fresh database read, never client state alone.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You need to be logged in." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    monthlyPriceId: PLANS.unlimited.monthly.priceId,
    yearlyPriceId: PLANS.unlimited.yearly.priceId,
    isPaid: isPaidStatus(profile?.subscription_status),
  });
}
