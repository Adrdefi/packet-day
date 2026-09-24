"use client";

import { useState } from "react";
import Link from "next/link";
import Wordmark from "@/components/layout/Wordmark";
import { useUpgradeCheckout } from "@/hooks/useUpgradeCheckout";
import PricingPlans, { CHECKOUT_REASSURANCE, unlimitedMonthlyPrice } from "@/components/pricing/PricingPlans";

const NOT_INCLUDED = "✕";

// Muted ✕ for sighted readers, spelled out for screen readers.
function ComparisonValue({ value }: { value: string }) {
  if (value !== NOT_INCLUDED) return <>{value}</>;
  return (
    <>
      <span aria-hidden="true">{NOT_INCLUDED}</span>
      <span className="sr-only">Not included</span>
    </>
  );
}

const FAQ = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel straight from your billing portal. No hoops, no guilt. Your Unlimited access continues until the end of the billing period.",
  },
  {
    q: "What happens to my packets if I cancel?",
    a: "They're yours. All packets you've generated remain in your account and are still printable.",
  },
  {
    q: "Do you offer refunds?",
    a: "If something went wrong or you're not happy, email us within 7 days and we'll make it right.",
  },
  {
    q: "What's the difference between annual and monthly?",
    a: "Annual billing saves you 25%. That's $36 back in your pocket each year. Monthly gives you flexibility if you want to try it first.",
  },
  {
    q: "Can I use Packet Day for more than one kid?",
    a: "Free plan supports 1 child profile. Upgrading to Unlimited unlocks unlimited profiles, one for every kid in your house.",
  },
];

interface Props {
  monthlyPriceId: string;
  yearlyPriceId: string;
  /** Preselects the toggle, e.g. from a `?plan=` param on arrival. Defaults to annual when omitted. */
  initialAnnual?: boolean;
}

export default function PricingPageClient({ monthlyPriceId, yearlyPriceId, initialAnnual }: Props) {
  const [isAnnual, setIsAnnual] = useState(initialAnnual ?? true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { loading, error, upgrade } = useUpgradeCheckout({
    monthlyPriceId,
    yearlyPriceId,
    source: "pricing_page",
  });

  // Used by the footer button; the cards themselves live in PricingPlans.
  const proPrice = unlimitedMonthlyPrice(isAnnual);
  const priceUnit = "/mo";

  return (
    <div className="min-h-screen bg-cream">
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="font-display font-bold text-sage">
          <Wordmark size="xl" />
        </Link>
        <div className="flex items-center gap-4 sm:gap-5">
          {[
            { href: "/", label: "Home" },
            { href: "/sample", label: "Sample" },
            { href: "/login", label: "Log in" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-semibold text-dark/70 hover:text-dark transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Headline, toggle, plan cards: shared with the homepage */}
      <section className="py-16 px-6">
        <PricingPlans
          monthlyPriceId={monthlyPriceId}
          yearlyPriceId={yearlyPriceId}
          source="pricing_page"
          headingLevel="h1"
          isAnnual={isAnnual}
          onIsAnnualChange={setIsAnnual}
          intro={
            <p className="text-dark/60 text-lg max-w-md mx-auto text-center mb-10">
              Start free. Upgrade when you&apos;re ready. No pressure, no nonsense.
            </p>
          }
        />
      </section>

      {/* Feature comparison table */}
      <section className="px-6 pb-20 max-w-2xl mx-auto">
        <h2 className="font-display text-2xl font-bold text-dark text-center mb-8">
          What&apos;s included
        </h2>
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="grid grid-cols-3 bg-cream-dark px-6 py-3 text-xs font-bold uppercase tracking-wide text-muted">
            <span className="col-span-1">Feature</span>
            <span className="text-center">Free</span>
            <span className="text-center text-sage">Unlimited</span>
          </div>
          {[
            ["Packets per month", "1", "Unlimited"],
            ["Child profiles", "1", "Unlimited"],
            ["All subjects", "✓", "✓"],
            ["Print-ready PDFs", "✓", "✓"],
            // Every packet on every plan has both (the generator and PDF
            // don't vary by plan), so only the rows above and early
            // feature access are real differences.
            ["Answer keys", "✓", "✓"],
            ["Supply lists", "✓", "✓"],
            ["Any theme", "✓", "✓"],
            ["Early feature access", NOT_INCLUDED, "✓"],
          ].map(([feature, free, pro], i) => (
            <div
              key={feature}
              className={[
                "grid grid-cols-3 px-6 py-4 text-sm",
                i % 2 === 0 ? "bg-white" : "bg-cream/50",
              ].join(" ")}
            >
              <span className="text-dark/80 font-medium">{feature}</span>
              <span
                className={[
                  "text-center",
                  free === NOT_INCLUDED ? "text-muted" : "text-dark/70",
                ].join(" ")}
              >
                <ComparisonValue value={free} />
              </span>
              <span
                className={[
                  "text-center font-semibold",
                  pro === NOT_INCLUDED ? "text-muted" : "text-sage",
                ].join(" ")}
              >
                <ComparisonValue value={pro} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 pb-24 max-w-2xl mx-auto">
        <h2 className="font-display text-2xl font-bold text-dark text-center mb-8">
          Questions we get a lot
        </h2>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <div key={i} className="bg-white rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left text-sm font-semibold text-dark hover:text-sage transition-colors"
              >
                {item.q}
                <span
                  className={[
                    "text-sage ml-4 shrink-0 transition-transform",
                    openFaq === i ? "rotate-45" : "",
                  ].join(" ")}
                >
                  +
                </span>
              </button>
              {openFaq === i && (
                <div className="px-6 pb-4 text-sm text-dark/70 leading-relaxed">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-sage py-16 px-6 text-center">
        <h2 className="font-display text-3xl font-bold text-cream mb-3">
          Ready to make today a good one?
        </h2>
        <p className="text-cream/75 mb-8">
          Join families who stopped dreading the hard days.
        </p>
        <button
          onClick={() => upgrade(isAnnual)}
          disabled={loading}
          className="bg-honey hover:bg-honey-dark text-dark font-bold py-4 px-8 rounded-xl transition-colors text-base disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Redirecting…" : `Get Unlimited for ${proPrice}${priceUnit} →`}
        </button>
        {error && <p className="text-coral-light text-sm mt-3 font-medium">{error}</p>}
        <p className="text-xs text-cream/75 mt-3">{CHECKOUT_REASSURANCE}</p>
      </section>
    </div>
  );
}
