import { cleanThemeParam, generateHrefForTheme } from "@/lib/themeParam";

/**
 * /signup link for a /sample CTA. With a theme, `next` carries
 * /generate?theme=... through signup, email confirmation and onboarding, so
 * the first packet form opens with it filled in. Without one it is just
 * /signup?from=... like every other tracked signup link.
 */
export function sampleSignupHref(from: string, rawTheme?: string | null): string {
  const params = new URLSearchParams({ from });
  if (cleanThemeParam(rawTheme)) params.set("next", generateHrefForTheme(rawTheme));
  return `/signup?${params.toString()}`;
}
