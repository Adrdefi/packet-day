"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import type { SamplePage } from "@/lib/sample/content";
import PageLightbox, { type LightboxPage } from "./PageLightbox";

interface Props {
  pages: SamplePage[];
  width: number;
  height: number;
}

/**
 * Swipe through every page of the sample packet. Plain CSS scroll snap, so a
 * touch swipe is the browser's own scrolling; the buttons, arrow keys and
 * counter just read and move that scroll position.
 */
export default function SampleFlipbook({ pages, width, height }: Props) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [current, setCurrent] = useState(0);
  const [openPage, setOpenPage] = useState<LightboxPage | null>(null);
  const last = pages.length - 1;

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      const target = Math.max(0, Math.min(last, index));
      track.scrollTo({ left: target * track.clientWidth, behavior: "smooth" });
    },
    [last],
  );

  function onScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    if (index !== current) setCurrent(Math.max(0, Math.min(last, index)));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(current + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(current - 1);
    }
  }

  const buttonClass =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-white text-xl font-bold text-sage shadow-sm transition-colors hover:border-sage disabled:opacity-40 disabled:hover:border-border";

  return (
    <div className="mx-auto max-w-xl" role="region" aria-roledescription="carousel" aria-label="Kai's sample packet, every page">
      <ul
        ref={trackRef}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        tabIndex={0}
        aria-label="Packet pages. Use the left and right arrow keys to turn pages."
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {pages.map((page, i) => (
          <li
            key={page.src}
            className="w-full shrink-0 snap-center snap-always px-1"
            aria-roledescription="slide"
            aria-label={i === last ? "Parent answer key" : `Page ${i + 1} of ${pages.length}`}
          >
            <figure>
              <button
                type="button"
                onClick={() => setOpenPage({ src: page.src, alt: page.alt, label: i === last ? "Parent answer key" : page.label })}
                className="relative block w-full cursor-zoom-in overflow-hidden rounded-lg border border-dark/10 bg-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
              >
                <span className="absolute left-3 top-3 rounded-full bg-cream/95 px-3 py-1 text-xs font-bold text-sage-dark shadow-sm">
                  {i === last ? "Parent answer key" : page.label}
                </span>
                <Image
                  src={page.src}
                  alt={page.alt}
                  width={width}
                  height={height}
                  sizes="(min-width: 640px) 576px, 100vw"
                  priority={i === 0}
                  loading={i === 0 ? "eager" : "lazy"}
                  className="h-auto w-full"
                />
                <span className="sr-only">, opens full size</span>
              </button>
              <figcaption className="mt-3 min-h-[3rem] text-center text-sm leading-snug text-dark/70">
                {page.caption}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between gap-4">
        <button type="button" onClick={() => goTo(current - 1)} disabled={current === 0} className={buttonClass} aria-label="Previous page">
          <span aria-hidden="true">←</span>
        </button>
        <p className="text-sm font-semibold text-dark" aria-live="polite">
          Page {current + 1} of {pages.length}
          {current === last && <span className="block text-xs font-bold text-coral">Parent answer key</span>}
        </p>
        <button type="button" onClick={() => goTo(current + 1)} disabled={current === last} className={buttonClass} aria-label="Next page">
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-dark/60">Tap a page to see it full size.</p>
      <PageLightbox page={openPage} width={width} height={height} onClose={() => setOpenPage(null)} />
    </div>
  );
}
