import Link from "next/link";
import { PLAN_PRICE } from "@/lib/plans";
import type { PricingCTAContent } from "@/lib/situations/types";

export default function SituationPricingCTA({ content }: { content: PricingCTAContent }) {
  const annualMonthlyRate = Math.round(PLAN_PRICE.yearly / 12);

  return (
    <section className="py-24 px-6 bg-sage text-center">
      <div className="max-w-2xl mx-auto">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-cream mb-6 leading-tight">
          {content.heading}
          {content.headingEmoji && (
            <span className="ml-2" aria-hidden="true">
              {content.headingEmoji}
            </span>
          )}
        </h2>
        <p className="text-cream/80 text-lg leading-relaxed mb-10">
          {content.intro} ${annualMonthlyRate}/month annual or ${PLAN_PRICE.monthly}/month monthly.
          {content.closingSentence && ` ${content.closingSentence}`}
        </p>
        <Link
          href="/signup"
          className="inline-block bg-cream text-sage font-bold text-base px-8 py-4 rounded-full hover:bg-cream-dark transition-colors shadow-sm"
        >
          {content.ctaLabel}
          {content.ctaEmoji && (
            <span className="ml-1.5" aria-hidden="true">
              {content.ctaEmoji}
            </span>
          )}
        </Link>
      </div>
    </section>
  );
}
