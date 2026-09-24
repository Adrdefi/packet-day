"use client";

import { useState } from "react";
import Link from "next/link";
import { useUpgradeCheckout } from "@/hooks/useUpgradeCheckout";

// The one pricing block (headline, billing toggle, both plan cards, the
// per day line, the sample link), shared by the homepage's pricing section
// (app/page.tsx) and /pricing (app/pricing/PricingPageClient.tsx) so their
// copy can't drift. Each page adds only what is unique to it around this.

// Answer keys and supply lists are in every packet on every plan (the
// generator prompt and PDF don't vary by plan), so both cards list them.
export const FREE_FEATURES = [
  "1 packet per month",
  "1 child profile",
  "All core subjects included",
  "Print-ready PDFs",
  "Answer keys for every packet",
  "Supply lists with household items only",
];

export const UNLIMITED_FEATURES = [
  "Unlimited packets",
  "Unlimited child profiles",
  "Infinite themes: anything they dream up",
  "Answer keys for every packet",
  "Supply lists with household items only",
  "First access to new features",
];

export const CHECKOUT_REASSURANCE = "Secure checkout by Stripe. Cancel anytime.";

export function unlimitedMonthlyPrice(isAnnual: boolean): number {
  return isAnnual ? 9 : 12;
}

interface Props {
  monthlyPriceId: string;
  yearlyPriceId: string;
  /** Analytics label for checkout_started; each page keeps its own. */
  source: "pricing_section" | "pricing_page";
  /** h1 on /pricing, h2 inside the homepage. */
  headingLevel: "h1" | "h2";
  /** Rendered between the headline and the toggle (the homepage's art, /pricing's intro line). */
  intro?: React.ReactNode;
  /** Controlled billing choice, for a page that also uses it elsewhere (the /pricing footer button). */
  isAnnual?: boolean;
  onIsAnnualChange?: (isAnnual: boolean) => void;
}

export default function PricingPlans({
  monthlyPriceId,
  yearlyPriceId,
  source,
  headingLevel,
  intro,
  isAnnual: controlledIsAnnual,
  onIsAnnualChange,
}: Props) {
  const [ownIsAnnual, setOwnIsAnnual] = useState(true);
  const isAnnual = controlledIsAnnual ?? ownIsAnnual;
  const setIsAnnual = onIsAnnualChange ?? setOwnIsAnnual;

  const { loading, error, upgrade } = useUpgradeCheckout({
    monthlyPriceId,
    yearlyPriceId,
    source,
  });

  const unlimitedPrice = unlimitedMonthlyPrice(isAnnual);
  const priceUnit = "/mo";
  const billingNote = isAnnual ? "$108 billed annually, save $36" : "Billed monthly";

  const Heading = headingLevel;
  const CardHeading = headingLevel === "h1" ? "h2" : "h3";

  return (
    <div className="max-w-5xl mx-auto">
      {/* Label */}
      <div className="text-center mb-4">
        <span className="inline-block bg-honey/20 text-honey-dark text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
          Simple Pricing
        </span>
      </div>

      {/* Heading. The space before the break is what keeps "drive-thru." and
          "Does" apart on phones, where the break is hidden. */}
      <Heading className="font-display text-4xl md:text-5xl font-bold text-dark text-center leading-tight mb-6">
        Costs less than the drive-thru.{" "}
        <br className="hidden md:block" />
        Does way more for your day.
      </Heading>

      {intro}

      {/* Toggle */}
      <div className="flex items-center justify-center gap-4 mb-12">
        <button
          onClick={() => setIsAnnual(true)}
          aria-pressed={isAnnual}
          className={[
            "text-sm font-bold px-5 py-3 rounded-full transition-colors min-w-[100px]",
            isAnnual ? "bg-sage text-cream" : "bg-transparent text-dark/60 hover:text-dark",
          ].join(" ")}
        >
          Annual{" "}
          <span
            className={["text-xs ml-1 font-semibold", isAnnual ? "text-honey-light" : "text-sage"].join(" ")}
          >
            save 25%
          </span>
        </button>
        <button
          onClick={() => setIsAnnual(false)}
          aria-pressed={!isAnnual}
          className={[
            "text-sm font-bold px-5 py-3 rounded-full transition-colors min-w-[100px]",
            !isAnnual ? "bg-sage text-cream" : "bg-transparent text-dark/60 hover:text-dark",
          ].join(" ")}
        >
          Monthly
        </button>
      </div>

      {/* Cards. On phones Unlimited comes first; side by side it sits on the right. */}
      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Free */}
        <div className="order-2 md:order-1 bg-white rounded-2xl border border-border p-8 flex flex-col">
          <div>
            <CardHeading className="font-display text-2xl font-bold text-dark mb-1">Free</CardHeading>
            <p className="text-sm text-muted mb-6">Dip your toes in, no card needed</p>
            <div className="mb-2">
              <span className="font-display text-5xl font-bold text-dark">$0</span>
              <span className="text-muted text-lg ml-1">/mo</span>
            </div>
            <p className="text-xs text-muted mb-8">Always free</p>
            <ul className="space-y-3 mb-8">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-dark/80">
                  <span className="text-sage mt-0.5 shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <Link
            href="/signup"
            className="mt-auto block text-center bg-cream border-2 border-sage text-sage font-bold py-3 px-6 rounded-xl hover:bg-sage hover:text-cream transition-colors"
          >
            Start Free
          </Link>
        </div>

        {/* Unlimited */}
        <div className="order-1 md:order-2 bg-sage rounded-2xl p-8 flex flex-col relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-honey text-dark text-xs font-bold px-3 py-1 rounded-full">
            Most Popular
          </div>
          <div>
            <CardHeading className="font-display text-2xl font-bold text-cream mb-1">Unlimited</CardHeading>
            <p className="text-sm text-cream/75 mb-6">Every kid. Every day. Every wild idea.</p>
            <div className="mb-2">
              <span className="font-display text-5xl font-bold text-cream">${unlimitedPrice}</span>
              <span className="text-cream/75 text-lg ml-1">{priceUnit}</span>
            </div>
            <p className="text-xs text-cream/60 mb-8">{billingNote}</p>
            <ul className="space-y-3 mb-8">
              {UNLIMITED_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-cream/90">
                  <span className="text-honey mt-0.5 shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          {error && <p className="text-coral-light text-sm mb-3 font-medium text-center">{error}</p>}
          <div className="mt-auto">
            <button
              onClick={() => upgrade(isAnnual)}
              disabled={loading}
              className="block w-full text-center bg-cream text-sage font-bold py-3 px-6 rounded-xl hover:bg-cream-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Redirecting…" : "Get Unlimited →"}
            </button>
            <p className="text-center text-xs text-cream/75 mt-2.5">{CHECKOUT_REASSURANCE}</p>
          </div>
        </div>
      </div>

      {/* Callout. $108 / 365 is about $0.296; monthly works out to about $0.40. */}
      <p className="text-center text-sm text-muted mt-8 max-w-md mx-auto">
        That&apos;s less than $0.30/day on the annual plan for a full day of personalized learning for every
        kid in your house.
      </p>
      <p className="text-center text-base mt-5">
        <Link href="/sample" className="text-sage font-semibold hover:underline">
          Not sure yet? See a real packet first.
        </Link>
      </p>
    </div>
  );
}
