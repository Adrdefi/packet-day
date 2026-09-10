import type { ChecklistContent } from "@/lib/situations/types";

interface Props {
  content: ChecklistContent;
  bgClassName?: string;
}

export default function SituationChecklist({ content, bgClassName = "bg-white" }: Props) {
  return (
    <section className={`py-24 px-6 ${bgClassName}`}>
      <div className="max-w-3xl mx-auto">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-dark text-center mb-10 leading-tight">
          {content.heading}
          {content.headingEmoji && (
            <span className="ml-2" aria-hidden="true">
              {content.headingEmoji}
            </span>
          )}
        </h2>
        <div className="bg-cream rounded-2xl border border-border p-8">
          <ul className="divide-y divide-border">
            {content.items.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 py-4 text-dark/80 text-base leading-relaxed"
              >
                <span className="text-sage font-bold mt-0.5 shrink-0" aria-hidden="true">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
