import type { Metadata } from "next";
import Link from "next/link";
import PublicHeader from "@/components/layout/PublicHeader";
import Footer from "@/components/layout/Footer";
import JsonLd from "@/components/JsonLd";
import SituationHero from "@/components/landing/SituationHero";
import SituationTextSection from "@/components/landing/SituationTextSection";
import SituationFAQ from "@/components/landing/SituationFAQ";
import SituationClosingCTA from "@/components/landing/SituationClosingCTA";
import ComparisonTable from "@/components/landing/ComparisonTable";
import UnitStudyCard from "@/components/unit-studies/UnitStudyCard";
import { buildFaqJsonLd } from "@/lib/situations/faq-schema";
import { getLiveUnitStudies } from "@/lib/unit-studies/loader";
import { SITE_URL, DEFAULT_OPEN_GRAPH, DEFAULT_TWITTER, DEFAULT_OG_IMAGE } from "@/lib/site";
import {
  PATH,
  metadata as pageMeta,
  hero,
  huntSection,
  doesntExistSection,
  comparison,
  anyDaySection,
  fairSection,
  seeRealSection,
  faq,
  closing,
} from "@/lib/free-worksheets";

const canonical = `${SITE_URL}${PATH}`;

// A page-level openGraph/twitter object replaces the root layout's instead
// of merging (see lib/site.ts), so the shared defaults are spread back in.
// Share image is the site default card.
export const metadata: Metadata = {
  title: { absolute: pageMeta.titleTag },
  description: pageMeta.metaDescription,
  alternates: { canonical },
  openGraph: {
    ...DEFAULT_OPEN_GRAPH,
    title: pageMeta.titleTag,
    description: pageMeta.metaDescription,
    url: canonical,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    ...DEFAULT_TWITTER,
    title: pageMeta.titleTag,
    description: pageMeta.metaDescription,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

export default function FreeWorksheetsPage() {
  const faqJsonLd = buildFaqJsonLd(faq);
  // Live pages only, on every deployment, so a preview never shows a draft
  // card that production wouldn't.
  const live = getLiveUnitStudies();
  const unitStudies = seeRealSection.unitStudySlugs
    .map((slug) => live.find((page) => page.slug === slug))
    .filter((page) => page !== undefined);

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <JsonLd data={faqJsonLd} />

      <PublicHeader />

      <main className="flex-1">
        <SituationHero content={hero} bgClassName="bg-cream" />

        <SituationTextSection content={huntSection} bgClassName="bg-white" />

        <section className="py-24 px-6 bg-paper">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-dark mb-6 leading-tight">
              {doesntExistSection.heading}
            </h2>
            <p className="text-dark/70 leading-relaxed">{doesntExistSection.body}</p>
            <p className="mt-10 font-display text-3xl md:text-4xl font-bold text-sage leading-tight text-center">
              {doesntExistSection.pullLine}
            </p>
          </div>
        </section>

        <section className="py-24 px-6 bg-cream">
          <div className="max-w-5xl mx-auto">
            <h2 className="sr-only">
              {comparison.freeHeading} vs {comparison.packetDayHeading}
            </h2>
            <ComparisonTable {...comparison} />
          </div>
        </section>

        <section className="py-24 px-6 bg-white">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-dark mb-6 leading-tight">
              {anyDaySection.heading}
            </h2>
            <p className="text-dark/70 leading-relaxed">
              {anyDaySection.segments.map((segment, i) =>
                segment.href ? (
                  <Link key={i} href={segment.href} className="font-semibold text-sage underline hover:text-sage-dark">
                    {segment.text}
                  </Link>
                ) : (
                  <span key={i}>{segment.text}</span>
                )
              )}
            </p>
          </div>
        </section>

        <SituationTextSection content={fairSection} bgClassName="bg-paper" />

        <section className="py-24 px-6 bg-cream">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-dark mb-6 leading-tight text-center">
              {seeRealSection.heading}
            </h2>
            <div className="text-center mb-12">
              <Link
                href="/sample"
                className="inline-block bg-white border-2 border-sage text-sage font-bold text-base px-8 py-3.5 rounded-full hover:bg-sage hover:text-cream transition-colors"
              >
                {seeRealSection.sampleLinkLabel}
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {unitStudies.map((page) => (
                <UnitStudyCard key={page.slug} page={page} />
              ))}
            </div>
          </div>
        </section>

        <SituationFAQ content={faq} bgClassName="bg-white" />

        <SituationClosingCTA content={closing} />
      </main>

      <Footer />
    </div>
  );
}
