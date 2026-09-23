import Image from "next/image";

const PAGE_SHADOW =
  "shadow-[0_1px_2px_color-mix(in_srgb,var(--color-dark)_10%,transparent),0_16px_36px_-12px_color-mix(in_srgb,var(--color-dark)_35%,transparent)]";
const NOTE = "rounded-md rounded-br-2xl shadow-md shadow-dark/15 font-extrabold text-sm text-dark leading-snug text-left";

const PAGES = {
  reading: {
    src: "/landing/oliver/reading.webp",
    alt: "Reading passage from the packet: Quill's Guide to the Constitution",
    note: "A real grade 5 reading passage, not busywork",
    noteColor: "bg-honey-light",
  },
  wordsearch: {
    src: "/landing/oliver/wordsearch.webp",
    alt: "Constitution word search with ten hidden words",
    note: "His golf obsession, woven right into the pages",
    noteColor: "bg-coral-light",
  },
  certificate: {
    src: "/landing/oliver/certificate.webp",
    alt: "Oliver's certificate of completion",
    note: "A certificate he'll actually want to earn",
    noteColor: "bg-white border border-border",
  },
  coloring: {
    src: "/landing/oliver/coloring.webp",
    alt: "Coloring page of Oliver and Quill signing the Constitution",
    note: "Quill shows up on every page. Kids hunt for him.",
    // bg-sage/15 is see-through, so both layouts sit this note on a paper backing.
    noteColor: "bg-sage/15",
  },
} as const;

type PageKey = keyof typeof PAGES;

const SWIPE_ORDER: PageKey[] = ["reading", "wordsearch", "certificate", "coloring"];

/**
 * "This is what lands in your inbox": four real pages from Oliver's packet.
 * lg and up: fanned across a table with sticky notes. Phones and tablets: a snap-scrolling row.
 * (At md widths the fan is too cramped for the notes, so it waits for lg.)
 */
export default function InsidePacketShowcase() {
  return (
    <>
      {/* ── Phones and tablets: swipe row ────────────────────────────────── */}
      <div className="lg:hidden">
        <p className="text-center font-bold text-sm text-sage mb-6">Swipe to peek inside →</p>
        <div className="-mx-6 flex gap-4 overflow-x-auto snap-x snap-mandatory px-[calc(50%-125px)] pb-6">
          {SWIPE_ORDER.map((key) => {
            const page = PAGES[key];
            return (
              <div key={key} className="flex-none w-[250px] snap-center">
                <Image
                  src={page.src}
                  width={1100}
                  height={1424}
                  alt={page.alt}
                  sizes="250px"
                  className={`w-full h-auto rounded-md ${PAGE_SHADOW}`}
                />
                <div className="mt-5 mx-3 rounded-md rounded-br-2xl bg-paper" aria-hidden="true">
                  <p className={`${NOTE} ${page.noteColor} -rotate-1 px-4 py-3`}>{page.note}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── lg and up: fanned spread ──────────────────────────────────────── */}
      <div className="hidden lg:block relative max-w-5xl mx-auto aspect-[1024/620]">
        <Image
          src={PAGES.coloring.src}
          width={1100}
          height={1424}
          alt={PAGES.coloring.alt}
          sizes="320px"
          className={`absolute left-[1%] top-[21%] w-[31%] h-auto rounded-md -rotate-9 ${PAGE_SHADOW}`}
        />
        <Image
          src={PAGES.reading.src}
          width={1100}
          height={1424}
          alt={PAGES.reading.alt}
          sizes="320px"
          className={`absolute left-[23%] top-[4%] w-[31%] h-auto rounded-md -rotate-3 ${PAGE_SHADOW}`}
        />
        <Image
          src={PAGES.wordsearch.src}
          width={1100}
          height={1424}
          alt={PAGES.wordsearch.alt}
          sizes="320px"
          className={`absolute left-[46%] top-[9%] w-[31%] h-auto rounded-md rotate-3 ${PAGE_SHADOW}`}
        />
        <Image
          src={PAGES.certificate.src}
          width={1100}
          height={1424}
          alt={PAGES.certificate.alt}
          sizes="320px"
          className={`absolute left-[68%] top-[22%] w-[31%] h-auto rounded-md rotate-8 ${PAGE_SHADOW}`}
        />

        {/* a. Reading: in the open space top-left of the reading page */}
        <p className={`absolute left-[5%] top-[3%] w-40 -rotate-6 px-4 py-3 ${NOTE} ${PAGES.reading.noteColor}`} aria-hidden="true">
          {PAGES.reading.note}
        </p>

        {/* b. Word search: under the page, arrow up at the "reading the fairway" line near its bottom */}
        <p className={`absolute left-[47%] top-[77%] w-44 rotate-2 px-4 py-3 ${NOTE} ${PAGES.wordsearch.noteColor}`} aria-hidden="true">
          <svg viewBox="0 0 104 84" className="absolute -top-[84px] left-[70px] w-[104px] h-[84px] stroke-dark" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="M4 82 C 20 40, 60 14, 98 8" />
            <path d="M88 2 L 98 8 L 90 16" />
          </svg>
          {PAGES.wordsearch.note}
        </p>

        {/* c. Certificate: across the bottom edge, tilted with the page so it covers the footer line */}
        <p className={`absolute left-[66%] top-[79%] w-72 rotate-6 px-4 py-3 ${NOTE} ${PAGES.certificate.noteColor}`} aria-hidden="true">
          {PAGES.certificate.note}
        </p>

        {/* d. Coloring: bottom left. Paper backing so the see-through sage tint stays readable. */}
        <div className="absolute -left-2 top-[88%] w-44 rotate-3 rounded-md rounded-br-2xl bg-paper" aria-hidden="true">
          <p className={`${NOTE} ${PAGES.coloring.noteColor} px-4 py-3`}>{PAGES.coloring.note}</p>
        </div>
      </div>
    </>
  );
}
