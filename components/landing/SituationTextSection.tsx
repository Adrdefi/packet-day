import type { ReactNode } from "react";
import type { Paragraph, TextSectionContent } from "@/lib/situations/types";

function renderParagraph(paragraph: Paragraph, key: number) {
  if (typeof paragraph === "string") {
    return (
      <p key={key} className="text-dark/70 leading-relaxed mb-5 last:mb-0">
        {paragraph}
      </p>
    );
  }
  return (
    <p key={key} className="text-dark/70 leading-relaxed mb-5 last:mb-0">
      {paragraph.map((segment, i) =>
        segment.italic ? (
          <em key={i}>{segment.text}</em>
        ) : (
          <span key={i}>{segment.text}</span>
        )
      )}
    </p>
  );
}

interface Props {
  content: TextSectionContent;
  /** Optional decorative element — renders as a two-column layout when present. */
  illustration?: ReactNode;
  bgClassName?: string;
}

export default function SituationTextSection({
  content,
  illustration,
  bgClassName = "bg-paper",
}: Props) {
  return (
    <section className={`py-24 px-6 ${bgClassName}`}>
      <div
        className={
          illustration
            ? "max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-12 items-center"
            : "max-w-3xl mx-auto"
        }
      >
        <div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-dark mb-6 leading-tight">
            {content.heading}
          </h2>
          {content.paragraphs.map((paragraph, i) => renderParagraph(paragraph, i))}
        </div>
        {illustration && <div className="flex justify-center">{illustration}</div>}
      </div>
    </section>
  );
}
