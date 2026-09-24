import { stripMarkdown } from "@/lib/blog";
import type { FAQContent } from "./types";

/**
 * Builds a situation page's FAQPage JSON-LD from its FAQ content. Called
 * from each page.tsx (a Server Component), never from SituationFAQ (a
 * "use client" component): stripMarkdown/lib/blog.ts touches Node's
 * fs/path, which can't be bundled for the browser. Same split
 * app/blog/[slug]/page.tsx uses.
 */
export function buildFaqJsonLd(faq: FAQContent) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.faqs.map((item) => ({
      "@type": "Question",
      name: stripMarkdown(item.question),
      acceptedAnswer: {
        "@type": "Answer",
        text: stripMarkdown(item.answer),
      },
    })),
  };
}
