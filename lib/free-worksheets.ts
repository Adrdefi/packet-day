/**
 * Copy for /free-worksheets, the "free worksheets vs Packet Day" comparison
 * page. Written in Natalie's voice; keep it word for word unless she changes
 * it. No dashes as punctuation anywhere (CLAUDE.md copy rule).
 */
import type { FAQContent, HeroContent, TextSectionContent } from "@/lib/situations/types";

export const PATH = "/free-worksheets";

export const metadata = {
  titleTag: "Free Printable Worksheets vs Packet Day | Learning Made for Your Kid",
  metaDescription:
    "Free worksheets give every kid the same page. Packet Day builds a full printable school day around your kid's interests, with a character guide through every subject. Free to start.",
  /** YYYY-MM-DD the page's content last changed. Feeds the sitemap. */
  updated: "2026-10-02",
};

export const hero: HeroContent = {
  h1: "Free worksheets are everywhere. None of them know your kid.",
  leadParagraphs: [
    {
      text: "Packet Day builds a full printable school day around whatever your kid is obsessed with, with one character guide and one story running through every subject. Ready in a minute or two.",
    },
  ],
  ctaLabel: "Make your first packet free",
  trustLine: "Free to start. No card needed.",
};

export const huntSection: TextSectionContent = {
  heading: "I've spent hours on this. You probably have too.",
  paragraphs: [
    "Searching. Filtering by grade. Downloading. Opening ten tabs to find one page that actually fits. Printing. You end up with a reading page from one site, a math page from another, and a coloring sheet that's way too easy. And every kid in the country gets the exact same page.",
  ],
};

export const doesntExistSection = {
  heading: "Good luck finding this one",
  body: "Sure, you can find a 4th grade dinosaur reading page. A dinosaur math page. Maybe even a dinosaur nonfiction page. Now try finding a full school day for a 3rd grader who loves dinosaurs AND baking, where one character guides them through every subject and the story carries from reading to math to writing.",
  pullLine: "We looked. It doesn't exist. So we built it.",
};

export const pileVsPacket = {
  pileCaption: "6 sites. 6 styles. No story.",
  packetCaption: "One day. One story. Made for your kid.",
};

/** Six rows. Grade level, answer keys and cost live in the FAQ instead. */
export interface ComparisonRow {
  label: string;
  free: string;
  packetDay: string;
}

export const comparison = {
  freeHeading: "Free worksheets",
  packetDayHeading: "Packet Day",
  rows: [
    { label: "Time to put together", free: "Hours of searching, filtering and downloading", packetDay: "A minute or two" },
    { label: "Made for", free: "Every kid gets the same page", packetDay: "Your kid's name, grade and current obsession" },
    { label: "How it fits together", free: "Random pages from random sites", packetDay: "One story and one character guide through every subject" },
    { label: "More than one interest", free: "Good luck", packetDay: "Combine them in one packet" },
    { label: "Fresh every time", free: "The same worksheet everyone downloaded", packetDay: "Brand new content every packet" },
    { label: "The fun part", free: "Rarely", packetDay: "A rotating puzzle break and a corny Joke of the Day" },
  ] satisfies ComparisonRow[],
};

/**
 * "Any day works" body, split so each day with a matching page (a use case
 * page, or the burnout blog post) becomes a link. A segment with no href renders as plain text.
 */
export const anyDaySection = {
  heading: "Homeschool day or any other day",
  segments: [
    { text: "A regular homeschool day. " },
    { text: "A sick day", href: "/sick-day" },
    { text: ". " },
    { text: "A burnt out day", href: "/blog/homeschool-burnout-permission-slip" },
    { text: ". " },
    { text: "A road trip", href: "/road-trip" },
    { text: ". An after school afternoon at Grandma's. Any day works with Packet Day." },
  ] as { text: string; href?: string }[],
};

export const fairSection: TextSectionContent = {
  heading: "When free worksheets are great",
  paragraphs: [
    "Free worksheets aren't bad. For drilling one skill, like a page of multiplication facts, they're perfect. Packet Day is for when you want a whole day that feels like it was made for your kid. Because it was.",
  ],
};

export const seeRealSection = {
  heading: "See a real packet",
  /** Live unit study pages shown as cards, in this order. */
  unitStudySlugs: ["dinosaurs", "kitchen-science", "outer-space", "sharks"],
  sampleLinkLabel: "Flip through a full sample packet",
};

export const faq: FAQContent = {
  heading: "Questions parents ask",
  faqs: [
    {
      question: "Is Packet Day really free?",
      answer: "Yes. The free plan gives you one full packet a month, no card needed. Unlimited is $9 a month, billed annually.",
    },
    {
      question: "How long does it take?",
      answer: "About a minute or two to make. Each packet is a full school day, roughly 2 to 5 hours with breaks.",
    },
    { question: "What grades does it cover?", answer: "Kindergarten through 8th grade." },
    {
      question: "Can my kid have more than one interest?",
      answer: "Yes. Type in both, like dinosaurs and baking, and Packet Day ties them together.",
    },
    { question: "Do I need to prep anything?", answer: "Nope. Print it and hand it over. Answer keys are included." },
    {
      question: "Does it replace our curriculum?",
      answer: "It works great alongside it, and it's there for the days you need a full plan fast.",
    },
  ],
};

export const closing = {
  heading: "Welcome to Packet Day",
  line: "Learning material as unique as your little learner.",
  ctaLabel: "Make your first packet free",
  ctaHref: "/signup",
};
