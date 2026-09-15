import Link from "next/link";
import type { ClosingCTAContent } from "@/lib/situations/section-types";

interface Props {
  content: ClosingCTAContent;
}

/** Centered closing CTA block: heading, one line, primary button, trust
 * line. Data-driven — no situation-specific text lives in this component. */
export default function SituationClosingCTA({ content }: Props) {
  return (
    <section className="py-24 px-6 bg-gradient-to-b from-cream to-sage-light/20">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-dark mb-6 leading-tight">
          {content.heading}
          {content.headingEmoji && (
            <span className="ml-2" aria-hidden="true">
              {content.headingEmoji}
            </span>
          )}
        </h2>
        <p className="text-dark/70 text-lg leading-relaxed mb-10">{content.line}</p>
        <Link
          href={content.ctaHref}
          className="inline-block bg-sage text-cream font-bold text-base px-8 py-4 rounded-full hover:bg-sage-dark transition-colors shadow-sm"
        >
          {content.ctaLabel}
          {content.ctaEmoji && (
            <span className="ml-1.5" aria-hidden="true">
              {content.ctaEmoji}
            </span>
          )}
        </Link>
        <p className="mt-5 text-sm font-semibold text-sage-dark">{content.trustLine}</p>
      </div>
    </section>
  );
}
