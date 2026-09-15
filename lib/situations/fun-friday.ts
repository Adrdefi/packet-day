/**
 * Copy and metadata for /fun-friday, as typed data — kept separate from
 * app/fun-friday/page.tsx so the page file only arranges blocks, and this
 * file only holds words. Source: docs/copy/fun-friday.md (status: FINAL,
 * approved by Andy and Natalie, Sep 15 2026) — copy here is verbatim from
 * that file, with page/hour figures pulled from lib/situations/figures.ts
 * the same way sick-day.ts and road-trip.ts do, instead of hand-typed.
 *
 * Chunk 1 deliberately omits the copy file's "Built for the Friday feeling"
 * section (its three lead-ins — "It's theirs.", "It's at their pace.",
 * "It's the reward." — are bold in the approved copy, and the shared
 * TextSegment type only supports `italic`, not bold; extending it was out of
 * scope for this chunk per Andy's decision, Sep 15 2026). The copy file
 * itself is untouched — that section is only missing from this data file and
 * from app/fun-friday/page.tsx's render, both to be revisited later.
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
  titleTag: "Fun Friday: The Homeschool Tradition That Started Packet Day | Packet Day",
  metaDescription:
    "Every Friday was packet day in our homeschool: their own pace, then pizza night. Make your kid's Fun Friday packet in a minute or two. Free, no card required.",
  canonical: `${SITE_URL}/fun-friday`,
};

const CTA_LABEL = "Make My Fun Friday Packet — Free";
const CTA_EMOJI = "✨";

export const hero: HeroContent = {
  h1: "Fun Friday: The Packet Day That Started It All. Generated in a Minute or Two.",
  leadParagraphs: [
    {
      text: "This one is personal. It's how Packet Day was born — and I'm the one who lived it.",
    },
  ],
  ctaLabel: CTA_LABEL,
  ctaEmoji: CTA_EMOJI,
  trustLine: "One free packet a month · No card required",
};

export const storySection: TextSectionContent = {
  heading: "Hi, I'm Natalie.",
  paragraphs: [
    "Every Friday in our homeschool was packet day. I would spend my week painstakingly building packets out of online resources — a math page from here, a reading passage from there, a science activity from somewhere else entirely. Hours of hunting, printing, and stapling, usually finished way too late on Thursday night.",
    [
      { text: "And on Fridays, Oliver (5th grade) and Vivian (3rd grade) got the whole thing: a full day they could work through at their own pace. No lessons. No hovering. Just their packet, their crayons, and the quiet pride of finishing something themselves. They " },
      { text: "loved", italic: true },
      { text: " it. It was the reward at the end of the week — finish your packet, and it's the weekend. And Friday pizza night, of course. (We bake together a lot in this house — the kids would tell you that's the real tradition.)" },
    ],
    "Then I did the math nobody wants to do: I was spending more time assembling packets than teaching the full week's curriculum.",
    "That's when my husband Andy had the thought that became this company: what if the packet built itself? What if every family could have packet day Fridays — or any day — without the 11pm Thursday assembly line?",
    "So we built it. This page is the original. The tradition, minus the exhaustion.",
    "You don't have to homeschool to steal this one, either. If your kids come home from a long school week running on empty, a Friday packet is the soft landing.",
  ],
};

export const steps: StepsContent = {
  heading: "Three steps. A minute or two. Done. ⚡",
  steps: [
    {
      title: "Tell us two things.",
      body: "Your kid's grade level and what they're obsessed with right now — the thing they'd talk about through pizza night if you let them.",
    },
    {
      title: "We build their Friday from scratch.",
      body: `${PAGE_RANGE_TEXT} — math, reading, puzzles, art, and more — with a character we invent just for them, woven through every subject. Nothing here existed before you asked for it.`,
    },
    {
      title: "Print it. Done.",
      body: "Hand it over Friday morning. They work at their own pace. You get your week back. Pizza night is still on you.",
    },
  ],
};

export const checklist: ChecklistContent = {
  heading: "What you get",
  headingEmoji: "✅",
  items: [
    `A print-ready PDF (${PAGE_RANGE_TEXT}) generated in a minute or two — made fresh for your kid, never pre-made`,
    `Math, reading, a puzzle break, a movement break, and a coloring page, plus one rotating subject like science or history. A full school day, roughly ${HOURS_RANGE_TEXT} with breaks.`,
    "Grade-level matched (K–8), themed to your child's obsession, with one invented character through every subject",
    "Answer keys, so Friday stays relaxing",
    "Household-items-only supply lists",
    "Zero screen time, zero prep, zero Thursday-night assembly line",
  ],
};

export const pricing: PricingCTAContent = {
  heading: "Free to start. Guilt-free to try.",
  headingEmoji: "💛",
  intro:
    "One packet a month is free — no card required. For every-Friday packet days, unlimited packets and unlimited kids are",
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
        "Yes. Friday packet day was a real tradition in our homeschool before it was a product. I built every packet by hand from online resources until the assembling was eating more time than the teaching. Packet Day is that tradition, automated — the Friday feeling, minus the Thursday night.",
    },
    {
      question: "How is this different from the packets you used to make?",
      answer:
        "Same love, none of the labor. I built each one by hunting down resources for hours; the generator builds one around your kid's grade level and obsession in a minute or two, with a character woven through every subject — something even my hand-built packets rarely had.",
    },
    {
      question: "Do I download a pre-made packet?",
      answer:
        "No — and that's the whole point. There are no pre-made packets. Every packet is generated from scratch the moment you ask: your kid's grade level, their current obsession, one invented character woven through every subject. What you print didn't exist a minute or two earlier.",
    },
    {
      question: "What if my kid finishes fast — or takes all day?",
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
