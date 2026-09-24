import { metadata as sickDayMetadata } from "./sick-day";
import { metadata as roadTripMetadata } from "./road-trip";
import { metadata as funFridayMetadata } from "./fun-friday";
import { metadata as multipleKidsMetadata } from "./multiple-kids";
import { metadata as screenFreeMetadata } from "./screen-free";

/**
 * Slug -> the date that situation page's content last changed (its data
 * file's `metadata.updated`), for app/sitemap.ts's lastModified. Its own
 * module for the same reason as ./og-content.ts: the registry stays light.
 *
 * A new situation page adds one entry here alongside its registry.ts and
 * og-content.ts entries. When you edit a page's copy, bump its `updated`.
 */
export const SITUATION_UPDATED: Record<string, string | undefined> = {
  "sick-day": sickDayMetadata.updated,
  "road-trip": roadTripMetadata.updated,
  "fun-friday": funFridayMetadata.updated,
  "multiple-kids": multipleKidsMetadata.updated,
  "screen-free": screenFreeMetadata.updated,
};
