/**
 * Copy and metadata for /sick-day, as typed data — kept separate from
 * app/sick-day/page.tsx so the page file only arranges blocks, and this
 * file only holds words. Source: docs/landing-pages/pages/sick-day.md,
 * with the founder-approved copy changes applied (see Phase 1 chat notes):
 * "60 seconds" -> "about a minute" throughout, page/hour ranges pulled
 * from lib/situations/figures.ts, household-items line reworded, the
 * "Next sick day?" paragraph replaced, and the duplicate answer-keys
 * mention removed from the low-energy section (it lives in step 3).
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

export const metadata: SituationPageMetadata = {
  titleTag: "Sick Day Activities for Kids: A Full School Day in About a Minute | Packet Day",
  metaDescription:
    "Your kid is home sick but not sick enough to sleep. Generate a personalized 13 to 18 page learning packet around their obsession: math, reading, science, art. Free, no card required.",
  canonical: `${SITE_URL}/sick-day`,
};

const CTA_LABEL = "Make My Sick Day Packet — Free";
const CTA_EMOJI = "✨";

export const hero: HeroContent = {
  badge: { text: "Your sick day backup plan", emoji: "💛" },
  h1: "Home Sick? Generate Their Whole School Day in About a Minute.",
  leadParagraphs: [
    {
      text: "It's 7am, the school called, and your kid is on the couch with a blanket fort. They're not sick enough to sleep all day, but they're not well enough for school either. You're tired, the day's already derailed, and the guilt is whispering that learning just evaporated for today.",
      emoji: "🏠",
    },
    {
      text: "It doesn't have to. Give us about a minute and we'll generate a full school day you don't have to plan, teach, or supervise beyond handing it over.",
    },
  ],
  ctaLabel: CTA_LABEL,
  ctaEmoji: CTA_EMOJI,
  trustLine: "One free packet a month · No card required",
};

export const steps: StepsContent = {
  heading: "How it works: three steps, about a minute",
  steps: [
    {
      title: "Tell us two things.",
      body: "Your kid's grade level and what they're obsessed with right now — dinosaurs, cats, Minecraft, space, whatever's running the show this month.",
      emoji: "📝",
    },
    {
      title: "We build their day from scratch.",
      body: `${PAGE_RANGE_TEXT} — math, reading, science, art, calm movement breaks — with a character we invent just for them, woven through every subject. Nothing here existed before you asked for it.`,
      emoji: "✨",
    },
    {
      title: "Print it. Done.",
      body: "Hand it over with some crayons and go make tea. Answer keys included, so there's no hovering over the couch.",
      emoji: "🎉",
    },
  ],
};

export const lowEnergySection: TextSectionContent = {
  heading: "Built for low-energy days — for both of you",
  headingEmoji: "🌿",
  paragraphs: [
    "Sick days have a particular shape: a kid who needs calm, quiet activities, and a parent with absolutely nothing left in the tank. That's who this is for.",
    `One packet. ${PAGE_RANGE_TEXT}. Math, reading, science, art, and gentle movement breaks that won't disturb the blanket fort. Everything at their level (K–8), everything printable. You print it once and you're done. The whole day is handled.`,
  ],
};

export const notADownloadSection: TextSectionContent = {
  heading: "This isn't a download. Nothing here existed before you asked.",
  headingEmoji: "🌟",
  paragraphs: [
    "You searched for sick day worksheets. Here's something better than worksheets.",
    'Every printable pack on Etsy, every "50 free sick day printables" listicle — they’re all pre-made. Same pages for every kid. You scroll, you guess, you print half a bundle hoping some of it fits.',
    [
      { text: "We don't have packets. We have a machine that makes them — one at a time, for one kid, in about a minute. Tell us your 3rd grader is dinosaur-obsessed, and we invent Bronto: a skateboarding T-rex with a name, a personality, and a starring role in every subject. Your kid solves fractions " },
      { text: "with", italic: true },
      { text: " Bronto, reads a dino mystery " },
      { text: "with", italic: true },
      { text: " Bronto, does a fossil science experiment " },
      { text: "with", italic: true },
      { text: " Bronto. It's not a stack of worksheets. It's a story they want to finish — starring a character built around their thing." },
    ],
    "Next sick day? Same obsession or a new one, you get a brand new adventure, generated fresh every single time.",
  ],
};

export const checklist: ChecklistContent = {
  heading: "What you get",
  headingEmoji: "📚",
  items: [
    `A print-ready PDF (${PAGE_RANGE_TEXT}) generated in about a minute — made fresh for your kid, never pre-made`,
    `Math, reading, science, art, and calm movement breaks — roughly ${HOURS_RANGE_TEXT} of quiet learning`,
    "Grade-level matched (K–8), themed to your child's obsession, with one invented character through every subject",
    "Answer keys, so you can rest instead of checking",
    "Simple supply lists, mostly things you already have at home",
    "Zero screen time, zero prep, zero decisions",
  ],
};

export const pricing: PricingCTAContent = {
  heading: "Free to start. Guilt-free to try.",
  headingEmoji: "⭐",
  intro:
    "One packet a month is free — no card required. When the next sick day hits, upgrade to unlimited packets and unlimited kids for",
  ctaLabel: CTA_LABEL,
  ctaEmoji: CTA_EMOJI,
};

export const faq: FAQContent = {
  heading: "FAQ",
  faqs: [
    {
      question: "My kid is sick — will they really want to do a learning packet?",
      answer:
        "We don't do generic worksheets, which is why this works on low-energy days. The packet is built around what they're obsessed with right now, with a character carrying them through every subject. Tired kids who won't touch a worksheet will finish a packet that's secretly about their favorite thing.",
    },
    {
      question: "How is this different from free printables I find online?",
      answer:
        "Free printables are static, one-grade-fits-all, and cost you an hour of hunting and guessing. Ours is generated fresh for your kid's exact grade level and obsession in about a minute — one packet, no scrolling, no printing half of a 200-page pack.",
    },
    {
      question: "Do I download a pre-made packet?",
      answer:
        "No — and that's the whole point. There are no pre-made packets. Every packet is generated from scratch the moment you ask: your kid's grade level, their current obsession, one invented character woven through every subject. What you print didn't exist a minute earlier.",
    },
    {
      question: "Can the packet be quiet/calm?",
      answer:
        "Yes. Every packet includes gentle, low-key activities — reading, drawing, and movement breaks that fit a restful day. It's designed for the couch, not the playground.",
    },
    {
      question: "What ages does it cover?",
      answer:
        "Kindergarten through 8th grade. Set each child's level once, and every packet matches it.",
    },
    {
      question: "Do I need a card for the free packet?",
      answer: "No. One free packet per month, no card, no surprise bills.",
    },
  ],
};
