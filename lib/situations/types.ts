/** Shared shapes for "situation" landing pages (/sick-day, /road-trip, ...). */

export interface SituationRegistryEntry {
  slug: string;
  href: string;
  label: string;
  teaser: string;
}

/** A run of text within a paragraph — `italic` renders as <em>. */
export interface TextSegment {
  text: string;
  italic?: boolean;
}

/** A paragraph is either plain text or a run of segments (for inline italics). */
export type Paragraph = string | TextSegment[];

export interface SituationPageMetadata {
  titleTag: string;
  metaDescription: string;
  canonical: string;
}

/**
 * A short run of text paired with an optional decorative emoji. The emoji is
 * always a separate field, never baked into `text` — components render it in
 * its own aria-hidden span. At most one per heading/label; never used on an
 * h1, title tag, meta description, openGraph field, JSON-LD, or FAQ content.
 */
export interface EmojiText {
  text: string;
  emoji?: string;
}

export interface HeroContent {
  /** Pill badge above the h1, e.g. "Your sick day backup plan". */
  badge?: EmojiText;
  /** Never carries an emoji — see EmojiText's doc comment. */
  h1: string;
  leadParagraphs: EmojiText[];
  ctaLabel: string;
  ctaEmoji?: string;
  trustLine: string;
}

export interface TextSectionContent {
  heading: string;
  headingEmoji?: string;
  paragraphs: Paragraph[];
}

export interface Step {
  title: string;
  body: string;
  emoji?: string;
}

export interface StepsContent {
  heading: string;
  steps: Step[];
}

export interface ChecklistContent {
  heading: string;
  headingEmoji?: string;
  items: string[];
}

export interface PricingCTAContent {
  heading: string;
  headingEmoji?: string;
  /** Copy leading up to the price figures — the component appends the live prices from PLAN_PRICE. */
  intro: string;
  /** Optional sentence rendered after the price sentence, e.g. a closing reassurance line. */
  closingSentence?: string;
  ctaLabel: string;
  ctaEmoji?: string;
}

export interface Faq {
  question: string;
  answer: string;
}

export interface FAQContent {
  heading: string;
  faqs: Faq[];
}
