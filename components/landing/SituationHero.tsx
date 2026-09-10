import Link from "next/link";
import type { HeroContent } from "@/lib/situations/types";

export default function SituationHero({ content }: { content: HeroContent }) {
  return (
    <section className="pt-16 pb-20 md:pt-24 md:pb-24 px-6 bg-cream text-center">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-4xl md:text-6xl font-bold text-dark leading-tight mb-8">
          {content.h1}
        </h1>

        {content.leadParagraphs.map((paragraph, i) => (
          <p
            key={i}
            className="text-lg md:text-xl text-dark/70 leading-relaxed mb-4 last:mb-0"
          >
            {paragraph}
          </p>
        ))}

        <div className="mt-10">
          <Link
            href="/signup"
            className="inline-block bg-sage text-cream font-bold text-base px-8 py-4 rounded-full hover:bg-sage-dark transition-colors shadow-sm"
          >
            {content.ctaLabel}
          </Link>
        </div>

        <p className="mt-5 text-sm font-semibold text-sage-dark">{content.trustLine}</p>
      </div>
    </section>
  );
}
