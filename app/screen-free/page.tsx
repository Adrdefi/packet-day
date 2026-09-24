import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import Footer from "@/components/layout/Footer";
import JsonLd from "@/components/JsonLd";
import { getSituationEntry } from "@/lib/situations/registry";
import { buildSituationMetadata } from "@/lib/situations/metadata";
import { buildFaqJsonLd } from "@/lib/situations/faq-schema";
import SituationHero from "@/components/landing/SituationHero";
import SituationSteps from "@/components/landing/SituationSteps";
import SituationTextSection from "@/components/landing/SituationTextSection";
import SituationChecklist from "@/components/landing/SituationChecklist";
import SituationPricingCTA from "@/components/landing/SituationPricingCTA";
import SituationFAQ from "@/components/landing/SituationFAQ";
import SituationCrossLinks from "@/components/landing/SituationCrossLinks";
import StepArt from "@/components/landing/art/StepArt";
import {
  metadata as screenFreeMetadata,
  hero,
  steps,
  competeSection,
  notADownloadSection,
  moreIdeasLink,
  checklist,
  pricing,
  faq,
} from "@/lib/situations/screen-free";

export const metadata: Metadata = buildSituationMetadata(
  getSituationEntry("screen-free"),
  screenFreeMetadata
);

export default function ScreenFreePage() {
  const faqJsonLd = buildFaqJsonLd(faq);

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <JsonLd data={faqJsonLd} />

      <SiteHeader />

      <main className="flex-1">
        {/* Alternating backgrounds (cream/white/paper), same as /sick-day.
            No two neighboring sections share one. */}
        <SituationHero content={hero} bgClassName="bg-cream" />
        <SituationSteps content={steps} bgClassName="bg-white" />
        <SituationTextSection
          content={competeSection}
          bgClassName="bg-paper"
          illustration={<StepArt step={2} className="w-48 md:w-56" />}
        />
        <SituationTextSection
          content={notADownloadSection}
          bgClassName="bg-cream"
          footer={
            <p className="text-sm">
              <span className="font-bold text-dark">{moreIdeasLink.lead}</span>{" "}
              <Link
                href={moreIdeasLink.href}
                className="font-semibold text-sage hover:text-sage-dark transition-colors"
              >
                {moreIdeasLink.label}
              </Link>
            </p>
          }
        />
        <SituationChecklist content={checklist} bgClassName="bg-white" />
        <SituationPricingCTA content={pricing} />
        <SituationFAQ content={faq} bgClassName="bg-white" />
        <SituationCrossLinks currentSlug="screen-free" bgClassName="bg-paper" />
      </main>

      <Footer />
    </div>
  );
}
