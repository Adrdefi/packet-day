interface Props {
  className?: string;
}

/**
 * Hero illustration: a finished "Volcano Day" packet made for Maya, with a name tag and a ready-in-minutes chip.
 * Decorative only: the surrounding text carries the meaning, so screen readers skip it.
 */
export default function HeroPacketArt({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 620 620" className={className} aria-hidden="true" focusable="false">
      <path className="fill-sage-light/50" d="M310 40 C 470 30, 600 150, 590 320 C 580 480, 470 590, 300 585 C 140 580, 30 470, 35 310 C 40 150, 160 48, 310 40 Z" opacity="0.45" />
      <ellipse className="fill-dark" cx="320" cy="566" rx="210" ry="16" opacity="0.08" />
      <g transform="rotate(-13 300 330)">
      <rect className="fill-white stroke-dark" x="130" y="130" width="290" height="380" rx="16" strokeWidth="3" />
      <rect className="fill-coral" x="150" y="150" width="120" height="20" rx="6" opacity="0.85" />
      <circle className="stroke-dark" cx="262" cy="262" r="16" fill="none" strokeWidth="3" />
      <circle className="stroke-dark" cx="292" cy="236" r="22" fill="none" strokeWidth="3" />
      <path className="stroke-dark" d="M170 460 L 245 300 L 275 318 L 305 300 L 380 460 Z" fill="none" strokeWidth="3" strokeLinejoin="round" />
      <path className="stroke-dark" d="M150 460 H 400" strokeWidth="3" />
      </g>
      <g transform="rotate(10 340 330)">
      <rect className="fill-white stroke-dark" x="205" y="115" width="290" height="380" rx="16" strokeWidth="3" />
      <circle className="fill-sage-light/50" cx="246" cy="200" r="13" />
      <text className="font-sans fill-dark" x="246" y="205" textAnchor="middle" fontWeight="800" fontSize="13">1</text>
      <text className="font-sans fill-dark" x="270" y="206" fontWeight="700" fontSize="20">7 + 5 = ____</text>
      <circle className="fill-sage-light/50" cx="246" cy="248" r="13" />
      <text className="font-sans fill-dark" x="246" y="253" textAnchor="middle" fontWeight="800" fontSize="13">2</text>
      <text className="font-sans fill-dark" x="270" y="254" fontWeight="700" fontSize="20">9 + 6 = ____</text>
      <circle className="fill-sage-light/50" cx="246" cy="296" r="13" />
      <text className="font-sans fill-dark" x="246" y="301" textAnchor="middle" fontWeight="800" fontSize="13">3</text>
      <text className="font-sans fill-dark" x="270" y="302" fontWeight="700" fontSize="20">8 + 7 = ____</text>
      </g>
      <g transform="rotate(-3 300 340)">
      <rect className="fill-white stroke-dark" x="150" y="130" width="300" height="410" rx="18" strokeWidth="3" />
      <rect className="stroke-sage-light" x="164" y="144" width="272" height="382" rx="12" fill="none" strokeWidth="2" />
      <text className="font-display fill-sage" x="300" y="194" textAnchor="middle" fontWeight="700" fontSize="22">Maya&apos;s</text>
      <text className="font-display fill-dark" x="300" y="234" textAnchor="middle" fontWeight="900" fontSize="38">Volcano Day</text>
      <rect className="fill-coral-light" x="187" y="250" width="70" height="24" rx="12" />
      <text className="font-sans fill-dark" x="222" y="267" textAnchor="middle" fontWeight="800" fontSize="12">Grade 2</text>
      <rect className="fill-honey-light" x="265" y="250" width="70" height="24" rx="12" />
      <text className="font-sans fill-dark" x="300" y="267" textAnchor="middle" fontWeight="800" fontSize="12">Science</text>
      <rect className="fill-sage-light/50" x="343" y="250" width="70" height="24" rx="12" />
      <text className="font-sans fill-dark" x="378" y="267" textAnchor="middle" fontWeight="800" fontSize="12">Art</text>
      <g transform="translate(216 284) scale(1.4)">
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
      <rect className="fill-sage" x="182" y="462" width="236" height="46" rx="23" />
      <text className="font-display fill-white" x="300" y="491" textAnchor="middle" fontWeight="700" fontSize="18">Good morning, Maya!</text>
      </g>
      <g transform="translate(18 64) rotate(-7)">
      <path className="stroke-dark" d="M24 34 C 10 10, -6 0, -14 -10" fill="none" strokeWidth="2" />
      <rect className="fill-dark" x="4" y="6" width="240" height="68" rx="18" opacity="0.1" />
      <rect className="fill-white stroke-dark" x="0" y="0" width="240" height="68" rx="18" strokeWidth="2.5" />
      <circle className="fill-paper stroke-dark" cx="24" cy="34" r="7" strokeWidth="2.5" />
      <text className="font-display fill-dark" x="44" y="30" fontWeight="900" fontSize="19">Made for Maya</text>
      <text className="font-sans fill-dark" x="44" y="52" fontWeight="700" fontSize="14">age 7 · loves volcanoes</text>
      </g>
      <g transform="translate(366 546) rotate(3)">
      <rect className="fill-sage" x="0" y="0" width="238" height="48" rx="24" />
      <circle className="stroke-white" cx="26" cy="24" r="11" fill="none" strokeWidth="2.5" />
      <path className="stroke-white" d="M26 24 V 17 M26 24 L 31 27" strokeWidth="2.5" strokeLinecap="round" />
      <text className="font-sans fill-white" x="46" y="30" fontWeight="800" fontSize="15">Ready in a minute or two</text>
      </g>
      <path className="fill-honey" transform="translate(560 96) scale(1.2)" d="M0 -15 L4 -4 L15 0 L4 4 L0 15 L-4 4 L-15 0 L-4 -4 Z" />
      <path className="fill-coral" transform="translate(70 420) scale(0.9)" d="M0 -15 L4 -4 L15 0 L4 4 L0 15 L-4 4 L-15 0 L-4 -4 Z" />
      <path className="fill-sage-light" transform="translate(560 250) scale(0.7)" d="M0 -15 L4 -4 L15 0 L4 4 L0 15 L-4 4 L-15 0 L-4 -4 Z" />
    </svg>
  );
}
