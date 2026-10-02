import type { SupabaseClient } from "@supabase/supabase-js";
import { createCheckoutSessionUrl, type CheckoutStripe } from "@/lib/stripe";
import { isPaidStatus } from "@/lib/isPaid";

export type CheckoutRedirectResult = { kind: "redirect"; to: string } | { kind: "error" };

interface ResolveCheckoutRedirectArgs {
  supabase: SupabaseClient;
  userId: string;
  userEmail: string | null | undefined;
  priceId: string;
  baseUrl: string;
  stripe?: CheckoutStripe;
}

/**
 * Where /checkout-redirect sends a signed in user. A paid account goes to the
 * dashboard and never gets a second checkout, the same rule the plan buttons
 * follow (app/api/create-checkout-session). Any failure comes back as
 * { kind: "error" } so the page can show a friendly message.
 */
export async function resolveCheckoutRedirect({
  supabase,
  userId,
  userEmail,
  priceId,
  baseUrl,
  stripe,
}: ResolveCheckoutRedirectArgs): Promise<CheckoutRedirectResult> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", userId)
      .single();

    if (isPaidStatus(profile?.subscription_status)) return { kind: "redirect", to: "/dashboard" };

    const url = await createCheckoutSessionUrl({ supabase, userId, userEmail, priceId, baseUrl, stripe });
    return { kind: "redirect", to: url ?? "/pricing" };
  } catch (err) {
    console.error("[checkout-redirect]", err);
    return { kind: "error" };
  }
}
