import type { SituationRegistryEntry } from "./types";

/**
 * Master list of live situation landing pages. The homepage's "Browse by
 * situation" section and each page's cross-link strip both read from this,
 * so adding a new situation page (e.g. /road-trip, /snow-day) is a one-line
 * addition here rather than a change in multiple places.
 */
export const SITUATIONS: SituationRegistryEntry[] = [
  {
    slug: "sick-day",
    href: "/sick-day",
    label: "Sick days",
    teaser: "Home sick? Generate their whole school day in about a minute.",
    emoji: "🛋️",
  },
  {
    slug: "road-trip",
    href: "/road-trip",
    label: "Road trips",
    teaser: 'Turn "are we there yet?" into learning they actually want.',
    emoji: "🚗",
  },
];

/** Looks up a registry entry by slug. Throws if the slug isn't registered — a
 * page importing this always knows its own slug, so a miss is a bug, not a
 * runtime condition to handle gracefully. */
export function getSituationEntry(slug: string): SituationRegistryEntry {
  const entry = SITUATIONS.find((situation) => situation.slug === slug);
  if (!entry) {
    throw new Error(`No situation registered for slug "${slug}"`);
  }
  return entry;
}
