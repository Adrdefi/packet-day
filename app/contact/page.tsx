import type { Metadata } from "next";
import SiteHeader from "@/components/layout/SiteHeader";
import Footer from "@/components/layout/Footer";
import { SITE_URL, DEFAULT_OPEN_GRAPH, DEFAULT_TWITTER, DEFAULT_OG_IMAGE } from "@/lib/site";

const TITLE = "Contact — Packet Day";
const DESCRIPTION =
  "Get in touch with the Packet Day team — we typically reply within a couple of business days.";

export const metadata: Metadata = {
  // Bare page name here, not TITLE — the layout's "%s | Packet Day" template
  // already appends the brand; using TITLE (which also ends in "Packet Day")
  // would double it up to "Contact — Packet Day | Packet Day".
  title: "Contact",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    ...DEFAULT_OPEN_GRAPH,
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/contact`,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    ...DEFAULT_TWITTER,
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <SiteHeader />

      <main className="flex-1 px-6 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-dark leading-tight mb-8">
            Get in touch
          </h1>

          <div className="space-y-6 text-dark/80 text-lg leading-relaxed mb-10">
            <p>
              Have a question, a bit of feedback, or a homeschool day that Packet Day saved? We
              would love to hear from you.
            </p>
            <p>
              Email us at hello@packetday.com and we will get back to you as soon as we can,
              usually within a couple of business days.
            </p>
          </div>

          <a
            href="mailto:hello@packetday.com"
            className="inline-block bg-sage text-cream font-bold text-base px-8 py-4 rounded-full hover:bg-sage-dark transition-colors shadow-sm"
          >
            Email hello@packetday.com
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
