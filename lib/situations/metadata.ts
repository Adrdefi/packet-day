import type { Metadata } from "next";
import type { SituationPageMetadata, SituationRegistryEntry } from "./types";
import { SITE_URL } from "@/lib/site";

/**
 * Builds the full `Metadata` object for a situation page, including its OG
 * image — driven by /og/[slug]/route.tsx, which reads the same registry
 * entry. A new situation page calls this with its own registry entry and
 * SituationPageMetadata and gets a correctly-imaged openGraph/twitter block
 * with no further wiring.
 */
export function buildSituationMetadata(
  entry: SituationRegistryEntry,
  pageMeta: SituationPageMetadata
): Metadata {
  const imageUrl = `${SITE_URL}/og/${entry.slug}`;

  return {
    // `absolute` bypasses the root layout's "%s | Packet Day" title template —
    // titleTag already ends in "| Packet Day", so the template would otherwise
    // double it up.
    title: { absolute: pageMeta.titleTag },
    description: pageMeta.metaDescription,
    alternates: { canonical: pageMeta.canonical },
    openGraph: {
      title: pageMeta.titleTag,
      description: pageMeta.metaDescription,
      url: pageMeta.canonical,
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: pageMeta.titleTag,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageMeta.titleTag,
      description: pageMeta.metaDescription,
      images: [imageUrl],
    },
  };
}
