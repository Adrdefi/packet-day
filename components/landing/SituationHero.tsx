import Link from "next/link";
import type { HeroContent } from "@/lib/situations/types";

interface Props {
  content: HeroContent;
  bgClassName?: string;
}

export default function SituationHero({ content, bgClassName = "bg-cream" }: Props) {
  return (
    <section className={`pt-16 pb-20 md:pt-24 md:pb-24 px-6 text-center ${bgClassName}`}>
      <div className="max-w-3xl mx-auto">
        {content.badge && (
          <span className="inline-block bg-honey/20 text-honey-dark text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
            {content.badge.text}
            {content.badge.emoji && (
              <span className="ml-1.5" aria-hidden="true">
                {content.badge.emoji}
              </span>
            )}
          </span>
        )}

        <h1 className="font-display text-4xl md:text-6xl font-bold text-dark leading-tight mb-8">
          {content.h1}
        </h1>

        {content.leadParagraphs.map((paragraph, i) => (
          <p
            key={i}
            className="text-lg md:text-xl text-dark/70 leading-relaxed mb-4 last:mb-0"
          >
            {paragraph.emoji && (
              <span className="mr-1.5" aria-hidden="true">
                {paragraph.emoji}
              </span>
            )}
            {paragraph.text}
          </p>
        ))}

        <div className="mt-10">
          <Link
            href="/signup"
            className="inline-block bg-sage text-cream font-bold text-base px-8 py-4 rounded-full hover:bg-sage-dark transition-colors shadow-sm"
          >
            {content.ctaLabel}
            {content.ctaEmoji && (
              <span className="ml-1.5" aria-hidden="true">
                {content.ctaEmoji}
              </span>
            )}
          </Link>
        </div>

        <p className="mt-5 text-sm font-semibold text-sage-dark">{content.trustLine}</p>
      </div>
    </section>
  );
}
