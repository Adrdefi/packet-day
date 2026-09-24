/**
 * Copy and metadata for /fun-friday, as typed data — kept separate from
 * app/fun-friday/page.tsx so the page file only arranges blocks, and this
 * file only holds words. Source: docs/copy/fun-friday.md (status: FINAL,
 * approved by Andy and Natalie, Sep 15 2026) — copy here is verbatim from
 * that file, with page/hour figures pulled from lib/situations/figures.ts
 * the same way sick-day.ts and road-trip.ts do, instead of hand-typed.
 *
 * Chunk 1 built hero/storySection/steps/checklist/pricing/faq using only
 * pre-existing components. Chunk 2 adds reasonsSection, comparisonSection,
 * and closingCta — each needed a new component (SituationReasons,
 * SituationComparison + SituationCharacterCard, SituationClosingCTA in
 * components/landing/) and new types (lib/situations/section-types.ts),
 * since the copy's bold lead-ins and character-card layout have no slot in
 * the original shared types/components.
 */
import { PAGE_RANGE_TEXT, HOURS_RANGE_TEXT } from "./figures";
import { SITE_URL } from "@/lib/site";
import type {
  SituationPageMetadata,
  HeroContent,
  TextSectionContent,
  StepsContent,
  ChecklistContent,
  PricingCTAContent,
  FAQContent,
} from "./types";
import type { ReasonsContent, ComparisonContent, ClosingCTAContent } from "./section-types";

export const metadata: SituationPageMetadata = {
  titleTag: "Fun Friday: The Homeschool Tradition That Started Packet Day",
  metaDescription:
    "Every Friday is packet day in our homeschool: their own pace, then pizza night. Make your kid's Fun Friday packet in a minute or two. Free, no card required.",
  canonical: `${SITE_URL}/fun-friday`,
  updated: "2026-09-24",
};

const CTA_LABEL = "Make My Free Fun Friday Packet";
const CTA_EMOJI = "✨";

export const hero: HeroContent = {
  badge: { text: "Packet Day + pizza night", emoji: "🍕" },
  h1: "Fun Friday: The Packet Day That Started It All. Generated in a Minute or Two.",
  leadParagraphs: [
    {
      text: "This one is personal. It's how Packet Day was born, and I'm the one who lived it.",
    },
  ],
  ctaLabel: CTA_LABEL,
  ctaEmoji: CTA_EMOJI,
  trustLine: "One free packet a month · No card required",
};

export const storySection: TextSectionContent = {
  heading: "Hi, I'm Natalie.",
  paragraphs: [
    "Every Friday in our homeschool is packet day. For years, I would spend my week painstakingly building packets out of online resources: a math page from here, a reading passage from there, a science activity from somewhere else entirely. Hours of hunting, printing, and stapling, usually finished way too late on Thursday night.",
    [
      { text: "On Fridays, Oliver (5th grade) and Vivian (3rd grade) get the whole thing: a full day they work through at their own pace. No lessons. No hovering. Just their packet, their crayons, and the quiet pride of finishing something themselves. They " },
      { text: "love", italic: true },
      { text: " it. It's the reward at the end of the week. Finish your packet, and it's the weekend. And Friday pizza night, of course. (We bake together a lot in this house. The kids would tell you that's the real tradition.)" },
    ],
    "Then I did the math nobody wants to do: I was spending more time assembling packets than teaching the full week's curriculum.",
    "That's when my husband Andy had the thought that became this company: what if the packet built itself? What if every family could have packet day Fridays, or any day, without the 11pm Thursday assembly line?",
    "So we built it. This page is the original. The tradition, minus the exhaustion.",
    "You don't have to homeschool to steal this one, either. If your kids come home from a long school week running on empty, a Friday packet is the soft landing.",
  ],
};

export const steps: StepsContent = {
  heading: "Three steps. A minute or two. Done. ⚡",
  steps: [
    {
      title: "Tell us two things.",
      body: "Your kid's grade level and what they're obsessed with right now, the thing they'd talk about through pizza night if you let them.",
    },
    {
      title: "We build their Friday from scratch.",
      body: `${PAGE_RANGE_TEXT} of math, reading, puzzles, art, and more, with a character we invent just for them, woven through every subject. Nothing here existed before you asked for it.`,
    },
    {
      title: "Print it. Done.",
      body: "Hand it over Friday morning. They work at their own pace. You get your week back. Pizza night is still on you.",
    },
  ],
};

export const reasonsSection: ReasonsContent = {
  heading: "Built for the Friday feeling",
  headingEmoji: "🎉",
  intro: "Packet day Fridays worked because of three things, and we kept all three:",
  cards: [
    {
      title: "It's theirs.",
      body: "Not a worksheet. A packet built around their obsession, with a character carrying them through every subject. The thing they look forward to, not the thing they endure.",
    },
    {
      title: "It's at their pace.",
      body: "No bells, no schedule, no keeping up with anyone. Fast finishers fly. Slow-and-steady kids take their time. Friday doesn't care.",
    },
    {
      title: "It's the reward.",
      body: "The week is done. This is the fun part, and then the weekend starts. That framing matters more than any curriculum choice I ever made.",
    },
  ],
  closingParagraph: `One packet. ${PAGE_RANGE_TEXT}. A full school day of real learning (K-8), roughly ${HOURS_RANGE_TEXT} with breaks, disguised as the best day of the week. Answer keys included, so Friday stays relaxing for you too.`,
};

