/**
 * Checks how checkout handles the saved Stripe customer.
 *
 *   npm run check-stripe-customer
 *
 * - A valid saved customer goes straight to checkout: one session call, no
 *   new customer, no profile write (the same path as before the fix).
 * - A saved customer Stripe can't find (a test mode one from sandbox
 *   testing) is replaced once: a new customer with the same email and
 *   supabase_user_id, saved to the profile, then one retry.
 * - A deleted customer is handled the same way. Assumes Stripe reports it as
 *   resource_missing on `customer`, like a test mode one.
 * - Any other Stripe error is rethrown with no new customer.
 * - A brand new customer that Stripe can't find is not retried (no loop).
 * - /checkout-redirect sends a paid account to the dashboard with no Stripe
 *   calls, and turns a failure into { kind: "error" }.
 *
 * Uses fakes only: no API calls, no env vars. Exits 1 on any failure.
 */

import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCheckoutSessionUrl, isMissingCustomerError, type CheckoutStripe } from "../lib/stripe";
import { resolveCheckoutRedirect } from "../lib/checkoutRedirect";

const failures: string[] = [];
let passed = 0;

function expect(label: string, ok: boolean, detail = "") {
  if (ok) passed++;
  else failures.push(`${label}${detail ? `: ${detail}` : ""}`);
}

interface FakeProfile {
  stripe_customer_id: string | null;
  email: string | null;
  subscription_status?: string;
}

function fakeSupabase(profile: FakeProfile | null) {
  const updates: { values: Record<string, unknown>; id: unknown }[] = [];
  const client = {
    from() {
      return {
        select() {
          return { eq: () => ({ single: async () => ({ data: profile, error: null }) }) };
        },
        update(values: Record<string, unknown>) {
          return {
            eq: async (_column: string, id: unknown) => {
              updates.push({ values, id });
              return { error: null };
            },
          };
        },
      };
    },
  };
  return { supabase: client as unknown as SupabaseClient, updates };
}

function missingCustomer(id: string): Error {
  return new Stripe.errors.StripeInvalidRequestError({
    type: "invalid_request_error",
    code: "resource_missing",
    param: "customer",
    message: `No such customer: '${id}'`,
  });
}

function fakeStripe({ missing = [] as string[], otherError = null as Error | null } = {}) {
  const customersCreated: { email?: string; metadata?: Record<string, string> }[] = [];
  const sessionCustomers: string[] = [];
  let next = 0;
  const stripe = {
    customers: {
      create: async (params: { email?: string; metadata?: Record<string, string> }) => {
        customersCreated.push(params);
        return { id: `cus_new${++next}` };
      },
    },
    checkout: {
      sessions: {
        create: async (params: { customer: string }) => {
          sessionCustomers.push(params.customer);
          if (otherError) throw otherError;
          if (missing.includes(params.customer)) throw missingCustomer(params.customer);
          return { url: `https://checkout.stripe.com/c/${params.customer}` };
        },
      },
    },
  };
  return { stripe: stripe as unknown as CheckoutStripe, customersCreated, sessionCustomers };
}

const base = { userId: "user_1", userEmail: "kid@example.com", priceId: "price_monthly", baseUrl: "https://www.packetday.com" };

// 1. Valid saved ID: today's path, untouched.
{
  const { supabase, updates } = fakeSupabase({ stripe_customer_id: "cus_live", email: "parent@example.com" });
  const fake = fakeStripe();
  const url = await createCheckoutSessionUrl({ ...base, supabase, stripe: fake.stripe });
  expect("valid ID: returns the checkout URL", url === "https://checkout.stripe.com/c/cus_live", String(url));
  expect("valid ID: one session call with the saved ID", JSON.stringify(fake.sessionCustomers) === '["cus_live"]', JSON.stringify(fake.sessionCustomers));
  expect("valid ID: no new customer", fake.customersCreated.length === 0);
  expect("valid ID: no profile write", updates.length === 0);
}

// 2. Saved ID missing in live Stripe (test mode customer): replaced once.
{
  const { supabase, updates } = fakeSupabase({ stripe_customer_id: "cus_testmode", email: "parent@example.com" });
  const fake = fakeStripe({ missing: ["cus_testmode"] });
  const url = await createCheckoutSessionUrl({ ...base, supabase, stripe: fake.stripe });
  expect("missing ID: returns the new customer's checkout URL", url === "https://checkout.stripe.com/c/cus_new1", String(url));
  expect("missing ID: tried the saved ID, then the new one", JSON.stringify(fake.sessionCustomers) === '["cus_testmode","cus_new1"]', JSON.stringify(fake.sessionCustomers));
  expect("missing ID: exactly one new customer", fake.customersCreated.length === 1);
  expect("missing ID: new customer keeps the profile email", fake.customersCreated[0]?.email === "parent@example.com");
  expect("missing ID: new customer has supabase_user_id", fake.customersCreated[0]?.metadata?.supabase_user_id === "user_1");
  expect(
    "missing ID: new ID saved to this profile",
    updates.length === 1 && updates[0].values.stripe_customer_id === "cus_new1" && updates[0].id === "user_1",
    JSON.stringify(updates),
  );
}

