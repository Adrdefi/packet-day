import type { Metadata } from "next";
import Link from "next/link";
import PublicHeader from "@/components/layout/PublicHeader";
import Footer from "@/components/layout/Footer";
import JsonLd from "@/components/JsonLd";
import { getSituationEntry } from "@/lib/situations/registry";
import { buildSituationMetadata } from "@/lib/situations/metadata";
import { buildFaqJsonLd } from "@/lib/situations/faq-schema";
import SituationHero from "@/components/landing/SituationHero";
import SituationSteps from "@/components/landing/SituationSteps";
import SituationTextSection from "@/components/landing/SituationTextSection";
import SituationReasons from "@/components/landing/SituationReasons";
import SituationComparison from "@/components/landing/SituationComparison";
import SituationChecklist from "@/components/landing/SituationChecklist";
import SituationPricingCTA from "@/components/landing/SituationPricingCTA";
import SituationFAQ from "@/components/landing/SituationFAQ";
import SituationClosingCTA from "@/components/landing/SituationClosingCTA";
import SituationCrossLinks from "@/components/landing/SituationCrossLinks";
import {
  metadata as funFridayMetadata,
  hero,
  storySection,
  steps,
  reasonsSection,
  comparisonSection,
  checklist,
  pricing,
  faq,
  closingCta,
} from "@/lib/situations/fun-friday";

export const metadata: Metadata = buildSituationMetadata(
  getSituationEntry("fun-friday"),
  funFridayMetadata
);

export default function FunFridayPage() {
  const faqJsonLd = buildFaqJsonLd(faq);

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <JsonLd data={faqJsonLd} />

      <PublicHeader />

      <main className="flex-1">
        {/* Alternating backgrounds (cream/white/paper), same as /sick-day. */}
        <SituationHero content={hero} bgClassName="bg-cream" />
        <SituationTextSection content={storySection} bgClassName="bg-white" />
        <SituationSteps content={steps} bgClassName="bg-paper" />
        <SituationReasons content={reasonsSection} bgClassName="bg-cream" />
        <SituationComparison content={comparisonSection} bgClassName="bg-white" />
        <SituationChecklist content={checklist} bgClassName="bg-paper" />
        <SituationPricingCTA content={pricing} />
        <SituationFAQ content={faq} bgClassName="bg-white" />

        <div className="pb-24 px-6 text-center bg-paper">
          <Link
            href="/blog/fun-friday-homeschool-tradition"
            className="text-sm font-semibold text-sage hover:text-sage-dark transition-colors"
          >
            Read the full story →
          </Link>
        </div>

        <SituationClosingCTA content={closingCta} />

        <SituationCrossLinks currentSlug="fun-friday" bgClassName="bg-paper" />
      </main>

      <Footer />
    </div>
  );
}
