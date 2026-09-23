import Image from "next/image";

/**
 * Hero visual: the real cover of Oliver's packet, with a name tag, a speed chip and
 * (on desktop) a sticky note pointing at Quill. The labels are decorative extras;
 * the cover image's alt text carries the meaning.
 */
export default function HeroPacketShowcase() {
  return (
    <div className="relative mx-auto w-full max-w-[290px] lg:max-w-[380px]">
      {/* Soft halo behind the cover */}
      <div
        className="absolute left-1/2 top-1/2 w-[108%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full bg-sage/10"
        aria-hidden="true"
      />

      <Image
        src="/landing/oliver/cover.webp"
        width={1100}
        height={1424}
        alt="The real cover of Oliver's Constitution Adventure Day packet, with Quill the Eagle and his mission for the day"
        sizes="(min-width: 1024px) 380px, 290px"
        preload
        className="relative w-full h-auto rounded-md -rotate-3 shadow-[0_1px_2px_color-mix(in_srgb,var(--color-dark)_10%,transparent),0_16px_36px_-12px_color-mix(in_srgb,var(--color-dark)_35%,transparent)]"
      />

      {/* Name tag, top-left */}
      <div
        className="absolute -left-6 -top-6 -rotate-6 flex items-center gap-3 bg-white border-2 border-dark rounded-2xl px-4 py-2.5 shadow-[3px_3px_0_var(--color-dark)]"
        aria-hidden="true"
      >
        <span className="w-3 h-3 shrink-0 rounded-full border-2 border-dark bg-paper" />
        <span className="text-left leading-tight">
          <span className="block font-display font-black text-dark text-base">Made for Oliver</span>
          <span className="block text-xs font-bold text-dark/60 whitespace-nowrap">
            grade 5 · loves golf<span className="hidden sm:inline"> and video games</span>
          </span>
        </span>
      </div>

      {/* Speed chip, bottom-right */}
      <div
        className="absolute -bottom-5 right-0 rotate-3 inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-sage text-cream font-extrabold text-sm px-4 py-2.5 shadow-sm"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current" fill="none" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        Ready in a minute or two
      </div>

      {/* Sticky note, desktop only, pointing left at Quill */}
      <div
        className="hidden lg:block absolute lg:-right-4 xl:-right-16 top-24 rotate-[5deg] w-36 bg-honey-light rounded-md rounded-br-2xl px-4 py-3 shadow-md shadow-dark/15 font-extrabold text-sm text-dark leading-snug text-left"
        aria-hidden="true"
      >
        <svg viewBox="0 0 48 32" className="absolute -left-11 top-2 w-10 h-7 stroke-dark" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="M44 8 C 34 2, 18 4, 6 18" />
          <path d="M5 9 L 6 18 L 15 17" />
        </svg>
        Meet Quill, his guide for the day
      </div>
    </div>
  );
}
