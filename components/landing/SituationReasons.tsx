import type { ReasonsContent } from "@/lib/situations/section-types";

interface Props {
  content: ReasonsContent;
  bgClassName?: string;
}

/** Heading, optional intro, a row of reason cards, optional closing line.
 * Data-driven — no situation-specific text lives in this component. */
export default function SituationReasons({ content, bgClassName = "bg-paper" }: Props) {
  return (
    <section className={`py-24 px-6 ${bgClassName}`}>
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-dark mb-4 leading-tight">
          {content.heading}
          {content.headingEmoji && (
            <span className="ml-2" aria-hidden="true">
              {content.headingEmoji}
            </span>
          )}
        </h2>

        {content.intro && (
          <p className="text-dark/70 text-lg leading-relaxed max-w-2xl mx-auto mb-12">
            {content.intro}
          </p>
        )}

        <div className="grid md:grid-cols-3 gap-6 text-left">
          {content.cards.map((card) => (
            <div
              key={card.title}
              className="bg-cream rounded-2xl border border-border p-8 shadow-sm"
            >
              <h3 className="font-display text-lg font-bold text-dark mb-3">{card.title}</h3>
              <p className="text-dark/70 text-base leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>

        {content.closingParagraph && (
          <p className="text-dark/70 text-base leading-relaxed max-w-2xl mx-auto mt-12">
            {content.closingParagraph}
          </p>
        )}
      </div>
    </section>
  );
}
