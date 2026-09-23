interface Props {
  className?: string;
}

/**
 * Pricing illustration: packets for three grades tied to one price tag.
 * Decorative only: the surrounding text carries the meaning, so screen readers skip it.
 */
export default function OnePriceArt({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 720 330" className={className} aria-hidden="true" focusable="false">
      <ellipse className="fill-dark" cx="360" cy="312" rx="280" ry="14" opacity="0.07" />
      <path className="stroke-dark" d="M360 78 C 300 120, 230 140, 200 158" fill="none" strokeWidth="2.5" strokeLinecap="round" />
      <path className="stroke-dark" d="M360 78 C 360 110, 360 120, 360 122" fill="none" strokeWidth="2.5" strokeLinecap="round" />
      <path className="stroke-dark" d="M360 78 C 430 118, 500 124, 536 104" fill="none" strokeWidth="2.5" strokeLinecap="round" />
      <rect className="fill-white stroke-dark" x="140" y="158" width="120" height="150" rx="12" strokeWidth="3" />
      <rect className="fill-coral" x="150" y="168" width="100" height="32" rx="8" />
      <text className="font-display fill-white" x="200" y="190" textAnchor="middle" fontWeight="900" fontSize="17">K</text>
      <circle className="fill-coral-light" cx="200" cy="228" r="14" />
      <rect className="fill-dark" x="158" y="256" width="84" height="6" rx="3" opacity="0.35" />
      <rect className="fill-dark" x="158" y="272" width="60" height="6" rx="3" opacity="0.35" />
      <rect className="fill-white stroke-dark" x="290" y="122" width="140" height="186" rx="12" strokeWidth="3" />
      <rect className="fill-honey-dark" x="300" y="132" width="120" height="34" rx="8" />
      <text className="font-display fill-white" x="360" y="155" textAnchor="middle" fontWeight="900" fontSize="17">Grade 3</text>
      <rect className="fill-dark" x="308" y="184" width="104" height="6" rx="3" opacity="0.35" />
      <rect className="fill-dark" x="308" y="200" width="80" height="6" rx="3" opacity="0.35" />
      <rect className="stroke-honey" x="308" y="222" width="16" height="16" rx="4" fill="none" strokeWidth="2.5" />
      <rect className="fill-dark" x="332" y="227" width="70" height="6" rx="3" opacity="0.3" />
      <rect className="stroke-honey" x="308" y="248" width="16" height="16" rx="4" fill="none" strokeWidth="2.5" />
      <rect className="fill-dark" x="332" y="253" width="56" height="6" rx="3" opacity="0.3" />
      <rect className="fill-white stroke-dark" x="460" y="104" width="160" height="204" rx="12" strokeWidth="3" />
      <rect className="fill-sage" x="470" y="114" width="140" height="36" rx="8" />
      <text className="font-display fill-white" x="540" y="138" textAnchor="middle" fontWeight="900" fontSize="17">Grade 6</text>
      <rect className="fill-dark" x="478" y="168" width="122" height="6" rx="3" opacity="0.35" />
      <rect className="fill-dark" x="478" y="184" width="110" height="6" rx="3" opacity="0.35" />
      <rect className="fill-dark" x="478" y="200" width="90" height="6" rx="3" opacity="0.35" />
      <rect className="stroke-sage-light" x="478" y="222" width="122" height="54" rx="8" fill="none" strokeWidth="2.5" />
      <g transform="rotate(-6 360 50)">
      <path className="fill-honey stroke-dark" d="M296 20 H 424 A 10 10 0 0 1 434 30 V 70 A 10 10 0 0 1 424 80 H 296 L 272 50 Z" strokeWidth="3" strokeLinejoin="round" />
      <circle className="fill-paper stroke-dark" cx="292" cy="50" r="6" strokeWidth="2.5" />
      <text className="font-display fill-dark" x="364" y="59" textAnchor="middle" fontWeight="900" fontSize="24">One price</text>
      </g>
      <path className="fill-coral" d="M600 40 l5 13 13 5 -13 5 -5 13 -5 -13 -13 -5 13 -5 z" />
      <path className="fill-sage-light" d="M120 100 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 z" />
    </svg>
  );
}
