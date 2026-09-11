import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import { getAllPosts } from "@/lib/blog";
import { SITE_URL, DEFAULT_OPEN_GRAPH, DEFAULT_TWITTER, DEFAULT_OG_IMAGE } from "@/lib/site";

const TITLE = "The Packet Day Blog | Homeschool Ideas and Real Talk";
const DESCRIPTION =
  "Homeschool ideas for the good days and the hard ones — sick days, bad days, burnout, and the stuff that actually helps.";

export const metadata: Metadata = {
  // `absolute` bypasses the root layout's "%s | Packet Day" title template —
  // this title already ends in "Packet Day", so the template would otherwise
  // double it up to "... | Packet Day | Packet Day".
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/blog`,
  },
  openGraph: {
    ...DEFAULT_OPEN_GRAPH,
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/blog`,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    ...DEFAULT_TWITTER,
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

function formatPublishDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <SiteHeader />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <header className="max-w-2xl mb-12 md:mb-16">
            <h1 className="font-display font-extrabold text-4xl md:text-5xl tracking-[-0.02em] leading-[1.2] text-dark">
              Homeschool Help for the Hard Days 💛
            </h1>
            <p className="mt-4 text-base leading-[1.6] text-dark/70">
              Real ideas, honest talk, and the stuff that actually works when
              today&apos;s not going the way you planned.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block rounded-2xl bg-white border border-cream-dark p-8 shadow-[0_2px_12px_rgba(212,168,67,0.08)] hover:shadow-[0_10px_28px_rgba(212,168,67,0.18)] transition-shadow duration-200"
              >
                <h2 className="font-display font-bold text-2xl tracking-[-0.02em] leading-[1.2] text-dark group-hover:text-sage transition-colors">
                  {post.title}
                </h2>
                <p className="mt-3 text-base leading-[1.6] text-dark/70">
                  {post.metaDescription}
                </p>
                <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-sage-dark">
                  <span>{formatPublishDate(post.publishDate)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{post.readingTime} min read</span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-sage p-10 md:p-14 text-center">
            <h2 className="font-display font-bold text-3xl md:text-4xl tracking-[-0.02em] leading-[1.2] text-cream">
              You don&apos;t have to plan tomorrow too. 💛
            </h2>
            <p className="mt-4 text-base leading-[1.6] text-cream/80 max-w-xl mx-auto">
              Tell us the grade and the obsession. Packet Day does the rest,
              so you don&apos;t have to.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-block bg-cream text-sage font-bold text-base px-8 py-4 rounded-full hover:bg-cream-dark transition-colors"
            >
              Try It Free
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
