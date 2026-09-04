import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { type PlanSlug, PLAN_PRICE } from "@/lib/plans";

// ─── Lazy client ──────────────────────────────────────────────────────────────

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Missing STRIPE_SECRET_KEY environment variable");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

// ─── Plans ────────────────────────────────────────────────────────────────────
// One paid plan — "Packet Day Unlimited" — billed either monthly or yearly.

export const PLANS = {
  free: {
    id: "free" as const,
    name: "Free",
    packetsPerMonth: 1,
    price: 0,
  },
  unlimited: {
    id: "unlimited" as const,
    name: "Packet Day Unlimited",
    packetsPerMonth: -1, // unlimited
    monthly: {
      priceId: process.env.STRIPE_PRICE_MONTHLY ?? "",
      price: PLAN_PRICE.monthly,
    },
    yearly: {
      priceId: process.env.STRIPE_PRICE_YEARLY ?? "",
      price: PLAN_PRICE.yearly,
    },
  },
} as const;

/** Maps a validated plan slug (never a raw Stripe price ID from a URL) to its price ID. */
export function getPriceIdForPlan(plan: PlanSlug): string {
  return PLANS.unlimited[plan].priceId;
}

// ─── Checkout session creation ─────────────────────────────────────────────────
// Shared by app/api/create-checkout-session/route.ts (direct upgrade) and
// app/checkout-redirect/page.tsx (post-signup/login handoff) so the
// customer-lookup-or-create + session-create logic isn't duplicated.

interface CreateCheckoutSessionArgs {
  supabase: SupabaseClient;
  userId: string;
  userEmail: string | null | undefined;
  priceId: string;
  baseUrl: string;
}

export async function createCheckoutSessionUrl({
  supabase,
  userId,
  userEmail,
  priceId,
  baseUrl,
}: CreateCheckoutSessionArgs): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, email")
    .eq("id", userId)
    .single();

  if (!profile) return null;

  const stripe = getStripe();
  let customerId: string | null = profile.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email ?? userEmail ?? undefined,
      metadata: { supabase_user_id: userId },
    });
    customerId = customer.id;

    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${baseUrl}/dashboard?upgraded=true`,
    cancel_url: `${baseUrl}/pricing`,
    allow_promotion_codes: true,
  });

  return session.url;
}
