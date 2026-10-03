import Stripe from "stripe";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { type PlanSlug, PLAN_PRICE } from "@/lib/plans";

// Saves stripe_customer_id. Same local getServiceClient() pattern as
// lib/emailSends.ts and lib/unsubscribe.ts. Server only.
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createSupabaseClient(url, key);
}

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

/** The parts of the Stripe client checkout uses. Tests pass a fake. */
export type CheckoutStripe = {
  customers: Pick<Stripe["customers"], "create">;
  checkout: { sessions: Pick<Stripe["checkout"]["sessions"], "create"> };
};

interface CreateCheckoutSessionArgs {
  supabase: SupabaseClient;
  userId: string;
  userEmail: string | null | undefined;
  priceId: string;
  baseUrl: string;
  stripe?: CheckoutStripe;
  /** Writes stripe_customer_id. Defaults to the service client; tests pass a fake. */
  adminSupabase?: SupabaseClient;
}

/**
 * True when Stripe says the customer we passed doesn't exist in this mode:
 * a test mode customer saved during sandbox testing, or a deleted one.
 */
export function isMissingCustomerError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const { code, param } = err as { code?: unknown; param?: unknown };
  return code === "resource_missing" && param === "customer";
}

/** Shown by the billing portal when the saved customer isn't in live Stripe. */
export const MISSING_BILLING_ACCOUNT_MESSAGE =
  "We couldn't find your billing account. Email us at hello@packetday.com and we'll sort it out.";

export async function createCheckoutSessionUrl({
  supabase,
  userId,
  userEmail,
  priceId,
  baseUrl,
  stripe = getStripe(),
  adminSupabase,
}: CreateCheckoutSessionArgs): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, email")
    .eq("id", userId)
    .single();

  if (!profile) return null;
  const email: string | undefined = profile.email ?? userEmail ?? undefined;

  async function createCustomer(): Promise<string> {
    const customer = await stripe.customers.create({
      email,
      metadata: { supabase_user_id: userId },
    });
    // The Stripe webhook finds the profile by this ID, so never send anyone
    // to checkout unless it was saved.
    const { error } = await (adminSupabase ?? getServiceClient())
      .from("profiles")
      .update({ stripe_customer_id: customer.id })
      .eq("id", userId);
    if (error) throw error;
    return customer.id;
  }

  function createSession(customerId: string) {
    return stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl}/dashboard?upgraded=true`,
      cancel_url: `${baseUrl}/pricing`,
      allow_promotion_codes: true,
    });
  }

  const savedCustomerId: string | null = profile.stripe_customer_id;
  const customerId = savedCustomerId ?? (await createCustomer());

  try {
    const session = await createSession(customerId);
    return session.url;
  } catch (err) {
    // Only a saved customer that Stripe can't find gets replaced, and only
    // once. A valid saved ID never reaches here, and any other error is
    // rethrown unchanged.
    if (!savedCustomerId || !isMissingCustomerError(err)) throw err;
    const session = await createSession(await createCustomer());
    return session.url;
  }
}
