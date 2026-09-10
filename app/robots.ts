import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Not NEXT_PUBLIC_APP_URL: this is a static build-time file, and the
// sitemap reference must always point at the canonical production domain no
// matter which environment (preview, staging, misconfigured prod) produced the
// build. If the env var were wrong here, this would silently point crawlers at
// the wrong domain with no build error to catch it. SITE_URL is hardcoded for
// the same reason — see lib/site.ts.
const BASE_URL = SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/account", "/generate", "/onboarding", "/api/", "/checkout-redirect"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
