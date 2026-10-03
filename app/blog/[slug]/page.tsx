import type { Metadata } from "next";
import type { ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import PublicHeader from "@/components/layout/PublicHeader";
import JsonLd from "@/components/JsonLd";
import { getAllPosts, getPostBySlug, stripMarkdown } from "@/lib/blog";
import { SITE_URL, DEFAULT_TWITTER, NATALIE_ID, NATALIE_PATH } from "@/lib/site";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

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

// Renders an <a> as a Next.js <Link> for any internal (site-relative) path,
// so /sick-day, /road-trip, and cross-post /blog/... links behave like real
// navigation even before those destination pages exist.
function MarkdownLink({
  href,
  ...props
}: ComponentPropsWithoutRef<"a">) {
  // sage-dark, not sage: half the bands are cream-deep, where sage text
  // misses WCAG AA (4.24:1); sage-dark clears it on both band colors.
  const linkClass =
    "text-sage-dark underline underline-offset-2 hover:text-dark transition-colors";
  if (href && href.startsWith("/")) {
    return <Link href={href} className={linkClass} {...props} />;
  }
  return <a href={href} className={linkClass} {...props} />;
}

function MarkdownList({
  className,
  ...props
}: ComponentPropsWithoutRef<"ul">) {
  const isTaskList = className?.includes("contains-task-list");
  return (
    <ul
      className={`${
        isTaskList ? "list-none pl-1" : "list-disc pl-6 marker:text-sage"
      } space-y-2 mb-5 text-dark/70`}
      {...props}
    />
  );
}

const markdownComponents: Components = {
  h2: (props) => (
    <h2
      className="font-display font-bold text-3xl md:text-4xl tracking-[-0.02em] leading-[1.15] text-sage-dark mt-12 mb-6 first:mt-0"
      {...props}
    />
  ),
  h3: (props) => (
    <h3
      className="font-display font-bold text-xl tracking-[-0.02em] leading-[1.2] text-dark mt-8 mb-3"
      {...props}
    />
  ),
  p: (props) => <p className="text-dark/70 leading-[1.6] mb-5" {...props} />,
  strong: (props) => <strong className="text-dark font-semibold" {...props} />,
  ul: MarkdownList,
  ol: (props) => (
    <ol
      className="list-decimal pl-6 marker:text-sage marker:font-semibold space-y-2 mb-5 text-dark/70"
      {...props}
    />
  ),
  li: (props) => <li className="leading-[1.6]" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="border-l-4 border-sage pl-5 ml-1 italic text-dark/70 my-6"
      {...props}
    />
  ),
  a: MarkdownLink,
  hr: (props) => <hr className="border-t border-cream-dark my-10" {...props} />,
};

// Search engines flag <title> tags over 70 characters, and emoji in a
// title tag read as noise in results. Drops the emoji for the <title>
// only (the H1, blog index, og:title and twitter:title keep it), and drops
// the " | Packet Day" suffix when the title would otherwise run long.
const MAX_TITLE_TAG_LENGTH = 70;

function buildPostTitleTag(title: string): string {
  const plain = title
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️‍]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  const withSuffix = `${plain} | Packet Day`;
  return [...withSuffix].length <= MAX_TITLE_TAG_LENGTH ? withSuffix : plain;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  const url = `${SITE_URL}/blog/${post.slug}`;
  const imageUrl = `${SITE_URL}/og/blog/${post.slug}`;

  return {
    // `absolute` bypasses the root layout's "%s | Packet Day" title
    // template — same reason as the blog index page: we're composing the
    // full title ourselves, so we don't want the template appending
    // "Packet Day" a second time.
    title: { absolute: buildPostTitleTag(post.title) },
    description: post.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      url,
      type: "article",
      publishedTime: post.publishDate,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      ...DEFAULT_TWITTER,
      title: post.title,
      description: post.metaDescription,
      images: [imageUrl],
    },
  };
}

