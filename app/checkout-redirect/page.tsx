import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSessionUrl, getPriceIdForPlan } from "@/lib/stripe";
import { isPlanSlug } from "@/lib/plans";
import { getBaseUrl } from "@/lib/config";

/**
 * Post-signup/login checkout handoff. Reached from /auth/callback (after
 * email confirmation) or /login, both carrying a validated plan slug —
 * never a raw Stripe price ID — so the plan a user picked on /pricing
 * survives the auth detour instead of dropping them on the dashboard.
 */
export default async function CheckoutRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;

  if (!isPlanSlug(plan)) redirect("/pricing");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/pricing");

  const url = await createCheckoutSessionUrl({
    supabase,
    userId: user.id,
    userEmail: user.email,
    priceId: getPriceIdForPlan(plan),
    baseUrl: getBaseUrl(await headers()),
  });

  if (!url) redirect("/pricing");

  redirect(url);
}
