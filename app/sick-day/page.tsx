import type { Metadata } from "next";
import PublicHeader from "@/components/layout/PublicHeader";
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
  metadata as sickDayMetadata,
  hero,
  steps,
  lowEnergySection,
  notADownloadSection,
  checklist,
  pricing,
  faq,
} from "@/lib/situations/sick-day";

export const metadata: Metadata = buildSituationMetadata(
  getSituationEntry("sick-day"),
  sickDayMetadata
);

export default function SickDayPage() {
  const faqJsonLd = buildFaqJsonLd(faq);

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <JsonLd data={faqJsonLd} />

      <PublicHeader />

      <main className="flex-1">
        {/* Alternating backgrounds (cream/white/paper) so adjacent sections
            never share a background — borrowed from app/page.tsx's own
            section-to-section alternation. */}
        <SituationHero content={hero} bgClassName="bg-cream" />
        <SituationSteps content={steps} bgClassName="bg-white" />
        <SituationTextSection
          content={lowEnergySection}
          bgClassName="bg-paper"
          illustration={<SituationIllustration className="w-48 h-48 md:w-56 md:h-56" />}
        />
        <SituationTextSection content={notADownloadSection} bgClassName="bg-cream" />
        <SituationChecklist content={checklist} bgClassName="bg-white" />
        <SituationPricingCTA content={pricing} />
        <SituationFAQ content={faq} bgClassName="bg-paper" />
        <SituationCrossLinks currentSlug="sick-day" bgClassName="bg-cream" />
      </main>

      <Footer />
    </div>
  );
}
