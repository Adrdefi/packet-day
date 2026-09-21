"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";

interface UseUpgradeCheckoutArgs {
  monthlyPriceId: string;
  yearlyPriceId: string;
  /** When present, attached to checkout_started as { plan, source } so a
   * conversion can be traced back to which surface opened checkout.
   * Omitted entirely, behavior (and the event shape) is exactly as before. */
  source?: string;
}

/**
 * Shared by PricingPageClient and the homepage PricingSection so the two
 * pricing surfaces can't drift on checkout behavior the way their copy did.
 */
export function useUpgradeCheckout({ monthlyPriceId, yearlyPriceId, source }: UseUpgradeCheckoutArgs) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upgrade(isAnnual: boolean) {
    track(
      "checkout_started",
      source ? { plan: isAnnual ? "yearly" : "monthly", source } : { plan: isAnnual ? "yearly" : "monthly" }
    );

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: isAnnual ? yearlyPriceId : monthlyPriceId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/signup?plan=${isAnnual ? "yearly" : "monthly"}`);
          return;
        }
        if (res.status === 409 && data.error === "already_subscribed") {
          router.push("/dashboard");
          return;
        }
        setError(data.error ?? "Something went sideways. Let's try that again.");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Something went sideways. Let's try that again.");
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, upgrade };
}
