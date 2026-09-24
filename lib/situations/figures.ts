/**
 * Figures that repeat across every situation page's copy. One shared place
 * so a future change (e.g. the page range) doesn't require editing each
 * page's copy file individually.
 */

export const PAGE_RANGE = { min: 11, max: 17 } as const;
export const HOURS_RANGE = { min: 2, max: 5 } as const;

export const PAGE_RANGE_TEXT = `${PAGE_RANGE.min} to ${PAGE_RANGE.max} pages`;
export const HOURS_RANGE_TEXT = `${HOURS_RANGE.min} to ${HOURS_RANGE.max} hours`;
/** Before a noun, e.g. "an 11 to 17 page packet". */
export const PAGE_RANGE_ADJECTIVE_TEXT = `${PAGE_RANGE.min} to ${PAGE_RANGE.max} page`;
