import { hero as sickDayHero } from "./sick-day";
import { hero as roadTripHero } from "./road-trip";

/**
 * Slug -> that page's on-page h1, for the OG image headline
 * (app/og/[slug]/route.tsx). Deliberately its own tiny module rather than a
 * field on SituationRegistryEntry: the registry is imported by the homepage
 * and other lightweight components, and adding a reference to each
 * situation's full hero content there would pull every situation's whole
 * data file into that bundle. Only the OG route needs this.
 *
 * A new situation page adds one entry here (pointing at its own hero.h1,
 * never retyping the copy) alongside its required registry.ts entry.
 */
export const OG_HEADLINES: Record<string, string> = {
  "sick-day": sickDayHero.h1,
  "road-trip": roadTripHero.h1,
};
