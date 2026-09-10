import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { SITUATIONS } from "@/lib/situations/registry";

// Hardcoded, not NEXT_PUBLIC_APP_URL: this is a static build-time file, and the
// sitemap must always state the canonical production domain no matter which
// environment (preview, staging, misconfigured prod) produced the build. If the
// env var were wrong here, every URL in the live sitemap would silently point at
// the wrong domain with no build error to catch it.
const BASE_URL = "https://packetday.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const latestPostDate = posts.length > 0 ? new Date(posts[0].publishDate) : new Date();

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
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: latestPostDate,
      changeFrequency: "weekly",
      priority: 0.8,
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
    lastModified: new Date(post.publishDate),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const situationPages: MetadataRoute.Sitemap = SITUATIONS.map((situation) => ({
    url: `${BASE_URL}${situation.href}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticPages, ...postPages, ...situationPages];
}
