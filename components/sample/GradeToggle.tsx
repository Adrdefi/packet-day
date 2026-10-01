"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { GradeSample } from "@/lib/sample/content";
import PageLightbox, { type LightboxPage } from "./PageLightbox";

interface Props {
  samples: GradeSample[];
  defaultGrade: number;
  width: number;
  height: number;
}

/** Tabs that swap the math, reading and puzzle pages between three real packets on the same theme. */
export default function GradeToggle({ samples, defaultGrade, width, height }: Props) {
  const [grade, setGrade] = useState(defaultGrade);
  const [openPage, setOpenPage] = useState<LightboxPage | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const active = samples.find((sample) => sample.grade === grade) ?? samples[0];

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + samples.length) % samples.length;
    setGrade(samples[next].grade);
    tabRefs.current[next]?.focus();
  }

  return (
    <div>
      <div role="tablist" aria-label="Pick a grade" className="mx-auto mb-8 flex max-w-md rounded-full border border-border bg-white p-1">
        {samples.map((sample, i) => {
          const selected = sample.grade === active.grade;
          return (
            <button
              key={sample.grade}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`grade-tab-${sample.grade}`}
              aria-selected={selected}
              aria-controls="grade-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setGrade(sample.grade)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={[
                "flex-1 rounded-full px-4 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage",
                selected ? "bg-sage text-cream" : "text-dark/70 hover:text-sage",
              ].join(" ")}
            >
              Grade {sample.grade}
            </button>
          );
        })}
      </div>

      <div id="grade-panel" role="tabpanel" aria-labelledby={`grade-tab-${active.grade}`}>
        <p className="text-center text-sm font-semibold text-sage-dark">
          Made for a grade {active.grade} learner named {active.childName}
        </p>
        <p className="mt-1 text-center text-dark/70">{active.caption}</p>
        <p className="mt-1 mb-6 text-center text-xs text-dark/60">Guide: {active.character}</p>
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
          {[
            { label: "Math page", image: active.math },
            { label: "Reading page", image: active.reading },
            { label: "Puzzle page", image: active.puzzle },
          ].map(({ label, image }) => (
            <figure key={image.src} className="w-[75%] shrink-0 snap-center md:w-auto">
              <button
                type="button"
                onClick={() => setOpenPage({ src: image.src, alt: image.alt, label: `Grade ${active.grade} ${label.toLowerCase()}` })}
                className="block w-full cursor-zoom-in overflow-hidden rounded-lg border border-dark/10 bg-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={width}
                  height={height}
                  sizes="(min-width: 768px) 300px, 75vw"
                  loading="lazy"
                  className="h-auto w-full"
                />
                <span className="sr-only">, opens full size</span>
              </button>
              <figcaption className="mt-2 text-center text-xs font-semibold uppercase tracking-wide text-dark/60">{label}</figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-dark/60">
          <span className="md:hidden">Swipe for more pages →&nbsp; </span>Tap a page to see it full size.
        </p>
      </div>
      <PageLightbox page={openPage} width={width} height={height} onClose={() => setOpenPage(null)} />
    </div>
  );
}
