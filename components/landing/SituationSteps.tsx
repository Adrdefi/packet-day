import { Card } from "@/components/ui/Card";
import type { StepsContent } from "@/lib/situations/types";

export default function SituationSteps({ content }: { content: StepsContent }) {
  return (
    <section className="py-24 px-6 bg-cream">
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
              <h3 className="font-display text-xl font-bold text-dark mb-3">{step.title}</h3>
              <p className="text-dark/70 text-sm leading-relaxed">{step.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
