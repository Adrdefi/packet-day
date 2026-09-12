import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { track } from "@vercel/analytics/server";

// Raw body required for Stripe signature verification
export const dynamic = "force-dynamic";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

// Stripe events can arrive out of order or be redelivered after retries, so the
// event payload is never trusted as current truth. Every relevant event re-fetches
// the subscription from the Stripe API and derives status from what Stripe says
// right now, rather than from what the event claims happened.
function mapStripeStatusToProfileStatus(
  status: Stripe.Subscription.Status
): "pro" | "cancelled" | null {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due": // intentionally keeps access during Stripe's retry window
      return "pro";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
    case "paused": // not being paid for — must not retain access
      return "cancelled";
    case "incomplete":
    default:
      // Leave the existing value unchanged. Never grant access based on a status
      // we don't have an explicit mapping for.
      return null;
  }
}

async function syncProfileFromSubscription(
  supabase: ReturnType<typeof getServiceClient>,
  subscriptionId: string
): Promise<{ interval: Stripe.Price.Recurring.Interval | null }> {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId, {
    expand: ["items"],
  });
  const customerId = subscription.customer as string;
  const firstItem = subscription.items.data[0];
  const periodEnd = firstItem
    ? new Date(firstItem.current_period_end * 1000).toISOString()
    : null;
  const interval = firstItem?.price?.recurring?.interval ?? null;
  const mappedStatus = mapStripeStatusToProfileStatus(subscription.status);

  const update: { stripe_customer_id: string; subscription_period_end: string | null; subscription_status?: "pro" | "cancelled" } = {
    stripe_customer_id: customerId,
    subscription_period_end: periodEnd,
  };
  if (mappedStatus !== null) {
    update.subscription_status = mappedStatus;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("stripe_customer_id", customerId)
    .select("id");

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(
      `No profile found with stripe_customer_id=${customerId} — nothing was synced`
    );
  }

  return { interval };
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = session.subscription as string | null;
        // Not every completed session is a subscription (e.g. one-time payment
        // mode) — nothing to sync in that case.
        if (!subscriptionId) break;

        const { interval } = await syncProfileFromSubscription(supabase, subscriptionId);

        try {
          if (interval) {
            await track("paid", { interval });
          } else {
            await track("paid");
          }
        } catch (err) {
          console.error("[stripe-webhook] Failed to record paid event:", err);
        }

        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        // Re-retrieve by ID instead of trusting event.data.object: a redelivered
        // or out-of-order event must never overwrite current state with stale data.
        const subscription = event.data.object as Stripe.Subscription;
        await syncProfileFromSubscription(supabase, subscription.id);
        break;
      }

      default:
        // Ignore unhandled events
        break;
    }
  } catch (err) {
    console.error(`[stripe-webhook] Error handling ${event.type}:`, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
