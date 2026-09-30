/**
 * The optional ?theme= value on /generate links, e.g. from the /sample
 * "What is your kid obsessed with?" box. It only ever becomes the starting
 * text of the theme input, which the parent can still edit, so it is
 * cleaned rather than trusted: letters, numbers, spaces and basic
 * punctuation only, whitespace collapsed, capped at THEME_PARAM_MAX.
 */
export const THEME_PARAM_MAX = 80;

export function cleanThemeParam(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[^\p{L}\p{N} .,'’!?&():;-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, THEME_PARAM_MAX)
    .trim();
  return cleaned || null;
}

/** "/generate?theme=dinosaurs", or plain "/generate" with no usable theme. */
export function generateHrefForTheme(raw: string | null | undefined): string {
  const theme = cleanThemeParam(raw);
  return theme ? `/generate?${new URLSearchParams({ theme }).toString()}` : "/generate";
}
