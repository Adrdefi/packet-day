import SituationCard from "@/components/landing/SituationCard";
import { SITUATIONS } from "@/lib/situations/registry";

export default function BrowseBySituation() {
  return (
    <section className="py-24 px-6 bg-paper">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block bg-coral/15 text-coral-dark text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
            Pick Your Day
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-dark mb-3 leading-tight">
            One generator. Every kind of day.
          </h2>
          <p className="text-dark/70 text-lg max-w-xl mx-auto">
            Pick the day. We&apos;ll generate the packet around your kid.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SITUATIONS.map((situation) => (
            <SituationCard key={situation.slug} situation={situation} />
          ))}
        </div>
      </div>
    </section>
  );
}
