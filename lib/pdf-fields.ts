// ─────────────────────────────────────────────────────────────────────────────
// PDF field accessors — defensive fallbacks for packet/activity fields the
// generator does not emit yet, and that the 78 existing packets in the
// database don't have either. Every accessor here must return a usable
// value even when the field, or the whole object, is missing or null.
//
// NOT WIRED YET. Standalone until PacketPDF.tsx is migrated in a later chunk.
// ─────────────────────────────────────────────────────────────────────────────

import { band, type BandKey } from './pdf-tokens';

// ─── Activity title fallbacks ──────────────────────────────────────────────

interface ActivityTitleFields {
  title?: string | null;
  shortTitle?: string | null;
  continuationTitle?: string | null;
  continuationHint?: string | null;
}

/** activity.shortTitle, else activity.title. */
export function shortTitle(activity: ActivityTitleFields | null | undefined): string {
  if (!activity) return '';
  return activity.shortTitle?.trim() || activity.title?.trim() || '';
}

/**
 * activity.continuationTitle, else shortTitle truncated at the first comma
 * or the word "and" (whichever comes first), capped at 28 characters.
 */
export function continuationTitle(activity: ActivityTitleFields | null | undefined): string {
  if (!activity) return '';

  const explicit = activity.continuationTitle?.trim();
  if (explicit) return explicit;

  const base = shortTitle(activity);
  if (!base) return '';

  const commaIdx = base.indexOf(',');
  const andMatch = base.match(/\band\b/i);
  const andIdx = andMatch ? andMatch.index! : -1;

  let cut = base.length;
  if (commaIdx !== -1) cut = Math.min(cut, commaIdx);
  if (andIdx !== -1) cut = Math.min(cut, andIdx);

  // A cut point of 0 (e.g. title starts with "and") would truncate to
  // nothing useful — fall back to the untruncated title in that case.
  let result = cut > 0 ? base.slice(0, cut).trim() : base;

  if (result.length > 28) result = result.slice(0, 28).trim();

  return result;
}

/** activity.continuationHint, else "continued". */
export function continuationHint(activity: ActivityTitleFields | null | undefined): string {
  if (!activity) return 'continued';
  return activity.continuationHint?.trim() || 'continued';
}

// ─── Block fallbacks ────────────────────────────────────────────────────────

interface BlockSizingFields {
  lineCount?: number | null;
  weight?: number | null;
}

/** block.lineCount, else band[bandKey].defaultLinesPerPrompt. */
export function lineCount(block: BlockSizingFields | null | undefined, bandKey: BandKey): number {
  const explicit = block?.lineCount;
  if (typeof explicit === 'number' && Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }
  return band[bandKey].defaultLinesPerPrompt;
}

/** block.weight, else 1. */
export function blockWeight(block: BlockSizingFields | null | undefined): number {
  const explicit = block?.weight;
  if (typeof explicit === 'number' && Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }
  return 1;
}
