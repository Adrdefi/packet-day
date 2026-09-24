import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/stripe";
import { getLatestMascotUrl, getPlanState } from "@/lib/packetUsage";

/**
 * Price ID lookup plus a fresh isPaid read, for UpgradeModal. app/page.tsx
 * and app/pricing/page.tsx are server components that already read the
 * price IDs from PLANS and pass them down as props to PricingPlans /
 * PricingPageClient. app/generate/page.tsx has no server-component wrapper
 * to do the same, so UpgradeModal fetches this itself instead. The price
 * IDs aren't a secret — they already reach the browser through those
 * existing props today. isPaid is: this is the server-side gate that makes
 * every UpgradeModal trigger (including the generate page's, which only
 * has client-held subscription state to go on) ultimately answer to a
 * fresh database read, never client state alone.
 *
 * capped, packetsUsed and resetDate come from lib/packetUsage.ts's
 * getPlanState, the same read app/dashboard/page.tsx uses, so the generate
 * page, the result screen and the dashboard all agree on who is out of
 * packets this month.
 *
 * latestMascotUrl: the newest hosted mascot for ?childId= (or for the whole
 * account when absent), for the small picture at the top of UpgradeModal.
 * Scoped to the logged-in user by both the query and RLS.
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You need to be logged in." }, { status: 401 });
  }

  const childId = new URL(request.url).searchParams.get("childId");

  const [plan, latestMascotUrl] = await Promise.all([
    getPlanState(supabase, user.id, "plans"),
    getLatestMascotUrl(supabase, user.id, childId),
  ]);

  return NextResponse.json({
    monthlyPriceId: PLANS.unlimited.monthly.priceId,
    yearlyPriceId: PLANS.unlimited.yearly.priceId,
    isPaid: plan.isPaid,
    capped: plan.capped,
    packetsUsed: plan.packetsUsed,
    resetDate: plan.resetDate,
    latestMascotUrl,
  });
}
