interface Props {
  className?: string;
  /** Which situation's decorative illustration to render. Defaults to sick-day's. */
  variant?: "sick-day" | "road-trip";
}

/**
 * Decorative stand-in for each situation page's illustration slot — simple
 * shapes in brand colors, purely decorative and hidden from screen readers.
 */
export default function SituationIllustration({ className = "", variant = "sick-day" }: Props) {
  if (variant === "road-trip") {
    return (
      <svg
        viewBox="0 0 200 200"
        className={className}
        aria-hidden="true"
        focusable="false"
      >
        {/* Winding road */}
        <path
          d="M20 190 C 50 140, 10 110, 50 80 C 90 50, 50 30, 90 10"
          className="stroke-border"
          strokeWidth="26"
          fill="none"
        />
        <path
          d="M20 190 C 50 140, 10 110, 50 80 C 90 50, 50 30, 90 10"
          className="stroke-white"
          strokeWidth="4"
          strokeDasharray="10 10"
          fill="none"
        />

        {/* Printed packet page, propped beside the road */}
        <rect x="110" y="90" width="72" height="90" rx="8" className="fill-white stroke-border" />
        <rect x="122" y="106" width="48" height="6" rx="3" className="fill-sage-light" />
        <rect x="122" y="120" width="40" height="6" rx="3" className="fill-border" />
        <rect x="122" y="134" width="46" height="6" rx="3" className="fill-border" />
        <rect x="122" y="148" width="30" height="6" rx="3" className="fill-border" />

        {/* Sparkle accent */}
        <path
          d="M170 50 L174 60 L184 64 L174 68 L170 78 L166 68 L156 64 L166 60 Z"
          className="fill-honey"
        />
        {/* Leaf accent */}
        <path
          d="M120 190 C 135 180, 145 190, 140 205 C 125 205, 115 200, 120 190 Z"
          className="fill-sage"
        />
      </svg>
    );
  }

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
