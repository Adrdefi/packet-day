import Stripe from "stripe";

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
      price: 12,
    },
    yearly: {
      priceId: process.env.STRIPE_PRICE_YEARLY ?? "",
      price: 108,
    },
  },
} as const;
