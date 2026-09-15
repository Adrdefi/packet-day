import SituationCharacterCard from "./SituationCharacterCard";
import type { ComparisonContent } from "@/lib/situations/section-types";

interface Props {
  content: ComparisonContent;
  bgClassName?: string;
}

/** Eyebrow, heading, lead line, two comparison columns (left plain, right
 * sage-filled), an optional character card, and an optional closing line.
 * Data-driven — no situation-specific text lives in this component. */
export default function SituationComparison({ content, bgClassName = "bg-cream" }: Props) {
  return (
    <section className={`py-24 px-6 ${bgClassName}`}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block bg-coral/15 text-coral-dark text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
            {content.eyebrow}
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-dark mb-6 leading-tight">
            {content.heading}
            {content.headingEmoji && (
              <span className="ml-2" aria-hidden="true">
                {content.headingEmoji}
              </span>
            )}
          </h2>
          <p className="text-dark/70 text-lg leading-relaxed max-w-2xl mx-auto">
            {content.leadParagraph}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <div className="bg-paper rounded-2xl border border-border p-8">
            <h3 className="font-display text-lg font-bold text-dark mb-5">
              {content.leftColumn.heading}
            </h3>
            <ul className="space-y-3">
              {content.leftColumn.items.map((item) => (
                <li key={item} className="text-dark/80 text-base leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-sage rounded-2xl p-8">
            <h3 className="font-display text-lg font-bold text-cream mb-5">
              {content.rightColumn.heading}
            </h3>
            <ul className="space-y-3">
              {content.rightColumn.items.map((item) => (
                <li key={item} className="text-cream/90 text-base leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {content.characterCard && (
          <div className="mb-10">
            <SituationCharacterCard content={content.characterCard} />
          </div>
        )}

        {content.closingParagraph && (
          <p className="text-dark/70 text-base leading-relaxed text-center max-w-2xl mx-auto">
            {content.closingParagraph}
          </p>
        )}
      </div>
    </section>
  );
}
