interface Props {
  className?: string;
}

/**
 * Real Talk illustration: a spilled coffee and crumpled lesson plan turning into a finished packet.
 * Decorative only: the surrounding text carries the meaning, so screen readers skip it.
 */
export default function HardDayArt({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 720 390" className={className} aria-hidden="true" focusable="false">
      <ellipse className="fill-dark" cx="170" cy="340" rx="150" ry="16" opacity="0.07" />
      <ellipse className="fill-dark" cx="575" cy="345" rx="130" ry="14" opacity="0.07" />
      <g transform="rotate(-9 150 200)">
      <path className="fill-white stroke-dark" d="M70 120 L205 104 L222 150 L212 290 L150 300 L88 296 L60 236 L74 180 Z" strokeWidth="3" strokeLinejoin="round" />
      <path className="stroke-dark" d="M74 180 L140 196 L205 104 M140 196 L150 300 M140 196 L60 236" fill="none" strokeWidth="1.6" opacity="0.35" />
      <path className="stroke-dark" d="M92 142 L178 132 M96 162 L150 158" strokeWidth="5" strokeLinecap="round" opacity="0.45" />
      <path className="stroke-coral" d="M100 220 C118 200, 130 246, 150 222 S 182 214, 190 236 S 170 262, 150 252 S 118 268, 104 250" fill="none" strokeWidth="4" strokeLinecap="round" />
      </g>
      <path className="fill-honey-dark" d="M150 322 C 200 300, 260 310, 290 330 C 300 342, 250 352, 200 348 C 160 346, 128 340, 150 322 Z" opacity="0.45" />
      <g transform="rotate(78 222 290)">
      <rect className="fill-coral stroke-dark" x="186" y="252" width="74" height="84" rx="12" strokeWidth="3" />
      <path className="stroke-dark" d="M260 272 C 290 272, 290 316, 260 316" fill="none" strokeWidth="3" />
      <rect className="fill-coral-light stroke-dark" x="186" y="252" width="74" height="16" rx="8" strokeWidth="3" />
      </g>
      <g transform="translate(48 70) rotate(-24)">
      <rect className="fill-honey stroke-dark" x="0" y="0" width="58" height="12" rx="3" strokeWidth="2.5" />
      <path className="fill-paper stroke-dark" d="M58 0 L74 6 L58 12 Z" strokeWidth="2.5" strokeLinejoin="round" />
      </g>
      <g transform="translate(118 44) rotate(18)">
      <rect className="fill-honey stroke-dark" x="0" y="0" width="40" height="12" rx="3" strokeWidth="2.5" />
      <rect className="fill-coral-light stroke-dark" x="-12" y="0" width="14" height="12" rx="3" strokeWidth="2.5" />
      </g>
      <path className="stroke-dark" d="M230 60 c6 -14 20 -14 22 0 c2 14 18 14 22 0 c4 -14 20 -12 20 2" fill="none" strokeWidth="3" strokeLinecap="round" />
      <path className="stroke-honey" d="M290 206 C 330 118, 410 110, 452 176" fill="none" strokeWidth="9" strokeLinecap="round" strokeDasharray="2 18" />
      <path className="fill-honey stroke-honey" d="M436 156 L462 190 L420 190 Z" strokeWidth="6" strokeLinejoin="round" />
      <path className="fill-honey" d="M370 64 l6 16 16 6 -16 6 -6 16 -6 -16 -16 -6 16 -6 z" />
      <path className="fill-coral" d="M420 92 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 z" />
      <path className="fill-sage-light" d="M322 118 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z" />
      <g transform="rotate(7 575 210)">
      <rect className="fill-sage-light/50 stroke-dark" x="492" y="86" width="186" height="248" rx="14" strokeWidth="3" />
      </g>
      <g transform="rotate(-4 575 210)">
      <rect className="fill-honey-light stroke-dark" x="484" y="82" width="186" height="248" rx="14" strokeWidth="3" />
      </g>
      <rect className="fill-white stroke-dark" x="478" y="76" width="190" height="252" rx="14" strokeWidth="3" />
      <rect className="fill-sage-light" x="492" y="90" width="162" height="46" rx="10" />
      <text className="font-display fill-white" x="573" y="120" textAnchor="middle" fontWeight="900" fontSize="19">Volcano Day</text>
      <rect className="fill-dark" x="490" y="70" width="26" height="8" rx="3" transform="rotate(-30 503 74)" />
      <rect className="fill-dark" x="500" y="156" width="96" height="7" rx="3.5" opacity="0.35" />
      <rect className="fill-dark" x="500" y="174" width="80" height="7" rx="3.5" opacity="0.35" />
      <rect className="stroke-sage-light" x="500" y="200" width="18" height="18" rx="5" fill="none" strokeWidth="2.5" />
      <rect className="fill-dark" x="526" y="206" width="70" height="6" rx="3" opacity="0.3" />
      <rect className="stroke-sage-light" x="500" y="228" width="18" height="18" rx="5" fill="none" strokeWidth="2.5" />
      <rect className="fill-dark" x="526" y="234" width="60" height="6" rx="3" opacity="0.3" />
      <rect className="stroke-sage-light" x="500" y="256" width="18" height="18" rx="5" fill="none" strokeWidth="2.5" />
      <rect className="fill-dark" x="526" y="262" width="74" height="6" rx="3" opacity="0.3" />
      <circle className="fill-sage-light/50 stroke-dark" cx="632" cy="190" r="24" strokeWidth="2.5" />
      <circle className="fill-white stroke-dark" cx="622" cy="170" r="8" strokeWidth="2.5" />
      <circle className="fill-white stroke-dark" cx="642" cy="170" r="8" strokeWidth="2.5" />
      <circle className="fill-dark" cx="623" cy="171" r="3" />
      <circle className="fill-dark" cx="643" cy="171" r="3" />
      <path className="stroke-dark" d="M620 198 Q 632 208 644 198" fill="none" strokeWidth="2.5" strokeLinecap="round" />
      <circle className="fill-honey stroke-dark" cx="666" cy="306" r="28" strokeWidth="3" />
      <path className="stroke-white" d="M653 306 L662 316 L680 296" fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path className="fill-honey" d="M690 62 l5 13 13 5 -13 5 -5 13 -5 -13 -13 -5 13 -5 z" />
    </svg>
  );
}
