"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { GradeSample } from "@/lib/sample/content";

interface Props {
  samples: GradeSample[];
  defaultGrade: number;
  width: number;
  height: number;
}

/** Tabs that swap the math and reading pages between three real packets on the same theme. */
export default function GradeToggle({ samples, defaultGrade, width, height }: Props) {
  const [grade, setGrade] = useState(defaultGrade);
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
        <div className="grid grid-cols-2 gap-3 md:gap-6">
          {[
            { label: "Math page", image: active.math },
            { label: "Reading page", image: active.reading },
          ].map(({ label, image }) => (
            <figure key={image.src}>
              <div className="overflow-hidden rounded-lg border border-dark/10 bg-white shadow-sm">
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={width}
                  height={height}
                  sizes="(min-width: 1024px) 460px, 50vw"
                  loading="lazy"
                  className="h-auto w-full"
                />
              </div>
              <figcaption className="mt-2 text-center text-xs font-semibold uppercase tracking-wide text-dark/60">{label}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
