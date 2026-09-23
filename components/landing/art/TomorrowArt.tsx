interface Props {
  className?: string;
}

/**
 * Final CTA illustration: an upright, steaming mug next to tomorrow's finished packet. Drawn for the sage background.
 * Decorative only: the surrounding text carries the meaning, so screen readers skip it.
 */
export default function TomorrowArt({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 560 420" className={className} aria-hidden="true" focusable="false">
      <ellipse className="fill-dark" cx="280" cy="380" rx="260" ry="26" opacity="0.18" />
      <path className="fill-honey-dark stroke-dark" d="M20 330 H 540 L 520 370 H 40 Z" strokeWidth="3" strokeLinejoin="round" />
      <g transform="rotate(-6 250 230)">
      <rect className="fill-white stroke-dark" x="170" y="100" width="170" height="226" rx="12" strokeWidth="3" />
      <rect className="stroke-sage-light" x="182" y="112" width="146" height="202" rx="8" fill="none" strokeWidth="2" />
      <text className="font-display fill-dark" x="255" y="146" textAnchor="middle" fontWeight="900" fontSize="20">Tomorrow</text>
      <g transform="translate(200 162) scale(0.92)">
      <ellipse className="fill-dark" cx="60" cy="113" rx="34" ry="6" opacity="0.12" />
      <path className="stroke-sage" d="M90 92 C 110 94, 116 72, 102 64" fill="none" strokeWidth="10" strokeLinecap="round" />
      <ellipse className="fill-sage stroke-dark" cx="44" cy="106" rx="11" ry="6" strokeWidth="2.5" />
      <ellipse className="fill-sage stroke-dark" cx="76" cy="106" rx="11" ry="6" strokeWidth="2.5" />
      <ellipse className="fill-sage-light stroke-dark" cx="60" cy="72" rx="36" ry="35" strokeWidth="3" />
      <ellipse className="fill-honey-light" cx="60" cy="85" rx="22" ry="18" />
      <circle className="fill-honey" cx="33" cy="86" r="3" />
      <circle className="fill-honey" cx="88" cy="82" r="3" />
      <circle className="fill-honey" cx="84" cy="93" r="2" />
      <circle className="fill-white stroke-dark" cx="46" cy="52" r="12" strokeWidth="2.5" />
      <circle className="fill-white stroke-dark" cx="74" cy="52" r="12" strokeWidth="2.5" />
      <circle className="fill-dark" cx="48" cy="54" r="5.5" />
      <circle className="fill-dark" cx="76" cy="54" r="5.5" />
      <circle className="fill-white" cx="50" cy="51.5" r="1.8" />
      <circle className="fill-white" cx="78" cy="51.5" r="1.8" />
      <ellipse className="fill-coral" cx="37" cy="68" rx="6" ry="4" opacity="0.7" />
      <ellipse className="fill-coral" cx="83" cy="68" rx="6" ry="4" opacity="0.7" />
      <path className="stroke-dark" d="M52 68 Q 60 75 68 68" fill="none" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <rect className="fill-sage" x="198" y="282" width="114" height="22" rx="11" />
      </g>
      <g transform="rotate(-14 110 310)">
      <rect className="fill-coral stroke-dark" x="60" y="300" width="96" height="14" rx="3" strokeWidth="2.5" />
      <rect className="fill-honey stroke-dark" x="72" y="282" width="96" height="14" rx="3" strokeWidth="2.5" />
      </g>
      <circle className="fill-coral stroke-dark" cx="84" cy="236" r="30" strokeWidth="3" />
      <path className="stroke-dark" d="M84 206 C 86 198, 92 194, 98 194" fill="none" strokeWidth="3" strokeLinecap="round" />
      <path className="fill-sage-light/50 stroke-dark" d="M88 202 C 98 192, 110 198, 104 206 C 98 210, 92 206, 88 202 Z" strokeWidth="2.5" />
      <rect className="fill-coral stroke-dark" x="390" y="232" width="84" height="96" rx="14" strokeWidth="3" />
      <path className="stroke-dark" d="M474 256 C 506 256, 506 304, 474 304" fill="none" strokeWidth="3" />
      <rect className="fill-coral-light stroke-dark" x="390" y="232" width="84" height="16" rx="8" strokeWidth="3" />
      <path className="stroke-paper" d="M414 216 c -8 -14, 8 -20, 0 -36 M436 216 c -8 -14, 8 -20, 0 -36 M458 216 c -8 -14, 8 -20, 0 -36" fill="none" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <path className="fill-honey-light" transform="translate(500 90) scale(1.2)" d="M0 -15 L4 -4 L15 0 L4 4 L0 15 L-4 4 L-15 0 L-4 -4 Z" />
      <path className="fill-paper" transform="translate(120 90) scale(0.9)" d="M0 -15 L4 -4 L15 0 L4 4 L0 15 L-4 4 L-15 0 L-4 -4 Z" />
      <path className="fill-honey-light" transform="translate(380 50) scale(0.6)" d="M0 -15 L4 -4 L15 0 L4 4 L0 15 L-4 4 L-15 0 L-4 -4 Z" />
    </svg>
  );
}
