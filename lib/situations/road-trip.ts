/**
 * Copy and metadata for /road-trip, as typed data — kept separate from
 * app/road-trip/page.tsx so the page file only arranges blocks, and this
 * file only holds words. Source: docs/landing-pages/pages/road-trip.md,
 * with the founder-approved copy changes applied (see Phase 2 session
 * notes): "60 seconds" -> "about a minute" throughout, page/hour ranges
 * pulled from lib/situations/figures.ts, the "Same obsession, new trip?"
 * sentence replaced, the supply-list bullet reworded, and the two FAQ
 * answers ("road trip activity book" and "print in color") reworded.
 */
import { PAGE_RANGE_TEXT, HOURS_RANGE_TEXT } from "./figures";
import type {
  SituationPageMetadata,
  HeroContent,
  TextSectionContent,
  ChecklistContent,
  PricingCTAContent,
  FAQContent,
} from "./types";

export const metadata: SituationPageMetadata = {
  titleTag: "Road Trip Activities for Kids Without a Tablet | Packet Day",
  metaDescription:
    "Backseat dread? Generate a personalized 13 to 18 page learning packet per kid, themed to their obsession, with a character woven through every subject. Print it tonight, free, no card.",
  canonical: "https://packetday.com/road-trip",
};

const CTA_LABEL = "Make My Road Trip Packet — Free";
const CTA_EMOJI = "✨";

export const hero: HeroContent = {
  badge: { text: "Your road trip game plan", emoji: "🚗" },
  h1: 'Turn "Are We There Yet?" Into Learning They Actually Want.',
  leadParagraphs: [
    {
      text: "Eight hours. Two kids. A tablet battery that won't survive it and a bag of snacks that buys you forty minutes. You're not looking for a curriculum — you just want something that keeps them busy, quiet, and not on a screen for once.",
      emoji: "🌙",
    },
    {
      text: `So do this instead. Spend about a minute tonight and wake up to a personalized, print-ready learning packet for each kid — themed to whatever they're currently obsessed with.`,
    },
  ],
  ctaLabel: CTA_LABEL,
  ctaEmoji: CTA_EMOJI,
  trustLine: "One free packet a month · No card required",
};

export const carRideSection: TextSectionContent = {
  heading: "A whole car ride, disguised as their favorite thing",
  headingEmoji: "✨",
  paragraphs: [
    `Here's how it works: tell us each child's obsession — dinosaurs, Taylor Swift, Minecraft, soccer — and we build a packet around it (${PAGE_RANGE_TEXT}), at their grade level (K–8), with an invented character woven through every subject. Math, reading, science, art, plus movement breaks for the rest stops.`,
    [
      { text: "It's not a stack of random worksheets. It's one continuous adventure starring a character built around " },
      { text: "their thing", italic: true },
      { text: ". Your dino kid isn't doing \"worksheet #4\" — they're helping their dinosaur character solve a problem, read a clue, draw the next scene. Backseat silence, but the good kind." },
    ],
  ],
};

export const activityBookSection: TextSectionContent = {
  heading: "Why not just buy a road trip activity book?",
  headingEmoji: "🌟",
  paragraphs: [
    "Activity books are the same for every kid, and your kids have already done the good pages and ignored the rest. The generic \"road trip printable\" listicles are worse — half the pages are wrong for your kid's grade and none of them care what they're into.",
    "Our packets are generated from scratch, per kid, per trip. New obsession? New packet. Same obsession, new trip? Still a brand new packet, generated fresh. You print it, toss it in the bag, done. And when you get home, there's no screen-time hangover to deal with.",
  ],
};

export const checklist: ChecklistContent = {
  heading: "What you get",
  headingEmoji: "📚",
  items: [
    `A print-ready PDF per child (${PAGE_RANGE_TEXT}), in about a minute`,
    `Math, reading, science, art, and movement breaks for rest stops — roughly ${HOURS_RANGE_TEXT} of learning`,
    "Each packet at that child's level (K–8), themed to their obsession, with one invented character through every subject",
    "Answer keys included",
    "Simple supply lists, mostly things you already have at home",
    "Zero screen time. Print it tonight, hand it over tomorrow.",
  ],
};

export const pricing: PricingCTAContent = {
  heading: "First packet's free. The whole trip costs you nothing to try.",
  headingEmoji: "⭐",
  intro:
    "One free packet a month — no card required. Unlimited packets and unlimited kids are",
  ctaLabel: CTA_LABEL,
  ctaEmoji: CTA_EMOJI,
};

export const faq: FAQContent = {
  heading: "FAQ",
  faqs: [
    {
      question: "How is this different from a road trip activity book?",
      answer: `Activity books are one-size-fits-all — half the pages bore your kid and half are the wrong level. We generate a fresh packet per child (${PAGE_RANGE_TEXT}), matched to their grade level and built around their obsession, with a character carrying them through every subject. Every packet is generated fresh for your kid.`,
    },
    {
      question: "Can I make one for each kid?",
      answer:
        "Yes — that's the point. Each child gets their own packet at their own level, themed to their own obsession. The Unlimited plan covers every kid.",
    },
    {
      question: "What ages does it work for?",
      answer: "Kindergarten through 8th grade.",
    },
    {
      question: "Do I need to print in color?",
      answer:
        "Color looks nicest, but nothing in the packet needs color to make sense, so black and white works too.",
    },
    {
      question: "Do I need a card for the free packet?",
      answer:
        "No. One free packet a month, no card required. Make tonight's trip packet free and see if the backseat goes quiet.",
    },
  ],
};
