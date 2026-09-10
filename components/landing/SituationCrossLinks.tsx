import SituationCardRow from "@/components/landing/SituationCardRow";
import { SITUATIONS } from "@/lib/situations/registry";

interface Props {
  /** The current page's situation slug — excluded from the strip so a page never links to itself. */
  currentSlug: string;
  bgClassName?: string;
}

export default function SituationCrossLinks({ currentSlug, bgClassName = "bg-white" }: Props) {
  const others = SITUATIONS.filter((situation) => situation.slug !== currentSlug);

  if (others.length === 0) {
    return null;
  }

  return (
    <section className={`py-24 px-6 ${bgClassName}`}>
      <div className="max-w-5xl mx-auto">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-dark text-center mb-10 leading-tight">
          Packets for every kind of day
        </h2>

        <SituationCardRow situations={others} />
      </div>
    </section>
  );
}
