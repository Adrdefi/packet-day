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

export interface HeroContent {
  h1: string;
  leadParagraphs: string[];
  ctaLabel: string;
  trustLine: string;
}

export interface TextSectionContent {
  heading: string;
  paragraphs: Paragraph[];
}

export interface Step {
  title: string;
  body: string;
}

export interface StepsContent {
  heading: string;
  steps: Step[];
}

export interface ChecklistContent {
  heading: string;
  items: string[];
}

export interface PricingCTAContent {
  heading: string;
  /** Copy leading up to the price figures — the component appends the live prices from PLAN_PRICE. */
  intro: string;
  ctaLabel: string;
}

export interface Faq {
  question: string;
  answer: string;
}

export interface FAQContent {
  heading: string;
  faqs: Faq[];
}
