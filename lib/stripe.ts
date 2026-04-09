import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
});

export const PLANS = {
  free: {
    id: "free" as const,
    name: "Free",
    packetsPerMonth: 3,
    priceId: null,
    price: 0,
  },
  starter: {
    id: "starter" as const,
    name: "Starter",
    packetsPerMonth: 20,
    priceId: process.env.STRIPE_STARTER_PRICE_ID ?? "",
    price: 9,
  },
  family: {
    id: "family" as const,
    name: "Family",
    packetsPerMonth: -1, // unlimited
    priceId: process.env.STRIPE_FAMILY_PRICE_ID ?? "",
    price: 19,
  },
} as const;
