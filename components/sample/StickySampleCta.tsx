"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Props {
  /** Element id of the hero. The bar shows once it has scrolled away. */
  heroId: string;
  /** Element id of the closing CTA. The bar hides once it is in view, so there are never two. */
  endId: string;
  href: string;
  label: string;
}

/** Mobile only bottom bar with one signup button. */
export default function StickySampleCta({ heroId, endId, href, label }: Props) {
  const [heroGone, setHeroGone] = useState(false);
  const [endReached, setEndReached] = useState(false);

  useEffect(() => {
    const hero = document.getElementById(heroId);
    const end = document.getElementById(endId);
    if (!hero || !end) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        // "Above the viewport" counts as passed; below it doesn't.
        const passedOrVisible = entry.isIntersecting || entry.boundingClientRect.top < 0;
        if (entry.target === hero) setHeroGone(!entry.isIntersecting && entry.boundingClientRect.top < 0);
        if (entry.target === end) setEndReached(passedOrVisible);
      }
    });
    observer.observe(hero);
    observer.observe(end);
    return () => observer.disconnect();
  }, [heroId, endId]);

  const show = heroGone && !endReached;

  return (
    <div
      aria-hidden={!show}
      inert={!show}
      data-state={show ? "shown" : "hidden"}
      className={[
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-cream/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(26,26,46,0.08)] backdrop-blur transition-transform duration-200 md:hidden",
        show ? "translate-y-0" : "translate-y-full",
      ].join(" ")}
    >
      <Link
        href={href}
        className="block w-full rounded-full bg-sage px-6 py-3.5 text-center text-base font-bold text-cream shadow-sm transition-colors hover:bg-sage-dark"
      >
        {label}
      </Link>
    </div>
  );
}
