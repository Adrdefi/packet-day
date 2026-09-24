import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import Footer from "@/components/layout/Footer";
import JsonLd from "@/components/JsonLd";
import {
  SITE_URL,
  DEFAULT_OPEN_GRAPH,
  DEFAULT_TWITTER,
  DEFAULT_OG_IMAGE,
  NATALIE_ID,
  NATALIE_URL,
} from "@/lib/site";

const TITLE = "About Packet Day | Built by a Homeschool Family";
const DESCRIPTION =
  "Packet Day was built by a homeschool mom and her developer husband to create original, print-ready learning packets for K-8 kids in a minute or two.";
const PAGE_URL = `${SITE_URL}/about`;
const ORG_ID = `${SITE_URL}/#organization`;
const PINTEREST_URL = "https://www.pinterest.com/packetday";

export const metadata: Metadata = {
  // Absolute, so the layout's "%s | Packet Day" template doesn't append a
  // second brand suffix to a title that already names Packet Day.
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    ...DEFAULT_OPEN_GRAPH,
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    ...DEFAULT_TWITTER,
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

const PACKET_CONTENTS = [
  "Reading and math at your child's grade level",
  "A rotating subject like science or history",
  "A puzzle break and a movement break",
  "A coloring page",
  "A custom character who shows up throughout the day",
  "A completion certificate",
  "A parent answer sheet, kept separate from your child's pages",
];

const DIFFERENCES = [
  {
    lead: "Original every time.",
    rest: "The math problems, reading passages, activities, and character are all created for that one request. Your kid can ask for the same obsession three days in a row and get something new each time.",
  },
  {
    lead: "Built by people who use it every week.",
    rest: "Packet Day reflects our real Fridays, real kid requests, and the need for actual breathing room, not a generic feature list.",
  },
  {
    lead: "Fast enough for real life.",
    rest: "A packet takes a minute or two. You can make one on your phone when the day falls apart.",
  },
  {
    lead: "Hand it over and step away.",
    rest: "Clean pages, household supplies, and an answer sheet, so you're not solving math problems at the kitchen table.",
  },
];

const AUDIENCE = [
  "Homeschool families who want a solid backup plan or a weekly tradition",
  "Parents with kids in different grades who want individual packets without planning twice",
  "School families on sick days, snow days, and school breaks",
  "Grandparents and caregivers covering a day of school",
  "Anyone who needs a school day ready in a minute or two",
];

// Hardcoded here for now; lib/testimonials.ts is handled separately.
// Both confirmed real, with permission.
const QUOTES = [
  {
    quote:
      "What a genius way to foster our kids' interests and let them learn through the things they naturally love.",
    name: "Chanty",
    credential: "homeschool mom of three",
  },
  {
    quote: "Super amazing!",
    name: "Chelsea D.",
    credential: "mom of two",
  },
];

const STEPS = [
  "Create a free account and add your child's grade.",
  "Tell us what they're into right now.",
  "Hit generate. Your packet is ready in a minute or two.",
  "Print it, hand it over, and breathe. Pizza optional.",
];

const FAQS = [
  {
    q: "Who built Packet Day?",
    a: "Natalie, a homeschool teacher and mom of two, and her husband Andy, a developer. We started it in 2026 in Lodi, California.",
  },
  {
    q: "How long does it take to make a packet?",
    a: "A minute or two. Fast enough to make one on your phone when the day falls apart.",
  },
  {
    q: "Is this a full curriculum?",
    a: "No. It's made for hard days, interest-led learning, filling gaps, and Friday traditions. It's designed to sit alongside your core curriculum.",
  },
  {
    q: "Do I need to be homeschooling to use this?",
    a: "Not at all. Plenty of families use Packet Day for sick days, snow days, or a school break, no homeschooling required.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. The free plan never needs a card, and Unlimited plans can be canceled anytime.",
  },
];

const linkClass = "text-sage font-semibold underline underline-offset-2 hover:text-sage-dark";

const AT_A_GLANCE: { label: string; value: ReactNode }[] = [
  { label: "Company", value: "Packet Day" },
  { label: "Founded", value: "2026" },
  { label: "Founders", value: "Natalie Riggs and Andy Riggs" },
  { label: "Based in", value: "Lodi, California" },
  { label: "What we make", value: "Original, print-ready, full-day learning packets for K-8" },
  {
    label: "Plans",
    value: (
      <>
        Free plan (no card required) and Unlimited.{" "}
        <Link href="/pricing" className={linkClass}>
          See pricing
        </Link>
      </>
    ),
  },
  {
    label: "Support",
    value: (
      <a href="mailto:hello@packetday.com" className={`${linkClass} break-all`}>
        hello@packetday.com
      </a>
    ),
  },
  {
    label: "Website",
    value: (
      <Link href="/" className={linkClass}>
        packetday.com
      </Link>
    ),
  },
  {
    label: "Follow us",
    value: (
      <a href={PINTEREST_URL} className={linkClass} target="_blank" rel="noopener noreferrer">
        Pinterest @packetday
      </a>
    ),
  },
];

const natalieId = NATALIE_ID;
const andyId = `${SITE_URL}/about#andy-riggs`;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": `${PAGE_URL}#webpage`,
      url: PAGE_URL,
      name: TITLE,
      description: DESCRIPTION,
      about: { "@id": ORG_ID },
      mainEntity: { "@id": ORG_ID },
    },
    {
      "@type": "Organization",
      "@id": ORG_ID,
      name: "Packet Day",
      url: SITE_URL,
      email: "hello@packetday.com",
      foundingDate: "2026",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Lodi",
        addressRegion: "CA",
        addressCountry: "US",
      },
      sameAs: [PINTEREST_URL],
      founder: [{ "@id": natalieId }, { "@id": andyId }],
    },
    {
      "@type": "Person",
      "@id": natalieId,
      name: "Natalie Riggs",
      jobTitle: "Co-Founder",
      url: NATALIE_URL,
      worksFor: { "@id": ORG_ID },
    },
    {
      "@type": "Person",
      "@id": andyId,
      name: "Andy Riggs",
      jobTitle: "Co-Founder and Developer",
      worksFor: { "@id": ORG_ID },
    },
    {
      "@type": "FAQPage",
      "@id": `${PAGE_URL}#faq`,
      mainEntity: FAQS.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: { "@type": "Answer", text: faq.a },
      })),
    },
  ],
};

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-3xl md:text-4xl font-bold text-dark leading-tight mb-6">
      {children}
    </h2>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-2.5 w-2 h-2 rounded-full bg-sage shrink-0" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <JsonLd data={jsonLd} />
      <SiteHeader />

      <main className="flex-1">
        {/* Intro */}
        <section className="px-6 pt-16 pb-12 md:pt-24">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-4xl md:text-6xl font-bold text-dark leading-tight mb-6">
              About Packet Day
            </h1>
            <p className="text-lg md:text-xl text-dark/80 leading-relaxed">
              Packet Day makes original, print-ready learning packets for K-8 kids, built around
              whatever your child is into right now. Tell us their grade and their current
              obsession, and in a minute or two you&apos;ll have a full school day ready to print.
            </p>
          </div>
        </section>

        {/* Why we built it */}
        <section className="px-6 py-12">
          <div className="max-w-3xl mx-auto text-dark/80 text-lg leading-relaxed">
            <SectionHeading>Why we built it</SectionHeading>
            <div className="space-y-5">
              <p>
                Packet Day started at our kitchen table in 2026. Natalie homeschools our two kids,
                Vivian and Oliver, and some days just don&apos;t go to plan. Someone&apos;s sick,
                the curriculum runs thin, or everyone is running on fumes.
              </p>
              <p>
                Andy is a developer. He built Packet Day to give Natalie real breathing room on
                those days, and to give the kids work they&apos;d actually be excited to do.
              </p>
              <p>
                It started with a Friday tradition: wrap up the week with a themed packet, then
                pizza, no guilt. We still do Packet Day Fridays, and Vivian and Oliver are still
                our official test pilots.
              </p>
            </div>
          </div>
        </section>

        {/* What's in a packet */}
        <section className="px-6 py-12">
          <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-border p-6 md:p-10 text-dark/80 text-lg leading-relaxed">
            <SectionHeading>What&apos;s in a packet</SectionHeading>
            <p className="mb-5">
              Every packet is written from scratch for your child. Nothing comes from a template or
              a theme library. A typical packet includes:
            </p>
            <div className="mb-6">
              <Bullets items={PACKET_CONTENTS} />
            </div>
            <p>
              Packets run 11 to 17 pages. That&apos;s a full school day, roughly 2 to 5 hours with
              breaks. Supply lists stick to things you already have at home. Download the PDF right
              away, and it lands in your inbox too.
            </p>
          </div>
        </section>

        {/* What makes it different */}
        <section className="px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <SectionHeading>What makes it different</SectionHeading>
            <div className="grid sm:grid-cols-2 gap-6">
              {DIFFERENCES.map((d) => (
                <p
                  key={d.lead}
                  className="bg-paper rounded-2xl border border-border p-6 text-dark/80 text-base leading-relaxed"
                >
                  <strong className="block font-display text-xl text-dark mb-2">{d.lead}</strong>
                  {d.rest}
                </p>
              ))}
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section className="px-6 py-12">
          <div className="max-w-3xl mx-auto text-dark/80 text-lg leading-relaxed">
            <SectionHeading>Who it&apos;s for</SectionHeading>
            <Bullets items={AUDIENCE} />
          </div>
        </section>

        {/* What parents say */}
        <section className="px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <SectionHeading>What parents say</SectionHeading>
            <div className="space-y-6">
              {QUOTES.map((t, i) => (
                <figure
                  key={t.name}
                  className={
                    i === 0
                      ? "bg-sage rounded-2xl p-7 md:p-10"
                      : "bg-white rounded-2xl border border-border p-7 md:p-8"
                  }
                >
                  <blockquote
                    className={[
                      "font-display font-bold leading-snug mb-5",
                      i === 0 ? "text-cream text-xl md:text-2xl" : "text-dark text-xl",
                    ].join(" ")}
                  >
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="flex items-center gap-3">
                    <span
                      className={[
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                        i === 0 ? "bg-honey text-dark" : "bg-sage text-cream",
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      {t.name.charAt(0)}
                    </span>
                    <span className={i === 0 ? "text-cream text-sm" : "text-dark text-sm"}>
                      <span className="font-bold">{t.name}</span>
                      <span className={i === 0 ? "text-cream/80" : "text-muted"}>
                        , {t.credential}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* The team */}
        <section className="px-6 py-12">
          <div className="max-w-3xl mx-auto text-dark/80 text-lg leading-relaxed">
            <SectionHeading>The team</SectionHeading>
            {/*
              Future family photo goes here. Use next/image with a real file in
              /public, meaningful alt text, and explicit width/height, e.g.:
              <Image src="/about/riggs-family.jpg" alt="Natalie and Andy Riggs with Vivian and Oliver" width={1200} height={800} className="rounded-2xl mb-8" />
              Do not render anything here until the photo exists.
            */}
            <div className="space-y-5">
              <p id="natalie">
                <strong className="text-dark">Natalie Riggs, Co-Founder.</strong> Homeschool
                teacher, mom of two, and the reason Packet Day exists. She was our first user, and
                she still is.
              </p>
              <p>
                <strong className="text-dark">Andy Riggs, Co-Founder and Developer.</strong> Andy
                builds and runs the product. He made Packet Day to take pressure off Natalie&apos;s
                hardest days and give the kids fun work they can do at their own pace.
              </p>
              <p>Packet Day is small, parent-led, and based in Lodi, California.</p>
            </div>
          </div>
        </section>

        {/* At a glance */}
        <section className="px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <SectionHeading>Packet Day at a glance</SectionHeading>
            <dl className="bg-white rounded-2xl border border-border divide-y divide-border">
              {AT_A_GLANCE.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[7.5rem_1fr] md:grid-cols-[11rem_1fr] gap-4 px-5 md:px-8 py-4"
                >
                  <dt className="font-bold text-dark text-sm md:text-base">{row.label}</dt>
                  <dd className="text-dark/80 text-sm md:text-base leading-relaxed min-w-0">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* How it works */}
        <section className="px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <SectionHeading>How it works</SectionHeading>
            <ol className="space-y-4">
              {STEPS.map((step, i) => (
                <li key={step} className="flex items-start gap-4">
                  <span
                    className="w-9 h-9 rounded-full bg-honey text-dark font-bold flex items-center justify-center shrink-0"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <span className="text-dark/80 text-lg leading-relaxed pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Questions: native details/summary so every answer is in the server HTML */}
        <section className="px-6 py-16 bg-white">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-dark text-center leading-tight mb-10">
              Questions
            </h2>
            <div className="divide-y divide-border">
              {FAQS.map((faq) => (
                <details key={faq.q} className="group">
                  <summary className="flex items-start justify-between gap-4 py-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-inset rounded-sm">
                    <span className="font-semibold text-dark text-base leading-snug group-hover:text-sage transition-colors">
                      {faq.q}
                    </span>
                    <span
                      className="text-sage mt-0.5 shrink-0 text-xl font-bold transition-transform duration-200 group-open:rotate-45"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="pb-5 text-dark/70 text-base leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTAs */}
        <section className="px-6 py-16 bg-sage">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="text-center bg-cream text-sage-dark font-bold text-base px-8 py-4 rounded-full hover:bg-paper transition-colors shadow-sm"
            >
              Make a packet for your kid
            </Link>
            <Link
              href="/sample"
              className="text-center border-2 border-cream text-cream font-bold text-base px-8 py-4 rounded-full hover:bg-cream hover:text-sage-dark transition-colors"
            >
              See a real packet first
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
