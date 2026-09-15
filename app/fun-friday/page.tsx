import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import Footer from "@/components/layout/Footer";
import JsonLd from "@/components/JsonLd";
import { stripMarkdown } from "@/lib/blog";
import { getSituationEntry } from "@/lib/situations/registry";
import { buildSituationMetadata } from "@/lib/situations/metadata";
import SituationHero from "@/components/landing/SituationHero";
import SituationSteps from "@/components/landing/SituationSteps";
import SituationTextSection from "@/components/landing/SituationTextSection";
import SituationChecklist from "@/components/landing/SituationChecklist";
import SituationPricingCTA from "@/components/landing/SituationPricingCTA";
import SituationFAQ from "@/components/landing/SituationFAQ";
import SituationCrossLinks from "@/components/landing/SituationCrossLinks";
import {
  metadata as funFridayMetadata,
  hero,
  storySection,
  steps,
  checklist,
  pricing,
  faq,
} from "@/lib/situations/fun-friday";

export const metadata: Metadata = buildSituationMetadata(
  getSituationEntry("fun-friday"),
  funFridayMetadata
);

export default function FunFridayPage() {
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
        <SituationTextSection content={storySection} bgClassName="bg-white" />
        <SituationSteps content={steps} bgClassName="bg-paper" />

        {/* Chunk 2: three reasons cards ("Built for the Friday feeling") —
            deferred because its bold lead-ins have no slot in the shared
            TextSegment type (italic only). See lib/situations/fun-friday.ts's
            file header. */}

        {/* Chunk 2: comparison + character card */}

        <SituationChecklist content={checklist} bgClassName="bg-cream" />
        <SituationPricingCTA content={pricing} />
        <SituationFAQ content={faq} bgClassName="bg-white" />

        <div className="pb-24 px-6 text-center bg-white">
          <Link
            href="/blog/fun-friday-homeschool-tradition"
            className="text-sm font-semibold text-sage hover:text-sage-dark transition-colors"
          >
            Read the full story →
          </Link>
        </div>

        {/* Chunk 2: closing CTA ("Pizza night is waiting") */}

        <SituationCrossLinks currentSlug="fun-friday" bgClassName="bg-paper" />
      </main>

      <Footer />
    </div>
  );
}
