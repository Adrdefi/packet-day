import type { ChecklistContent } from "@/lib/situations/types";

export default function SituationChecklist({ content }: { content: ChecklistContent }) {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-dark text-center mb-10 leading-tight">
          {content.heading}
        </h2>
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
    </section>
  );
}
