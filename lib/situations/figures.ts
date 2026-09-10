/**
 * Figures that repeat across every situation page's copy. One shared place
 * so a future change (e.g. the page range) doesn't require editing each
 * page's copy file individually.
 */

export const PAGE_RANGE = { min: 13, max: 18 } as const;
export const HOURS_RANGE = { min: 2, max: 6 } as const;

export const PAGE_RANGE_TEXT = `${PAGE_RANGE.min}–${PAGE_RANGE.max} pages`;
export const HOURS_RANGE_TEXT = `${HOURS_RANGE.min}–${HOURS_RANGE.max} hours`;
