import type { Metadata } from "next";
import Link from "next/link";
import PublicHeader from "@/components/layout/PublicHeader";
import Footer from "@/components/layout/Footer";
import UnitStudyCard from "@/components/unit-studies/UnitStudyCard";
import { SITE_URL, DEFAULT_OPEN_GRAPH, DEFAULT_TWITTER, DEFAULT_OG_IMAGE } from "@/lib/site";
import { PAGE_RANGE_TEXT } from "@/lib/situations/figures";
import { getVisibleUnitStudies } from "@/lib/unit-studies/loader";
import { ENTITY_SENTENCE } from "@/lib/unit-studies/entity";
import { HUB_SIGNUP_HREF } from "@/lib/unit-studies/format";

const TITLE = "Printable Unit Study Packets for Kids (K-8) | Packet Day";
const DESCRIPTION =
  "Themed, printable unit study packets for K to 8, each a full school day built around one topic your kid loves. See real sample pages. Free to start.";
const URL = `${SITE_URL}/unit-studies`;

const pages = getVisibleUnitStudies();
// An empty hub is thin content, so it stays out of search until a page is live.
const hasLivePage = pages.some((page) => page.status === "live");

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: URL },
  ...(!hasLivePage && { robots: { index: false, follow: true } }),
  openGraph: {
    ...DEFAULT_OPEN_GRAPH,
    title: TITLE,
    description: DESCRIPTION,
    url: URL,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    ...DEFAULT_TWITTER,
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

export default function UnitStudiesHubPage() {
  return (
    <div className="min-h-screen flex flex-col bg-cream-deep">
      <PublicHeader />

      <main className="flex-1">
        <section className="px-6 pt-12 pb-10 md:pt-20 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-dark leading-tight mb-6">
              Unit study packets for kids
            </h1>
            <p className="text-lg text-dark/70 leading-relaxed">
              Each one is a real packet we made around a single theme, {PAGE_RANGE_TEXT} of reading,
              math, science, puzzles and a movement break. Look inside, then make one for your own kid
              about whatever they are into this week.
            </p>
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="max-w-5xl mx-auto">
            {pages.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {pages.map((page) => (
                  <UnitStudyCard key={page.slug} page={page} />
                ))}
              </div>
            ) : (
              <div className="max-w-xl mx-auto rounded-2xl border border-border bg-white p-8 text-center">
                <p className="font-display text-xl font-bold text-dark mb-3">
                  The first unit studies are on their way.
                </p>
                <p className="text-dark/70 leading-relaxed mb-6">
                  While we finish them, you can flip through a real packet from start to finish.
                </p>
                <Link href="/sample" className="font-semibold text-sage hover:underline">
                  See a full sample packet →
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="px-6 pb-20 text-center">
          <div className="max-w-2xl mx-auto">
            <p className="text-dark/70 leading-relaxed mb-8">{ENTITY_SENTENCE}</p>
            <Link
              href={HUB_SIGNUP_HREF}
              className="inline-block bg-sage text-cream font-bold text-base px-8 py-4 rounded-full hover:bg-sage-dark transition-colors shadow-sm"
            >
              Make your first packet free
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