/**
 * Splits a post body into bands: the intro (everything before the first
 * H2), then one chunk per H2 section. A `---` divider that ends a chunk is
 * dropped, since the band boundary now does that job (every current post
 * has one right before its FAQ section). Posts have no code blocks, so a
 * line starting with "## " is always a heading.
 */
function splitIntoSections(content: string): string[] {
  const sections: string[][] = [[]];
  for (const line of content.split("\n")) {
    if (line.startsWith("## ")) sections.push([]);
    sections[sections.length - 1].push(line);
  }
  return sections
    .map((lines) => lines.join("\n").replace(/\n\s*---\s*$/, "").trim())
    .filter((chunk) => chunk.length > 0);
}

/** Bands alternate cream-deep and white, starting with the header and intro. */
const BAND_BACKGROUNDS = ["bg-cream-deep", "bg-white"] as const;

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    notFound();
  }

  const postUrl = `${SITE_URL}/blog/${post.slug}`;
  const sections = splitIntoSections(post.content);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: post.faqs.map((faq) => ({
      "@type": "Question",
      name: stripMarkdown(faq.question),
      acceptedAnswer: {
        "@type": "Answer",
        text: stripMarkdown(faq.answer),
      },
    })),
  };

  // `image` is the post's share image, the same URL og:image uses. Every
  // post is written in Natalie's voice, so she is the author. Her @id
  // matches the Person node on /about, and her name matches that page.
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.publishDate,
    dateModified: post.updatedDate,
    url: postUrl,
    image: `${SITE_URL}/og/blog/${post.slug}`,
    author: {
      "@type": "Person",
      "@id": NATALIE_ID,
      name: "Natalie Riggs",
      jobTitle: "Co-Founder",
      url: NATALIE_ID,
    },
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Packet Day",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo-mark.png`,
      },
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-cream-deep">
      <JsonLd data={articleJsonLd} />
      {/* Only posts with a FAQ section get FAQPage schema. */}
      {post.faqs.length > 0 && <JsonLd data={faqJsonLd} />}

      <PublicHeader />

      {/* Same rhythm as the homepage and unit study pages: full width bands
          alternating cream-deep and white, the text column kept at the
          same readable width inside each, ending on a solid sage band. */}
      <main className="flex-1">
        {sections.map((section, i) => (
          <section
            key={i}
            className={`px-6 py-14 md:py-20 ${BAND_BACKGROUNDS[i % BAND_BACKGROUNDS.length]}`}
          >
            <div className="max-w-2xl mx-auto [&>*:last-child]:mb-0">
              {i === 0 && (
                <header className="mb-10">
                  <Link
                    href="/blog"
                    className="text-sm font-semibold text-sage-dark hover:text-dark transition-colors"
                  >
                    ← Back to all posts
                  </Link>

                  <h1 className="mt-6 font-display font-extrabold text-4xl md:text-5xl tracking-[-0.02em] leading-[1.2] text-dark">
                    {post.title}
                  </h1>

                  <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-sage-dark">
                    <span>{formatPublishDate(post.publishDate)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{post.readingTime} min read</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-sage-dark">
                    By{" "}
                    <Link href={NATALIE_PATH} className="text-sage-dark underline underline-offset-2 hover:text-dark transition-colors">
                      Natalie Riggs
                    </Link>
                  </p>
                </header>
              )}
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
                {section}
              </ReactMarkdown>
            </div>
          </section>
        ))}

        <section className="px-6 py-16 md:py-24 bg-sage text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="font-display font-bold text-3xl md:text-4xl tracking-[-0.02em] leading-[1.2] text-cream">
              Like what you just read? 📝
            </h2>
            <p className="mt-4 text-base leading-[1.6] text-cream max-w-xl mx-auto">
              Packet Day turns an idea like this into a real, printable day.
              Pick a grade, pick an obsession, and it&apos;s ready in a minute or
              two.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-block bg-cream text-sage font-bold text-base px-8 py-4 rounded-full hover:bg-cream-dark transition-colors"
            >
              Try Packet Day Free
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
