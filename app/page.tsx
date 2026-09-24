import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Wordmark from "@/components/layout/Wordmark";
import ThemeTicker from "@/components/landing/ThemeTicker";
import PricingPlans from "@/components/pricing/PricingPlans";
import OnePriceArt from "@/components/landing/art/OnePriceArt";
import FAQSection, { FAQS } from "@/components/landing/FAQSection";
import JsonLd from "@/components/JsonLd";
import BrowseBySituation from "@/components/landing/BrowseBySituation";
import HeroPacketShowcase from "@/components/landing/HeroPacketShowcase";
import InsidePacketShowcase from "@/components/landing/InsidePacketShowcase";
import HardDayArt from "@/components/landing/art/HardDayArt";
import StepArt from "@/components/landing/art/StepArt";
import TomorrowArt from "@/components/landing/art/TomorrowArt";
import LandingIcon, { type LandingIconName } from "@/components/landing/art/LandingIcon";
import { TESTIMONIALS } from "@/lib/testimonials";
import { PLANS } from "@/lib/stripe";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  // Absolute so the layout's title template can never append a second brand suffix.
  title: { absolute: "Printable Homeschool Packets, Any Theme, K-8 | Packet Day" },
  description:
    "Print-ready learning packets themed to whatever your kid loves. For homeschool days, sick days, and snow days. Ready in a minute or two. Free to start.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "Printable Homeschool Packets, Any Theme, K-8 | Packet Day",
    description:
      "Print-ready learning packets themed to whatever your kid loves. For homeschool days, sick days, and snow days. Ready in a minute or two. Free to start.",
    url: SITE_URL,
    siteName: "Packet Day",
    images: [{ url: "/og?v=2", width: 1200, height: 630, alt: "Packet Day: a printable school day built around what your kid loves" }],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Printable Homeschool Packets, Any Theme, K-8 | Packet Day",
    description:
      "Print-ready learning packets themed to whatever your kid loves. For homeschool days, sick days, and snow days. Ready in a minute or two. Free to start.",
    images: ["/og?v=2"],
  },
};

// ─── Static section data ──────────────────────────────────────────────────────

const PAIN_CARDS: { icon: LandingIconName; title: string; desc: string }[] = [
  {
    icon: "fumes",
    title: "You're running on fumes.",
    desc: "Flu, migraines, first trimester, or just a terrible night's sleep. Your body says stop but the school year doesn't pause. You need something ready to hand them right now.",
  },
  {
    icon: "mentalLoad",
    title: "The mental load won at 10am.",
    desc: "The toddler is melting down, the laundry pile has feelings, and lesson planning feels impossible today. You need a backup plan, not a guilt trip.",
  },
  {
    icon: "curricula",
    title: "You're between curricula. Again.",
    desc: "You switched programs mid-year, you're supplementing a co-op day, or you just need something structured to fill the gaps without starting a whole new system.",
  },
  {
    icon: "schoolClosed",
    title: "School's closed. Again.",
    desc: "Snow day, teacher workday, or your kid's home sick. You didn't plan a school day, but you can still hand them one.",
  },
];

const PREVIEW_CARDS: { icon: LandingIconName; subject: string; desc: string }[] = [
  { icon: "math", subject: "Math", desc: "Measuring dinosaurs, counting fossils, dino timeline math" },
  { icon: "reading", subject: "Reading", desc: "Dino facts passage + comprehension questions" },
  { icon: "science", subject: "Science", desc: "Fossil dig activity, herbivore vs. carnivore sort" },
  { icon: "artPe", subject: "Art + PE", desc: 'Draw your own dino + "Dino Stomp" movement break' },
];

const STEPS = [
  {
    step: "STEP 1",
    title: "Tell Us About Your Kids",
    desc: "Grade level + what they're into right now. Dinosaurs, baking, outer space, soccer, Minecraft. The more specific, the better the AI makes it.",
  },
  {
    step: "STEP 2",
    title: 'Hit \u201cGenerate\u201d',
    desc: "Our AI creates a complete, original packet in a minute or two: math, reading, science, art, and PE breaks, all themed to their world.",
  },
  {
    step: "STEP 3",
    title: "Print, Hand Off, Breathe",
    desc: "Hit print. Hand it to your kids. Sit down with your coffee (or go back to bed). They're learning, and you get to breathe.",
  },
];

