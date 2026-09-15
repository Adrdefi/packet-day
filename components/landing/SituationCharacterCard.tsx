import Image from "next/image";
import type { Paragraph } from "@/lib/situations/types";
import type { CharacterCardContent } from "@/lib/situations/section-types";

// Mirrors SituationTextSection's own renderParagraph — duplicated rather
// than imported since that function isn't exported and this chunk's rules
// don't allow editing that file to export it.
function renderBody(body: Paragraph) {
  if (typeof body === "string") return body;
  return body.map((segment, i) =>
    segment.italic ? <em key={i}>{segment.text}</em> : <span key={i}>{segment.text}</span>
  );
}

interface Props {
  content: CharacterCardContent;
}

/** The "meet your kid's character" callout inside SituationComparison —
 * its own component since SituationComparison also renders fine without it
 * (characterCard is optional there). Data-driven, no situation text hardcoded. */
export default function SituationCharacterCard({ content }: Props) {
  return (
    <div className="bg-paper rounded-2xl border-2 border-dashed border-coral-light p-8 md:p-10">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div
            className={`rounded-full flex items-center justify-center overflow-hidden ${
              content.image
                ? "w-[180px] h-[180px] md:w-[220px] md:h-[220px] bg-white p-4 md:p-5"
                : "w-20 h-20 bg-coral/15"
            }`}
          >
            {content.image ? (
              <Image
                src={content.image.src}
                alt={content.image.alt}
                width={content.image.width}
                height={content.image.height}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-4xl" aria-hidden="true">
                {content.avatarEmoji}
              </span>
            )}
          </div>
          {content.caption && (
            <p
              className={`text-xs text-muted text-center leading-snug ${
                content.image ? "max-w-[180px] md:max-w-[220px]" : "max-w-[9rem]"
              }`}
            >
              {content.caption}
            </p>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="inline-block bg-coral/15 text-coral-dark text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-3">
            {content.tag}
          </span>
          <h3 className="font-display text-xl font-bold text-dark mb-3">{content.title}</h3>
          <p className="text-dark/70 text-base leading-relaxed">{renderBody(content.body)}</p>
        </div>
      </div>
    </div>
  );
}
