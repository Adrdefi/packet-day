import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { SITUATIONS } from "@/lib/situations/registry";
import { SITUATION_UPDATED } from "@/lib/situations/sitemap-dates";
import { SITE_URL } from "@/lib/site";
import { getLiveUnitStudies } from "@/lib/unit-studies/loader";
import { PATH as FREE_WORKSHEETS_PATH, metadata as freeWorksheetsMeta } from "@/lib/free-worksheets";

// Not NEXT_PUBLIC_APP_URL: this is a static build-time file, and the
// sitemap must always state the canonical production domain no matter which
// environment (preview, staging, misconfigured prod) produced the build. If the
// env var were wrong here, every URL in the live sitemap would silently point at
// the wrong domain with no build error to catch it. SITE_URL is hardcoded for
// the same reason — see lib/site.ts.
const BASE_URL = SITE_URL;

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const latestPostDate = posts.length > 0 ? new Date(posts[0].publishDate) : new Date();
  // /blog lists every post, so it changes whenever any post does.
  const latestPostUpdate =
    posts.length > 0
      ? new Date(posts.map((post) => post.updatedDate).sort().at(-1)!)
      : new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: latestPostDate,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/pricing`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/sample`,
      // Rebuilt around Kai's outer space packet.
      lastModified: new Date("2026-09-30"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}${FREE_WORKSHEETS_PATH}`,
      lastModified: new Date(freeWorksheetsMeta.updated),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: latestPostUpdate,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/about`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/contact`,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/terms`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const postPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.updatedDate),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const situationPages: MetadataRoute.Sitemap = SITUATIONS.map((situation) => ({
    url: `${BASE_URL}${situation.href}`,
    ...(SITUATION_UPDATED[situation.slug] && {
      lastModified: new Date(SITUATION_UPDATED[situation.slug]!),
    }),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  // Live pages only (never drafts, even on a preview build). The hub is
  // listed only once there is at least one live page to list on it.
  const liveUnitStudies = getLiveUnitStudies();
  const unitStudyDate = (page: (typeof liveUnitStudies)[number]) => page.dateModified ?? page.datePublished!;
  const unitStudyPages: MetadataRoute.Sitemap =
    liveUnitStudies.length === 0
      ? []
      : [
          {
            url: `${BASE_URL}/unit-studies`,
            lastModified: new Date(liveUnitStudies.map(unitStudyDate).sort().at(-1)!),
            changeFrequency: "weekly",
            priority: 0.7,
          },
          ...liveUnitStudies.map((page) => ({
            url: `${BASE_URL}/unit-studies/${page.slug}`,
            lastModified: new Date(unitStudyDate(page)),
            changeFrequency: "monthly" as const,
            priority: 0.6,
          })),
        ];

  return [...staticPages, ...postPages, ...situationPages, ...unitStudyPages];
}
