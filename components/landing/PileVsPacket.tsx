import Image from "next/image";

/**
 * "Pile vs packet": a messy fan of mismatched generic worksheets (pure CSS,
 * gray, no images) next to a neat fan of real pages from Oliver's packet.
 * Side by side from md up, stacked on phones (pile first). Uses only
 * existing color tokens; the worksheet grays are the muted token at low
 * opacity.
 */

const PAGE_SHADOW =
  "shadow-[0_1px_2px_color-mix(in_srgb,var(--color-dark)_10%,transparent),0_12px_28px_-12px_color-mix(in_srgb,var(--color-dark)_35%,transparent)]";

/** Placeholder text lines for a fake worksheet. */
function Lines({ count, className = "" }: { count: number; className?: string }) {
  const widths = ["w-full", "w-11/12", "w-4/5", "w-full", "w-3/4", "w-5/6", "w-2/3"];
  return (
    <div className={`space-y-[6%] ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`h-[3px] rounded-full bg-muted/25 ${widths[i % widths.length]}`} />
      ))}
    </div>
  );
}

/** Six fake worksheets, each with a different header style, scattered at odd angles. */
const WORKSHEETS = [
  {
    position: "left-[2%] top-[14%] -rotate-[13deg]",
    header: <div className="mb-[10%] h-[14%] -mx-[10%] -mt-[10%] bg-muted/35" />,
  },
  {
    position: "left-[30%] top-[2%] rotate-[8deg]",
    header: (
      <div className="mb-[10%] space-y-[5%]">
        <div className="h-[6px] w-3/4 rounded-sm bg-muted/50" />
        <div className="h-[2px] w-full bg-muted/40" />
      </div>
    ),
  },
  {
    position: "left-[54%] top-[16%] -rotate-[5deg]",
    header: <div className="mb-[10%] h-[16%] rounded border-2 border-dashed border-muted/40" />,
  },
  {
    position: "left-[12%] top-[40%] rotate-[15deg]",
    header: (
      <div className="mb-[10%] flex items-center gap-[8%]">
        <div className="aspect-square w-[22%] rounded-full bg-muted/30" />
        <div className="h-[5px] flex-1 rounded-full bg-muted/40" />
      </div>
    ),
  },
  {
    position: "left-[40%] top-[38%] -rotate-[9deg]",
    header: (
      <div className="mb-[10%] flex justify-center">
        <div className="h-[8px] w-1/2 rounded-full bg-muted/45" />
      </div>
    ),
  },
  {
    position: "left-[62%] top-[44%] rotate-[4deg]",
    header: (
      <div className="mb-[10%] grid grid-cols-4 gap-[4%]">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="aspect-square rounded-sm border border-muted/40" />
        ))}
      </div>
    ),
  },
];

/** Real pages from Oliver's Constitution Adventure Day packet, back to front. */
const PACKET_PAGES = [
  {
    src: "/landing/oliver/certificate.webp",
    alt: "Oliver's certificate of completion",
    position: "left-[2%] top-[10%] -rotate-[10deg] z-10",
  },
  {
    src: "/landing/oliver/wordsearch.webp",
    alt: "Constitution word search with ten hidden words",
    position: "left-[15%] top-[6%] -rotate-[5deg] z-20",
  },
  {
    src: "/landing/oliver/reading.webp",
    alt: "Reading passage from the packet: Quill's Guide to the Constitution",
    position: "left-[40%] top-[6%] rotate-[5deg] z-20",
  },
  {
    src: "/landing/oliver/coloring.webp",
    alt: "Coloring page of Oliver and Quill signing the Constitution",
    position: "left-[52%] top-[10%] rotate-[10deg] z-10",
  },
  {
    src: "/landing/oliver/cover.webp",
    alt: "Cover of Oliver's Constitution Adventure Day packet, with Quill the Eagle and his mission for the day",
    position: "left-[27%] top-[3%] z-30",
  },
];

interface Props {
  pileCaption: string;
  packetCaption: string;
}

export default function PileVsPacket({ pileCaption, packetCaption }: Props) {
  return (
    <div className="grid gap-14 md:grid-cols-2 md:gap-10">
      <figure>
        <div
          role="img"
          aria-label="A messy pile of six mismatched worksheets from different websites, each in a different style"
          className="relative mx-auto aspect-[5/4] w-full max-w-[420px]"
        >
          {WORKSHEETS.map((sheet, i) => (
            <div
              key={i}
              className={`absolute w-[36%] aspect-[8.5/11] overflow-hidden rounded-sm border border-border bg-white p-[5%] ${PAGE_SHADOW} ${sheet.position}`}
            >
              {sheet.header}
              <Lines count={6 - (i % 3)} />
            </div>
          ))}
        </div>
        <figcaption className="mt-8 text-center font-display text-xl font-bold text-dark/70">
          {pileCaption}
        </figcaption>
      </figure>

      <figure>
        <div className="relative mx-auto aspect-[5/4] w-full max-w-[420px]">
          <div
            className="absolute left-1/2 top-1/2 w-[80%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full bg-sage/10"
            aria-hidden="true"
          />
          {PACKET_PAGES.map((page) => (
            <Image
              key={page.src}
              src={page.src}
              alt={page.alt}
              width={1100}
              height={1424}
              loading="lazy"
              sizes="(min-width: 768px) 200px, 45vw"
              className={`absolute w-[46%] h-auto rounded-md bg-white ${PAGE_SHADOW} ${page.position}`}
            />
          ))}
        </div>
        <figcaption className="mt-8 text-center font-display text-xl font-bold text-sage-dark">
          {packetCaption}
        </figcaption>
      </figure>
    </div>
  );
}
