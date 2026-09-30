import Image from "next/image";
import Link from "next/link";
import { coverOf, gallerySrc } from "@/lib/unit-studies/loader";
import { gradePhrase, themeInSentence } from "@/lib/unit-studies/format";
import type { UnitStudyPage } from "@/lib/unit-studies/schema";

/**
 * Card linking to one unit study page: cover, theme, sample grade, one line.
 * Drafts get a "Draft" badge; they only exist outside production.
 */
export default function UnitStudyCard({ page }: { page: UnitStudyPage }) {
  const cover = coverOf(page);

  return (
    <Link
      href={`/unit-studies/${page.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
    >
      <div className="border-b border-border bg-cream-dark">
        <Image
          src={gallerySrc(page, cover)}
          alt={cover.alt}
          width={cover.width}
          height={cover.height}
          sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
          loading="lazy"
          className="aspect-[4/3] w-full object-cover object-top"
        />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-2 flex items-center gap-2">
          <h3 className="font-display text-lg font-bold text-dark">{page.theme.name}</h3>
          {page.status === "draft" && (
            <span className="rounded-full bg-honey/25 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-honey-dark">
              Draft
            </span>
          )}
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sage-dark">
          Sample made for {gradePhrase(page.sample.grade)}
        </p>
        <p className="mb-4 flex-1 text-sm leading-relaxed text-dark/70">{page.meta.description}</p>
        <span className="text-sm font-bold text-sage group-hover:underline">
          See the {themeInSentence(page)} packet →
        </span>
      </div>
    </Link>
  );
}
