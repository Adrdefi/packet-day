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
import SituationIllustration from "@/components/landing/SituationIllustration";
import SituationCrossLinks from "@/components/landing/SituationCrossLinks";
import {
  metadata as multipleKidsMetadata,
  hero,
  combineSection,
  steps,
  independentWorkSection,
  rotationLink,
  notADownloadSection,
  checklist,
  pricing,
  faq,
} from "@/lib/situations/multiple-kids";

export const metadata: Metadata = buildSituationMetadata(
  getSituationEntry("multiple-kids"),
  multipleKidsMetadata
);

export default function MultipleKidsPage() {
  const faqJsonLd = buildFaqJsonLd(faq);

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <JsonLd data={faqJsonLd} />

      <SiteHeader />

      <main className="flex-1">
        {/* Alternating backgrounds (cream/white/paper), same as /sick-day.
            No two neighboring sections share one. */}
        <SituationHero content={hero} bgClassName="bg-cream" />
        <SituationTextSection content={combineSection} bgClassName="bg-white" />
        <SituationSteps content={steps} bgClassName="bg-paper" />
        <SituationTextSection
          content={independentWorkSection}
          bgClassName="bg-cream"
          illustration={<SituationIllustration className="w-48 h-48 md:w-56 md:h-56" />}
          footer={
            <p className="text-sm">
              <span className="font-bold text-dark">{rotationLink.lead}</span>{" "}
              <Link
                href={rotationLink.href}
                className="font-semibold text-sage hover:text-sage-dark transition-colors"
              >
                {rotationLink.label}
              </Link>
            </p>
          }
        />
        <SituationTextSection content={notADownloadSection} bgClassName="bg-white" />
        <SituationChecklist content={checklist} bgClassName="bg-paper" />
        <SituationPricingCTA content={pricing} />
        <SituationFAQ content={faq} bgClassName="bg-white" />
        <SituationCrossLinks currentSlug="multiple-kids" bgClassName="bg-paper" />
      </main>

      <Footer />
    </div>
  );
}
