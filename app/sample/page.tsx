import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PublicHeader from "@/components/layout/PublicHeader";
import Footer from "@/components/layout/Footer";
import JsonLd from "@/components/JsonLd";
import LandingIcon from "@/components/landing/art/LandingIcon";
import TestimonialCard from "@/components/landing/TestimonialCard";
import SampleFlipbook from "@/components/sample/SampleFlipbook";
import GradeToggle from "@/components/sample/GradeToggle";
import ThemeSignupForm from "@/components/sample/ThemeSignupForm";
import { SITE_URL, DEFAULT_OPEN_GRAPH, DEFAULT_TWITTER, ANDY_PATH } from "@/lib/site";
import { GENERATION_TIME_TEXT, HOURS_RANGE_TEXT, PAGE_RANGE_TEXT } from "@/lib/situations/figures";
import { buildFaqJsonLd } from "@/lib/situations/faq-schema";
import { PLANS } from "@/lib/stripe";
import { TESTIMONIALS } from "@/lib/testimonials";
import { coverOf, gallerySrc, getLiveUnitStudies } from "@/lib/unit-studies/loader";
import { pricingLine } from "@/lib/unit-studies/format";
import { PLAN_PRICE } from "@/lib/plans";
import {
  DAY_STEPS,
  DEFAULT_GRADE,
  GRADE_SAMPLES,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  SAMPLE_CHILD,
  SAMPLE_GRADE,
  SAMPLE_PAGES,
} from "@/lib/sample/content";

const TITLE = "See a Real Sample Packet | Packet Day";
const PAGE_COUNT = SAMPLE_PAGES.length;
const DESCRIPTION = `Flip through all ${PAGE_COUNT} pages of a real grade ${SAMPLE_GRADE} outer space packet, answer key included, then see it for grades 1 and 7. Free to start.`;
const PAGE_URL = `${SITE_URL}/sample`;
const OG_IMAGE = {
  url: `${SITE_URL}/og/sample`,
  width: 1200,
  height: 630,
  alt: "The cover of Kai and the Missing Planet, a real sample packet",
};

export const metadata: Metadata = {
  // `absolute` skips the root "%s | Packet Day" template; the title already has it.
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { ...DEFAULT_OPEN_GRAPH, title: TITLE, description: DESCRIPTION, url: PAGE_URL, images: [OG_IMAGE] },
  twitter: { ...DEFAULT_TWITTER, title: TITLE, description: DESCRIPTION, images: [OG_IMAGE.url] },
};

const HERO_ID = "sample-hero";
const FINAL_CTA_ID = "sample-final-cta";
const MAX_UNIT_STUDIES = 6;
const SHOWN_TESTIMONIALS = ["chanty", "bridget-j", "barbara-r"];

const freeCount = PLANS.free.packetsPerMonth;
const FREE_LINE = `${freeCount} free packet${freeCount === 1 ? "" : "s"} every month. No card needed.`;

// Closing line under the free line: only the paid plan, prices from lib/plans.ts.
const UNLIMITED_LINE = `Want more? Unlimited is $${Math.round(PLAN_PRICE.yearly / 12)} a month billed annually or $${PLAN_PRICE.monthly} month to month.`;

const FAQS = [
  {
    question: "What does it cost?",
    answer: `You can start for free. ${pricingLine()}`,
  },
  {
    question: "Are these made by AI?",
    answer:
      "Yes, AI writes each packet from scratch around your kid's grade and the theme you type in. We are a homeschool family, and our own kids test packets all the time. They are good, and they are not perfect, so skim it before you print. The parent answer key makes checking the work quick.",
  },
  {
    question: "How long does a packet take?",
    answer: `A packet takes ${GENERATION_TIME_TEXT} to make and fills roughly ${HOURS_RANGE_TEXT} of school with breaks. It runs ${PAGE_RANGE_TEXT}, and you can print it right away. Every packet is also emailed to you, so it is easy to find later.`,
  },
  {
    question: "Which grades?",
    answer:
      "Packet Day makes packets for kindergarten through grade 8. The reading, math and writing are matched to your kid's grade level. The grade toggle above shows the same outer space theme made for grades 1, 4 and 7.",
  },
];

function SectionHeading({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <h2
      className={`font-display text-3xl md:text-4xl font-bold text-dark mb-4 leading-tight ${center ? "text-center" : ""}`}
    >
      {children}
    </h2>
  );
}

