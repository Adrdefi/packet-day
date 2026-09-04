/**
 * Client-safe plan-slug helpers. Kept separate from lib/stripe.ts (which
 * imports the Stripe SDK and reads server-only env vars) so client
 * components can import this without pulling Node-only code into the
 * browser bundle.
 */

export type PlanSlug = "monthly" | "yearly";

export function isPlanSlug(value: unknown): value is PlanSlug {
  return value === "monthly" || value === "yearly";
}

export const PLAN_LABEL: Record<PlanSlug, string> = {
  monthly: "Monthly",
  yearly: "Yearly",
};

/** Dollar amounts for each plan — the single source of truth; lib/stripe.ts's PLANS reads from this too. */
export const PLAN_PRICE: Record<PlanSlug, number> = {
  monthly: 12,
  yearly: 108,
};
