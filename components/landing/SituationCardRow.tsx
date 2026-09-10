import SituationCard from "@/components/landing/SituationCard";
import type { SituationRegistryEntry } from "@/lib/situations/types";

interface Props {
  situations: SituationRegistryEntry[];
}

/**
 * Shared row layout for situation cards — used by both the homepage's
 * "Browse by situation" section and each situation page's cross-link strip.
 * A centered flex-wrap row with fixed card widths (not a grid) so a row
 * with fewer cards than fit centers itself instead of leaving empty
 * column slots or squeezing into a narrower wrapper.
 */
export default function SituationCardRow({ situations }: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-6">
      {situations.map((situation) => (
        <SituationCard
          key={situation.slug}
          situation={situation}
          className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]"
        />
      ))}
    </div>
  );
}
