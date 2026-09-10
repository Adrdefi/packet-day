"use client";

import { useState } from "react";
import type { FAQContent } from "@/lib/situations/types";

// The FAQPage JSON-LD for this content is rendered by the page (a Server
// Component) via buildFaqJsonLd below, the same split the blog post page
// uses — stripMarkdown/lib/blog.ts touches Node's fs/path, so it must never
// be imported from a "use client" component or the client bundle breaks.
interface Props {
  content: FAQContent;
  bgClassName?: string;
}

export default function SituationFAQ({ content, bgClassName = "bg-white" }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className={`py-24 px-6 ${bgClassName}`}>
      <div className="max-w-3xl mx-auto">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-dark text-center mb-12 leading-tight">
          {content.heading}
        </h2>

        <div className="divide-y divide-border">
          {content.faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            const answerId = `situation-faq-answer-${i}`;
            const questionId = `situation-faq-question-${i}`;
            return (
              <div key={i}>
                <button
                  id={questionId}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-start justify-between gap-4 py-5 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-inset rounded-sm"
                  aria-expanded={isOpen}
                  aria-controls={answerId}
                >
                  <span className="font-semibold text-dark text-base leading-snug group-hover:text-sage transition-colors">
                    {faq.question}
                  </span>
                  <span
                    className={[
                      "text-sage mt-0.5 shrink-0 text-xl font-bold transition-transform duration-200",
                      isOpen ? "rotate-45" : "",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </button>
                <div id={answerId} role="region" aria-labelledby={questionId} hidden={!isOpen}>
                  {isOpen && (
                    <p className="pb-5 text-dark/70 text-sm leading-relaxed">{faq.answer}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
