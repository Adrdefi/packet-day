import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicHeader from "@/components/layout/PublicHeader";
import Footer from "@/components/layout/Footer";
import JsonLd from "@/components/JsonLd";
import SituationTextSection from "@/components/landing/SituationTextSection";
import SituationCardRow from "@/components/landing/SituationCardRow";
import SituationClosingCTA from "@/components/landing/SituationClosingCTA";
import DraftBanner from "@/components/unit-studies/DraftBanner";
import UnitStudyCard from "@/components/unit-studies/UnitStudyCard";
import { SITUATIONS } from "@/lib/situations/registry";
import { HOURS_RANGE_TEXT, PAGE_RANGE_TEXT } from "@/lib/situations/figures";
import { DEFAULT_OPEN_GRAPH, DEFAULT_TWITTER, DEFAULT_OG_IMAGE, NATALIE_PATH } from "@/lib/site";
import { coverOf, gallerySrc, getUnitStudy, getVisibleUnitStudies } from "@/lib/unit-studies/loader";
import { buildUnitStudyFaqJsonLd, buildUnitStudyGraph, unitStudyUrl } from "@/lib/unit-studies/jsonld";
import { ENTITY_SENTENCE } from "@/lib/unit-studies/entity";
import {
  indefiniteArticle,
  monthYear,
  paragraphs,
  pricingLine,
  primaryCtaLabel,
  sampleLabel,
  signupHref,
  updatedDate,
} from "@/lib/unit-studies/format";

// Every page is built at build time. A slug with no visible content file
// (unknown, or a draft on production) is a real 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getVisibleUnitStudies().map((page) => ({ slug: page.slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const page = getUnitStudy(slug);
  if (!page) return {};

  const url = unitStudyUrl(page.slug);
  const { title, description } = page.meta;

  return {
    // `absolute` bypasses the root layout's "%s | Packet Day" template; the
    // title already ends in "| Packet Day".
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    ...(page.status === "draft" && { robots: { index: false, follow: false } }),
    openGraph: {
      ...DEFAULT_OPEN_GRAPH,
      title,
      description,
      url,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      ...DEFAULT_TWITTER,
      title,
      description,
      images: [DEFAULT_OG_IMAGE.url],
    },
  };
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-3xl md:text-4xl font-bold text-dark mb-6 leading-tight">
      {children}
    </h2>
  );
}

