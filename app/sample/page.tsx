import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Wordmark from "@/components/layout/Wordmark";

export const metadata: Metadata = {
  title: "See a Sample Packet",
  description:
    "Browse a real, full-length Packet Day packet — every page, no signup required.",
};

// Every page in public/sample/ was rasterized at the same width by
// scripts/convert-sample-pdf.ts, so the pixel dimensions are uniform.
const PAGE_WIDTH = 1200;
const PAGE_HEIGHT = 1553;
const PAGE_COUNT = 15;

const pages = Array.from({ length: PAGE_COUNT }, (_, i) => {
  const pageNum = i + 1;
  const isLast = pageNum === PAGE_COUNT;
  return {
    src: `/sample/page-${String(pageNum).padStart(2, "0")}.png`,
    alt: isLast
      ? "Sample packet, page 15 of 15 — parent answer sheet"
      : `Sample packet, page ${pageNum} of ${PAGE_COUNT}`,
  };
});

export default function SamplePage() {
  return (
    <main className="min-h-full">
      <div className="mx-auto max-w-2xl px-4 pt-8 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-display font-bold text-dark hover:text-sage transition-colors"
        >
          <Wordmark size="lg" />
        </Link>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-6 pb-8 text-center">
        <h1 className="font-display text-3xl font-bold text-dark sm:text-4xl">
          This is a real packet, made for a real kid
        </h1>
        <p className="mt-4 text-base leading-relaxed text-dark/70">
          Noah is going to the Grand Canyon. Before the trip he had roughly
          four hundred questions about rocks, and his mom had no lesson plan
          for that.
        </p>
        <p className="mt-4 text-base leading-relaxed text-dark/70">
          This is what she got back, all fifteen pages, exactly as it
          printed. There is a question in there about his 3D printer, which
          has nothing to do with canyons and everything to do with Noah.
          Nothing to sign up for, scroll as far as you want.
        </p>
        <p className="mt-4 text-base leading-relaxed text-dark/70">
          Your kid&apos;s version would be different. That is sort of the
          whole point.
        </p>
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pb-16">
        {pages.map((page, i) => (
          <div
            key={page.src}
            className="overflow-hidden rounded-lg border border-dark/10 shadow-sm"
          >
            <Image
              src={page.src}
              alt={page.alt}
              width={PAGE_WIDTH}
              height={PAGE_HEIGHT}
              sizes="(min-width: 672px) 672px, 100vw"
              priority={i === 0}
              loading={i === 0 ? "eager" : "lazy"}
              className="h-auto w-full"
            />
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-2xl px-4 pb-20 text-center">
        <h2 className="font-display text-2xl font-bold text-dark sm:text-3xl">
          Yours would be about something else entirely
        </h2>
        <p className="mt-4 text-base leading-relaxed text-dark/70">
          Sharks. Ancient Egypt. The specific garbage truck that comes on
          Tuesdays. Volcanoes for the third month running.
        </p>
        <p className="mt-4 text-base leading-relaxed text-dark/70">
          You tell us the thing your kid is into right now, their grade, and
          how long you have. You get a full day back: math, reading,
          writing, science, a movement break, a word search, a coloring page
          with their own character in it, and an answer key so you are not
          solving the math yourself at the kitchen table.
        </p>
        <p className="mt-4 text-base leading-relaxed text-dark/70">
          It takes about a minute to make one.
        </p>

        <div className="mt-8">
          <Link
            href="/signup"
            className="inline-block rounded-full bg-sage px-8 py-4 text-base font-bold text-cream shadow-sm transition-colors hover:bg-sage-dark"
          >
            Make one for your kid
          </Link>
        </div>

        <p className="mt-6 text-sm">
          <Link href="/" className="text-sage font-semibold hover:underline">
            Learn more about Packet Day →
          </Link>
        </p>
      </div>
    </main>
  );
}
