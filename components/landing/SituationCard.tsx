import Link from "next/link";
import LandingIcon from "@/components/landing/art/LandingIcon";
import type { SituationRegistryEntry } from "@/lib/situations/types";

interface Props {
  situation: SituationRegistryEntry;
  className?: string;
}

export default function SituationCard({ situation, className = "" }: Props) {
  return (
    <Link
      href={situation.href}
      className={`group block rounded-2xl bg-white border border-border p-8 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 ${className}`}
    >
      {situation.icon ? (
        <div className="w-16 h-16 rounded-full bg-honey/15 flex items-center justify-center mb-4">
          <LandingIcon name={situation.icon} className="w-11 h-11" />
        </div>
      ) : (
        <div className="text-4xl mb-4" aria-hidden="true">
          {situation.emoji}
        </div>
      )}
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
