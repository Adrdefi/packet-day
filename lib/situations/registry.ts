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
  },
  {
    slug: "road-trip",
    href: "/road-trip",
    label: "Road trips",
    teaser: 'Turn "are we there yet?" into learning they actually want.',
  },
];
