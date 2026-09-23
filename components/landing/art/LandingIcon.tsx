import type { ReactElement } from "react";

export type LandingIconName =
  | "fumes"
  | "mentalLoad"
  | "curricula"
  | "schoolClosed"
  | "math"
  | "reading"
  | "science"
  | "artPe"
  | "gradeAligned"
  | "original"
  | "peBreaks"
  | "answerKeys"
  | "limitless"
  | "printReady"
  | "sickDays"
  | "roadTrips"
  | "funFridays";

const ICONS: Record<LandingIconName, ReactElement> = {
  // Running on fumes
  fumes: (
    <g transform="translate(24 24) scale(1.276) translate(-24.75 -23.5)"><path className="fill-coral-light stroke-dark" d="M12 19h18v12a7 7 0 0 1-7 7h-4a7 7 0 0 1-7-7z" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <path className="stroke-dark" d="M30 22h3a4.5 4.5 0 0 1 0 9h-3" fill="none" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <path className="stroke-dark" d="M18 14c-1.5-2 1.5-3 0-5 M24 14c-1.5-2 1.5-3 0-5" fill="none" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </g>
  ),
  // Mental load
  mentalLoad: (
    <g transform="translate(24 24) scale(1.276) translate(-24.5 -21.69)"><path className="stroke-dark" d="M10 32c2-10 10-16 14-12s-6 10-2 12 12-4 10-11-12-6-8 1 10 8 12 2" fill="none" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="fill-honey" cx="36" cy="14" r="3" />
      </g>
  ),
  // Between curricula
  curricula: (
    <g transform="translate(24 24) scale(1.213) translate(-22.75 -24.5)"><path className="stroke-dark" d="M10 18h24 M28 12l6 6-6 6" fill="none" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <path className="stroke-dark" d="M38 31H14 M20 25l-6 6 6 6" fill="none" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="fill-coral" cx="10" cy="18" r="2.5" />
      </g>
  ),
  // School's closed
  schoolClosed: (
    <g transform="translate(24 24) scale(1.088) translate(-26.0 -22.0)"><path className="fill-coral-light stroke-dark" d="M9 38V22l13-9 13 9v16z" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <path className="stroke-dark" d="M18 38v-8h8v8" fill="none" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <path className="stroke-sage" d="M38 6v10 M33 11h10 M34.5 7.5l7 7 M41.5 7.5l-7 7" fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
      </g>
  ),
  // Math
  math: (
    <g transform="translate(24 24) scale(1.156) translate(-24.0 -24.0)"><path className="fill-honey-light stroke-dark" d="M8 31L31 8l9 9-23 23z" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <path className="stroke-dark" d="M14 25l4 4 M19 20l3 3 M24 15l4 4 M29 10l3 3" fill="none" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </g>
  ),
  // Reading
  reading: (
    <g transform="translate(24 24) scale(1.321) translate(-24.0 -24.8)"><path className="fill-white stroke-dark" d="M24 15c-4-3-10-3-14-1v22c4-2 10-2 14 1 4-3 10-3 14-1V14c-4-2-10-2-14 1z" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <path className="stroke-dark" d="M24 15v22" fill="none" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <path className="stroke-honey-dark" d="M14 20h6 M14 25h6 M28 20h6" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
      </g>
  ),
  // Science
  science: (
    <g transform="translate(24 24) scale(1.321) translate(-25.0 -25.0)"><circle className="fill-white stroke-dark" cx="21" cy="21" r="10" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <path className="stroke-dark" d="M28.5 28.5L39 39" fill="none" strokeWidth="4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <path className="stroke-honey-dark" d="M16 19a6 6 0 0 1 5-4" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" fill="none" />
      </g>
  ),
  // Art + PE
  artPe: (
    <g transform="translate(24 24) scale(1.321) translate(-25.0 -23.0)"><path className="fill-coral stroke-dark" d="M11 37l4-11 17-17 7 7-17 17z" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <path className="fill-paper stroke-dark" d="M11 37l4-11 7 7z" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <path className="stroke-dark" d="M28 13l7 7" fill="none" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </g>
  ),
  // Grade aligned
  gradeAligned: (
    <g transform="translate(24 24) scale(1.233) translate(-24.0 -24.0)"><circle className="fill-white stroke-dark" cx="24" cy="24" r="15" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="fill-coral-light stroke-dark" cx="24" cy="24" r="9" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="fill-dark" cx="24" cy="24" r="3" />
      </g>
  ),
  // Original every time
  original: (
    <g transform="translate(24 24) scale(1.088) translate(-24.0 -24.0)"><path className="fill-honey-light stroke-dark" d="M24 7l4 12 12 5-12 5-4 12-4-12-12-5 12-5z" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </g>
  ),
  // PE breaks
  peBreaks: (
    <g transform="translate(24 24) scale(1.156) translate(-23.0 -25.5)"><path className="fill-sage-light stroke-dark" d="M7 30c0-5 3-11 5-13h8l2 5 10 3c4 1 7 3 7 7v2H7z" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <path className="stroke-dark" d="M7 34h32" fill="none" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <path className="stroke-dark" d="M17 21l3 2 M20 18l3 2" fill="none" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </g>
  ),
  // Answer keys
  answerKeys: (
    <g transform="translate(24 24) scale(1.233) translate(-24.0 -24.0)"><rect className="fill-sage-light stroke-dark" x="9" y="9" width="30" height="30" rx="9" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <path className="stroke-white" d="M17 24l5 5 10-11" fill="none" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </g>
  ),
  // Limitless themes
  limitless: (
    <g transform="translate(24 24) scale(1.088) translate(-24.0 -19.25)"><path className="stroke-dark" d="M24 24c-4-5-7-7-10-7a7 7 0 0 0 0 14c3 0 6-2 10-7s7-7 10-7a7 7 0 0 1 0 14c-3 0-6-2-10-7z" fill="none" strokeWidth="2.6" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="fill-honey" cx="37" cy="10" r="2.5" />
      </g>
  ),
  // Print ready
  printReady: (
    <g transform="translate(24 24) scale(1.156) translate(-24.0 -24.0)"><rect className="fill-white stroke-dark" x="15" y="8" width="18" height="11" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <rect className="fill-sage-light stroke-dark" x="8" y="18" width="32" height="14" rx="4" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <path className="fill-white stroke-dark" d="M15 28h18v12H15z" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <path className="stroke-dark" d="M19 33h10 M19 37h7" fill="none" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="fill-honey" cx="34" cy="23" r="1.8" />
      </g>
  ),
  // Sick days
  sickDays: (
    <g transform="translate(24 24) scale(1.028) translate(-24.0 -26.0)"><path className="fill-white stroke-dark" d="M9 19c0-4 4-5 9-5s9 1 9 5-4 5-9 5-9-1-9-5z" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <path className="fill-coral-light stroke-dark" d="M6 27h36v11H6z" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <path className="stroke-dark" d="M6 32c6-3 12 3 18 0s12 3 18 0" fill="none" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </g>
  ),
  // Road trips
  roadTrips: (
    <g transform="translate(24 24) scale(1.156) translate(-24.0 -26.0)"><path className="fill-honey-light stroke-dark" d="M8 31v-6l5-9h22l5 9v6z" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <path className="stroke-dark" d="M15 16l-2 9h22l-2-9" fill="none" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="fill-dark" cx="15" cy="32" r="4" />
      <circle className="fill-dark" cx="33" cy="32" r="4" />
      </g>
  ),
  // Fun Fridays
  funFridays: (
    <g transform="translate(24 24) scale(1.165) translate(-24.0 -25.12)"><path className="fill-honey-light stroke-dark" d="M9 13c10-5 20-5 30 0L24 41z" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <path className="stroke-honey-dark" d="M9 13c10-5 20-5 30 0" fill="none" strokeWidth="4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="fill-coral" cx="21" cy="21" r="2.8" />
      <circle className="fill-coral" cx="28" cy="27" r="2.8" />
      <circle className="fill-coral" cx="23" cy="32" r="2.2" />
      </g>
  ),
};

interface Props {
  name: LandingIconName;
  className?: string;
}

/**
 * Small drawn icons for the homepage, replacing emoji where they acted as pictures.
 * Same outline weight and colors as the homepage illustrations. Drawn on a 48x48 grid, each scaled to fill the same 37 unit box, with strokes that
 * stay the same weight at any scale;
 * the caller sizes it and puts it in a tinted circle.
 * Decorative only: the card title next to it carries the meaning, so screen readers skip it.
 */
export default function LandingIcon({ name, className = "" }: Props) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      {ICONS[name]}
    </svg>
  );
}
