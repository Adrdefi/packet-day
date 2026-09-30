import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Not NEXT_PUBLIC_APP_URL: this is a static build-time file, and the
// sitemap reference must always point at the canonical production domain no
// matter which environment (preview, staging, misconfigured prod) produced the
// build. If the env var were wrong here, this would silently point crawlers at
// the wrong domain with no build error to catch it. SITE_URL is hardcoded for
// the same reason — see lib/site.ts.
const BASE_URL = SITE_URL;

// Private app paths. Every group repeats them, because a crawler that finds
// a group naming it follows only that group and ignores the "*" rules.
const DISALLOW = ["/dashboard", "/account", "/generate", "/onboarding", "/api/", "/checkout-redirect"];

// Crawlers we welcome by name, each checked against its vendor's own docs
// (2026-09-29): Google (developers.google.com/crawling), Bing (bingbot),
// OpenAI (developers.openai.com/api/docs/bots), Anthropic
// (support.claude.com/en/articles/8896518), Perplexity
// (docs.perplexity.ai/docs/resources/perplexity-crawlers) and Apple
// (support.apple.com/en-us/119829).
const NAMED_CRAWLERS = [
  "Googlebot",
  "Bingbot",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...NAMED_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow: DISALLOW })),
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
