interface Props {
  step: 1 | 2 | 3;
  className?: string;
}

/**
 * How it works illustrations, one per step:
 * 1 = a kid's profile card, 2 = a packet being made, 3 = printer and inbox.
 * Decorative only: the step title and text carry the meaning, so screen readers skip it.
 */
export default function StepArt({ step, className = "" }: Props) {
  if (step === 1) {
    return (
      <svg viewBox="0 0 220 160" className={className} aria-hidden="true" focusable="false">
        <rect className="fill-paper stroke-dark" x="30" y="22" width="160" height="120" rx="16" strokeWidth="3" />
        <circle className="fill-coral-light stroke-dark" cx="72" cy="66" r="24" strokeWidth="3" />
        <path className="fill-dark" d="M50 60 C 54 38, 90 36, 95 58 C 84 50, 64 50, 50 60 Z" />
        <circle className="fill-dark" cx="64" cy="68" r="2.6" />
        <circle className="fill-dark" cx="80" cy="68" r="2.6" />
        <path className="stroke-dark" d="M65 77 Q 72 83 79 77" fill="none" strokeWidth="2.5" strokeLinecap="round" />
        <rect className="fill-dark" x="108" y="50" width="62" height="8" rx="4" opacity="0.75" />
        <rect className="fill-dark" x="108" y="66" width="40" height="7" rx="3.5" opacity="0.4" />
        <rect className="fill-honey" x="50" y="102" width="112" height="28" rx="14" />
        <text className="font-sans fill-dark" x="106" y="121" textAnchor="middle" fontWeight="800" fontSize="14">volcanoes!</text>
        <path className="fill-coral" d="M190 26 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 z" />
      </svg>
    );
  }

  if (step === 2) {
    return (
      <svg viewBox="0 0 220 160" className={className} aria-hidden="true" focusable="false">
        <g transform="rotate(-14 110 90)">
        <rect className="fill-sage-light/50 stroke-dark" x="66" y="30" width="88" height="112" rx="10" strokeWidth="3" />
        </g>
        <g transform="rotate(10 110 90)">
        <rect className="fill-honey-light stroke-dark" x="66" y="30" width="88" height="112" rx="10" strokeWidth="3" />
        </g>
        <rect className="fill-white stroke-dark" x="66" y="28" width="88" height="112" rx="10" strokeWidth="3" />
        <rect className="fill-sage-light" x="76" y="38" width="68" height="20" rx="6" />
        <rect className="fill-dark" x="78" y="70" width="52" height="6" rx="3" opacity="0.35" />
        <rect className="fill-dark" x="78" y="84" width="40" height="6" rx="3" opacity="0.35" />
        <rect className="fill-dark" x="78" y="98" width="56" height="6" rx="3" opacity="0.35" />
        <circle className="fill-sage stroke-dark" cx="174" cy="112" r="26" strokeWidth="3" />
        <rect className="fill-dark" x="168" y="80" width="12" height="7" rx="2" />
        <path className="stroke-white" d="M174 112 L 174 96 M 174 112 L 186 118" strokeWidth="3.5" strokeLinecap="round" />
        <path className="fill-honey" d="M36 40 l5 12 12 5 -12 5 -5 12 -5 -12 -12 -5 12 -5 z" />
        <path className="fill-coral" d="M50 112 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 220 160" className={className} aria-hidden="true" focusable="false">
      <rect className="fill-white stroke-dark" x="82" y="18" width="76" height="46" rx="4" strokeWidth="3" />
      <rect className="fill-sage-light stroke-dark" x="52" y="54" width="136" height="60" rx="14" strokeWidth="3" />
      <circle className="fill-honey" cx="168" cy="72" r="5" />
      <rect className="fill-dark" x="74" y="98" width="92" height="10" rx="3" />
      <path className="fill-white stroke-dark" d="M78 104 L 78 150 L 162 150 L 162 104" strokeWidth="3" strokeLinejoin="round" />
      <rect className="fill-dark" x="90" y="118" width="54" height="6" rx="3" opacity="0.35" />
      <rect className="fill-dark" x="90" y="132" width="40" height="6" rx="3" opacity="0.35" />
      <g transform="rotate(-10 34 70)">
      <rect className="fill-honey-light stroke-dark" x="6" y="52" width="56" height="38" rx="6" strokeWidth="3" />
      <path className="stroke-dark" d="M8 55 L 34 74 L 60 55" fill="none" strokeWidth="3" strokeLinejoin="round" />
      </g>
      <path className="fill-honey" d="M196 30 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 z" />
    </svg>
  );
}
