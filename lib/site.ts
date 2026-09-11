/**
 * The site's one canonical, public address — used anywhere a URL needs to
 * be correct regardless of environment (preview, staging, misconfigured
 * prod) or runtime (server or client): metadataBase, canonical tags,
 * sitemap.xml, robots.txt, JSON-LD, and OG tags.
 *
 * Hardcoded, not an env var: these are static/build-time values in some
 * callers (sitemap.ts, robots.ts) and must always state the true canonical
 * production domain no matter what produced the build. An env var pointing
 * at the wrong domain would silently poison every URL derived from it, with
 * no build error to catch it. No imports either, so this is safe to pull
 * into both server code and client components without bundling concerns.
 *
 * The live site redirects the apex domain (https://packetday.com) to this
 * one — this constant is the address that redirect lands on, not the one
 * that redirects away.
 */
export const SITE_URL = "https://www.packetday.com";

/**
 * openGraph/twitter fields that app/layout.tsx sets at the root
 * (siteName/locale/type, card/site) — a page-level `openGraph` or `twitter`
 * object in Next.js metadata REPLACES the parent's entirely rather than
 * merging, so any page that needs its own `url` or `images` has to spread
 * these back in or it silently loses the inherited tags.
 */
export const DEFAULT_OPEN_GRAPH = {
  siteName: "Packet Day",
  locale: "en_US",
  type: "website" as const,
};

export const DEFAULT_TWITTER = {
  card: "summary_large_image" as const,
  site: "@packetday",
};

/** Homepage share image, reused as the default for pages with no image of their own. */
export const DEFAULT_OG_IMAGE = {
  url: "/og",
  width: 1200,
  height: 630,
  alt: "Packet Day — AI-powered learning packets for homeschool families",
};
