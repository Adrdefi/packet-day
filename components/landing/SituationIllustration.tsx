/**
 * Decorative stand-in for the mockup's dinosaur emoji: stacked printed
 * packet pages with a small sparkle and leaf accent, built from basic
 * shapes in brand colors. Purely decorative — hidden from screen readers.
 */
export default function SituationIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="40" y="70" width="110" height="90" rx="10" className="fill-cream-dark stroke-border" />
      <rect x="30" y="55" width="110" height="90" rx="10" className="fill-paper stroke-border" />
      <rect x="20" y="40" width="110" height="90" rx="10" className="fill-white stroke-border" />

      <rect x="36" y="58" width="70" height="6" rx="3" className="fill-sage-light" />
      <rect x="36" y="72" width="88" height="6" rx="3" className="fill-border" />
      <rect x="36" y="86" width="60" height="6" rx="3" className="fill-border" />
      <rect x="36" y="100" width="78" height="6" rx="3" className="fill-border" />

      <path
        d="M162 40 L166 50 L176 54 L166 58 L162 68 L158 58 L148 54 L158 50 Z"
        className="fill-honey"
      />
      <path
        d="M40 30 C55 20 65 30 60 45 C45 45 35 40 40 30 Z"
        className="fill-sage"
      />
    </svg>
  );
}
