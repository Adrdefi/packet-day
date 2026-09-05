import Image from "next/image";

type WordmarkSize = "base" | "lg" | "xl";
type WordmarkVariant = "default" | "cream";

const ICON_SRC: Record<WordmarkVariant, string> = {
  default: "/logo-mark.png",
  cream: "/logo-mark-cream.png",
};

const TEXT_SIZE_PX: Record<WordmarkSize, number> = {
  base: 16,
  lg: 18,
  xl: 20,
};

const TEXT_CLASS: Record<WordmarkSize, string> = {
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

// Fraunces (font-display) has a cap height of roughly 0.72em, but the mark
// is a square glyph with empty corners, so sized at literal cap height it
// optically reads smaller than the letterforms beside it. Scaling up ~1.3x
// compensates so the two balance.
const CAP_HEIGHT_RATIO = 0.72 * 1.3;

interface WordmarkProps {
  size?: WordmarkSize;
  /** "cream" for dark/sage backgrounds where the default mark's color would disappear. */
  variant?: WordmarkVariant;
  /** Hide the "Packet Day" text below the sm: breakpoint, icon only. Text stays screen-reader-visible at every width so the icon's alt can stay empty. */
  hideTextOnMobile?: boolean;
  className?: string;
}

export default function Wordmark({
  size = "base",
  variant = "default",
  hideTextOnMobile = false,
  className,
}: WordmarkProps) {
  const iconPx = Math.round(TEXT_SIZE_PX[size] * CAP_HEIGHT_RATIO);

  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <Image
        src={ICON_SRC[variant]}
        alt=""
        width={iconPx}
        height={iconPx}
        className="shrink-0"
      />
      <span
        className={`${TEXT_CLASS[size]} ${
          hideTextOnMobile ? "sr-only sm:not-sr-only" : ""
        }`}
      >
        Packet Day
      </span>
    </span>
  );
}