export default async function UnitStudyPage({ params }: Params) {
  const { slug } = await params;
  const page = getUnitStudy(slug);
  if (!page) notFound();

  const cover = coverOf(page);
  const updated = updatedDate(page);
  const themeLower = page.theme.name.toLowerCase();
  const article = indefiniteArticle(themeLower);
  const visibleSlugs = new Set(getVisibleUnitStudies().map((entry) => entry.slug));
  const related = page.related
    .filter((relatedSlug) => visibleSlugs.has(relatedSlug))
    .map((relatedSlug) => getUnitStudy(relatedSlug)!);
  const useCases = page.useCaseLinks
    .map((href) => SITUATIONS.find((situation) => situation.href === href))
    .filter((situation) => situation !== undefined);

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <JsonLd data={buildUnitStudyGraph(page)} />
      <JsonLd data={buildUnitStudyFaqJsonLd(page)} />

      {page.status === "draft" && <DraftBanner />}
      <PublicHeader />

      <main className="flex-1">
        {/* a + b: H1, answer capsule, byline, then the cover and CTAs */}
        <section className="px-6 pt-12 pb-16 md:pt-20 md:pb-20 bg-cream">
          <div className="max-w-5xl mx-auto grid gap-10 md:grid-cols-[1fr_minmax(0,22rem)] md:items-center">
            <div>
              <h1 className="font-display text-4xl md:text-5xl font-bold text-dark leading-tight mb-6">
                {page.h1}
              </h1>
              <p className="text-lg md:text-xl text-dark/80 leading-relaxed mb-6">{page.answerCapsule}</p>
              <p className="text-sm text-dark/60">
                By{" "}
                <Link href={NATALIE_PATH} className="font-semibold text-sage hover:underline">
                  Natalie
                </Link>
                , homeschool mom and Packet Day co-founder
              </p>
              {(updated || page.natalieReviewedOn) && (
                <p className="mt-1 text-sm text-dark/60">
                  {updated && <>Updated {monthYear(updated)}</>}
                  {updated && page.natalieReviewedOn && <span aria-hidden="true"> · </span>}
                  {page.natalieReviewedOn && <>Reviewed by Natalie</>}
                </p>
              )}
            </div>

            <div className="text-center">
              <div className="mx-auto max-w-xs overflow-hidden rounded-lg border border-dark/10 shadow-md">
                <Image
                  src={gallerySrc(page, cover)}
                  alt={cover.alt}
                  width={cover.width}
                  height={cover.height}
                  sizes="(min-width: 768px) 320px, 80vw"
                  priority
                  className="h-auto w-full"
                />
              </div>
              <p className="mt-3 text-sm font-semibold text-sage-dark">{sampleLabel(page)}</p>
              <div className="mt-6">
                <Link
                  href={signupHref(page)}
                  className="inline-block bg-sage text-cream font-bold text-base px-8 py-4 rounded-full hover:bg-sage-dark transition-colors shadow-sm"
                >
                  {primaryCtaLabel(page)}
                </Link>
              </div>
              <p className="mt-4 text-sm">
                <Link href="/sample" className="font-semibold text-sage hover:underline">
                  Flip through a full sample packet first →
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* c: what is inside, then the gallery */}
        <section className="px-6 py-20 bg-white">
          <div className="max-w-5xl mx-auto">
            <SectionHeading>
              What is inside {article} {themeLower} packet?
            </SectionHeading>
            <p className="max-w-3xl text-dark/70 leading-relaxed mb-10">
              {article === "an" ? "An" : "A"} {themeLower} packet is a full school day on paper: {PAGE_RANGE_TEXT} built around{" "}
              {themeLower}, roughly {HOURS_RANGE_TEXT} with breaks. This sample has{" "}
              {page.sample.pageCount} pages, and {page.sample.characterName} guides the whole day.
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
              {page.gallery.map((item) => (
                <figure key={item.file}>
                  <div className="overflow-hidden rounded-lg border border-dark/10 shadow-sm">
                    <Image
                      src={gallerySrc(page, item)}
                      alt={item.alt}
                      width={item.width}
                      height={item.height}
                      sizes="(min-width: 1024px) 240px, (min-width: 768px) 33vw, 50vw"
                      loading="lazy"
                      className="h-auto w-full"
                    />
                  </div>
                  <figcaption className="mt-2 text-sm leading-snug text-dark/70">{item.caption}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* d: what the child does */}
        <section className="px-6 py-20 bg-paper">
          <div className="max-w-3xl mx-auto">
            <SectionHeading>What does my child actually do?</SectionHeading>
            <ul className="space-y-4">
              {page.inside.map((item) => (
                <li key={`${item.subject}-${item.activity}`} className="rounded-xl bg-white border border-border p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-sage-dark mb-1">{item.subject}</p>
                  <p className="font-semibold text-dark">{item.activity}</p>
                  <p className="mt-1 text-sm leading-relaxed text-dark/70">{item.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* e, f: character and learning */}
        <SituationTextSection
          content={{ heading: page.characterSection.heading, paragraphs: paragraphs(page.characterSection.body) }}
          bgClassName="bg-cream"
        />
        <SituationTextSection
          content={{ heading: page.learning.heading, paragraphs: paragraphs(page.learning.body) }}
          bgClassName="bg-white"
        />

        {/* g: grade bands */}
        <section className="px-6 py-20 bg-paper">
          <div className="max-w-5xl mx-auto">
            <SectionHeading>Which grades is this for?</SectionHeading>
            <div className="grid gap-4 md:grid-cols-3 md:gap-6">
              {page.gradeBands.map((band) => (
                <div key={band.band} className="rounded-xl bg-white border border-border p-6">
                  <h3 className="font-display text-xl font-bold text-dark mb-2">Grades {band.band}</h3>
                  <p className="text-sm leading-relaxed text-dark/70">{band.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* h: Natalie's note */}
        <SituationTextSection
          content={{ heading: "A note from Natalie", paragraphs: paragraphs(page.natalieNote.body) }}
          bgClassName="bg-cream"
        />

        {/* i: FAQ, every answer in the HTML and always visible */}
        <section className="px-6 py-20 bg-white">
          <div className="max-w-3xl mx-auto">
            <SectionHeading>Questions parents ask about {themeLower} packets</SectionHeading>
            <div className="divide-y divide-border">
              {page.faqs.map((faq) => (
                <div key={faq.q} className="py-6">
                  <h3 className="font-semibold text-dark text-lg leading-snug mb-2">{faq.q}</h3>
                  <p className="text-dark/70 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* j: related packets, use case pages, hub and sample */}
        <section className="px-6 py-20 bg-paper">
          <div className="max-w-5xl mx-auto">
            {related.length > 0 && (
              <>
                <SectionHeading>More unit study packets</SectionHeading>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-16">
                  {related.map((relatedPage) => (
                    <UnitStudyCard key={relatedPage.slug} page={relatedPage} />
                  ))}
                </div>
              </>
            )}
            <SectionHeading>Packets for the days you need one</SectionHeading>
            <SituationCardRow situations={useCases} />
            <p className="mt-10 text-center text-sm">
              <Link href="/unit-studies" className="font-semibold text-sage hover:underline">
                Browse every unit study packet
              </Link>
              <span className="mx-3 text-dark/30" aria-hidden="true">·</span>
              <Link href="/sample" className="font-semibold text-sage hover:underline">
                See a full sample packet
              </Link>
            </p>
          </div>
        </section>

        {/* k: closing CTA and pricing line */}
        <SituationClosingCTA
          content={{
            heading: `Ready for your own ${themeLower} day?`,
            line: ENTITY_SENTENCE,
            ctaLabel: primaryCtaLabel(page),
            ctaHref: signupHref(page),
            trustLine: pricingLine(),
          }}
        />
      </main>

      <Footer />
    </div>
  );
}