export default function SamplePage() {
  const cover = SAMPLE_PAGES[0];
  const unitStudies = getLiveUnitStudies().slice(0, MAX_UNIT_STUDIES);
  const testimonials = SHOWN_TESTIMONIALS.map((id) => TESTIMONIALS.find((t) => t.id === id && t.verified)).filter(
    (t) => t !== undefined,
  );
  const gridTestimonials = testimonials.filter((t) => !t.featured);
  const featuredTestimonials = testimonials.filter((t) => t.featured);
  const totalMinutes = DAY_STEPS.reduce((sum, step) => sum + (step.minutes ?? 0), 0);
  const activityCount = DAY_STEPS.filter((step) => step.minutes).length;

  return (
    <div className="min-h-screen flex flex-col bg-cream-deep">
      <JsonLd data={buildFaqJsonLd({ heading: "Questions parents ask", faqs: FAQS })} />
      <PublicHeader />

      <main className="flex-1">
        {/* Hero */}
        <section id={HERO_ID} className="px-6 pt-12 pb-16 md:pt-20 md:pb-20 bg-cream-deep">
          <div className="max-w-5xl mx-auto grid gap-10 md:grid-cols-[1fr_minmax(0,20rem)] md:items-center">
            <div>
              <h1 className="font-display text-4xl md:text-5xl font-bold text-dark leading-tight mb-6">
                Flip through a whole school day about outer space
              </h1>
              <p className="text-lg md:text-xl text-dark/80 leading-relaxed mb-8">
                This is a real Packet Day packet, made for a grade {SAMPLE_GRADE} learner named {SAMPLE_CHILD}. Every
                page is here, even the parent answer key. You don&apos;t need to sign up to look.
              </p>
              <ThemeSignupForm from="sample-hero" inputId="sample-theme-hero" freeLine={FREE_LINE} />
            </div>
            <div className="hidden md:block text-center">
              <div className="mx-auto max-w-xs overflow-hidden rounded-lg border border-dark/10 shadow-md rotate-2">
                <Image
                  src={cover.src}
                  alt={cover.alt}
                  width={PAGE_WIDTH}
                  height={PAGE_HEIGHT}
                  sizes="320px"
                  priority
                  className="h-auto w-full"
                />
              </div>
              <p className="mt-4 text-sm font-semibold text-sage-dark">
                A sample packet made for a grade {SAMPLE_GRADE} learner named {SAMPLE_CHILD}
              </p>
            </div>
          </div>
        </section>

        {/* Flipbook */}
        <section className="px-4 sm:px-6 py-20 bg-white">
          <div className="max-w-5xl mx-auto">
            <SectionHeading center>Every page, start to finish</SectionHeading>
            <p className="mx-auto mb-10 max-w-2xl text-center text-dark/70 leading-relaxed">
              Swipe, tap the arrows or use your arrow keys. This is exactly what {SAMPLE_CHILD}&apos;s packet looks
              like, down to the last page, which is just for you.
            </p>
            <SampleFlipbook pages={SAMPLE_PAGES} width={PAGE_WIDTH} height={PAGE_HEIGHT} />
          </div>
        </section>

        {/* A school day on paper */}
        <section className="px-6 py-20 bg-paper">
          <div className="max-w-3xl mx-auto">
            <SectionHeading>A school day on paper</SectionHeading>
            <p className="mb-10 text-dark/70 leading-relaxed">
              Here is {SAMPLE_CHILD}&apos;s day from the Today at a Glance page: {activityCount} activities and{" "}
              {totalMinutes} minutes of work, with a puzzle and a movement break in the middle. Then a coloring page, a
              certificate and an answer key for you.
            </p>
            <ol className="relative space-y-4 before:absolute before:left-7 before:top-4 before:bottom-4 before:w-0.5 before:bg-sage/25">
              {DAY_STEPS.map((step) => (
                <li key={step.kind} className="relative flex items-center gap-4">
                  <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-white shadow-sm">
                    <LandingIcon name={step.icon} className="h-9 w-9" />
                  </div>
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-sage-dark">{step.kind}</p>
                      <p className="font-semibold leading-snug text-dark">{step.title}</p>
                    </div>
                    <p className="shrink-0 text-right text-sm font-bold text-dark/70">
                      {step.minutes ? `${step.minutes} min` : step.note}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Meet Nova */}
        <section className="px-6 py-20 bg-cream-deep">
          <div className="max-w-5xl mx-auto grid gap-8 md:grid-cols-[23.5rem_1fr] md:gap-12 md:items-center">
            {/* Nova on their own, from the packet's cover art. Above the heading on mobile, left of it on desktop. */}
            <div className="mx-auto w-[17rem] md:w-full overflow-hidden rounded-3xl border border-border bg-white p-3 shadow-sm">
              <Image
                src="/sample/nova.png"
                alt="Nova the fox astronaut in a shiny silver spacesuit, waving and holding a magnifying glass."
                width={742}
                height={742}
                sizes="(min-width: 768px) 352px, 248px"
                loading="lazy"
                className="h-auto w-full"
              />
            </div>
            <div>
              <SectionHeading>Meet Nova</SectionHeading>
              <p className="mb-5 text-dark/70 leading-relaxed">
                {/* Plain text on purpose: built from constants, this paragraph came out of
                    the build with words missing (a string folding bug), so it names Kai directly. */}
                Nova is a fox astronaut in a shiny silver spacesuit, with a magnifying glass for detective work. On the
                cover Nova brings Kai an urgent case: an old star chart shows nine planets, but today we only count
                eight. In the reading they follow the clues to find out why Pluto is now called a dwarf planet, and the
                certificate ends with &ldquo;Nova is proud of you, Kai.&rdquo;
              </p>
              <p className="font-semibold text-dark">Every packet invents its own character.</p>
            </div>
          </div>
        </section>

        {/* Grade toggle */}
        <section className="px-4 sm:px-6 py-20 bg-white">
          <div className="max-w-4xl mx-auto">
            <SectionHeading center>Same theme, different grade</SectionHeading>
            <p className="mx-auto mb-10 max-w-2xl text-center text-dark/70 leading-relaxed">
              We made the same outer space packet for three kids in three grades. Tap a grade to see how the math, the
              reading and the puzzle change.
            </p>
            <GradeToggle samples={GRADE_SAMPLES} defaultGrade={DEFAULT_GRADE} width={PAGE_WIDTH} height={PAGE_HEIGHT} />
          </div>
        </section>

        {/* Every kid gets a different packet */}
        <section className="px-6 py-20 bg-paper">
          <div className="max-w-5xl mx-auto">
            <SectionHeading>Every kid gets a different packet</SectionHeading>
            <p className="mb-10 max-w-2xl text-lg text-dark/70 leading-relaxed">
              Oliver once asked for only Megalodons three days in a row. He got three different packets.
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
              {unitStudies.map((page) => {
                const pageCover = coverOf(page);
                return (
                  <Link
                    key={page.slug}
                    href={`/unit-studies/${page.slug}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="border-b border-border bg-cream-dark">
                      <Image
                        src={gallerySrc(page, pageCover)}
                        alt={pageCover.alt}
                        width={pageCover.width}
                        height={pageCover.height}
                        sizes="(min-width: 768px) 300px, 50vw"
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover object-top"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-display text-lg font-bold leading-snug text-dark group-hover:text-sage">
                        {page.theme.name}
                      </h3>
                      <p className="mt-1 text-sm text-dark/70">Guide: {page.sample.characterName}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
            <p className="mt-10 text-center">
              <Link href="/unit-studies" className="font-semibold text-sage hover:underline">
                See every unit study packet →
              </Link>
            </p>
          </div>
        </section>

        {/* Andy's note */}
        <section className="px-6 py-20 bg-cream-deep">
          <div className="max-w-3xl mx-auto">
            <SectionHeading>A note from Andy</SectionHeading>
            <p className="text-dark/70 leading-relaxed">
              Before I took Oliver camping in the White Mountains at the Ancient Bristlecone Pine Forest, we made a few
              Packet Day packets about bristlecone pines, stargazing and constellations. Then we saw the real thing.
              The stars were amazing. Oliver pointed out the Big Dipper and the Milky Way, and he was blown away. He
              loved it, maybe not quite as much as the s&apos;mores.
            </p>
            <p className="mt-6 text-sm text-dark/60">
              <Link href={ANDY_PATH} className="font-semibold text-sage hover:underline">
                Andy, Packet Day co-founder and Oliver&apos;s dad
              </Link>
            </p>
          </div>
        </section>

        {/* Testimonials */}
        <section className="px-6 py-20 bg-white">
          <div className="max-w-3xl mx-auto">
            <SectionHeading center>What parents tell us</SectionHeading>
            <div className="mt-10 grid sm:grid-cols-2 gap-6 mb-6">
              {gridTestimonials.map((t) => (
                <TestimonialCard key={t.id} testimonial={t} />
              ))}
            </div>
            {featuredTestimonials.map((t) => (
              <TestimonialCard key={t.id} testimonial={t} featured />
            ))}
          </div>
        </section>

        {/* FAQ: every answer in the HTML and always visible, like the unit study pages */}
        <section className="px-6 py-20 bg-paper">
          <div className="max-w-3xl mx-auto">
            <SectionHeading>Questions parents ask</SectionHeading>
            <div className="divide-y divide-border">
              {FAQS.map((faq) => (
                <div key={faq.question} className="py-6">
                  <h3 className="font-semibold text-dark text-lg leading-snug mb-2">{faq.question}</h3>
                  <p className="text-dark/70 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section id={FINAL_CTA_ID} className="px-6 py-24 bg-gradient-to-b from-cream to-sage-light/20">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-dark mb-4 leading-tight">
              Your kid&apos;s version would be about something else entirely
            </h2>
            <p className="mb-10 text-lg text-dark/70 leading-relaxed">
              Tell us what they love right now. We build a whole school day around it in {GENERATION_TIME_TEXT}.
            </p>
            <ThemeSignupForm from="sample-footer" inputId="sample-theme-footer" freeLine={FREE_LINE} align="center" />
            <p className="mt-4 text-sm font-semibold text-sage-dark">{UNLIMITED_LINE}</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
