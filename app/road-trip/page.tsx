import type { Metadata } from "next";
import SiteHeader from "@/components/layout/SiteHeader";
import Footer from "@/components/layout/Footer";
import JsonLd from "@/components/JsonLd";
import { stripMarkdown } from "@/lib/blog";
import SituationHero from "@/components/landing/SituationHero";
import SituationTextSection from "@/components/landing/SituationTextSection";
import SituationChecklist from "@/components/landing/SituationChecklist";
import SituationPricingCTA from "@/components/landing/SituationPricingCTA";
import SituationFAQ from "@/components/landing/SituationFAQ";
import SituationIllustration from "@/components/landing/SituationIllustration";
import SituationCrossLinks from "@/components/landing/SituationCrossLinks";
import {
  metadata as roadTripMetadata,
  hero,
  carRideSection,
  activityBookSection,
  checklist,
  pricing,
  faq,
} from "@/lib/situations/road-trip";

export const metadata: Metadata = {
  // `absolute` bypasses the root layout's "%s | Packet Day" title template —
  // titleTag already ends in "| Packet Day", so the template would otherwise
  // double it up. Same reason /sick-day does this.
  title: { absolute: roadTripMetadata.titleTag },
  description: roadTripMetadata.metaDescription,
  alternates: { canonical: roadTripMetadata.canonical },
  openGraph: {
    title: roadTripMetadata.titleTag,
    description: roadTripMetadata.metaDescription,
    url: roadTripMetadata.canonical,
  },
};

export default function RoadTripPage() {
  // Computed here (a Server Component), not inside SituationFAQ (a "use
  // client" component) — stripMarkdown/lib/blog.ts touches Node's fs/path,
  // which can't be bundled for the browser. Same split /sick-day uses.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.faqs.map((item) => ({
      "@type": "Question",
      name: stripMarkdown(item.question),
      acceptedAnswer: {
        "@type": "Answer",
        text: stripMarkdown(item.answer),
      },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <JsonLd data={faqJsonLd} />

      <SiteHeader />

      <main className="flex-1">
        {/* Alternating backgrounds (cream/white/paper), same as /sick-day. */}
        <SituationHero content={hero} bgClassName="bg-cream" />
        <SituationTextSection
          content={carRideSection}
          bgClassName="bg-white"
          illustration={
            <SituationIllustration variant="road-trip" className="w-48 h-48 md:w-56 md:h-56" />
          }
        />
        <SituationTextSection content={activityBookSection} bgClassName="bg-paper" />
        <SituationChecklist content={checklist} bgClassName="bg-cream" />
        <SituationPricingCTA content={pricing} />
        <SituationFAQ content={faq} bgClassName="bg-white" />
        <SituationCrossLinks currentSlug="road-trip" bgClassName="bg-paper" />
      </main>

      <Footer />
    </div>
  );
}