// 3. Deleted customer: same handling.
{
  const { supabase, updates } = fakeSupabase({ stripe_customer_id: "cus_deleted", email: null });
  const fake = fakeStripe({ missing: ["cus_deleted"] });
  const url = await createCheckoutSessionUrl({ ...base, supabase, stripe: fake.stripe });
  expect("deleted customer: returns a checkout URL", url === "https://checkout.stripe.com/c/cus_new1", String(url));
  expect("deleted customer: falls back to the login email", fake.customersCreated[0]?.email === "kid@example.com");
  expect("deleted customer: new ID saved", updates.length === 1 && updates[0].values.stripe_customer_id === "cus_new1");
}

// 4. Any other Stripe error: rethrown, nothing created.
{
  const { supabase, updates } = fakeSupabase({ stripe_customer_id: "cus_live", email: "parent@example.com" });
  const priceError = new Stripe.errors.StripeInvalidRequestError({
    type: "invalid_request_error",
    code: "resource_missing",
    param: "line_items[0][price]",
    message: "No such price",
  });
  const fake = fakeStripe({ otherError: priceError });
  let thrown: unknown = null;
  try {
    await createCheckoutSessionUrl({ ...base, supabase, stripe: fake.stripe });
  } catch (err) {
    thrown = err;
  }
  expect("other error: rethrown unchanged", thrown === priceError);
  expect("other error: no new customer", fake.customersCreated.length === 0);
  expect("other error: no profile write", updates.length === 0);
}

// 5. No saved ID: create once, as today; a missing brand new customer is not retried.
{
  const { supabase, updates } = fakeSupabase({ stripe_customer_id: null, email: "parent@example.com" });
  const fake = fakeStripe();
  const url = await createCheckoutSessionUrl({ ...base, supabase, stripe: fake.stripe });
  expect("no saved ID: creates one customer and checks out", url === "https://checkout.stripe.com/c/cus_new1" && fake.customersCreated.length === 1 && updates.length === 1);
}
{
  const { supabase } = fakeSupabase({ stripe_customer_id: null, email: "parent@example.com" });
  const fake = fakeStripe({ missing: ["cus_new1"] });
  let thrown = false;
  try {
    await createCheckoutSessionUrl({ ...base, supabase, stripe: fake.stripe });
  } catch {
    thrown = true;
  }
  expect("no loop: a missing brand new customer is rethrown, not retried", thrown && fake.customersCreated.length === 1);
}

// 6. The error check itself, on a real Stripe error object.
expect("isMissingCustomerError: real customer error", isMissingCustomerError(missingCustomer("cus_x")));
expect(
  "isMissingCustomerError: other params are not the customer",
  !isMissingCustomerError(
    new Stripe.errors.StripeInvalidRequestError({ type: "invalid_request_error", code: "resource_missing", param: "price", message: "x" }),
  ),
);
expect("isMissingCustomerError: plain errors are not", !isMissingCustomerError(new Error("network")) && !isMissingCustomerError(null));

// 7. /checkout-redirect.
{
  const { supabase } = fakeSupabase({ stripe_customer_id: "cus_live", email: "parent@example.com", subscription_status: "pro" });
  const fake = fakeStripe();
  const result = await resolveCheckoutRedirect({ ...base, supabase, stripe: fake.stripe });
  expect("paid user: sent to the dashboard", result.kind === "redirect" && result.to === "/dashboard", JSON.stringify(result));
  expect("paid user: no Stripe calls", fake.sessionCustomers.length === 0 && fake.customersCreated.length === 0);
}
{
  const { supabase } = fakeSupabase({ stripe_customer_id: "cus_live", email: "parent@example.com", subscription_status: "free" });
  const fake = fakeStripe();
  const result = await resolveCheckoutRedirect({ ...base, supabase, stripe: fake.stripe });
  expect("free user: sent to checkout", result.kind === "redirect" && result.to === "https://checkout.stripe.com/c/cus_live", JSON.stringify(result));
}
{
  const { supabase } = fakeSupabase({ stripe_customer_id: "cus_live", email: "parent@example.com", subscription_status: "free" });
  const fake = fakeStripe({ otherError: new Error("Stripe is down") });
  const original = console.error;
  console.error = () => {};
  const result = await resolveCheckoutRedirect({ ...base, supabase, stripe: fake.stripe });
  console.error = original;
  expect("failure: friendly error instead of a crash", result.kind === "error", JSON.stringify(result));
}

if (failures.length) {
  console.error(`${failures.length} failed, ${passed} passed:`);
  for (const f of failures) console.error(`  FAIL ${f}`);
  process.exit(1);
}
console.log(`All ${passed} checks passed.`);
