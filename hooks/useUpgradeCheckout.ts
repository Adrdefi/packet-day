"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";

interface UseUpgradeCheckoutArgs {
  monthlyPriceId: string;
  yearlyPriceId: string;
}

/**
 * Shared by PricingPageClient and the homepage PricingSection so the two
 * pricing surfaces can't drift on checkout behavior the way their copy did.
 */
export function useUpgradeCheckout({ monthlyPriceId, yearlyPriceId }: UseUpgradeCheckoutArgs) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upgrade(isAnnual: boolean) {
    track("checkout_started", { plan: isAnnual ? "yearly" : "monthly" });

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
