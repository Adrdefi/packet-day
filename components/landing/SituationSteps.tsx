import { Card } from "@/components/ui/Card";
import type { StepsContent } from "@/lib/situations/types";

interface Props {
  content: StepsContent;
  bgClassName?: string;
}

export default function SituationSteps({ content, bgClassName = "bg-cream" }: Props) {
  return (
    <section className={`py-24 px-6 ${bgClassName}`}>
      <div className="max-w-5xl mx-auto">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-dark text-center mb-14 leading-tight">
          {content.heading}
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {content.steps.map((step, i) => (
            <Card key={step.title} padding="lg" className="text-center md:text-left">
              <div className="w-12 h-12 rounded-full bg-sage text-cream font-display font-bold text-xl flex items-center justify-center mb-5 mx-auto md:mx-0">
                {i + 1}
              </div>
              <h3 className="font-display text-xl font-bold text-dark mb-3 flex items-center justify-center md:justify-start gap-2">
                {step.title}
                {step.emoji && (
                  <span className="text-lg" aria-hidden="true">
                    {step.emoji}
                  </span>
                )}
              </h3>
              <p className="text-dark/70 text-sm leading-relaxed">{step.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
