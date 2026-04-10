"use client";

import { useState } from "react";
import Link from "next/link";

const STARTER_FEATURES = [
  "3 AI-generated packets per month",
  "1 child profile",
  "All subjects included",
  "Print-ready PDFs",
];

const UNLIMITED_FEATURES = [
  "Unlimited AI-generated packets",
  "Unlimited child profiles",
  "Infinite themes — anything they dream up",
  "Answer keys for every packet",
  "Supply lists included",
  "First access to new features",
];

export default function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);

  const unlimitedPrice = isAnnual ? 9 : 12;
  const billingNote = isAnnual ? "Billed annually — save 25%" : "Billed monthly";

  return (
    <section id="pricing" className="py-24 bg-cream px-6">
      <div className="max-w-5xl mx-auto">
        {/* Label */}
        <div className="text-center mb-4">
          <span className="inline-block bg-honey/20 text-honey-dark text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
            Simple Pricing
          </span>
        </div>

        {/* Heading */}
        <h2 className="font-display text-4xl md:text-5xl font-bold text-dark text-center leading-tight mb-6">
          Costs less than the drive-thru.<br className="hidden md:block" />
          Does way more for your day.
        </h2>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <button
            onClick={() => setIsAnnual(true)}
            aria-pressed={isAnnual}
            className={[
              "text-sm font-bold px-5 py-3 rounded-full transition-colors min-w-[100px]",
              isAnnual
                ? "bg-sage text-cream"
                : "bg-transparent text-dark/60 hover:text-dark",
            ].join(" ")}
          >
            Annual{" "}
            <span
              className={[
                "text-xs ml-1 font-semibold",
                isAnnual ? "text-honey-light" : "text-sage",
              ].join(" ")}
            >
              save 25%
            </span>
          </button>
          <button
            onClick={() => setIsAnnual(false)}
            aria-pressed={!isAnnual}
            className={[
              "text-sm font-bold px-5 py-3 rounded-full transition-colors min-w-[100px]",
              !isAnnual
                ? "bg-sage text-cream"
                : "bg-transparent text-dark/60 hover:text-dark",
            ].join(" ")}
          >
            Monthly
          </button>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Starter */}
          <div className="bg-white rounded-2xl border border-border p-8 flex flex-col">
            <div>
              <h3 className="font-display text-2xl font-bold text-dark mb-1">Starter</h3>
              <p className="text-sm text-muted mb-6">Dip your toes in — no card needed</p>
              <div className="mb-2">
                <span className="font-display text-5xl font-bold text-dark">$0</span>
                <span className="text-muted text-lg ml-1">/mo</span>
              </div>
              <p className="text-xs text-muted mb-8">Always free</p>
              <ul className="space-y-3 mb-8">
                {STARTER_FEATURES.map((f) => (
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
          <div className="bg-sage rounded-2xl p-8 flex flex-col relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-honey text-dark text-xs font-bold px-3 py-1 rounded-full">
              Most Popular
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold text-cream mb-1">Unlimited</h3>
              <p className="text-sm text-cream/75 mb-6">Every kid. Every day. Every wild idea.</p>
              <div className="mb-2">
                <span className="font-display text-5xl font-bold text-cream">
                  ${unlimitedPrice}
                </span>
                <span className="text-cream/75 text-lg ml-1">/mo</span>
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
            <Link
              href="/signup"
              className="mt-auto block text-center bg-cream text-sage font-bold py-3 px-6 rounded-xl hover:bg-cream-dark transition-colors"
            >
              Get Unlimited →
            </Link>
          </div>
        </div>

        {/* Callout */}
        <p className="text-center text-sm text-muted mt-8 max-w-md mx-auto">
          That&apos;s less than $0.30/day for a full day of personalized, AI-crafted learning for every kid in your house.
        </p>
      </div>
    </section>
  );
}
