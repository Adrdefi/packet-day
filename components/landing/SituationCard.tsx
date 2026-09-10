import Link from "next/link";
import type { SituationRegistryEntry } from "@/lib/situations/types";

interface Props {
  situation: SituationRegistryEntry;
}

export default function SituationCard({ situation }: Props) {
  return (
    <Link
      href={situation.href}
      className="group block rounded-2xl bg-white border border-border p-8 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200"
    >
      <div className="text-4xl mb-4" aria-hidden="true">
        {situation.emoji}
      </div>
      <h3 className="font-display text-lg font-bold text-dark mb-2">
        {situation.label}
      </h3>
      <p className="text-dark/70 text-sm leading-relaxed mb-4">{situation.teaser}</p>
      <span className="text-sage font-bold text-sm group-hover:underline">
        See how it works →
      </span>
    </Link>
  );
}
