import type { Metadata } from "next";
import SiteHeader from "@/components/layout/SiteHeader";
import Footer from "@/components/layout/Footer";
import JsonLd from "@/components/JsonLd";
import { stripMarkdown } from "@/lib/blog";
import SituationHero from "@/components/landing/SituationHero";
import SituationSteps from "@/components/landing/SituationSteps";
import SituationTextSection from "@/components/landing/SituationTextSection";
import SituationChecklist from "@/components/landing/SituationChecklist";
import SituationPricingCTA from "@/components/landing/SituationPricingCTA";
import SituationFAQ from "@/components/landing/SituationFAQ";
import SituationIllustration from "@/components/landing/SituationIllustration";
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

export const metadata: Metadata = {
  // `absolute` bypasses the root layout's "%s | Packet Day" title template —
  // titleTag already ends in "| Packet Day", so the template would otherwise
  // double it up. Same reason the blog pages do this.
  title: { absolute: sickDayMetadata.titleTag },
  description: sickDayMetadata.metaDescription,
  alternates: { canonical: sickDayMetadata.canonical },
  openGraph: {
    title: sickDayMetadata.titleTag,
    description: sickDayMetadata.metaDescription,
    url: sickDayMetadata.canonical,
  },
};

export default function SickDayPage() {
  // Computed here (a Server Component), not inside SituationFAQ (a "use
  // client" component) — stripMarkdown/lib/blog.ts touches Node's fs/path,
  // which can't be bundled for the browser. Same split app/blog/[slug]/page.tsx uses.
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
        <SituationHero content={hero} />
        <SituationSteps content={steps} />
        <SituationTextSection
          content={lowEnergySection}
          bgClassName="bg-white"
          illustration={<SituationIllustration className="w-48 h-48 md:w-56 md:h-56" />}
        />
        <SituationTextSection content={notADownloadSection} bgClassName="bg-paper" />
        <SituationChecklist content={checklist} />
        <SituationPricingCTA content={pricing} />
        <SituationFAQ content={faq} />
      </main>

      <Footer />
    </div>
  );
}
