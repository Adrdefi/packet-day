import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import ThemeTicker from "@/components/landing/ThemeTicker";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";
import EmailCapture from "@/components/landing/EmailCapture";

export const metadata: Metadata = {
  title: "Packet Day — AI-Powered Learning Packets for Homeschool Families",
  description:
    "Generate a full day of personalized, printable learning activities for your homeschooled child in 60 seconds. Free to start.",
  openGraph: {
    title: "Packet Day — AI-Powered Learning Packets for Homeschool Families",
    description:
      "Generate a full day of personalized, printable learning activities for your homeschooled child in 60 seconds. Free to start.",
    url: "https://packetday.com",
    siteName: "Packet Day",
    images: [{ url: "/og", width: 1200, height: 630, alt: "Packet Day — AI-powered learning packets for homeschool families" }],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Packet Day — AI-Powered Learning Packets for Homeschool Families",
    description:
      "Generate a full day of personalized, printable learning activities for your homeschooled child in 60 seconds. Free to start.",
    images: ["/og"],
  },
};

// ─── Static section data ──────────────────────────────────────────────────────

const PAIN_CARDS = [
  {
    emoji: "🤒",
    title: "You're running on fumes.",
    desc: "Flu, migraines, first trimester, or just a terrible night's sleep. Your body says stop but the school year doesn't pause. You need something ready to hand them right now.",
  },
  {
    emoji: "🧠",
    title: "The mental load won at 10am.",
    desc: "The toddler is melting down, the laundry pile has feelings, and lesson planning feels impossible today. You need a backup plan — not a guilt trip.",
  },
  {
    emoji: "🔀",
    title: "You're between curricula. Again.",
    desc: "You switched programs mid-year, you're supplementing a co-op day, or you just need something structured to fill the gaps without starting a whole new system.",
  },
];

const PREVIEW_CARDS = [
  { emoji: "🦕", subject: "Math", desc: "Measuring dinosaurs, counting fossils, dino timeline math" },
  { emoji: "📖", subject: "Reading", desc: "Dino facts passage + comprehension questions" },
  { emoji: "🔬", subject: "Science", desc: "Fossil dig activity, herbivore vs. carnivore sort" },
  { emoji: "🎨", subject: "Art + PE", desc: 'Draw your own dino + "Dino Stomp" movement break' },
];

const STEPS = [
  {
    icon: "👧🏻👦🏼",
    step: "STEP 1",
    title: "Tell Us About Your Kids",
    desc: "Grade level + what they're into right now. Dinosaurs, baking, outer space, soccer, Minecraft — the more specific, the better the AI makes it.",
  },
  {
    icon: "⚡",
    step: "STEP 2",
    title: 'Hit \u201cGenerate\u201d',
    desc: "Our AI creates a complete, original packet in about 60 seconds — math, reading, science, art, and PE breaks, all themed to their world.",
  },
  {
    icon: "🖨️",
    step: "STEP 3",
    title: "Print, Hand Off, Breathe",
    desc: "Hit print. Hand it to your kids. Sit down with your coffee (or go back to bed). They're learning — and you get to breathe.",
  },
];

const FEATURES = [
  {
    emoji: "🎯",
    title: "Grade-Aligned, Not Generic",
    desc: "K–8th content matched to your child's actual level. The AI adapts complexity, vocabulary, and concepts to where they really are.",
  },
  {
    emoji: "🧠",
    title: "Original Content Every Time",
    desc: "No recycled worksheet library. The AI creates fresh problems, passages, and activities from scratch — so your kid never gets a repeat.",
  },
  {
    emoji: "🏃",
    title: "PE Breaks Built In",
    desc: "Movement activities between subjects keep wiggly bodies active and help brains actually absorb what they're learning.",
  },
  {
    emoji: "✅",
    title: "Answer Keys Included",
    desc: "Check their work in 30 seconds. Or hand the key to your oldest and let them play teacher. (They love that.)",
  },
  {
    emoji: "♾️",
    title: "Limitless Imagination",
    desc: "There's no theme too weird, too specific, or too niche. If your kid can dream it, the AI can turn it into a school day.",
  },
  {
    emoji: "🖨️",
    title: "Beautiful Print-Ready PDFs",
    desc: "Clean layouts, colorful pages, zero screen time. Print on regular paper and hand it over — done.",
  },
];