export const comparisonSection: ComparisonContent = {
  eyebrow: "The difference",
  heading: "This isn't a download. I used to spend hours on what now takes a minute or two.",
  headingEmoji: "📝",
  leadParagraph:
    "I remember the old way: six browser tabs, three printers' worth of ink, and a Thursday night spent deciding whether page 7 was too hard for a 3rd grader.",
  leftColumn: {
    heading: "📚 My old Thursday nights",
    items: [
      "❌ Hours of hunting, printing, and stapling",
      "❌ Guessing whether each page fit their grade",
      "❌ Done at 11pm, if I was lucky",
    ],
  },
  rightColumn: {
    heading: "✨ Packet Day",
    items: [
      "✅ Generated fresh, one kid at a time",
      "✅ One packet, a minute or two, done",
      "✅ Built around their obsession",
    ],
  },
  characterCard: {
    image: {
      src: "/images/situations/dazzle-the-donut.webp",
      alt: "Dazzle the Donut, a smiling pink sprinkled donut character waving",
      width: 600,
      height: 600,
    },
    caption: "From a real packet made for Vivian, 3rd grade",
    tag: "A REAL PACKET DAY CHARACTER",
    title: "Dazzle the Donut & the sprinkle shop",
    body: [
      {
        text: "We don't have packets. We have a machine that makes them: one at a time, for one kid, in a minute or two. Tell us your 3rd grader is donut-obsessed (mine are; we bake together constantly), and we invent Dazzle the Donut, who runs the busiest sprinkle shop in town. Your kid solves multiplication in Dazzle's shop ",
      },
      { text: "with", italic: true },
      { text: " Dazzle, reads the story of the sprinkled donut " },
      { text: "with", italic: true },
      { text: " Dazzle, and figures out what makes a donut rise " },
      { text: "with", italic: true },
      { text: " Dazzle. It's the packet I used to make, upgraded, and generated while the coffee brews. ☕" },
    ],
  },
  closingParagraph:
    "New obsession next Friday? New packet. Same obsession all year? Still a brand-new packet every time, never repeated, never a rerun.",
};

export const closingCta: ClosingCTAContent = {
  heading: "Pizza night is waiting.",
  headingEmoji: "🍕",
  line: "A minute or two from now, Friday could be handled. Go preheat the oven.",
  ctaLabel: CTA_LABEL,
  ctaEmoji: CTA_EMOJI,
  ctaHref: "/signup",
  trustLine: "One free packet a month · No card required",
};

export const checklist: ChecklistContent = {
  heading: "What you get",
  headingEmoji: "✅",
  items: [
    `A print-ready PDF (${PAGE_RANGE_TEXT}) generated in a minute or two, made fresh for your kid, never pre-made`,
    `Math, reading, a puzzle break, a movement break, and a coloring page, plus one rotating subject like science or history. A full school day, roughly ${HOURS_RANGE_TEXT} with breaks.`,
    "Grade-level matched (K-8), themed to your child's obsession, with one invented character through every subject",
    "Answer keys, so Friday stays relaxing",
    "Household-items-only supply lists",
    "Zero screen time, zero prep, zero Thursday-night assembly line",
  ],
};

export const pricing: PricingCTAContent = {
  heading: "Free to start. Guilt-free to try.",
  headingEmoji: "💛",
  intro:
    "One packet a month is free, no card required. For every-Friday packet days, unlimited packets and unlimited kids are",
  closingSentence: "Less than the ink I used to burn through.",
  ctaLabel: CTA_LABEL,
  ctaEmoji: CTA_EMOJI,
};

export const faq: FAQContent = {
  heading: "Everything parents ask 🧠",
  faqs: [
    {
      question: "Is this really how Packet Day started?",
      answer:
        "Yes. Friday packet day was a real tradition in our homeschool long before it was a product, and it still is. I built every packet by hand from online resources until the assembling was eating more time than the teaching. Packet Day is that tradition, automated: the Friday feeling, minus the Thursday night.",
    },
    {
      question: "How is this different from the packets you used to make?",
      answer:
        "Same love, none of the labor. I built each one by hunting down resources for hours; the generator builds one around your kid's grade level and obsession in a minute or two, with a character woven through every subject, something even my hand-built packets rarely had.",
    },
    {
      question: "Do I download a pre-made packet?",
      answer:
        "No, and that's the whole point. There are no pre-made packets. Every packet is generated from scratch the moment you ask: your kid's grade level, their current obsession, one invented character woven through every subject. What you print didn't exist a minute or two earlier.",
    },
    {
      question: "What if my kid finishes fast, or takes all day?",
      answer:
        "Both are correct. That's the Friday design: it's their pace, not a schedule. Fast finishers get the pride of an early weekend; steady workers get a full, satisfying day. There's no behind on a Friday.",
    },
    {
      question: "What ages does it cover?",
      answer:
        "Kindergarten through 8th grade. Set each child's level once, and every packet matches it.",
    },
    {
      question: "Do we have to homeschool to do this?",
      answer:
        "Not at all. A Fun Friday packet makes a great after-school wind-down or a slow Saturday morning. The tradition is about the rhythm and the ownership, not the schooling model.",
    },
    {
      question: "Do I need a card for the free packet?",
      answer: "No. One free packet per month, no card, no surprise bills.",
    },
  ],
};
