/**
 * Shapes for the newer situation-page section components (Reasons,
 * Comparison, CharacterCard, ClosingCTA) — kept out of ./types.ts, which
 * chunk 2's rules leave untouched, so these are additive rather than a
 * change to the original shared contract. `Paragraph`/`TextSegment` are
 * reused from ./types so italic runs (e.g. the character card's "*with*")
 * render the same way SituationTextSection already does.
 */
import type { Paragraph } from "./types";

export interface ReasonCard {
  title: string;
  body: string;
}

export interface ReasonsContent {
  heading: string;
  headingEmoji?: string;
  intro?: string;
  cards: ReasonCard[];
  /** Optional paragraph rendered below the card grid. */
  closingParagraph?: string;
}

export interface ComparisonColumn {
  /** Verbatim from copy, including its own leading emoji (e.g. "📚 My old Thursday nights"). */
  heading: string;
  /** Verbatim from copy, each item already carrying its own ❌/✅ prefix. */
  items: string[];
}

export interface CharacterCardContent {
  /** Rendered when no `image` is given. */
  avatarEmoji?: string;
  /** A real character photo/illustration, shown instead of avatarEmoji when present. */
  image?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  /** Small warm-gray line under the image, e.g. crediting the real packet it came from. */
  caption?: string;
  tag: string;
  title: string;
  body: Paragraph;
}

export interface ComparisonContent {
  eyebrow: string;
  heading: string;
  headingEmoji?: string;
  leadParagraph: string;
  /** Rendered as the plain/muted card, always on the left (mobile: first). */
  leftColumn: ComparisonColumn;
  /** Rendered as the sage-filled card, always on the right (mobile: second). */
  rightColumn: ComparisonColumn;
  characterCard?: CharacterCardContent;
  closingParagraph?: string;
}

export interface ClosingCTAContent {
  heading: string;
  headingEmoji?: string;
  line: string;
  ctaLabel: string;
  ctaEmoji?: string;
  ctaHref: string;
  trustLine: string;
}