const TESTIMONIALS = [
  {
    stars: 5,
    tag: "Sick Day Lifesaver",
    quote:
      "I had a stomach bug and literally could not get off the couch. Generated three packets from my phone — one for each kid — in under five minutes. They did school for the entire day and I didn't have to do anything except hit print. I almost cried.",
    bold: "one for each kid — in under five minutes.",
    initial: "J",
    name: "Jessica M.",
    detail: "Mom of 3 • Grades 1, 3, 6",
  },
  {
    stars: 5,
    tag: "AI Skeptic → Believer",
    quote:
      "I was super skeptical about 'AI-generated' anything for my kids. Then my daughter got a packet themed around horses and the reading passage mentioned different gaits — walk, trot, canter, gallop. This wasn't generic. The AI actually knew things. I was sold.",
    bold: "different gaits — walk, trot, canter, gallop.",
    initial: "R",
    name: "Rachel T.",
    detail: "Mom of 2 • Grades K, 4",
  },
  {
    stars: 5,
    tag: "Multi-Kid Magic",
    quote:
      "My 7-year-old wants rainbows and unicorns. My 10-year-old wants 'only military history.' They each get exactly what they want and I'm not planning two completely different school days anymore. This has given me my sanity back. Not exaggerating.",
    bold: "I'm not planning two completely different school days anymore.",
    initial: "D",
    name: "Danielle K.",
    detail: "Mom of 4 • Grades 2, 4, 6, 8",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <>
      <Navbar />

      <main>
        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <section className="pt-32 pb-20 px-6 bg-cream text-center">
          <div className="max-w-4xl mx-auto">
            {/* Emoji row */}
            <div className="flex justify-center gap-3 text-3xl mb-8">
              {["🦖", "🚀", "🎨", "🧪", "📖", "⚽"].map((e) => (
                <span key={e}>{e}</span>
              ))}
            </div>

            {/* Headline */}
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-dark leading-tight mb-6">
              Today&apos;s a Hard Day.
              <br />
              Your Kids Can{" "}
              <em className="italic text-sage not-italic" style={{ fontStyle: "italic" }}>
                Still
              </em>{" "}
              Learn.
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-dark/70 max-w-2xl mx-auto mb-10 leading-relaxed">
              Packet Day uses{" "}
              <strong className="text-dark font-bold">
                AI to create personalized, print-ready learning packets
              </strong>{" "}
              themed to whatever your kids are obsessed with — in under 60 seconds.
              Sharks? Ancient Egypt? Minecraft? If they can imagine it, we can build
              a school day around it.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                href="/signup"
                className="bg-sage text-cream font-bold text-base px-8 py-4 rounded-full hover:bg-sage-dark transition-colors shadow-sm"
              >
                Try It Free — No Card Needed ✨
              </Link>
              <a
                href="#themes"
                className="text-sage font-bold text-base px-8 py-4 rounded-full border-2 border-sage hover:bg-sage/10 transition-colors"
              >
                See the Magic
              </a>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
              {[
                { stat: "K–8th", label: "Grade Levels" },
                { stat: "4–6 hrs", label: "Per Packet" },
                { stat: "60 sec", label: "To Generate" },
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

        {/* ── PAIN POINTS ───────────────────────────────────────────────────── */}
        <section className="py-24 bg-white px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-4">
              <span className="inline-block bg-coral/15 text-coral-dark text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
                Real Talk
              </span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-dark text-center mb-14 leading-tight max-w-3xl mx-auto">
              Some days, homeschool just doesn&apos;t happen the way you planned.
              (And that&apos;s okay.)
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              {PAIN_CARDS.map((card) => (
                <div
                  key={card.title}
                  className="bg-cream rounded-2xl p-8 border border-coral/20"
                >
                  <div className="text-4xl mb-4">{card.emoji}</div>
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
              Packet Day is powered by AI — which means there&apos;s no fixed library of themes.
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
                  <span className="text-3xl shrink-0">{card.emoji}</span>
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
                <span className="text-2xl">🤖</span>
                <h3 className="font-display text-xl font-bold text-cream">
                  How the AI works (the non-techy version)
                </h3>
              </div>
              <p className="text-cream/80 leading-relaxed text-sm">
                You tell us your child&apos;s grade and what they&apos;re into. Our AI builds a
                complete school day from scratch — original math problems, reading passages, science
                activities, art projects, and PE breaks — all woven into that theme. It&apos;s not
                pulling from a database of pre-made worksheets. Every packet is brand new, every
                single time. That means your kid never gets the same packet twice, and you&apos;ll
                never run out of ideas — even if they want &ldquo;only sharks, forever.&rdquo;
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
                  <div className="text-4xl mb-4">{step.icon}</div>
                  <div className="text-xs font-bold text-sage tracking-widest mb-2">
                    {step.step}
                  </div>
                  <h3 className="font-display text-xl font-bold text-dark mb-3">
                    {step.title}
                  </h3>
                  <p className="text-dark/70 text-sm leading-relaxed">{step.desc}</p>
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

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
                  <div className="text-3xl mb-4">{feature.emoji}</div>
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

            <div className="grid md:grid-cols-3 gap-6 mb-6">
              {TESTIMONIALS.map((t) => (
                <div
                  key={t.name}
                  className="bg-white rounded-2xl p-7 border border-border flex flex-col"
                >
                  <div className="flex gap-1 mb-3">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <span key={i} className="text-honey text-sm">⭐</span>
                    ))}
                  </div>
                  <span className="inline-block self-start bg-sage/10 text-sage text-xs font-bold px-3 py-1 rounded-full mb-4">
                    {t.tag}
                  </span>
                  <p className="text-dark/80 text-sm leading-relaxed mb-6 flex-1">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 mt-auto">
                    <div className="w-10 h-10 rounded-full bg-sage flex items-center justify-center text-cream font-bold text-sm shrink-0">
                      {t.initial}
                    </div>
                    <div>
                      <div className="font-bold text-dark text-sm">{t.name}</div>
                      <div className="text-muted text-xs">{t.detail}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Highlighted testimonial — full width */}
            <div className="bg-sage rounded-2xl p-8 md:p-10">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-honey text-sm">⭐</span>
                ))}
              </div>
              <blockquote className="font-display text-xl md:text-2xl text-cream font-bold leading-snug mb-6">
                &ldquo;I run a homeschool co-op with 14 families and I recommended Packet Day to
                all of them. Within a week, every single mom had signed up. One of them texted me
                at 9pm and said &lsquo;I just generated a packet about marine biology while lying
                in bed and I&apos;m emotional about it.&rsquo; That&apos;s the energy.&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-cream/20 flex items-center justify-center text-cream font-bold shrink-0">
                  S
                </div>
                <div>
                  <div className="font-bold text-cream">Sarah W.</div>
                  <div className="text-cream/70 text-sm">
                    Co-op organizer • 6 years homeschooling
                  </div>
                </div>
              </div>
            </div>
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
                I thought — what if AI could take my kids&apos; wild interests and turn them into
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
              <span>👧🏻 Vivian, 8</span>
              <span className="text-muted">•</span>
              <span>👦🏼 Oliver, 10</span>
              <span className="text-muted">•</span>
              <span className="italic">Official Packet Day test pilots</span>
            </div>
          </div>
        </section>

        {/* ── PRICING ───────────────────────────────────────────────────────── */}
        <PricingSection />

        {/* ── FAQ ───────────────────────────────────────────────────────────── */}
        <FAQSection />

        {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
        <section className="py-24 bg-sage px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="text-5xl mb-6">📦✨</div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-cream leading-tight mb-6">
              Tomorrow might be a hard day.
              <br />
              You&apos;ll be ready.
            </h2>
            <p className="text-cream/80 text-lg leading-relaxed mb-10">
              Join the parents who stopped guilt-spiraling on &ldquo;off&rdquo; days and started
              handing their kids something they actually love — created by AI, powered by their
              imagination.
            </p>
            <Link
              href="/signup"
              className="inline-block bg-cream text-sage font-bold text-lg px-10 py-4 rounded-full hover:bg-cream-dark transition-colors shadow-sm"
            >
              Start Free — No Card Needed →
            </Link>
            <p className="text-cream/60 text-sm mt-5">
              Free forever plan available. Upgrade only when your kids start asking for more
              packets. (They will.)
            </p>
          </div>
        </section>

        {/* ── EMAIL CAPTURE ─────────────────────────────────────────────────── */}
        <EmailCapture />

        {/* ── FOOTER ────────────────────────────────────────────────────────── */}
        <footer className="bg-dark px-6 py-14">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-2 font-display font-bold text-lg text-cream mb-2 justify-center md:justify-start">
                <span>📦</span>
                <span>Packet Day</span>
              </div>
              <p className="text-cream/50 text-xs max-w-xs">
                AI-powered learning packets, built by a homeschool family, tested on real kids,
                powered by coffee.
              </p>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-6">
                {["Privacy", "Terms", "Contact"].map((link) => (
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