const FEATURES: { icon: LandingIconName; title: string; desc: string }[] = [
  {
    icon: "gradeAligned",
    title: "Grade-Aligned, Not Generic",
    desc: "K-8th content matched to your child's actual level. The AI adapts complexity, vocabulary, and concepts to where they really are.",
  },
  {
    icon: "original",
    title: "Original Content Every Time",
    desc: "No recycled worksheet library. The AI creates fresh problems, passages, and activities from scratch, so your kid never gets a repeat.",
  },
  {
    icon: "peBreaks",
    title: "PE Breaks Built In",
    desc: "Movement activities between subjects keep wiggly bodies active and help brains actually absorb what they're learning.",
  },
  {
    icon: "answerKeys",
    title: "Answer Keys Included",
    desc: "Check their work in 30 seconds. Or hand the key to your oldest and let them play teacher. (They love that.)",
  },
  {
    icon: "limitless",
    title: "Limitless Imagination",
    desc: "There's no theme too weird, too specific, or too niche. If your kid can dream it, the AI can turn it into a school day.",
  },
  {
    icon: "printReady",
    title: "Beautiful Print-Ready PDFs",
    desc: "Clean layouts, colorful pages, zero screen time. Print on regular paper and hand it over. Done.",
  },
];

// Same Organization @id as app/about/page.tsx, so both pages describe one
// company. The full details (founders, address, founding date) live on /about.
const homeJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Packet Day",
      url: SITE_URL,
      email: "hello@packetday.com",
      sameAs: ["https://www.pinterest.com/packetday"],
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: FAQS.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: { "@type": "Answer", text: faq.a },
      })),
    },
  ],
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <>
      <JsonLd data={homeJsonLd} />
      <Navbar />

      <main>
        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <section className="pt-32 pb-20 px-6 bg-cream text-center">
          {/* Below lg: text, cover, stats stack in DOM order. At lg: text and stats share the
              left column, centered between two flexible rows; the cover spans the right. */}
          <div className="max-w-6xl mx-auto lg:grid lg:grid-cols-[1.6fr_1fr] lg:grid-rows-[1fr_auto_auto_1fr] lg:gap-x-12">
            <div className="lg:col-start-1 lg:row-start-2 lg:text-left">
              {/* Headline */}
              <h1 className="font-display text-5xl md:text-6xl lg:text-[2.75rem] xl:text-[3.25rem] font-bold text-dark leading-tight mb-6">
                Today&apos;s a Hard Day.
                <br />
                Your Kids Can{" "}
                <em className="italic text-sage">
                  Still
                </em>{" "}
                Learn.
              </h1>

              {/* Subheadline */}
              <p className="text-lg md:text-xl text-dark/70 max-w-2xl mx-auto lg:mx-0 mb-4 leading-relaxed">
                A full, printable school day built around whatever your kid is obsessed
                with, ready in a minute or two.
              </p>
              <p className="text-base md:text-lg font-semibold text-dark max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed">
                Monday it’s monster trucks. Tuesday it’s ancient Egypt. Wednesday it’s
                “only sloths.” Every one works, and no two packets are ever the same.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-16">
                <Link
                  href="/signup"
                  className="bg-sage text-cream font-bold text-base px-8 py-4 rounded-full hover:bg-sage-dark transition-colors shadow-sm"
                >
                  Try It Free, No Card Needed ✨
                </Link>
                <Link
                  href="/sample"
                  className="text-sage font-bold text-base px-8 py-4 rounded-full border-2 border-sage hover:bg-sage/10 transition-colors"
                >
                  See a Real Packet
                </Link>
              </div>
            </div>

            <div className="lg:col-start-2 lg:row-start-1 lg:row-span-4 lg:self-center">
              <HeroPacketShowcase />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto mt-16 lg:mt-0 lg:mx-0 lg:col-start-1 lg:row-start-3">
              {[
                { stat: "K-8th", label: "Grade Levels" },
                { stat: "2-5 hrs", label: "Per Packet" },
                { stat: "1-2 min", label: "To Generate" },
                { stat: "∞", label: "Possible Themes" },
              ].map(({ stat, label }) => (
                <div key={label} className="text-center">
                  <div className="font-display text-3xl font-bold text-sage">{stat}</div>
                  <div className="text-sm text-dark/60 mt-1 font-semibold">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── LOOK INSIDE ───────────────────────────────────────────────────── */}
        <section className="py-24 bg-paper px-6 overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <span className="inline-block bg-sage/10 text-sage text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
                A real packet, start to finish
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-dark mb-6">
                This is what lands in your inbox.
              </h2>
            </div>

            <InsidePacketShowcase />

            <p className="text-center text-dark/70 mt-10 max-w-2xl mx-auto">
              That’s 4 of the 14 pages in Oliver’s Constitution Adventure Day. Inside: math,
              reading, writing, history, a word search, a movement break and a coloring page.
            </p>
            <p className="text-center mt-4">
              <Link href="/sample" className="text-sage font-bold hover:underline">
                See every page of a real packet →
              </Link>
            </p>
          </div>
        </section>

        {/* ── PAIN POINTS ───────────────────────────────────────────────────── */}
        <section className="py-24 bg-white px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-4">
              <span className="inline-block bg-coral/15 text-coral-dark text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
                Real Talk
              </span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-dark text-center mb-6 leading-tight max-w-3xl mx-auto">
              Some days, homeschool just doesn&apos;t happen the way you planned.
              (And that&apos;s okay.)
            </h2>

            <HardDayArt className="w-full max-w-[640px] mx-auto" />
            <div className="max-w-[640px] mx-auto mt-1 mb-14 flex justify-center md:justify-between gap-2 md:px-8 font-bold text-sm text-dark/60">
              <span>Tuesday, 9:14 am</span>
              <span className="md:hidden" aria-hidden="true">→</span>
              <span>Tuesday, 9:16 am</span>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {PAIN_CARDS.map((card) => (
                <div
                  key={card.title}
                  className="bg-cream rounded-2xl p-8 border border-coral/20"
                >
                  <div className="w-16 h-16 rounded-full bg-coral/15 flex items-center justify-center mb-4">
                    <LandingIcon name={card.icon} className="w-11 h-11" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-dark mb-3">
                    {card.title}
                  </h3>
                  <p className="text-dark/70 leading-relaxed text-sm">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── AI / INFINITE THEMES ──────────────────────────────────────────── */}
        <section id="themes" className="py-24 bg-cream px-6 overflow-hidden">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-4">
              <span className="inline-block bg-sage/10 text-sage text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
                Powered by AI
              </span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-dark mb-6 leading-tight">
              If your kid can dream it, we can teach it.
            </h2>
            <p className="text-dark/70 text-lg leading-relaxed mb-4">
              Packet Day is powered by AI, which means there&apos;s no fixed library of themes.
              Every single packet is created from scratch, tailored to your child&apos;s grade level
              and whatever they&apos;re into{" "}
              <em className="italic">right now</em>.
            </p>
            <p className="text-dark/70 text-lg leading-relaxed">
              Last week it was volcanoes. This week it&apos;s Taylor Swift. Tomorrow it might be
              &ldquo;only robots that live underwater.&rdquo;{" "}
              <strong className="text-dark">All of those work.</strong>
            </p>
          </div>
          <ThemeTicker />
        </section>

        {/* ── PACKET PREVIEW ────────────────────────────────────────────────── */}
        <section className="py-24 bg-white px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-dark text-center mb-10">
              Example: &ldquo;Dinosaur Day&rdquo; for a 3rd Grader
            </h2>

            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              {PREVIEW_CARDS.map((card) => (
                <div
                  key={card.subject}
                  className="bg-cream rounded-2xl p-6 border border-border flex items-start gap-4"
                >
                  <div className="w-14 h-14 shrink-0 rounded-full bg-honey/20 flex items-center justify-center">
                    <LandingIcon name={card.icon} className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-dark text-lg mb-1">
                      {card.subject}
                    </h3>
                    <p className="text-dark/70 text-sm leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* AI explanation */}
            <div className="bg-dark rounded-2xl p-8 text-cream">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="font-display text-xl font-bold text-cream">
                  How the AI works (the non-techy version)
                </h3>
              </div>
              <p className="text-cream/80 leading-relaxed text-sm">
                You tell us your child&apos;s grade and what they&apos;re into. Our AI builds a
                complete school day from scratch: original math problems, reading passages, science
                activities, art projects, and PE breaks, all woven into that theme. It&apos;s not
                pulling from a database of pre-made worksheets. Every packet is brand new, every
                single time. That means your kid never gets the same packet twice, and you&apos;ll
                never run out of ideas, even if they want &ldquo;only sharks, forever.&rdquo;
              </p>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
        <section id="how-it-works" className="py-24 bg-cream px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-4">
              <span className="inline-block bg-honey/20 text-honey-dark text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
                Ridiculously Easy
              </span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-dark text-center mb-3 leading-tight">
              Three steps. One coffee. Full school day.
            </h2>
            <p className="text-center text-dark/60 text-lg mb-14">
              No lesson planning. No decision fatigue. No screen time for the kids.
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              {STEPS.map((step, i) => (
                <div key={step.step} className="text-center">
                  <StepArt step={(i + 1) as 1 | 2 | 3} className="w-full max-w-[180px] mx-auto mb-4" />
                  <div className="text-xs font-bold text-sage tracking-widest mb-2">
                    {step.step}
                  </div>
                  <h3 className="font-display text-xl font-bold text-dark mb-3">
                    {step.title}
                  </h3>
                  <p className="text-dark/70 text-sm leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BROWSE BY SITUATION ──────────────────────────────────────────── */}
        <BrowseBySituation />

        {/* ── FEATURES ──────────────────────────────────────────────────────── */}
        <section className="py-24 bg-white px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-4">
              <span className="inline-block bg-sage/10 text-sage text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
                Not Busywork
              </span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-dark text-center mb-14 leading-tight">
              Real learning they&apos;ll actually enjoy. (Seriously.)
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-cream rounded-2xl p-7 border border-border"
                >
                  <div className="w-14 h-14 rounded-full bg-sage/10 flex items-center justify-center mb-4">
                    <LandingIcon name={feature.icon} className="w-10 h-10" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-dark mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-dark/70 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ──────────────────────────────────────────────────── */}
        <section id="reviews" className="py-24 bg-cream px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-4">
              <span className="inline-block bg-honey/20 text-honey-dark text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
                Parents Are Talking
              </span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-dark text-center mb-3 leading-tight">
              Real families. Real hard days. Real results.
            </h2>
            <p className="text-center text-dark/60 text-lg mb-14 max-w-2xl mx-auto">
              Here&apos;s what happens when you stop guilt-spiraling and start handing your kids
              something brilliant.
            </p>

            <div className="grid sm:grid-cols-2 gap-6 mb-6 max-w-3xl mx-auto">
              {TESTIMONIALS.filter((t) => t.verified && !t.featured).map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-2xl p-7 border border-border flex flex-col sm:[&:last-child:nth-child(odd)]:col-span-2"
                >
                  <p className="text-dark/80 text-sm leading-relaxed mb-6 flex-1">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 mt-auto">
                    <div className="w-10 h-10 rounded-full bg-sage flex items-center justify-center text-cream font-bold text-sm shrink-0">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-dark text-sm">{t.name}</div>
                      <div className="text-muted text-xs">{t.credential}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Highlighted testimonial — full width */}
            {TESTIMONIALS.filter((t) => t.verified && t.featured).map((t) => (
              <div key={t.id} className="bg-sage rounded-2xl p-8 md:p-10">
                <blockquote className="font-display text-xl md:text-2xl text-cream font-bold leading-snug mb-6">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-cream/20 flex items-center justify-center text-cream font-bold shrink-0">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-cream">{t.name}</div>
                    <div className="text-cream/70 text-sm">{t.credential}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FOUNDER STORY ─────────────────────────────────────────────────── */}
        <section className="py-24 bg-white px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-dark mb-3 leading-tight">
              Why I Built This
            </h2>
            <p className="text-dark/60 text-lg mb-8 font-semibold">
              I built the tool I desperately needed on my worst homeschool days.
            </p>

            <div className="prose-like space-y-5 text-dark/80 leading-relaxed mb-10">
              <p>
                Packet Day wasn&apos;t born from a business plan. It was born on a Tuesday when I
                was running on four hours of sleep, my lesson plans were a disaster, and Oliver
                just wanted to learn about sharks while Vivian wouldn&apos;t stop asking about
                volcanoes.
              </p>
              <p>
                I thought: what if AI could take my kids&apos; wild interests and turn them into
                an actual school day? Not generic worksheets, but something as specific and
                imaginative as they are? That&apos;s Packet Day. And now I&apos;m sharing it with
                every parent who&apos;s ever had a day like that.
              </p>
            </div>

            {/* Quote card */}
            <div className="bg-cream rounded-2xl border border-border p-8 mb-8">
              <blockquote className="font-display text-xl font-bold text-dark leading-snug mb-6">
                &ldquo;Oliver asked for &lsquo;only Megalodons&rsquo; three days in a row and got
                three completely different packets. Vivian wanted &lsquo;volcanoes but also
                unicorns&rsquo; and it actually worked. The AI gets it.&rdquo;
              </blockquote>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-sage flex items-center justify-center text-cream font-bold text-lg shrink-0">
                  N
                </div>
                <div>
                  <div className="font-bold text-dark">Natalie</div>
                  <div className="text-sm text-muted">Co-Founder of Packet Day</div>
                  <div className="text-xs text-muted">Homeschool mom &amp; recovering perfectionist</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-dark/60 text-sm">
              <span>Vivian, 8</span>
              <span className="text-muted">•</span>
              <span>Oliver, 10</span>
              <span className="text-muted">•</span>
              <span className="italic">Official Packet Day test pilots</span>
            </div>
          </div>
        </section>

        {/* ── OWN CHARACTER ─────────────────────────────────────────────────── */}
        <section className="py-24 bg-paper px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <span className="inline-block bg-sage/10 text-sage text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
                The part nobody else does
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-dark mb-3">
                Every packet gets its own character.
              </h2>
              <p className="text-dark/70 max-w-2xl mx-auto leading-relaxed">
                A character invented for that day, drawn for that kid, who turns up
                in the math problems, the writing prompt, and the coloring page.
              </p>
            </div>

            <Image
              src="/landing/characters.png"
              alt="Two illustrated characters, a fox in a top hat and a worm in a lab coat holding a magnifying glass, beside an empty dashed card labeled 'your kid's character'."
              width={1600}
              height={900}
              sizes="(max-width: 768px) 100vw, 1024px"
              className="w-full h-auto"
            />
          </div>
        </section>

        {/* ── PRICING ───────────────────────────────────────────────────────── */}
        <section id="pricing" className="py-24 bg-cream px-6">
          <PricingPlans
            monthlyPriceId={PLANS.unlimited.monthly.priceId}
            yearlyPriceId={PLANS.unlimited.yearly.priceId}
            source="pricing_section"
            headingLevel="h2"
            intro={<OnePriceArt className="w-full max-w-[480px] mx-auto mb-8" />}
          />
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────────── */}
        <FAQSection />

        {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
        <section className="py-24 bg-sage px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <TomorrowArt className="w-full max-w-[280px] md:max-w-[360px] mx-auto mb-6" />
            <h2 className="font-display text-4xl md:text-5xl font-bold text-cream leading-tight mb-6">
              Tomorrow might be a hard day.
              <br />
              You&apos;ll be ready.
            </h2>
            <p className="text-cream/80 text-lg leading-relaxed mb-10">
              Join the parents who stopped guilt-spiraling on &ldquo;off&rdquo; days and started
              handing their kids something they actually love, created by AI, powered by their
              imagination.
            </p>
            <Link
              href="/signup"
              className="inline-block bg-cream text-sage font-bold text-lg whitespace-nowrap px-8 sm:px-10 py-4 rounded-full hover:bg-cream-dark transition-colors shadow-sm"
            >
              Start Free, No Card Needed →
            </Link>
            <p className="text-cream/60 text-sm mt-5">
              Free forever plan available. Upgrade only when your kids start asking for more
              packets. (They will.)
            </p>
          </div>
        </section>

        {/* ── FOOTER ────────────────────────────────────────────────────────── */}
        <footer className="bg-dark px-6 py-14">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-2 font-display font-bold text-cream mb-2 justify-center md:justify-start">
                <Wordmark size="lg" />
              </div>
              <p className="text-cream/50 text-xs max-w-xs">
                AI-powered learning packets, built by a homeschool family, tested on real kids,
                powered by coffee.
              </p>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-6">
                {["About", "Privacy", "Terms", "Contact"].map((link) => (
                  <Link
                    key={link}
                    href={`/${link.toLowerCase()}`}
                    className="text-cream/50 hover:text-cream text-sm transition-colors"
                  >
                    {link}
                  </Link>
                ))}
              </div>
              <p className="text-cream/30 text-xs">
                © 2026 Packet Day. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
