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
 *
 * capped: free tier AND this month's packet already used, from the same
 * get_my_packet_usage read (and the same used >= 1 rule) as
 * app/dashboard/page.tsx. The generate page's result view uses it to decide
 * whether to show the upgrade card in place of "Generate another packet".
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You need to be logged in." }, { status: 401 });
  }

  const [{ data: profile }, { data: usageRows, error: usageError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("subscription_status, packets_used_this_month")
      .eq("id", user.id)
      .single(),
    supabase.rpc("get_my_packet_usage"),
  ]);

  if (usageError) {
    console.error("[plans] get_my_packet_usage failed, falling back to raw profile column:", usageError.message);
  }
  const isPaid = isPaidStatus(profile?.subscription_status);
  const packetsUsed = usageRows?.[0]?.packets_used ?? profile?.packets_used_this_month ?? 0;

  return NextResponse.json({
    monthlyPriceId: PLANS.unlimited.monthly.priceId,
    yearlyPriceId: PLANS.unlimited.yearly.priceId,
    isPaid,
    capped: !isPaid && packetsUsed >= 1,
  });
}
