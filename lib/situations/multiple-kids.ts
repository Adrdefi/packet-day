/**
 * Copy and metadata for /multiple-kids, as typed data, kept separate from
 * app/multiple-kids/page.tsx so the page file only arranges blocks, and this
 * file only holds words. Source: docs/copy/multiple-kids.md, verbatim, with
 * page/hour ranges pulled from lib/situations/figures.ts. The copy's second
 * trust line (under the pricing CTA) is intentionally omitted:
 * SituationPricingCTA has no trust-line slot.
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
  titleTag: "Homeschooling Multiple Kids at Different Levels | Packet Day",
  metaDescription: `Homeschooling multiple kids at different levels? Get an ${PAGE_RANGE_ADJECTIVE_TEXT} packet per kid, matched to their grade and built around their obsession. Free to start.`,
  canonical: `${SITE_URL}/multiple-kids`,
};

const CTA_LABEL = "Make My First Packet Free";
const CTA_EMOJI = "✨";

export const hero: HeroContent = {
  badge: { text: "Homeschooling more than one?", emoji: "💛" },
  h1: "One Packet Per Kid. Each at Their Level. Each Ready in a Minute or Two.",
  leadParagraphs: [
    {
      text: "Your kindergartner wants you to watch her write every single letter. Your 6th grader is stuck on ratios and sighing loudly about it. They both need you right now, and there's only one of you. Homeschooling multiple kids at different levels means somebody's always waiting, and by 10 AM the day already feels behind.",
      emoji: "🏠",
    },
    {
      text: "Give us a minute or two per kid. Each one gets a packet built for their level and their obsession, so one can work on their own while you teach the other.",
    },
  ],
  ctaLabel: CTA_LABEL,
  ctaEmoji: CTA_EMOJI,
  trustLine: "One free packet a month · No card required",
};

export const combineSection: TextSectionContent = {
  heading: "Combine what you can. Split what you must.",
  headingEmoji: "🌿",
  paragraphs: [
    "Some things really are better together. Read-alouds, science experiments, art projects, history stories. Do those as a crew.",
    "But math and reading live at each kid's own level, and no amount of combining fixes that. What you need is a way for one kid to do real, solid work alone while you teach the other. Then swap.",
  ],
};

export const steps: StepsContent = {
  heading: "How it works: three steps, a minute or two per kid",
  steps: [
    {
      title: "Tell us about each kid.",
      body: "Grade level and current obsession, one kid at a time. Space, horses, dinosaurs, baking, whatever's running the show this month.",
      emoji: "📝",
    },
    {
      title: "We build each packet from scratch.",
      body: `${PAGE_RANGE_TEXT} per kid: math, reading, science, art, and movement breaks, matched to their grade, with a character we invent just for them woven through every subject. Your 3rd grader gets a different packet than your 5th grader. Obviously.`,
      emoji: "✨",
    },
    {
      title: "Print them. Run your rotation.",
      body: "Hand each kid their packet and some crayons. One works on their own while you teach the other, then you swap. Nobody waits. Nobody's bored. Nobody's lost.",
      emoji: "🎉",
    },
  ],
};

export const independentWorkSection: TextSectionContent = {
  heading: "The independent work finally holds",
  headingEmoji: "💪",
  paragraphs: [
    "Here's the thing nobody tells you about teaching multiple levels: the rotation only works if the alone work is good. Too hard, and you're interrupted every five minutes. Too easy, and they're done in ten and bouncing off the walls.",
    `A packet built around your kid's obsession, at exactly their level, with a character they want to follow through every page? That holds. They read, they solve, they draw, they move. Each packet is a full school day, roughly ${HOURS_RANGE_TEXT} with breaks, so there's more than enough to carry every independent block. (Your littlest ones may need you to read them the directions. Everyone else is off and running.)`,
    "That's what buys you the quiet to actually teach the other one.",
  ],
};

/** Closing line of the independent-work section, linking to the schedule post. */
export const rotationLink = {
  lead: "Want our actual rotation?",
  label: "Here's the exact schedule we use with two kids at two levels →",
  href: "/blog/homeschool-schedule-multiple-kids",
};

export const notADownloadSection: TextSectionContent = {
  heading: "This isn't a download. Nothing here existed before you asked.",
  headingEmoji: "🌟",
  paragraphs: [
    'There\'s no multi-kid bundle to buy. No "grades 3 to 5 combo pack" where half the pages miss both kids.',
    "We don't have packets. We have a machine that makes them. One at a time, per kid, in a minute or two. Tell us your 3rd grader is dinosaur-obsessed and your 5th grader lives for space, and we invent two completely different characters starring in two completely different adventures. Same morning. Totally different packets. Never repeated, never a rerun.",
  ],
};

export const checklist: ChecklistContent = {
  heading: "What you get",
  headingEmoji: "📚",
  items: [
    `A print-ready PDF per kid (${PAGE_RANGE_TEXT} each), generated in a minute or two. Made fresh, never pre-made`,
    `Math, reading, science, art, and movement breaks in every packet. A full school day, roughly ${HOURS_RANGE_TEXT} with breaks`,
    "Grade-level matched (K-8), themed to each kid's obsession, with one invented character per packet",
    "Answer keys for every packet, so you're not hovering over anyone",
    "Simple supply lists, mostly things you already have at home",
  ],
};

export const pricing: PricingCTAContent = {
  heading: "Free to start. Built for the whole crew.",
  headingEmoji: "⭐",
  intro:
    "One packet a month is free, no card required. That's one packet for your family, so you can see it work. When every kid wants their own (and they will), unlimited packets for unlimited kids is",
  closingSentence: "One subscription covers the whole table.",
  ctaLabel: CTA_LABEL,
  ctaEmoji: CTA_EMOJI,
};

export const faq: FAQContent = {
  heading: "FAQ",
  faqs: [
    {
      question: "Will this work if my kids are far apart in age?",
      answer:
        "Yes. That's exactly what it's built for. Each packet is generated separately at each kid's grade level, so a kindergartner and a 6th grader each get work that fits. The only shared part is the kitchen table.",
    },
    {
      question: "How many kids can I add?",
      answer:
        "On Unlimited, as many as you have. Every kid gets their own packet, their own level, their own character, and one subscription covers them all.",
    },
    {
      question: "Do they each get their own character?",
      answer:
        "Yes. Every packet gets a character invented around that kid's obsession, woven through every subject. Siblings comparing characters at lunch is a feature, not a bug.",
    },
    {
      question: "Is the free packet per kid or per family?",
      answer:
        "Per family. The free plan is one packet a month, so you can see how it works before you pay a thing. Unlimited is where every kid gets their own packet, every time.",
    },
    {
      question: "Can I really run a school morning with three kids?",
      answer:
        "Yes. The rotation is the whole trick: while you teach one kid, the others work their own packets, then you rotate. Open and close the day together. Two or three focused hours covers everyone, because nobody's waiting around.",
    },
    {
      question: "Do I need to print in color?",
      answer:
        "Color is nicer, but the packets print fine in black and white too. Nothing depends on color to make sense.",
    },
  ],
};
