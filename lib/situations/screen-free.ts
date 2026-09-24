/**
 * Copy and metadata for /screen-free, as typed data, kept separate from
 * app/screen-free/page.tsx so the page file only arranges blocks, and this
 * file only holds words. Source: docs/copy/screen-free.md, verbatim, with
 * page/hour ranges pulled from lib/situations/figures.ts. Two approved
 * departures: the second trust line (under the pricing CTA) is omitted,
 * since SituationPricingCTA has no trust-line slot, and the first FAQ
 * answer's "*theirs*" is plain text, since SituationFAQ renders answers
 * as plain strings.
 */
import { PAGE_RANGE_TEXT, PAGE_RANGE_ADJECTIVE_TEXT, HOURS_RANGE_TEXT } from "./figures";
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

export const metadata: SituationPageMetadata = {
  titleTag: "Screen-Free Activities for Kids They'll Actually Choose | Packet Day",
  metaDescription: `Tired of the tablet babysitter? Get a personalized ${PAGE_RANGE_ADJECTIVE_TEXT} packet built around your kid's obsession. Math, reading, science, art. Printed, not streamed.`,
  canonical: `${SITE_URL}/screen-free`,
};

const CTA_LABEL = "Make My Free Screen-Free Packet";
const CTA_EMOJI = "✨";

export const hero: HeroContent = {
  badge: { text: "Screen-free activities for kids", emoji: "🌿" },
  h1: "The Screen-Free Day They'll Actually Ask For. Ready in a Minute or Two.",
  leadParagraphs: [
    {
      text: '"Just 30 more minutes" becomes three hours. You finally call time, and suddenly you\'re the villain for enforcing the limit you set. You want them off screens, but the alternative can\'t be you entertaining them all day. And every "101 screen-free activities" list suggests the same scavenger hunt for the fortieth time.',
      emoji: "🏠",
    },
    {
      text: "Here's the swap. Give us a minute or two, and your kid gets a whole packet built around the thing they're obsessed with right now. Not a generic activity book they'll abandon by page four.",
    },
  ],
  ctaLabel: CTA_LABEL,
  ctaEmoji: CTA_EMOJI,
  trustLine: "One free packet a month · No card required",
};

export const steps: StepsContent = {
  heading: "How it works: three steps, a minute or two",
  steps: [
    {
      title: "Tell us two things.",
      body: "Your kid's grade level and what they're obsessed with: space, horses, Minecraft, baking, whatever's running the show this month.",
      emoji: "📝",
    },
    {
      title: "We build their day from scratch.",
      body: `${PAGE_RANGE_TEXT} of math, reading, science, art, and movement breaks, with a character we invent just for them, woven through every subject. Nothing here existed before you asked for it.`,
      emoji: "✨",
    },
    {
      title: "Print it. Done.",
      body: "Hand it over with crayons. The tablet stays in the drawer, and nobody has to be the villain.",
      emoji: "🎉",
    },
  ],
};

export const competeSection: TextSectionContent = {
  heading: "Built to compete with the tablet, and win",
  headingEmoji: "💪",
  paragraphs: [
    [
      { text: "Here's the honest truth: most screen-free activities lose to screens because they're generic. A coloring book can't compete with Minecraft. But a packet where the math, the story, the science experiment, and the art project are all about " },
      { text: "their thing", italic: true },
      { text: "? That's not just competing with the tablet. That's better than the tablet, because it's theirs." },
    ],
    `One packet. ${PAGE_RANGE_TEXT}. A full school day off screens, roughly ${HOURS_RANGE_TEXT} with breaks (reading, solving, drawing, moving), at their level (K-8), with answer keys so you're not hovering.`,
  ],
};

export const notADownloadSection: TextSectionContent = {
  heading: "This isn't a download. Nothing here existed before you asked.",
  headingEmoji: "🌟",
  paragraphs: [
    "You searched for screen-free activities. Here's something that lasts longer than another idea list.",
    "Most screen-free activity books give the same pages to every kid. Your kid does the good ones and ignores the rest.",
    [
      { text: "We don't have packets. We have a machine that makes them. One at a time, for one kid, in a minute or two. Tell us your kid is ocean-obsessed, and we invent Marina: a deep sea explorer octopus with a headlamp and a field journal, starring in every subject. Your kid counts glowing jellyfish " },
      { text: "with", italic: true },
      { text: " Marina, reads a deep sea mystery " },
      { text: "with", italic: true },
      { text: " Marina, draws the creature they discover " },
      { text: "with", italic: true },
      { text: " Marina. It's not a stack of worksheets. It's a story they want to finish, with zero pixels involved." },
    ],
    "Next time? Same obsession or a new one. A brand new adventure, generated fresh. Never repeated, never a rerun.",
  ],
};

/** Closing line of the not-a-download section, linking to the screen-free activities post. */
export const moreIdeasLink = {
  lead: "Want more ideas?",
  label: "25 screen-free activities that actually work →",
  href: "/blog/screen-free-activities-kids",
};

export const checklist: ChecklistContent = {
  heading: "What you get",
  headingEmoji: "📚",
  items: [
    `A print-ready PDF (${PAGE_RANGE_TEXT}) generated in a minute or two. Made fresh for your kid, never pre-made`,
    `Math, reading, science, art, and movement breaks. A full school day, roughly ${HOURS_RANGE_TEXT} with breaks`,
    "Grade-level matched (K-8), themed to your kid's obsession, with one invented character through every subject",
    "Answer keys, so checking takes two minutes, not twenty",
    "Simple supply lists, mostly things you already have at home",
    "Zero screen time for your kid, zero prep, zero decisions",
  ],
};

export const pricing: PricingCTAContent = {
  heading: "Free to start. Guilt-free to try.",
  headingEmoji: "⭐",
  intro:
    "One packet a month is free, no card required. When they finish it and ask for another one, unlimited packets and unlimited kids are",
  ctaLabel: CTA_LABEL,
  ctaEmoji: CTA_EMOJI,
};

export const faq: FAQContent = {
  heading: "FAQ",
  faqs: [
    {
      question: "Will my kid really choose this over a tablet?",
      answer:
        "They'll choose what feels like it's theirs. A generic workbook loses to a screen every time. A packet where a character built around their obsession needs their help across every subject is a story they want to finish. That's the whole trick, and it's why this works where activity books don't.",
    },
    {
      question: "How is this different from a screen-free activity book?",
      answer: `Activity books are the same for every kid. Half the pages bore yours and half are the wrong level. We generate a fresh packet per kid (${PAGE_RANGE_TEXT}), matched to their grade level and built around their obsession, with a character carrying them through every subject. No two packets are ever the same.`,
    },
    {
      question: "Do I download a pre-made packet?",
      answer:
        "No, and that's the whole point. There are no pre-made packets. Every packet is generated from scratch the moment you ask: your kid's grade level, their current obsession, one invented character woven through every subject. What you print didn't exist a couple of minutes earlier.",
    },
    {
      question: "What ages does it cover?",
      answer:
        "Kindergarten through 8th grade. Set each kid's level once, and every packet matches it.",
    },
    {
      question: "Do I need to print in color?",
      answer:
        "Color is nicer, but the packets print fine in black and white too. Nothing depends on color to make sense.",
    },
    {
      question: "Do I need a card for the free packet?",
      answer: "No. One free packet a month, no card, no surprise bills.",
    },
  ],
};
